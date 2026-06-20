"use client";

import { useState, useRef, useEffect } from "react";
import AnnotationOverlay from "@/components/AnnotationOverlay";
import ZkLoginButton from "@/components/ZkLoginButton";
import StudyModePicker from "@/components/StudyModePicker";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type Breakdown = { score: number; feedback: string };
type Annotation = { keyword: string; type: string; context: string; suggestion: string };
type Improvement = { category: string; defect: string; fix: string };
type Citation = { claim: string; source: string; reference: string };
type EvalResult = {
  subject: string; estimatedScore: string; overallCritique: string;
  breakdown: { knowledge: Breakdown; application: Breakdown; analysis: Breakdown; evaluation: Breakdown };
  annotations: Annotation[]; improvements: Improvement[]; citations?: Citation[];
};
type TrustResult = { reliabilityScore: number; hallucinationRisk: number; trustLabel: string; summary: string };
type Message =
  | { role: "user"; content: string; imagePreview?: string }
  | { role: "assistant"; type: "eval"; result: EvalResult; answer: string; trust?: TrustResult }
  | { role: "assistant"; type: "study"; content: string; mode: string }
  | { role: "assistant"; type: "text"; content: string };
type Session = { id: string; title: string; subject: string; messages: Message[]; question: string; phase: "idle"|"has_question"|"has_eval"; lastResult?: EvalResult; createdAt: number };
type SubjectSummary = { sessions: number; averages: { knowledge: number; application: number; analysis: number; evaluation: number }; recentDefects: string[] };
type HistoryItem = { id: number; question: string; subject?: string; result: { estimatedScore?: string; overallCritique?: string; breakdown?: any }; createdAt: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const SUBJECTS = ["Economics","Business","Physics","Maths","History","Psychology"];
const SUBJECT_ICONS: Record<string,string> = { economics:"📈", business:"🏢", physics:"⚡", maths:"∑", history:"📜", psychology:"🧠" };

function chips(phase: "idle"|"has_question"|"has_eval", last?: EvalResult): string[] {
  if (phase==="idle") return [];
  if (phase==="has_question") return ["🔍 Explain the question","🧭 Guide me (Socratic)","🎯 Mark scheme breakdown"];
  const w = last ? Object.entries(last.breakdown).sort((a,b)=>a[1].score-b[1].score)[0][0] : "Evaluation";
  return [`💡 Why is my ${w} score low?`,"📝 Show a model answer","🔁 Give me a similar question"];
}

function newSession(): Session {
  return { id: Date.now().toString(), title:"New chat", subject:"Economics", messages:[], question:"", phase:"idle", createdAt: Date.now() };
}

function SideItem({ label, icon, active, onClick }: { label:string; icon:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 12px", borderRadius:8, fontSize:13, cursor:"pointer", background:active?"#1a1a2e":"transparent", border:`0.5px solid ${active?"#2a2a4a":"transparent"}`, color:active?"#c7d2fe":"#666", textAlign:"left", transition:"all 0.12s", fontFamily:"inherit" }}
      onMouseEnter={e=>{if(!active)(e.currentTarget as HTMLElement).style.background="#141414";}}
      onMouseLeave={e=>{if(!active)(e.currentTarget as HTMLElement).style.background="transparent";}}>
      <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{label}</span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = useState<"chat"|"analytics"|"history">("chat");
  const [sessions, setSessions] = useState<Session[]>([newSession()]);
  const [activeId, setActiveId] = useState<string>(sessions[0].id);
  const [subject, setSubject] = useState("Economics");
  const [loading, setLoading] = useState(false);
  const [, setLoadingLabel] = useState("");
  const [, setError] = useState("");
  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<string|null>(null);
  const [imagePreview] = useState<string|null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Analytics State
  const [analytics, setAnalytics] = useState<Record<string, SubjectSummary>>({});
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [activeSub, setActiveSub] = useState<string|null>(null);

  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const session = sessions.find(s=>s.id===activeId) ?? sessions[0];

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); }, [session.messages, loading]);

  useEffect(()=>{
    const onUp = ()=>{
      const sel = window.getSelection()?.toString().trim();
      if(sel && sel.length>10 && sel.length<300){ setInput(`> "${sel}"\n\n`); textareaRef.current?.focus(); }
    };
    document.addEventListener("mouseup",onUp);
    return ()=>document.removeEventListener("mouseup",onUp);
  },[]);

  useEffect(()=>{
    if(view==="analytics"&&!analyticsLoaded){ 
      fetch("/api/weakness").then(r=>r.json()).then(d=>{setAnalytics(d);const f=Object.keys(d)[0];if(f)setActiveSub(f);setAnalyticsLoaded(true);}); 
    }
    if(view==="history"&&!historyLoaded){ 
      fetch("/api/history").then(r=>r.json()).then(d=>{setHistoryItems(Array.isArray(d)?d:[]);setHistoryLoaded(true);}); 
    }
  },[view, analyticsLoaded, historyLoaded]);

  function updateSession(id:string, patch: Partial<Session>) {
    setSessions(p=>p.map(s=>s.id===id?{...s,...patch}:s));
  }

  function addMsg(id:string, msg:Message) {
    setSessions(p=>p.map(s=>s.id===id?{...s,messages:[...s.messages,msg]}:s));
  }

  function startNew() {
    const s = newSession(); setSessions(p=>[s,...p]); setActiveId(s.id); setView("chat"); setInput(""); setError("");
  }

  async function send(text?:string) {
    const content=(text||input).trim(); if(!content) return;
    setInput(""); setError("");
    addMsg(activeId,{role:"user",content,imagePreview:imagePreview??undefined});

    const sess = sessions.find(s=>s.id===activeId)!;

    if(!sess.question){
      const title = content.slice(0,42)+(content.length>42?"…":"");
      updateSession(activeId,{question:content,phase:"has_question",title});
      return;
    }

    setLoading(true); setLoadingLabel("Evaluating...");
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: sess.question, response1: content, subject: sess.subject || subject })
      });
      const data = await res.json();
      addMsg(activeId, { role: "assistant", type: "eval", result: data, answer: content });
      updateSession(activeId, { phase: "has_eval", lastResult: data });
    } catch {
      setError("Evaluation pipeline crashed.");
    } finally {
      setLoading(false); setLoadingLabel("");
    }
  }

  // Định dạng mảng chuẩn data cho Recharts radar
  const chartData = activeSub && analytics[activeSub] ? [
    { subject: 'Knowledge', A: analytics[activeSub].averages.knowledge },
    { subject: 'Application', A: analytics[activeSub].averages.application },
    { subject: 'Analysis', A: analytics[activeSub].averages.analysis },
    { subject: 'Evaluation', A: analytics[activeSub].averages.evaluation },
  ] : [];

  // FIX LỖI 1: Khai báo chính xác cấu trúc activeAnalytics để không bị báo "Cannot find name"
  const activeAnalytics = activeSub ? analytics[activeSub] : undefined;
  const sessChips = chips(session.phase, session.lastResult);
  const SB_W = sidebarOpen ? 240 : 0;

  return (
    <div style={{display:"flex",height:"100vh",background:"#0a0a0a",color:"#e5e5e5",fontFamily:"var(--font-geist-sans,sans-serif)",overflow:"hidden"}}>

      {/* ── Sidebar ── */}
      <div style={{width:SB_W,flexShrink:0,borderRight:"0.5px solid #161616",display:"flex",flexDirection:"column",overflow:"hidden",transition:"width 0.2s ease",background:"#080808"}}>
        {sidebarOpen && (
          <>
            <div style={{padding:"14px 12px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"0.5px solid #111"}}>
              <span style={{fontSize:14,fontWeight:600,color:"#e5e5e5"}}>iStudy AI</span>
              <button onClick={startNew} style={{width:28,height:28,borderRadius:8,background:"transparent",border:"0.5px solid #222",color:"#666",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>

            <div style={{padding:"8px 8px 4px"}}>
              <SideItem label="Analytics" icon="📊" active={view==="analytics"} onClick={()=>setView("analytics")} />
              <SideItem label="History" icon="🕐" active={view==="history"} onClick={()=>setView("history")} />
            </div>

            <div style={{padding:"4px 8px 6px"}}>
              <div style={{fontSize:10,color:"#333",textTransform:"uppercase",letterSpacing:"0.06em",padding:"4px 4px 6px"}}>Chats</div>
              {sessions.map(s=>(
                <SideItem key={s.id} label={s.title} icon={SUBJECT_ICONS[s.subject?.toLowerCase()]||"💬"} active={view==="chat"&&activeId===s.id}
                  onClick={()=>{setActiveId(s.id);setView("chat");}} />
              ))}
            </div>

            <div style={{padding:"10px 10px 6px",borderTop:"0.5px solid #111",marginTop:"auto"}}>
              <ZkLoginButton />
            </div>
            
            <div style={{padding:"10px 10px 14px"}}>
              <div style={{fontSize:10,color:"#333",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Subject</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {SUBJECTS.map(s=>(
                  <button key={s} onClick={()=>{setSubject(s);updateSession(activeId,{subject:s});}}
                    style={{padding:"3px 9px",borderRadius:20,fontSize:11,cursor:"pointer",border:"0.5px solid",fontFamily:"inherit",background:subject===s?"#312e81":"transparent",borderColor:subject===s?"#4f46e5":"#1e1e1e",color:subject===s?"#c7d2fe":"#555",transition:"all 0.12s"}}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Main Area ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",padding:"0 16px",height:44,borderBottom:"0.5px solid #111",flexShrink:0,gap:10}}>
          <button onClick={()=>setSidebarOpen(p=>!p)} style={{background:"transparent",border:"none",color:"#444",cursor:"pointer",fontSize:16}}>☰</button>
          <span style={{fontSize:13,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
            {view==="chat" ? (session.question?session.question.slice(0,60)+"…":"New chat") : view==="analytics"?"Analytics":"History"}
          </span>
        </div>

        {/* ── Chat View ── */}
        {view==="chat" && (
          <>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 16px",borderBottom:"0.5px solid #0f0f0f",flexShrink:0}}>
              <StudyModePicker active={activeMode} onChange={setActiveMode} />
            </div>

            {/* Messages Container */}
            <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:16}}>
              {session.messages.length===0 && (
                <div style={{margin:"auto",textAlign:"center",maxWidth:380,color:"#2a2a2a"}}>
                  <div style={{fontSize:32,marginBottom:12}}>📚</div>
                  <p style={{fontSize:14,color:"#444"}}>Paste your exam question to get started.</p>
                </div>
              )}
              
              {session.messages.map((msg,i)=>{
                if(msg.role==="user") return (
                  <div key={i} style={{display:"flex",justifyContent:"flex-end"}}>
                    <div style={{maxWidth:"66%",background:"#1a1a2e",border:"0.5px solid #252545",borderRadius:"14px 14px 4px 14px",padding:"9px 13px",fontSize:14,color:"#d0d0e8",whiteSpace:"pre-wrap"}}>
                      {msg.content}
                    </div>
                  </div>
                );
                
                if(msg.role==="assistant" && msg.type==="eval") {
                  const r = msg.result;
                  return (
                    <div key={i} style={{display:"flex",gap:8}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#555"}}>A</div>
                      <div style={{flex:1,display:"flex",flexDirection:"column",gap:9}}>
                        <div style={{background:"#0f0f0f",border:"0.5px solid #161616",borderRadius:12,padding:"14px"}}>
                          <div style={{fontSize:30,fontWeight:700}}>{r.estimatedScore}</div>
                          <div style={{fontSize:12,color:"#666",marginTop:4}}>{r.overallCritique}</div>
                        </div>
                        {r.annotations && <AnnotationOverlay text={msg.answer} annotations={r.annotations}/>}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div style={{padding:"0 20px 20px",background:"linear-gradient(transparent, #0a0a0a 20%)"}}>
              {sessChips.length > 0 && (
                <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:8,paddingBottom:4}}>
                  {sessChips.map(c=>(
                    <button key={c} onClick={()=>send(c)} style={{padding:"4px 10px",borderRadius:6,background:"#111",border:"0.5px solid #222",color:"#888",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>{c}</button>
                  ))}
                </div>
              )}
              <div style={{display:"flex",background:"#0f0f0f",border:"0.5px solid #1c1c1c",borderRadius:10,padding:8,gap:8}}>
                <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)} placeholder={session.question?"Type your answer...":"Paste essay prompt..."}
                  style={{flex:1,background:"transparent",border:"none",color:"#e5e5e5",fontSize:13,outline:"none",resize:"none",height:36,fontFamily:"inherit"}}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}/>
                <button onClick={()=>send()} style={{background:"#1a1a2e",border:"0.5px solid #2a2a4a",color:"#818cf8",borderRadius:6,padding:"0 12px",fontSize:12,cursor:"pointer"}}>Send</button>
              </div>
            </div>
          </>
        )}

        {/* ── Analytics View ── */}
        {view === "analytics" && (
          <div style={{ padding: 24, overflowY: "auto", flex: 1, background: "#0a0a0a" }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, color: "#fff" }}>Analytics Profile</h2>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>Overview of capability averages based on evaluation logs.</p>
            
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {/* Radar Card */}
              <div style={{ width: 340, height: 320, background: "#0f0f10", border: "0.5px solid #1c1c1e", borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 12, textTransform: "uppercase" }}>Capability Radar</div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="90%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                      <PolarGrid stroke="#262626" />
                      <PolarAngleAxis dataKey="subject" stroke="#888" style={{ fontSize: 11 }} />
                      <Radar name="Capability" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ fontSize: 12, color: "#444", textAlign: "center", marginTop: 100 }}>No analytical history logs generated yet.</div>
                )}
              </div>

              {/* Avg Scores Card */}
              <div style={{ flex: 1, minWidth: 280, background: "#0f0f10", border: "0.5px solid #1c1c1e", borderRadius: 16, padding: 20 }}>
                <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 16, textTransform: "uppercase" }}>Avg Scores</div>
                
                <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:20}}>
                  {Object.keys(analytics).map(subKey => (
                    <button key={subKey} onClick={()=>setActiveSub(subKey)} style={{padding:"5px 11px", borderRadius:8, fontSize:12, background:activeSub===subKey?"#1e1e38":"#111", border:`0.5px solid ${activeSub===subKey?"#3b82f6":"#222"}`, color:activeSub===subKey?"#93c5fd":"#666", cursor:"pointer"}}>
                      {subKey}
                    </button>
                  ))}
                </div>

                {activeAnalytics ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {Object.entries(activeAnalytics.averages).map(([key, val]) => (
                      <div key={key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                          <span style={{ textTransform: "capitalize", color: "#ccc" }}>{key}</span>
                          <span style={{ fontWeight: 600, color: "#38bdf8" }}>{Number(val).toFixed(1)}/5</span>
                        </div>
                        <div style={{ width: "100%", height: 6, background: "#1e1e1f", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${(Number(val) / 5) * 100}%`, height: "100%", background: "#4f46e5", borderRadius: 3 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#444" }}>Please select or run a script evaluation to initialize data metrics.</div>
                )}
              </div>
            </div>

            {/* Recurring Weaknesses Card */}
            <div style={{ marginTop: 24, background: "#0f0f10", border: "0.5px solid #1c1c1e", borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 12, color: "#888", fontWeight: 600, marginBottom: 12, textTransform: "uppercase" }}>Recurring Weaknesses</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {activeAnalytics?.recentDefects && activeAnalytics.recentDefects.length > 0 ? (
                  activeAnalytics.recentDefects.map((defect: string, idx: number) => (
                    <span key={idx} style={{ background: "#2d1616", border: "0.5px solid #4c1d1d", color: "#f87171", padding: "4px 10px", borderRadius: 20, fontSize: 12 }}>
                      {defect}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#444", fontSize: 12 }}>No persistent critical flaws detected in current logs.</span>
                )}
              </div>
              <p style={{ fontSize: 11, color: "#444", margin: 0 }}>Automatically tagged from your evaluation history — frequent defects will appear here.</p>
            </div>
          </div>
        )}

        {/* ── History View ── */}
        {view === "history" && (
          <div style={{padding:24, overflowY:"auto", flex:1}}>
            <h2 style={{fontSize:18, fontWeight:600, marginBottom:16, color:"#fff"}}>Session History</h2>
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {historyItems.length === 0 ? (
                <div style={{fontSize:13, color:"#333"}}>No saved sessions found.</div>
              ) : (
                // FIX LỖI 2: Ép kiểu tường minh cho map callback params để loại bỏ lỗi 'd' / 'idx' implicitly any type
                historyItems.map((item: HistoryItem) => (
                  <div key={item.id} style={{background:"#0b0b0c", border:"0.5px solid #141416", borderRadius:10, padding:14, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:13, color:"#ccc", fontWeight:500, marginBottom:4}}>{item.question?.slice(0, 80)}...</div>
                      <div style={{fontSize:11, color:"#444"}}>{item.subject} · {new Date(item.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div style={{fontSize:16, fontWeight:700, color:"#818cf8"}}>{item.result?.estimatedScore || "N/A"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
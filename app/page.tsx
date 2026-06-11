"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import AnnotationOverlay from "@/components/AnnotationOverlay";
import StudyModePicker from "@/components/Studymodepicker";
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
const STUDY_MODES = [
  { key:"socratic", label:"Guide Me", icon:"🧭" },
  { key:"scaffold", label:"Base Concepts", icon:"🧱" },
  { key:"exam_drill", label:"Exam Drill", icon:"🎯" },
];
const LAYER_COLORS: Record<string,string> = { knowledge:"#60a5fa", application:"#a78bfa", analysis:"#facc15", evaluation:"#f87171" };
const SUBJECT_ICONS: Record<string,string> = { economics:"📈", business:"🏢", physics:"⚡", maths:"∑", history:"📜", psychology:"🧠" };
const sc = (s:number) => s>=4?"#4ade80":s>=3?"#facc15":"#f87171";

function chips(phase: "idle"|"has_question"|"has_eval", last?: EvalResult): string[] {
  if (phase==="idle") return [];
  if (phase==="has_question") return ["🔍 Explain the question","🧭 Guide me (Socratic)","🎯 Mark scheme breakdown"];
  const w = last ? Object.entries(last.breakdown).sort((a,b)=>a[1].score-b[1].score)[0][0] : "Evaluation";
  return [`💡 Why is my ${w} score low?`,"📝 Show a model answer","🔁 Give me a similar question"];
}

async function silentTrust(q:string,a:string,s:string): Promise<TrustResult|null> {
  try { const r=await fetch("/api/trust",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q,answer:a,subject:s})}); return r.ok?r.json():null; } catch{return null;}
}

function newSession(): Session {
  return { id: Date.now().toString(), title:"New chat", subject:"Economics", messages:[], question:"", phase:"idle", createdAt: Date.now() };
}

// ─── Sidebar item ─────────────────────────────────────────────────────────────
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [view, setView] = useState<"chat"|"analytics"|"history">("chat");
  const [sessions, setSessions] = useState<Session[]>([newSession()]);
  const [activeId, setActiveId] = useState<string>(sessions[0].id);
  const [subject, setSubject] = useState("Economics");
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [error, setError] = useState("");
  const [input, setInput] = useState("");
  const [activeMode, setActiveMode] = useState<string|null>(null);
  const [imageFile, setImageFile] = useState<File|null>(null);
  const [imagePreview, setImagePreview] = useState<string|null>(null);
  const [ocrTarget, setOcrTarget] = useState<"question"|"answer">("answer");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Analytics
  const [analytics, setAnalytics] = useState<Record<string,SubjectSummary>>({});
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);
  const [activeSub, setActiveSub] = useState<string|null>(null);

  // History
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const session = sessions.find(s=>s.id===activeId) ?? sessions[0];

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[session.messages, loading]);

  useEffect(()=>{
    const onUp = ()=>{
      const sel = window.getSelection()?.toString().trim();
      if(sel && sel.length>10 && sel.length<300){ setInput(`> "${sel}"\n\n`); textareaRef.current?.focus(); }
    };
    document.addEventListener("mouseup",onUp);
    return ()=>document.removeEventListener("mouseup",onUp);
  },[]);

  useEffect(()=>{
    if(view==="analytics"&&!analyticsLoaded){ fetch("/api/weakness").then(r=>r.json()).then(d=>{setAnalytics(d);const f=Object.keys(d)[0];if(f)setActiveSub(f);setAnalyticsLoaded(true);}); }
    if(view==="history"&&!historyLoaded){ fetch("/api/history").then(r=>r.json()).then(d=>{setHistoryItems(Array.isArray(d)?d:[]);setHistoryLoaded(true);}); }
  },[view]);

  function updateSession(id:string, patch: Partial<Session>) {
    setSessions(p=>p.map(s=>s.id===id?{...s,...patch}:s));
  }

  function addMsg(id:string, msg:Message) {
    setSessions(p=>p.map(s=>s.id===id?{...s,messages:[...s.messages,msg]}:s));
  }

  function startNew() {
    const s = newSession(); setSessions(p=>[s,...p]); setActiveId(s.id); setView("chat"); setInput(""); setError("");
  }

  async function runOCR() {
    if(!imageFile) return;
    setLoading(true); setLoadingLabel("Extracting text...");
    try {
      const form=new FormData(); form.append("image",imageFile);
      const res=await fetch("/api/ocr",{method:"POST",body:form}); const data=await res.json();
      if(!data.text){setError("OCR failed.");return;}
      if(ocrTarget==="question"){
        updateSession(activeId,{question:data.text,phase:"has_question"});
        const dr=await fetch("/api/detect-subject",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:data.text})});
        const dd=await dr.json(); if(dd.subject&&SUBJECTS.includes(dd.subject)){setSubject(dd.subject);updateSession(activeId,{subject:dd.subject});}
        addMsg(activeId,{role:"assistant",type:"text",content:`📄 Question extracted:\n\n${data.text}`});
      } else { setInput(data.text); }
      setImageFile(null); setImagePreview(null);
    } catch{setError("OCR failed.");}
    finally{setLoading(false);setLoadingLabel("");}
  }

  async function send(text?:string) {
    const content=(text||input).trim(); if(!content) return;
    setInput(""); setError("");
    addMsg(activeId,{role:"user",content,imagePreview:imagePreview??undefined});
    setImageFile(null); setImagePreview(null);

    const sess = sessions.find(s=>s.id===activeId)!;

    // First message = the question
    if(!sess.question){
      const title = content.slice(0,42)+(content.length>42?"…":"");
      updateSession(activeId,{question:content,phase:"has_question",title});
      setLoading(true); setLoadingLabel("Detecting subject...");
      try {
        const dr=await fetch("/api/detect-subject",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:content})});
        const dd=await dr.json(); const det=dd.subject&&SUBJECTS.includes(dd.subject)?dd.subject:subject;
        setSubject(det); updateSession(activeId,{subject:det});
        addMsg(activeId,{role:"assistant",type:"text",content:`Subject detected: **${det}**.\n\nPaste your answer to evaluate, or use a study mode first.`});
      } finally{setLoading(false);setLoadingLabel("");}
      return;
    }

    const studyMap:Record<string,string>={
      "🧭 Guide me (Socratic)":"socratic","🔁 Give me a similar question":"exam_drill",
      "🎯 Mark scheme breakdown":"exam_drill","🔍 Explain the question":"scaffold",
    };
    const isStudy = studyMap[content]||activeMode;
    const isFollowUp = content.startsWith("💡")||content.startsWith("📝");

    if(isStudy||isFollowUp){
      const mode=studyMap[content]||activeMode||"scaffold";
      setLoading(true); setLoadingLabel("Thinking...");
      try {
        const res=await fetch("/api/study",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:isFollowUp?`${sess.question}\n\nContext: ${content}`:sess.question,subject:sess.subject||subject,mode})});
        const data=await res.json();
        addMsg(activeId,{role:"assistant",type:"study",content:data.text||data.error,mode:mode as string});
      } finally{setLoading(false);setLoadingLabel("");setActiveMode(null);}
      return;
    }

    // Evaluate
    setLoading(true); setLoadingLabel("Evaluating...");
    try {
      const res=await fetch("/api/evaluate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:sess.question,response1:content,response2:"",evaluator:"Gemini",subject:sess.subject||subject})});
      const data:EvalResult=await res.json();
      if(!res.ok){setError((data as any).error||"Evaluation failed.");return;}
      addMsg(activeId,{role:"assistant",type:"eval",result:data,answer:content});
      updateSession(activeId,{phase:"has_eval",lastResult:data});
      fetch("/api/weakness",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({subject:sess.subject||subject,scores:data.breakdown,improvements:data.improvements})});
      setLoadingLabel("Verifying reliability...");
      const trust=await silentTrust(sess.question,content,sess.subject||subject);
      if(trust&&trust.hallucinationRisk>30){
        setSessions(p=>p.map(s=>{
          if(s.id!==activeId) return s;
          const msgs=[...s.messages]; const last=msgs.length-1;
          if(msgs[last]?.role==="assistant"&&(msgs[last] as any).type==="eval") msgs[last]={...msgs[last],trust} as any;
          return {...s,messages:msgs};
        }));
      }
    } finally{setLoading(false);setLoadingLabel("");}
  }

  const activeAnalytics = activeSub?analytics[activeSub]:null;
  const sessChips = chips(session.phase, session.lastResult);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const SB_W = sidebarOpen ? 240 : 0;

  return (
    <div style={{display:"flex",height:"100vh",background:"#0a0a0a",color:"#e5e5e5",fontFamily:"var(--font-geist-sans,sans-serif)",overflow:"hidden"}}>

      {/* ── Sidebar ── */}
      <div style={{width:SB_W,flexShrink:0,borderRight:"0.5px solid #161616",display:"flex",flexDirection:"column",overflow:"hidden",transition:"width 0.2s ease",background:"#080808"}}>
        {sidebarOpen && (
          <>
            {/* Logo + new */}
            <div style={{padding:"14px 12px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"0.5px solid #111"}}>
              <span style={{fontSize:14,fontWeight:600,letterSpacing:"-0.01em",color:"#e5e5e5"}}>iStudy AI</span>
              <button onClick={startNew} title="New chat" style={{width:28,height:28,borderRadius:8,background:"transparent",border:"0.5px solid #222",color:"#666",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>

            {/* Nav items */}
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

            {/* Subject pills */}
            <div style={{marginTop:"auto",padding:"10px 10px 14px",borderTop:"0.5px solid #111"}}>
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

      {/* ── Main ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Top bar */}
        <div style={{display:"flex",alignItems:"center",padding:"0 16px",height:44,borderBottom:"0.5px solid #111",flexShrink:0,gap:10}}>
          <button onClick={()=>setSidebarOpen(p=>!p)} style={{width:28,height:28,borderRadius:6,background:"transparent",border:"none",color:"#444",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
            ☰
          </button>
          <span style={{fontSize:13,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
            {view==="chat" ? (session.question?session.question.slice(0,60)+"…":"New chat") : view==="analytics"?"Analytics":"History"}
          </span>
          {view==="chat" && session.subject && (
            <span style={{fontSize:11,background:"#1a1a2e",border:"0.5px solid #2a2a4a",color:"#818cf8",borderRadius:20,padding:"2px 10px",flexShrink:0}}>{session.subject}</span>
          )}
        </div>

        {/* ── Chat view ── */}
        {view==="chat" && (
          <>
            {/* Study mode picker */}
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 16px",borderBottom:"0.5px solid #0f0f0f",flexShrink:0}}>
              <StudyModePicker active={activeMode} onChange={setActiveMode} />
              {activeMode && (
                <span style={{fontSize:11,color:"#444"}}>
                  — next message uses {activeMode.replace("_"," ")} mode
                </span>
              )}
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",padding:"20px 20px",display:"flex",flexDirection:"column",gap:16}}>
              {session.messages.length===0 && (
                <div style={{margin:"auto",textAlign:"center",maxWidth:380,color:"#2a2a2a"}}>
                  <div style={{fontSize:32,marginBottom:12}}>📚</div>
                  <p style={{fontSize:14,color:"#444",marginBottom:4}}>Paste your exam question to get started.</p>
                  <p style={{fontSize:12,color:"#2a2a2a"}}>Select text in any reply to quote it.</p>
                </div>
              )}
              {session.messages.map((msg,i)=>{
                if(msg.role==="user") return (
                  <div key={i} style={{display:"flex",justifyContent:"flex-end"}}>
                    <div style={{maxWidth:"66%",background:"#1a1a2e",border:"0.5px solid #252545",borderRadius:"14px 14px 4px 14px",padding:"9px 13px",fontSize:14,lineHeight:1.6,color:"#d0d0e8",whiteSpace:"pre-wrap"}}>
                      {msg.imagePreview&&<img src={msg.imagePreview} alt="" style={{maxHeight:90,borderRadius:5,marginBottom:6,display:"block"}}/>}
                      {msg.content}
                    </div>
                  </div>
                );
                if(msg.role==="assistant"&&msg.type==="text") return (
                  <div key={i} style={{display:"flex",gap:8,maxWidth:"72%"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"#111",border:"0.5px solid #1e1e1e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginTop:2,color:"#555"}}>A</div>
                    <div style={{background:"#0f0f0f",border:"0.5px solid #161616",borderRadius:"4px 13px 13px 13px",padding:"9px 13px",fontSize:14,lineHeight:1.7,color:"#bbb",whiteSpace:"pre-wrap"}}>{msg.content}</div>
                  </div>
                );
                if(msg.role==="assistant"&&msg.type==="study") return (
                  <div key={i} style={{display:"flex",gap:8,maxWidth:"72%"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"#111",border:"0.5px solid #1e1e1e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginTop:2,color:"#555"}}>A</div>
                    <div style={{background:"#0d0d18",border:"0.5px solid #1a1a30",borderRadius:"4px 13px 13px 13px",padding:"10px 14px",fontSize:14,lineHeight:1.7,color:"#bbb",whiteSpace:"pre-wrap"}}>
                      <span style={{display:"inline-block",fontSize:10,background:"#1e1e3a",border:"0.5px solid #2e2e5a",color:"#818cf8",borderRadius:5,padding:"2px 7px",marginBottom:7}}>
                        {STUDY_MODES.find(m=>m.key===msg.mode)?.icon} {STUDY_MODES.find(m=>m.key===msg.mode)?.label}
                      </span>
                      <div>{msg.content}</div>
                    </div>
                  </div>
                );
                if(msg.role==="assistant"&&msg.type==="eval") {
                  const r=msg.result;
                  return (
                    <div key={i} style={{display:"flex",gap:8}}>
                      <div style={{width:24,height:24,borderRadius:"50%",background:"#111",border:"0.5px solid #1e1e1e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginTop:2,color:"#555"}}>A</div>
                      <div style={{flex:1,display:"flex",flexDirection:"column",gap:9}}>
                        {/* Score card */}
                        <div style={{background:"#0f0f0f",border:"0.5px solid #161616",borderRadius:12,padding:"14px 16px"}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:12}}>
                            <div>
                              <div style={{fontSize:10,color:"#444",marginBottom:3}}>{r.subject}</div>
                              <div style={{fontSize:30,fontWeight:700,letterSpacing:"-0.03em"}}>{r.estimatedScore}</div>
                            </div>
                            <div style={{fontSize:12,color:"#666",lineHeight:1.6,maxWidth:380}}>{r.overallCritique}</div>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:7}}>
                            {(["knowledge","application","analysis","evaluation"] as const).map(key=>(
                              <div key={key} style={{background:"#0a0a0a",border:"0.5px solid #141414",borderRadius:9,padding:"9px 10px"}}>
                                <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{key}</div>
                                <div style={{fontSize:20,fontWeight:700,color:sc(r.breakdown[key].score)}}>{r.breakdown[key].score}/5</div>
                                <div style={{marginTop:4,height:2,background:"#161616",borderRadius:1}}>
                                  <div style={{height:"100%",borderRadius:1,background:sc(r.breakdown[key].score),width:`${(r.breakdown[key].score/5)*100}%`}}/>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Annotations */}
                        {r.annotations?.length>0&&(
                          <div style={{background:"#0c0c07",border:"0.5px solid #1e1e00",borderRadius:10,padding:"10px 13px"}}>
                            <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:7}}>Annotated answer</div>
                            <AnnotationOverlay text={msg.answer} annotations={r.annotations}/>
                          </div>
                        )}
                        {/* Improvements */}
                        {r.improvements?.length>0&&(
                          <div style={{background:"#0d0d0d",border:"0.5px solid #141414",borderRadius:10,padding:"10px 13px",display:"flex",flexDirection:"column",gap:7}}>
                            <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:1}}>How to improve</div>
                            {r.improvements.map((imp,j)=>(
                              <div key={j} style={{background:"#0a0a0a",border:"0.5px solid #141414",borderRadius:8,padding:"8px 10px"}}>
                                <div style={{fontSize:9,color:"#60a5fa",textTransform:"uppercase",marginBottom:2}}>{imp.category}</div>
                                <div style={{fontSize:12,color:"#f87171",marginBottom:2}}>⚠ {imp.defect}</div>
                                <div style={{fontSize:12,color:"#4ade80"}}>✓ {imp.fix}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Citations */}
                        {r.citations&&r.citations.length>0&&(
                          <div style={{background:"#0d0d0d",border:"0.5px solid #141414",borderRadius:10,padding:"10px 13px",display:"flex",flexDirection:"column",gap:5}}>
                            <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:1}}>Sources</div>
                            {r.citations.map((c,j)=>(
                              <div key={j} style={{background:"#0a0a0a",border:"0.5px solid #141414",borderRadius:8,padding:"7px 10px"}}>
                                <div style={{fontSize:12,color:"#bbb"}}>"{c.claim}"</div>
                                <div style={{fontSize:10,color:"#60a5fa",marginTop:2}}>📚 {c.source}</div>
                                <div style={{fontSize:10,color:"#333",marginTop:1}}>{c.reference}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Trust */}
                        {msg.trust&&msg.trust.hallucinationRisk>30&&(
                          <div style={{display:"flex",alignItems:"flex-start",gap:7,background:"#130f00",border:"0.5px solid #2a1e00",borderRadius:9,padding:"8px 12px"}}>
                            <span>⚠️</span>
                            <div>
                              <div style={{fontSize:11,color:"#facc15",fontWeight:500,marginBottom:1}}>Reliability flagged</div>
                              <div style={{fontSize:11,color:"#777"}}>{msg.trust.summary}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
              {loading&&(
                <div style={{display:"flex",gap:8,maxWidth:"72%"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:"#111",border:"0.5px solid #1e1e1e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,color:"#555"}}>A</div>
                  <div style={{background:"#0f0f0f",border:"0.5px solid #161616",borderRadius:"4px 13px 13px 13px",padding:"9px 13px",display:"flex",alignItems:"center",gap:7}}>
                    <span style={{fontSize:11,color:"#444"}}>{loadingLabel||"Thinking..."}</span>
                    <span style={{display:"inline-flex",gap:3}}>{[0,1,2].map(d=><span key={d} style={{width:3,height:3,borderRadius:"50%",background:"#333",animation:`pulse 1.2s ${d*0.2}s infinite`}}/>)}</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Chips */}
            {sessChips.length>0&&!loading&&(
              <div style={{padding:"7px 16px",display:"flex",gap:5,flexWrap:"wrap",borderTop:"0.5px solid #0f0f0f",flexShrink:0}}>
                {sessChips.map(chip=>(
                  <button key={chip} onClick={()=>send(chip)} style={{padding:"4px 12px",borderRadius:20,fontSize:12,cursor:"pointer",background:"transparent",border:"0.5px solid #1a1a1a",color:"#555",transition:"all 0.12s",fontFamily:"inherit"}}
                    onMouseEnter={e=>{(e.currentTarget).style.borderColor="#2a2a3a";(e.currentTarget).style.color="#999";}}
                    onMouseLeave={e=>{(e.currentTarget).style.borderColor="#1a1a1a";(e.currentTarget).style.color="#555";}}>
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Error */}
            {error&&<div style={{margin:"0 16px 5px",background:"#130505",border:"0.5px solid #2a0a0a",borderRadius:7,padding:"6px 11px",fontSize:12,color:"#f87171",flexShrink:0}}>{error}</div>}

            {/* Input */}
            <div style={{padding:"9px 16px 14px",borderTop:"0.5px solid #0f0f0f",background:"#0a0a0a",flexShrink:0}}>
              {imagePreview&&(
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7,padding:"5px 9px",background:"#0f0f0f",border:"0.5px solid #161616",borderRadius:7}}>
                  <img src={imagePreview} alt="" style={{height:36,borderRadius:4,objectFit:"cover"}}/>
                  <select value={ocrTarget} onChange={e=>setOcrTarget(e.target.value as any)} style={{background:"#0a0a0a",border:"0.5px solid #1e1e1e",borderRadius:5,padding:"2px 6px",fontSize:11,color:"#777",fontFamily:"inherit"}}>
                    <option value="answer">→ Answer</option><option value="question">→ Question</option>
                  </select>
                  <button onClick={runOCR} disabled={loading} style={{padding:"2px 9px",borderRadius:5,fontSize:11,background:"#1e1b4b",border:"none",color:"#a5b4fc",cursor:"pointer",fontFamily:"inherit"}}>Extract</button>
                  <button onClick={()=>{setImageFile(null);setImagePreview(null);}} style={{padding:"2px 7px",borderRadius:5,fontSize:11,background:"transparent",border:"0.5px solid #1e1e1e",color:"#444",cursor:"pointer",fontFamily:"inherit"}}>✕</button>
                </div>
              )}
              <div style={{display:"flex",gap:7,alignItems:"flex-end",background:"#0f0f0f",border:"0.5px solid #161616",borderRadius:11,padding:"7px 7px 7px 11px"}}>
                <button onClick={()=>fileRef.current?.click()} style={{padding:"4px 6px",borderRadius:6,background:"transparent",border:"0.5px solid #161616",color:"#333",cursor:"pointer",fontSize:14,flexShrink:0,alignSelf:"flex-end",marginBottom:1}}>📎</button>
                <input ref={fileRef} type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;setImageFile(f);setImagePreview(URL.createObjectURL(f));}} style={{display:"none"}}/>
                <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
                  placeholder={!session.question?"Paste your exam question...":session.phase==="has_question"?"Paste your answer to evaluate...":"Ask a follow-up..."}
                  rows={1} style={{flex:1,background:"transparent",border:"none",outline:"none",resize:"none",fontSize:13,color:"#e5e5e5",lineHeight:1.6,fontFamily:"inherit",maxHeight:130,overflowY:"auto"}}
                  onInput={e=>{const t=e.target as HTMLTextAreaElement;t.style.height="auto";t.style.height=Math.min(t.scrollHeight,130)+"px";}}/>
                <button onClick={()=>send()} disabled={loading||!input.trim()}
                  style={{padding:"5px 13px",borderRadius:8,fontSize:12,fontWeight:500,cursor:"pointer",flexShrink:0,alignSelf:"flex-end",border:"none",transition:"all 0.12s",fontFamily:"inherit",
                    background:input.trim()&&!loading?"#4f46e5":"#111",color:input.trim()&&!loading?"#fff":"#333"}}>
                  Send
                </button>
              </div>
              <div style={{marginTop:4,fontSize:10,color:"#222",textAlign:"center"}}>Enter to send · Shift+Enter for newline · Select text to quote</div>
            </div>
          </>
        )}

        {/* ── Analytics view ── */}
        {view==="analytics"&&(
          <div style={{flex:1,overflowY:"auto",padding:"20px 20px"}}>
            {!analyticsLoaded&&<p style={{color:"#444",fontSize:13}}>Loading...</p>}
            {analyticsLoaded&&Object.keys(analytics).length===0&&(
              <div style={{maxWidth:340,margin:"60px auto",textAlign:"center",color:"#333"}}>
                <div style={{fontSize:32,marginBottom:12}}>📊</div>
                <p style={{fontSize:13}}>No data yet. Complete some evaluations first.</p>
                <button onClick={()=>setView("chat")} style={{marginTop:14,padding:"7px 18px",borderRadius:9,background:"#1e1b4b",border:"none",color:"#a5b4fc",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Start evaluating</button>
              </div>
            )}
            {analyticsLoaded&&Object.keys(analytics).length>0&&(
              <div style={{display:"flex",gap:18,maxWidth:800,margin:"0 auto"}}>
                <div style={{display:"flex",flexDirection:"column",gap:4,width:150,flexShrink:0}}>
                  {Object.keys(analytics).map(s=>(
                    <button key={s} onClick={()=>setActiveSub(s)} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",borderRadius:9,fontSize:12,cursor:"pointer",textAlign:"left",transition:"all 0.12s",fontFamily:"inherit",
                      background:activeSub===s?"#1a1a2e":"transparent",border:`0.5px solid ${activeSub===s?"#2a2a4a":"#111"}`,color:activeSub===s?"#93c5fd":"#555"}}>
                      <span>{SUBJECT_ICONS[s]||"📚"}</span>
                      <div><div style={{fontWeight:500,textTransform:"capitalize",fontSize:11}}>{s}</div><div style={{fontSize:9,color:"#333"}}>{analytics[s].sessions} sessions</div></div>
                    </button>
                  ))}
                </div>
                {activeAnalytics&&activeSub&&(
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:12}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
                      {[
                        {label:"Sessions",value:activeAnalytics.sessions,color:"#e5e5e5",sub:null},
                        {label:"Strongest",value:Object.entries(activeAnalytics.averages).sort((a,b)=>b[1]-a[1])[0][0],color:"#4ade80",sub:`${Object.entries(activeAnalytics.averages).sort((a,b)=>b[1]-a[1])[0][1]}/5`},
                        {label:"Needs work",value:Object.entries(activeAnalytics.averages).sort((a,b)=>a[1]-b[1])[0][0],color:"#f87171",sub:`${Object.entries(activeAnalytics.averages).sort((a,b)=>a[1]-b[1])[0][1]}/5`},
                      ].map(card=>(
                        <div key={card.label} style={{background:"#0f0f0f",border:"0.5px solid #141414",borderRadius:11,padding:"12px 14px"}}>
                          <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{card.label}</div>
                          <div style={{fontSize:20,fontWeight:700,color:card.color,textTransform:"capitalize"}}>{card.value}</div>
                          {card.sub&&<div style={{fontSize:10,color:"#444",marginTop:1}}>{card.sub} avg</div>}
                        </div>
                      ))}
                    </div>
                    <div style={{background:"#0f0f0f",border:"0.5px solid #141414",borderRadius:11,padding:"14px"}}>
                      <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Capability radar</div>
                      <ResponsiveContainer width="100%" height={180}>
                        <RadarChart data={[{axis:"Knowledge",score:activeAnalytics.averages.knowledge},{axis:"Application",score:activeAnalytics.averages.application},{axis:"Analysis",score:activeAnalytics.averages.analysis},{axis:"Evaluation",score:activeAnalytics.averages.evaluation}]}>
                          <PolarGrid stroke="#161616"/><PolarAngleAxis dataKey="axis" tick={{fill:"#555",fontSize:10}}/>
                          <Radar dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.18} dot={{fill:"#818cf8",r:3}}/>
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{background:"#0f0f0f",border:"0.5px solid #141414",borderRadius:11,padding:"12px 14px"}}>
                      <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>Avg scores</div>
                      {(["knowledge","application","analysis","evaluation"] as const).map(key=>(
                        <div key={key} style={{marginBottom:9}}>
                          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#555",marginBottom:3}}>
                            <span style={{textTransform:"capitalize"}}>{key}</span><span style={{color:LAYER_COLORS[key]}}>{activeAnalytics.averages[key]}/5</span>
                          </div>
                          <div style={{height:3,background:"#141414",borderRadius:2}}>
                            <div style={{height:"100%",borderRadius:2,background:LAYER_COLORS[key],width:`${(activeAnalytics.averages[key]/5)*100}%`,transition:"width 0.5s ease"}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    {activeAnalytics.recentDefects.length>0&&(
                      <div style={{background:"#0f0f0f",border:"0.5px solid #141414",borderRadius:11,padding:"12px 14px"}}>
                        <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:9}}>Recurring weaknesses</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                          {[...new Set(activeAnalytics.recentDefects)].map((d,i)=>(
                            <span key={i} style={{fontSize:11,background:"#130505",border:"0.5px solid #2a0a0a",color:"#f87171",borderRadius:20,padding:"2px 10px"}}>{d}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── History view ── */}
        {view==="history"&&(
          <div style={{flex:1,overflowY:"auto",padding:"20px 20px"}}>
            <div style={{maxWidth:680,margin:"0 auto"}}>
              {historyItems.length>0&&(
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
                  <button onClick={async()=>{await fetch("/api/history/clear",{method:"POST"});setHistoryItems([]);}} style={{padding:"4px 11px",borderRadius:7,fontSize:11,background:"transparent",border:"0.5px solid #2a0a0a",color:"#f87171",cursor:"pointer",fontFamily:"inherit"}}>Clear all</button>
                </div>
              )}
              {!historyLoaded&&<p style={{color:"#444",fontSize:13}}>Loading...</p>}
              {historyLoaded&&historyItems.length===0&&(
                <div style={{textAlign:"center",color:"#333",marginTop:60}}>
                  <div style={{fontSize:32,marginBottom:12}}>📭</div>
                  <p style={{fontSize:13}}>No evaluations yet.</p>
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {historyItems.map(item=>(
                  <div key={item.id} style={{background:"#0f0f0f",border:"0.5px solid #141414",borderRadius:11,padding:"12px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7,flexWrap:"wrap"}}>
                      {item.subject&&<span style={{fontSize:10,background:"#1a1a2e",border:"0.5px solid #252545",color:"#818cf8",borderRadius:20,padding:"2px 9px"}}>{item.subject}</span>}
                      {item.result?.estimatedScore&&<span style={{fontSize:12,fontWeight:700,color:"#4ade80"}}>{item.result.estimatedScore}</span>}
                      <span style={{fontSize:10,color:"#2a2a2a",marginLeft:"auto"}}>{new Date(item.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                    <p style={{fontSize:12,color:"#bbb",margin:"0 0 5px",lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as any}}>{item.question}</p>
                    {item.result?.overallCritique&&<p style={{fontSize:11,color:"#444",lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as any}}>{item.result.overallCritique}</p>}
                    {item.result?.breakdown&&(
                      <div style={{display:"flex",gap:7,marginTop:9}}>
                        {(["knowledge","application","analysis","evaluation"] as const).map(key=>(
                          <div key={key} style={{flex:1}}>
                            <div style={{fontSize:8,color:"#2a2a2a",marginBottom:2,textTransform:"uppercase"}}>{key.slice(0,2)}</div>
                            <div style={{height:2,background:"#141414",borderRadius:1}}><div style={{height:"100%",borderRadius:1,background:sc(item.result.breakdown![key].score),width:`${(item.result.breakdown![key].score/5)*100}%`}}/></div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={()=>{setHistoryItems(p=>p.filter(h=>h.id!==item.id));fetch(`/api/history/${item.id}`,{method:"DELETE"});}} style={{marginTop:9,padding:"3px 9px",borderRadius:5,fontSize:10,background:"transparent",border:"0.5px solid #1a0505",color:"#f87171",cursor:"pointer",fontFamily:"inherit"}}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:.15}50%{opacity:.7}}`}</style>
    </div>
  );
}
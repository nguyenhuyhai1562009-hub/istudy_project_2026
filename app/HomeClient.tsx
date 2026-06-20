"use client";



import { useState, useRef, useEffect, useCallback } from "react";
import AnnotationOverlay from "../components/AnnotationOverlay";
import { useWalrusStorage } from "../hooks/useWalrusStorage";
import StudyModePicker from "../components/StudyModePicker";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
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
  | { role: "assistant"; type: "eval"; result: EvalResult; answer: string; trust?: TrustResult; imagePreview?: string }
  | { role: "assistant"; type: "study"; content: string; mode: string }
  | { role: "assistant"; type: "text"; content: string };
type Session = { id: string; title: string; subject: string; messages: Message[]; question: string; phase: "idle"|"has_question"|"has_eval"; lastResult?: EvalResult; aiChips?: string[]; createdAt: number };
type SubjectSummary = { sessions: number; averages: { knowledge: number; application: number; analysis: number; evaluation: number }; recentDefects: string[] };
type HistoryItem = { id: string; question: string; subject?: string; estimatedScore?: string; scores?: { knowledge: number; application: number; analysis: number; evaluation: number }; createdAt: string };

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

function chips(phase: "idle"|"has_question"|"has_eval", last?: EvalResult, aiChips?: string[]): string[] {
  if (phase==="idle") return [];
  if (phase==="has_question") return ["🔍 Explain the question","🧭 Guide me (Socratic)","🎯 Mark scheme breakdown"];
  if (aiChips && aiChips.length>0) return [...aiChips, "📎 Submit a new answer"];
  const w = last ? Object.entries(last.breakdown).sort((a,b)=>a[1].score-b[1].score)[0][0] : "Evaluation";
  return [`💡 Why is my ${w} score low?`,"📝 Show a model answer","🔁 Give me a similar question","📎 Submit a new answer"];
}

async function silentTrust(q:string,a:string,s:string): Promise<TrustResult|null> {
  try { const r=await fetch("/api/trust",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q,answer:a,subject:s})}); return r.ok?r.json():null; } catch{return null;}
}

function newSession(): Session {
  return { id: Date.now().toString(), title:"New chat", subject:"Economics", messages:[], question:"", phase:"idle", createdAt: Date.now() };
}

// ── Markdown renderer (no extra deps) ────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  const inlineFormat = (line: string, key: string | number) => {
    // Split on **bold**, *italic*, `code`
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return (
      <span key={key}>
        {parts.map((p, i) => {
          if (p.startsWith("**") && p.endsWith("**"))
            return <strong key={i} style={{color:"#e5e5e5",fontWeight:600}}>{p.slice(2,-2)}</strong>;
          if (p.startsWith("*") && p.endsWith("*"))
            return <em key={i} style={{color:"#c4b5fd"}}>{p.slice(1,-1)}</em>;
          if (p.startsWith("`") && p.endsWith("`"))
            return <code key={i} style={{background:"#1e1e2e",color:"#a5f3fc",borderRadius:4,padding:"1px 5px",fontSize:"0.9em",fontFamily:"monospace"}}>{p.slice(1,-1)}</code>;
          return p;
        })}
      </span>
    );
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") { elements.push(<br key={`br-${i}`}/>); i++; continue; }

    // Bullet list
    if (/^[-*•]\s/.test(line.trim())) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i].trim())) {
        listItems.push(<li key={i} style={{marginBottom:3}}>{inlineFormat(lines[i].trim().slice(2), i)}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} style={{paddingLeft:18,margin:"4px 0",color:"#bbb"}}>{listItems}</ul>);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(<li key={i} style={{marginBottom:3}}>{inlineFormat(lines[i].trim().replace(/^\d+\.\s/,""), i)}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} style={{paddingLeft:18,margin:"4px 0",color:"#bbb"}}>{listItems}</ol>);
      continue;
    }

    // Heading
    if (line.startsWith("### ")) { elements.push(<div key={i} style={{fontSize:13,fontWeight:600,color:"#c4b5fd",margin:"8px 0 3px"}}>{line.slice(4)}</div>); i++; continue; }
    if (line.startsWith("## "))  { elements.push(<div key={i} style={{fontSize:14,fontWeight:700,color:"#a5b4fc",margin:"10px 0 4px"}}>{line.slice(3)}</div>); i++; continue; }
    if (line.startsWith("# "))   { elements.push(<div key={i} style={{fontSize:15,fontWeight:700,color:"#818cf8",margin:"10px 0 4px"}}>{line.slice(2)}</div>); i++; continue; }

    // Normal line
    elements.push(<div key={i} style={{lineHeight:1.7}}>{inlineFormat(line, i)}</div>);
    i++;
  }

  return <>{elements}</>;
}

// ── ScoreCards ────────────────────────────────────────────────────────────────
function ScoreCards({ breakdown }: { breakdown: Record<string, Breakdown> }) {
  const [expanded, setExpanded] = useState<string|null>(null);
  const sc2 = (s:number) => s>=4?"#4ade80":s>=3?"#facc15":"#f87171";
  const labels: Record<string,string[]> = {
    knowledge: ["Definitions","Key concepts","Accurate terminology","Theories cited"],
    application: ["Context used","Real-world link","Data applied","Case relevance"],
    analysis: ["Cause-effect chains","Logical links","Multi-step reasoning","Counter-mechanisms"],
    evaluation: ["Counter-arguments","Weighted judgment","Final conclusion","Nuanced stance"],
  };
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:7}}>
      {(["knowledge","application","analysis","evaluation"] as const).map(key=>(
        <div key={key} onClick={()=>setExpanded(expanded===key?null:key)}
          style={{background:"#0a0a0a",border:`0.5px solid ${expanded===key?"#2a2a4a":"#141414"}`,borderRadius:9,padding:"9px 10px",cursor:"pointer",transition:"all 0.15s",position:"relative"}}>
          <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{key}</div>
          <div style={{fontSize:20,fontWeight:700,color:sc2(breakdown[key].score)}}>{breakdown[key].score}/5</div>
          <div style={{marginTop:4,height:2,background:"#161616",borderRadius:1}}>
            <div style={{height:"100%",borderRadius:1,background:sc2(breakdown[key].score),width:`${(breakdown[key].score/5)*100}%`}}/>
          </div>
          {expanded===key&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#0f0f1a",border:"0.5px solid #2a2a4a",borderRadius:9,padding:"10px 12px",zIndex:20,minWidth:180}}>
              <div style={{fontSize:10,color:"#818cf8",marginBottom:6,fontWeight:500,textTransform:"capitalize"}}>{key} — {breakdown[key].score}/5</div>
              <div style={{fontSize:11,color:"#777",lineHeight:1.6,marginBottom:6}}>{breakdown[key].feedback}</div>
              <div style={{fontSize:10,color:"#555",marginBottom:4}}>Missing elements:</div>
              {labels[key].map((l,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                  <span style={{color:breakdown[key].score>=4?"#4ade80":"#f87171",fontSize:10}}>{breakdown[key].score>=4?"✓":"✗"}</span>
                  <span style={{fontSize:11,color:breakdown[key].score>=4?"#555":"#888"}}>{l}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── HoverCard with glow ───────────────────────────────────────────────────────
function HoverCard({ label, value, color, sub, tooltip, glowColor }: {
  label:string; value:string|number; color:string; sub?:string; tooltip?:string; glowColor?:string
}) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{
        position:"relative", background:"#0f0f0f", borderRadius:11, padding:"12px 14px",
        cursor:tooltip?"help":"default", animation:"fadeIn 0.35s ease",
        transition:"transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
        transform: hover ? "translateY(-2px)" : "none",
        border: hover
          ? `0.5px solid ${glowColor || "#2a2a4a"}`
          : `0.5px solid ${glowColor ? glowColor+"55" : "#141414"}`,
        boxShadow: hover && glowColor
          ? `0 0 14px ${glowColor}44, 0 0 4px ${glowColor}22`
          : "none",
      }}>
      <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5}}>{label}</div>
      <div style={{fontSize:20,fontWeight:700,color,textTransform:"capitalize"}}>{value}</div>
      {sub&&<div style={{fontSize:10,color:"#444",marginTop:1}}>{sub} avg</div>}
      {hover&&tooltip&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#13131f",border:"0.5px solid #2a2a4a",borderRadius:9,padding:"9px 11px",fontSize:11,color:"#bbb",lineHeight:1.5,zIndex:30,boxShadow:"0 6px 20px rgba(0,0,0,0.5)"}}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

function HoverChip({ label, color, tooltip }: { label:string; color:string; tooltip?:string }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} style={{position:"relative"}}>
      <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#0a0a0a",border:`0.5px solid ${color}33`,color,textTransform:"capitalize",cursor:tooltip?"help":"default"}}>
        {label}
      </span>
      {hover&&tooltip&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,width:200,background:"#13131f",border:"0.5px solid #2a2a4a",borderRadius:9,padding:"9px 11px",fontSize:11,color:"#bbb",lineHeight:1.5,zIndex:30,boxShadow:"0 6px 20px rgba(0,0,0,0.5)"}}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ── ProgressTrend ─────────────────────────────────────────────────────────────
function ProgressTrend({ subject, fetchHistory }: { subject: string; fetchHistory: () => Promise<any[]> }) {
  const [points, setPoints] = useState<{ date: string; score: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSubjectRef = useRef<string>("");

  useEffect(() => {
    if (lastSubjectRef.current === subject) return;
    lastSubjectRef.current = subject;
    setLoading(true);
    fetchHistory().then(records => {
      const filtered = records
        .filter(r => r.subject?.toLowerCase() === subject.toLowerCase())
        .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((r, i) => {
          const total = (r.scores?.knowledge||0)+(r.scores?.application||0)+(r.scores?.analysis||0)+(r.scores?.evaluation||0);
          return { date: `#${i+1}`, score: Math.round((total/20)*100) };
        });
      setPoints(filtered);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [subject]);

  const trend = points && points.length >= 2
    ? Math.round(((points[points.length-1].score - points[0].score) / Math.max(1, points[0].score)) * 100)
    : null;

  return (
    <div style={{
      background:"linear-gradient(135deg, #14122a 0%, #0d0d1a 60%, #0a0a12 100%)",
      border:"0.5px solid #2a2860", borderRadius:13, padding:"16px 18px",
      boxShadow:"0 4px 24px rgba(79,70,229,0.1)",
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <span style={{fontSize:11,color:"#a5b4fc",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Progress Trend</span>
        {trend !== null && (
          <span style={{fontSize:11,fontWeight:600,color: trend>=0 ? "#4ade80" : "#f87171", display:"flex",alignItems:"center",gap:3}}>
            {trend>=0 ? "↗" : "↘"} {trend>=0?"+":""}{trend}%
          </span>
        )}
      </div>
      {loading && (
        <div style={{height:90,borderRadius:8,background:"linear-gradient(90deg,#161430,#1e1c40,#161430)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/>
      )}
      {!loading && (!points || points.length < 2) && (
        <div style={{height:90,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#444"}}>
          Need at least 2 sessions to show trend
        </div>
      )}
      {!loading && points && points.length >= 2 && (
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={points} margin={{top:6,right:6,bottom:0,left:-24}}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#818cf8"/>
                <stop offset="100%" stopColor="#c084fc"/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{fill:"#444",fontSize:9}} axisLine={false} tickLine={false}/>
            <YAxis hide domain={[0,100]}/>
            <Tooltip contentStyle={{background:"#13131f",border:"0.5px solid #2a2a4a",borderRadius:8,fontSize:11}} labelStyle={{color:"#888"}} itemStyle={{color:"#c4b5fd"}}/>
            <Line type="monotone" dataKey="score" stroke="url(#trendGradient)" strokeWidth={2.5} dot={{fill:"#a78bfa",r:3}} activeDot={{r:5}}/>
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── OverallAssessmentSection ──────────────────────────────────────────────────
function OverallAssessmentSection({ subject, averages, sessions, recentDefects }: {
  subject: string;
  averages: { knowledge: number; application: number; analysis: number; evaluation: number };
  sessions: number;
  recentDefects: string[];
}) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const cacheKey = `assess-${subject}-${sessions}-${JSON.stringify(averages)}`;
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (lastKeyRef.current === cacheKey) return;
    lastKeyRef.current = cacheKey;
    setLoading(true);
    fetch("/api/analytics-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, averages, sessions, recentDefects }),
    })
      .then(r => r.json())
      .then(d => { if (d.overallAssessment) setText(d.overallAssessment); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cacheKey]);

  return (
    <div style={{
      background:"linear-gradient(145deg, #161330 0%, #100e22 45%, #0a0a14 100%)",
      border:"0.5px solid #2a2860", borderRadius:14, padding:"18px 20px",
      boxShadow:"0 4px 28px rgba(99,80,230,0.12)",
      animation: "fadeIn 0.4s ease",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:11}}>
        <span style={{fontSize:13}}>📋</span>
        <span style={{
          fontSize:11,color:"#a5b4fc",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",
          textDecoration:"underline",textDecorationColor:"#4f46e5",textUnderlineOffset:4,textDecorationThickness:1.5,
        }}>Overall Assessment</span>
      </div>
      {loading&&!text&&(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[100,92,76].map((w,i)=>(
            <div key={i} style={{height:11,borderRadius:4,width:`${w}%`,background:"linear-gradient(90deg,#1a1a2e,#22223e,#1a1a2e)",backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/>
          ))}
        </div>
      )}
      {text&&<div style={{fontSize:13,color:"#d4d4e8",lineHeight:1.85}}>{renderMarkdown(text)}</div>}
    </div>
  );
}

// ── SideItem ──────────────────────────────────────────────────────────────────
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

// ── AnalyticsInsight ──────────────────────────────────────────────────────────
const METHOD_ICONS: Record<string,string> = {
  "Flashcards": "🗂️", "Timed Essays": "⏱️", "Socratic Questions": "🧭", "Mind Mapping": "🕸️", "Teach-back Method": "🎤",
};

type AnalyticsInsightData = {
  overallStatement: string;
  learnerProfile: string;
  overallAssessment: string;
  learningMethod: { type: string; reason: string };
  categoryInsights: { knowledge: string; application: string; analysis: string; evaluation: string };
};

function AnalyticsInsight({ subject, averages, sessions, recentDefects, onLoaded }: {
  subject: string;
  averages: { knowledge: number; application: number; analysis: number; evaluation: number };
  sessions: number;
  recentDefects: string[];
  onLoaded?: (d: AnalyticsInsightData) => void;
}) {
  const [insight, setInsight] = useState<AnalyticsInsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheKey = `${subject}-${sessions}-${JSON.stringify(averages)}`;
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (lastKeyRef.current === cacheKey) return;
    lastKeyRef.current = cacheKey;
    setLoading(true);
    fetch("/api/analytics-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, averages, sessions, recentDefects }),
    })
      .then(r => r.json())
      .then(d => { if (d.overallStatement) { setInsight(d); onLoaded?.(d); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cacheKey]);

  if (loading && !insight) return (
    <div style={{background:"linear-gradient(135deg,#0f0f1a,#0a0a0a)",border:"0.5px solid #1e1e3a",borderRadius:13,padding:"14px 16px",fontSize:11,color:"#555"}}>
      Generating learner profile...
    </div>
  );
  if (!insight) return null;

  return (
    <div style={{
      background:"linear-gradient(135deg, #14122a 0%, #0d0d1a 60%, #0a0a12 100%)",
      border:"0.5px solid #2a2860", borderRadius:13, padding:"16px 18px",
      display:"flex", flexDirection:"column", gap:12,
      boxShadow:"0 4px 24px rgba(79,70,229,0.1)",
    }}>
      {/* Overall Statement */}
      <div>
        <div style={{fontSize:9,color:"#6b6b9e",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Overall statement</div>
        <p style={{
          fontSize:12.5, color:"#c8c8e8", lineHeight:1.65, margin:0,
          textDecoration:"underline",
          textDecorationColor:"#4f46e566",
          textUnderlineOffset:"3px",
          textDecorationThickness:"1px",
        }}>{insight.overallStatement}</p>
      </div>

      {/* Learner Profile */}
      <div style={{borderTop:"0.5px solid #2a2860",paddingTop:12}}>
        <div style={{fontSize:9,color:"#6b6b9e",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Learner Profile</div>
        <p style={{fontSize:12.5,color:"#c8c8e8",lineHeight:1.65,margin:0,fontStyle:"italic"}}>{insight.learnerProfile}</p>
      </div>

      {/* Learning Method */}
      <div style={{borderTop:"0.5px solid #2a2860",paddingTop:12,display:"flex",gap:10,alignItems:"flex-start"}}>
        <div style={{
          width:36,height:36,borderRadius:10,flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
          background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
          boxShadow:"0 2px 12px rgba(124,58,237,0.4)",
        }}>
          {METHOD_ICONS[insight.learningMethod.type] || "🎯"}
        </div>
        <div>
          <div style={{fontSize:9,color:"#6b6b9e",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:3}}>Recommended Method</div>
          <div style={{fontSize:12,color:"#c4b5fd",fontWeight:600,marginBottom:3}}>{insight.learningMethod.type}</div>
          <div style={{fontSize:11,color:"#777",lineHeight:1.5}}>{insight.learningMethod.reason}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const address: string | null = null;
  const { saveRecord, fetchAnalytics, fetchHistory } = useWalrusStorage();
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
  const [categoryInsights, setCategoryInsights] = useState<{knowledge:string;application:string;analysis:string;evaluation:string}|null>(null);

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
    if(view==="analytics"&&!analyticsLoaded){ fetchAnalytics().then(d=>{setAnalytics(d);const f=Object.keys(d)[0];if(f)setActiveSub(f);setAnalyticsLoaded(true);}); }
    if(view==="history"&&!historyLoaded){
      fetchHistory().then(records=>{
        const items: HistoryItem[] = records.map((r,i)=>({
          id: r.createdAt + "-" + i,
          question: r.question,
          subject: r.subject,
          estimatedScore: r.estimatedScore,
          scores: r.scores,
          createdAt: r.createdAt,
        }));
        setHistoryItems(items);
        setHistoryLoaded(true);
      });
    }
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
      } else {
        setInput(data.text);
        setImageFile(null);
      }
      if(ocrTarget==="question"){ setImageFile(null); setImagePreview(null); }
    } catch{setError("OCR failed.");}
    finally{setLoading(false);setLoadingLabel("");}
  }

  async function send(text?:string) {
    const content=(text||input).trim(); if(!content) return;
    setInput(""); setError("");
    const attachedImage = imagePreview ?? undefined;
    addMsg(activeId,{role:"user",content,imagePreview:attachedImage});
    setImageFile(null); setImagePreview(null);

    const sess = sessions.find(s=>s.id===activeId)!;

    // First message — detect subject silently then evaluate
    if(!sess.question){
      const title = content.slice(0,42)+(content.length>42?"…":"");
      updateSession(activeId,{question:content,phase:"has_question",title});
      setLoading(true); setLoadingLabel("Detecting subject...");
      try {
        const dr=await fetch("/api/detect-subject",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:content})});
        const dd=await dr.json(); const det=dd.subject&&SUBJECTS.includes(dd.subject)?dd.subject:subject;
        setSubject(det); updateSession(activeId,{subject:det,question:content});
        setLoadingLabel(`${det} · A/AS Level detected`);
        await new Promise(r=>setTimeout(r,800));
        addMsg(activeId,{role:"assistant",type:"text",content:`📚 **${det}** detected.\n\nNow paste your answer and I'll evaluate it — or pick a study mode above to explore the question first.`});
      } finally{setLoading(false);setLoadingLabel("");}
      return;
    }

    // Reset to re-evaluate mode
    if(content==="📎 Submit a new answer"){
      updateSession(activeId,{phase:"has_question"});
      addMsg(activeId,{role:"assistant",type:"text",content:"Ready for your next answer — paste or upload it below."});
      setLoading(false);
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

    // If already evaluated → follow-up chat
    if(sess.phase==="has_eval"){
      setLoading(true); setLoadingLabel("Thinking...");
      try {
        const chatHistory = sess.messages
          .filter(m=>m.role==="user"||(m.role==="assistant"&&(m as any).type==="text"||(m as any).type==="study"))
          .slice(-6)
          .map(m=>({
            role: m.role as "user"|"assistant",
            content: m.role==="user"?(m as any).content:(m as any).content||"",
          }))
          .filter(m=>m.content);
        chatHistory.push({role:"user",content});
        const res=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({question:sess.question,subject:sess.subject||subject,messages:chatHistory,mode:activeMode||undefined})});
        const data=await res.json();
        if(!res.ok){setError(data.error||"Chat failed.");return;}

        if(data.isNewTopic){
          updateSession(activeId,{question:content,phase:"has_question"});
          addMsg(activeId,{role:"assistant",type:"text",content:data.text});
          const dr=await fetch("/api/detect-subject",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:content})});
          const dd=await dr.json();
          const det=dd.subject&&SUBJECTS.includes(dd.subject)?dd.subject:subject;
          setSubject(det); updateSession(activeId,{subject:det});
        } else {
          addMsg(activeId,{role:"assistant",type:"text",content:data.text});
        }
      } finally{setLoading(false);setLoadingLabel("");setActiveMode(null);}
      return;
    }

    // First answer → Evaluate
    setLoading(true); setLoadingLabel("Evaluating...");
    try {
      const res=await fetch("/api/evaluate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:sess.question,response1:content,response2:"",evaluator:"Gemini",subject:sess.subject||subject})});
      const data:EvalResult=await res.json();
      if(!res.ok){setError((data as any).error||"Evaluation failed.");return;}
      addMsg(activeId,{role:"assistant",type:"eval",result:data,answer:content,imagePreview:attachedImage});
      updateSession(activeId,{phase:"has_eval",lastResult:data});
      saveRecord(address,{
        subject:sess.subject||subject,
        question:sess.question,
        scores:{knowledge:data.breakdown.knowledge.score,application:data.breakdown.application.score,analysis:data.breakdown.analysis.score,evaluation:data.breakdown.evaluation.score},
        estimatedScore:data.estimatedScore,
        improvements:data.improvements,
        createdAt:new Date().toISOString(),
      });
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
      fetch("/api/suggest-chips",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({question:sess.question,subject:sess.subject||subject,breakdown:data.breakdown,overallCritique:data.overallCritique})})
        .then(r=>r.json()).then(d=>{ if(d.chips?.length>0) updateSession(activeId,{aiChips:d.chips}); })
        .catch(()=>{});
    } finally{setLoading(false);setLoadingLabel("");}
  }

  const activeAnalytics = activeSub?analytics[activeSub]:null;
  const sessChips = chips(session.phase, session.lastResult, session.aiChips);

  const SB_W = sidebarOpen ? 240 : 0;

  return (
    <div style={{
      display:"flex", height:"100vh",
      background:"linear-gradient(160deg,#0d0b1a 0%,#0a0a0f 40%,#080810 100%)",
      color:"#e5e5e5", fontFamily:"var(--font-geist-sans,sans-serif)", overflow:"hidden",
    }}>

      {/* ── Sidebar ── */}
      <div style={{
        width:SB_W, flexShrink:0, borderRight:"0.5px solid #161620",
        display:"flex", flexDirection:"column", overflow:"hidden",
        transition:"width 0.2s ease",
        background:"linear-gradient(180deg,#0e0c1c 0%,#090910 100%)",
      }}>
        {sidebarOpen && (
          <>
            <div style={{padding:"14px 12px 10px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"0.5px solid #111"}}>
              <span style={{fontSize:14,fontWeight:600,letterSpacing:"-0.01em",color:"#e5e5e5"}}>iStudy AI</span>
              <button onClick={startNew} title="New chat" style={{width:28,height:28,borderRadius:8,background:"transparent",border:"0.5px solid #222",color:"#666",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
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

            <div style={{padding:"10px 10px 6px",borderTop:"0.5px solid #111",marginTop:"auto",fontSize:11,color:"#333",textAlign:"center"}}>
              zkLogin (paused)
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

      {/* ── Main ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Top bar — slightly distinct from body */}
        <div style={{
          display:"flex", alignItems:"center", padding:"0 16px", height:44,
          background:"linear-gradient(90deg,#0f0d1f 0%,#0c0b18 100%)",
          borderBottom:"0.5px solid #1a1830", flexShrink:0, gap:10,
        }}>
          <button onClick={()=>setSidebarOpen(p=>!p)} style={{width:28,height:28,borderRadius:6,background:"transparent",border:"none",color:"#444",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>
            ☰
          </button>
          <span style={{fontSize:13,color:"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
            {view==="chat" ? (session.question?session.question.slice(0,60)+"…":"New chat") : view==="analytics"?"Analytics":"History"}
          </span>
          {view==="chat" && (
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <StudyModePicker active={activeMode} onChange={setActiveMode} />
              {activeMode && (
                <span style={{fontSize:11,color:"#444",whiteSpace:"nowrap"}}>
                  — {activeMode.replace("_"," ")} mode
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Chat view ── */}
        {view==="chat" && (
          <>

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
                    <div style={{background:"#0f0f0f",border:"0.5px solid #161616",borderRadius:"4px 13px 13px 13px",padding:"9px 13px",fontSize:14,color:"#bbb"}}>{renderMarkdown(msg.content)}</div>
                  </div>
                );
                if(msg.role==="assistant"&&msg.type==="study") return (
                  <div key={i} style={{display:"flex",gap:8,maxWidth:"72%"}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:"#111",border:"0.5px solid #1e1e1e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,flexShrink:0,marginTop:2,color:"#555"}}>A</div>
                    <div style={{background:"#0d0d18",border:"0.5px solid #1a1a30",borderRadius:"4px 13px 13px 13px",padding:"10px 14px",fontSize:14,lineHeight:1.7,color:"#bbb",whiteSpace:"pre-wrap"}}>
                      <span style={{display:"inline-block",fontSize:10,background:"#1e1e3a",border:"0.5px solid #2e2e5a",color:"#818cf8",borderRadius:5,padding:"2px 7px",marginBottom:7}}>
                        {STUDY_MODES.find(m=>m.key===msg.mode)?.icon} {STUDY_MODES.find(m=>m.key===msg.mode)?.label}
                      </span>
                      <div>{renderMarkdown(msg.content)}</div>
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
                            <div style={{fontSize:12,color:"#666",lineHeight:1.6,maxWidth:380}}>{renderMarkdown(r.overallCritique)}</div>
                          </div>
                          <ScoreCards breakdown={r.breakdown} />
                        </div>
                        {/* Annotations */}
                        {r.annotations?.length>0&&(
                          msg.imagePreview ? (
                            <div style={{background:"#0c0c07",border:"0.5px solid #1e1e00",borderRadius:10,padding:"10px 13px"}}>
                              <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Your answer vs annotations</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                                <div>
                                  <img src={msg.imagePreview} alt="Your answer" style={{width:"100%",borderRadius:8,border:"0.5px solid #222",display:"block"}}/>
                                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                                    {r.annotations.slice(0,3).map((a,j)=>(
                                      <span key={j} style={{fontSize:11,background:"#1a1500",border:"0.5px solid #3a2e00",color:"#facc15",borderRadius:6,padding:"2px 8px"}}>
                                        {"①②③"[j]} {a.keyword.slice(0,24)}{a.keyword.length>24?"...":""}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                                  {r.annotations.slice(0,3).map((a,j)=>(
                                    <div key={j} style={{background:"#0a0a0a",border:"0.5px solid #1e1e00",borderRadius:8,padding:"8px 10px"}}>
                                      <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:4}}>
                                        <span style={{fontSize:13,flexShrink:0}}>{"①②③"[j]}</span>
                                        <span style={{fontSize:12,color:"#facc15",fontWeight:500}}>"{a.keyword}"</span>
                                      </div>
                                      <div style={{fontSize:11,color:"#999",lineHeight:1.5,marginLeft:19}}>{a.suggestion}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div style={{background:"#0c0c07",border:"0.5px solid #1e1e00",borderRadius:10,padding:"10px 13px"}}>
                              <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:7}}>Annotated answer</div>
                              <AnnotationOverlay text={msg.answer} annotations={r.annotations}/>
                            </div>
                          )
                        )}
                        {/* Improvements */}
                        {r.improvements?.length>0&&(
                          <div style={{background:"#0d0d0d",border:"0.5px solid #141414",borderRadius:10,padding:"10px 13px"}}>
                            <div style={{fontSize:9,color:"#555",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Top improvements</div>
                            {r.improvements.slice(0,3).map((imp,j)=>(
                              <div key={j} style={{display:"flex",gap:8,marginBottom:j<Math.min(r.improvements.length,3)-1?10:0,alignItems:"flex-start"}}>
                                <span style={{fontSize:14,flexShrink:0,marginTop:1}}>{"①②③"[j]}</span>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:12,color:"#e5e5e5",fontWeight:500,marginBottom:3}}>{renderMarkdown(imp.defect)}</div>
                                  <div style={{display:"flex",alignItems:"flex-start",gap:5}}>
                                    <span style={{fontSize:10,color:"#555",flexShrink:0,marginTop:1}}>Why?</span>
                                    <span style={{fontSize:11,color:"#666",lineHeight:1.5}}>{renderMarkdown(imp.fix.slice(0,120))}{imp.fix.length>120?"...":""}</span>
                                  </div>
                                </div>
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
              <div style={{padding:"7px 16px",borderTop:"0.5px solid #0f0f0f",flexShrink:0}}>
                <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:session.phase==="has_eval"?8:0}}>
                  {sessChips.map(chip=>(
                    <button key={chip} onClick={()=>send(chip)} style={{padding:"4px 12px",borderRadius:20,fontSize:12,cursor:"pointer",background:"transparent",border:"0.5px solid #1a1a1a",color:"#555",transition:"all 0.12s",fontFamily:"inherit"}}
                      onMouseEnter={e=>{(e.currentTarget).style.borderColor="#2a2a3a";(e.currentTarget).style.color="#999";}}
                      onMouseLeave={e=>{(e.currentTarget).style.borderColor="#1a1a1a";(e.currentTarget).style.color="#555";}}>
                      {chip}
                    </button>
                  ))}
                </div>
                {session.phase==="has_eval"&&session.lastResult&&(()=>{
                  const r=session.lastResult!;
                  const weakest=Object.entries(r.breakdown).sort((a,b)=>a[1].score-b[1].score)[0];
                  const suggestions: Record<string,string>={
                    knowledge:`Review core ${r.subject} definitions`,
                    application:`Apply ${r.subject} concepts to real contexts`,
                    analysis:`Build cause-effect chains in answers`,
                    evaluation:`Add counter-arguments and weighted conclusions`,
                  };
                  return (
                    <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:"#0f0f1a",border:"0.5px solid #1e1e3a",borderRadius:8}}>
                      <span style={{fontSize:11,color:"#555",flexShrink:0}}>Next:</span>
                      <button onClick={()=>send(`💡 Why is my ${weakest[0]} score low?`)}
                        style={{fontSize:11,color:"#818cf8",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",padding:0}}>
                        → {suggestions[weakest[0]]} ({weakest[0]}: {weakest[1].score}/5)
                      </button>
                    </div>
                  );
                })()}
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
                {activeAnalytics&&activeSub&&(()=>{
                  const sorted = Object.entries(activeAnalytics.averages).sort((a,b)=>a[1]-b[1]);
                  const weakest = sorted[0];
                  const strongestCandidates = sorted.filter(([k]) => k !== weakest[0]);
                  const strongest = strongestCandidates.length > 0
                    ? [...strongestCandidates].sort((a,b)=>b[1]-a[1])[0]
                    : sorted[sorted.length-1];
                  const allEqual = sorted.every(([,v]) => v === sorted[0][1]);

                  const counts: Record<string,number> = {};
                  (activeAnalytics.recentDefects||[]).forEach(d=>{counts[d]=(counts[d]||0)+1;});
                  const recurring = Object.entries(counts).filter(([,c])=>c>1).sort((a,b)=>b[1]-a[1]);
                  const recentOnly = [...new Set(activeAnalytics.recentDefects||[])].filter(d=>counts[d]===1);

                  return (
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
                      {/* Summary cards with glowing borders */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9}}>
                        {[
                          { label:"Sessions",   value:activeAnalytics.sessions,                          color:"#e5e5e5", sub:undefined,                              key:null,          glowColor:"#ca8a04" },
                          { label:"Strongest",  value:allEqual?"Balanced":strongest[0],                  color:"#4ade80", sub:allEqual?undefined:`${strongest[1]}/5`, key:allEqual?null:strongest[0], glowColor:"#16a34a" },
                          { label:"Needs work", value:weakest[0],                                        color:"#f87171", sub:`${weakest[1]}/5`,                      key:weakest[0],    glowColor:"#dc2626" },
                        ].map(card=>(
                          <HoverCard key={card.label} label={card.label} value={card.value} color={card.color} sub={card.sub}
                            glowColor={card.glowColor}
                            tooltip={card.key ? categoryInsights?.[card.key as keyof typeof categoryInsights] : undefined} />
                        ))}
                      </div>

                      {/* Progress Trend */}
                      <ProgressTrend subject={activeSub} fetchHistory={fetchHistory} />

                      {/* AI Insight */}
                      <AnalyticsInsight subject={activeSub} averages={activeAnalytics.averages} sessions={activeAnalytics.sessions} recentDefects={activeAnalytics.recentDefects} onLoaded={(d)=>setCategoryInsights(d.categoryInsights)} />

                      {/* Areas to improve — max 5 total */}
                      {(recurring.length>0||recentOnly.length>0)&&(()=>{
                        const recurringSlice = recurring.slice(0, 5);
                        const remainingSlots = 5 - recurringSlice.length;
                        const recentSlice = recentOnly.slice(0, remainingSlots);
                        return (
                          <div style={{background:"#0f0f0f",border:"0.5px solid #141414",borderRadius:11,padding:"12px 14px"}}>
                            <div style={{fontSize:9,color:"#444",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:9}}>Areas to improve</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {recurringSlice.map(([d,c],i)=>(
                                <span key={"r"+i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,background:"#1a0a00",border:"0.5px solid #3a1a00",color:"#fb923c",borderRadius:20,padding:"2px 10px"}}>
                                  {d}<span style={{fontSize:9,background:"#3a1a00",borderRadius:10,padding:"1px 6px",color:"#fdba74"}}>recurring ×{c}</span>
                                </span>
                              ))}
                              {recentSlice.map((d,i)=>(
                                <span key={"n"+i} style={{fontSize:11,background:"#130505",border:"0.5px solid #2a0a0a",color:"#f87171",borderRadius:20,padding:"2px 10px"}}>{d}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Collapsible: Radar + Score bars */}
                      <details style={{background:"#0f0f0f",border:"0.5px solid #141414",borderRadius:11,overflow:"hidden"}}>
                        <summary style={{padding:"10px 14px",fontSize:11,color:"#555",cursor:"pointer",listStyle:"none",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          <span style={{textTransform:"uppercase",letterSpacing:"0.05em",fontSize:9}}>Capability radar & scores</span>
                          <span style={{fontSize:10}}>▾</span>
                        </summary>
                        <div style={{padding:"0 14px 14px"}}>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                            {(["knowledge","application","analysis","evaluation"] as const).map(key=>(
                              <HoverChip key={key} label={key} color={LAYER_COLORS[key]} tooltip={categoryInsights?.[key]} />
                            ))}
                          </div>
                          <ResponsiveContainer width="100%" height={180}>
                            <RadarChart data={[
                              {axis:"Knowledge",  score:activeAnalytics.averages.knowledge},
                              {axis:"Application",score:activeAnalytics.averages.application},
                              {axis:"Analysis",   score:activeAnalytics.averages.analysis},
                              {axis:"Evaluation", score:activeAnalytics.averages.evaluation},
                            ]}>
                              <PolarGrid stroke="#161616"/><PolarAngleAxis dataKey="axis" tick={{fill:"#555",fontSize:10}}/>
                              <Radar dataKey="score" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.18} dot={{fill:"#818cf8",r:3}}/>
                            </RadarChart>
                          </ResponsiveContainer>
                          <div style={{marginTop:12}}>
                            {(["knowledge","application","analysis","evaluation"] as const).map(key=>(
                              <div key={key} style={{marginBottom:9}}>
                                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#555",marginBottom:3}}>
                                  <span style={{textTransform:"capitalize"}}>{key}</span>
                                  <span style={{color:LAYER_COLORS[key]}}>{activeAnalytics.averages[key]}/5</span>
                                </div>
                                <div style={{height:3,background:"#141414",borderRadius:2}}>
                                  <div style={{height:"100%",borderRadius:2,background:LAYER_COLORS[key],width:`${Math.min(100,(activeAnalytics.averages[key]/5)*100)}%`,transition:"width 0.5s ease"}}/>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>

                      {/* Overall Assessment paragraph */}
                      {categoryInsights&&(
                        <OverallAssessmentSection subject={activeSub} averages={activeAnalytics.averages} sessions={activeAnalytics.sessions} recentDefects={activeAnalytics.recentDefects} />
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── History view ── */}
        {view==="history"&&(
          <div style={{flex:1,overflowY:"auto",padding:"20px 20px"}}>
            <div style={{maxWidth:680,margin:"0 auto"}}>
              {historyItems.length>0&&(
                <div style={{marginBottom:12,fontSize:11,color:"#444"}}>🐋 Stored permanently on Walrus — {historyItems.length} record{historyItems.length>1?"s":""}</div>
              )}
              {!historyLoaded&&<p style={{color:"#444",fontSize:13}}>Loading from Walrus...</p>}
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
                      {item.estimatedScore&&<span style={{fontSize:12,fontWeight:700,color:"#4ade80"}}>{item.estimatedScore}</span>}
                      <span style={{fontSize:10,color:"#2a2a2a",marginLeft:"auto"}}>{new Date(item.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                    <p style={{fontSize:12,color:"#bbb",margin:"0 0 5px",lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as any}}>{item.question}</p>
                    {item.scores&&(
                      <div style={{display:"flex",gap:7,marginTop:9}}>
                        {(["knowledge","application","analysis","evaluation"] as const).map(key=>(
                          <div key={key} style={{flex:1}}>
                            <div style={{fontSize:8,color:"#2a2a2a",marginBottom:2,textTransform:"uppercase"}}>{key.slice(0,2)}</div>
                            <div style={{height:2,background:"#141414",borderRadius:1}}><div style={{height:"100%",borderRadius:1,background:sc(item.scores![key]),width:`${Math.min(100,(item.scores![key]/5)*100)}%`}}/></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:.15}50%{opacity:.7}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

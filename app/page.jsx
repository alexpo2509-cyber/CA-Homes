'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const SURL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/cahomes/';
const fmt = (n) => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n||0);
const fmtD = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '–';
const td = () => new Date().toISOString().split('T')[0];
const mName = (m) => { const [y,mo]=m.split('-'); return new Date(y,mo-1).toLocaleDateString('de-DE',{month:'long',year:'numeric'}); };
const fmtK = (n) => (n||0)>=1e6?((n/1e6).toFixed(1)+'M €'):(n||0)>=1e3?((n/1e3).toFixed(0)+'K €'):fmt(n);
const CCATS=['Reparatur','Hausgeld','Versicherung','Verwaltung','Renovierung','Sonstiges'];
const TCATS=['Nebenkostenabrechnung','Versicherung','Hausgeld','Mieterhöhung','Wartung','Sonstiges'];
const DCATS=['Mietvertrag','Abnahmeprotokoll','Nebenkostenabrechnung','Rechnung','Versicherung','E-Mail','Foto','Sonstiges'];
const TSTAT=['offen','in Bearbeitung','erledigt'];
const NKK=['heating','water','garbage','insurance','management','elevator','cleaning','garden','cableTV','other'];
const NKL={heating:'Heizkosten',water:'Wasser/Abwasser',garbage:'Müllabfuhr',insurance:'Gebäudeversicherung',management:'Hausverwaltung',elevator:'Aufzug',cleaning:'Treppenhausreinigung',garden:'Gartenpflege',cableTV:'Kabelanschluss',other:'Sonstige'};

// ═══ SVG ICONS ═══
const IC={
  home:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  alert:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  clock:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  bld:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/></svg>,
  eur:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 9.5C16.2 7.4 14.3 6 12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6c2.3 0 4.2-1.4 5-3.5"/><line x1="4" y1="10" x2="13" y2="10"/><line x1="4" y1="14" x2="13" y2="14"/></svg>,
  wrn:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  file:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  edit:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  del:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  chv:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  back:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  plus:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  user:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  users:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  cam:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  trend:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  gear:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  moon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  out:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  srch:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  dl:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  ul:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  msg:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  globe:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  calc:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><line x1="8" y1="10" x2="8" y2="10.01"/><line x1="12" y1="10" x2="12" y2="10.01"/></svg>,
  pin:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  ph:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  ml:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
};

function Modal({title,onClose,children,footer}){return(<div className="mo" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="md"><div className="mh"><h3>{title}</h3><button className="ib" onClick={onClose}>✕</button></div><div className="mb">{children}</div>{footer&&<div className="mf">{footer}</div>}</div></div>);}
function F({label,children}){return<div className="fg"><label>{label}</label>{children}</div>;}
async function upFile(uid,file,folder='docs'){const ext=file.name.split('.').pop();const path=`${uid}/${folder}/${Date.now()}.${ext}`;const{error}=await supabase.storage.from('cahomes').upload(path,file);if(error)throw error;return path;}
function fileUrl(p){return p?SURL+p:'';}

export default function Home(){
  const [user,setUser]=useState(null);const [loading,setLoading]=useState(true);
  const [authMode,setAuthMode]=useState('login');const [email,setEmail]=useState('');const [pw,setPw]=useState('');const [err,setErr]=useState('');
  const [data,setData]=useState(null);const [view,setView]=useState('home');const [propId,setPropId]=useState(null);
  const [theme,setTheme]=useState('light');const [sideOpen,setSideOpen]=useState(false);
  const [hh,setHh]=useState(null);const [members,setMembers]=useState([]);const [invEmail,setInvEmail]=useState('');const [invMsg,setInvMsg]=useState('');
  const [onboarded,setOnboarded]=useState(true);

  useEffect(()=>{try{const s=localStorage.getItem('ca-theme');if(s)setTheme(s)}catch{}},[]);
  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme);try{localStorage.setItem('ca-theme',theme)}catch{}},[theme]);
  useEffect(()=>{supabase.auth.getUser().then(({data:{user}})=>{setUser(user);setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user??null));return()=>subscription.unsubscribe();},[]);

  const ld=useCallback(async()=>{if(!user)return;
    const[p,t,pay,c,tk,ta,d]=await Promise.all([supabase.from('properties').select('*').order('created_at'),supabase.from('tenants').select('*'),supabase.from('payments').select('*').order('month',{ascending:false}),supabase.from('costs').select('*').order('date',{ascending:false}),supabase.from('tickets').select('*').order('date',{ascending:false}),supabase.from('tasks').select('*').order('due'),supabase.from('documents').select('*').order('date',{ascending:false})]);
    const dd={properties:p.data||[],tenants:t.data||[],payments:pay.data||[],costs:c.data||[],tickets:tk.data||[],tasks:ta.data||[],documents:d.data||[]};
    setData(dd);
    if(dd.properties.length===0){try{const ob=localStorage.getItem('ca-ob');if(!ob)setOnboarded(false)}catch{}}
    const{data:mem}=await supabase.from('household_members').select('*,households(*)').eq('user_id',user.id);
    if(mem?.length>0){setHh(mem[0].households);const{data:all}=await supabase.from('household_members').select('*').eq('household_id',mem[0].household_id);setMembers(all||[]);}
  },[user]);
  useEffect(()=>{if(user)ld()},[user,ld]);

  const auth=async(e)=>{e.preventDefault();setErr('');const{error}=authMode==='login'?await supabase.auth.signInWithPassword({email,password:pw}):await supabase.auth.signUp({email,password:pw});if(error)setErr(error.message);};
  const inv=async()=>{if(!invEmail||!hh)return;const{error}=await supabase.from('household_members').insert({household_id:hh.id,invited_email:invEmail,role:'member',status:'pending',user_id:user.id});setInvMsg(error?'Fehler: '+error.message:`${invEmail} eingeladen!`);if(!error){setInvEmail('');ld();}};
  const nav=(v,id)=>{setView(v);setPropId(id||null);setSideOpen(false);};
  const prop=propId?data?.properties.find(p=>p.id===propId):null;

  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)',color:'var(--text3)',fontFamily:'DM Sans,sans-serif'}}>Laden...</div>;

  // Login
  if(!user)return(<div className="login-wrap"><div className="login-card"><h1 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:30,marginBottom:4}}>CA Homes</h1><p style={{color:'var(--text2)',fontSize:13,marginBottom:28}}>{authMode==='login'?'Anmelden':'Registrieren'}</p>{err&&<div className="login-error">{err}</div>}<form onSubmit={auth}><input type="email" placeholder="E-Mail" value={email} onChange={e=>{setEmail(e.target.value);setErr('')}} className="li"/><input type="password" placeholder="Passwort" value={pw} onChange={e=>{setPw(e.target.value);setErr('')}} className="li"/><button type="submit" className="btn bp" style={{width:'100%',justifyContent:'center',padding:12,fontSize:15}}>{authMode==='login'?'Anmelden':'Account erstellen'}</button></form><button onClick={()=>setAuthMode(a=>a==='login'?'signup':'login')} style={{background:'none',border:'none',color:'var(--accent)',fontSize:13,marginTop:16,cursor:'pointer'}}>{authMode==='login'?'Noch kein Account? Registrieren':'Bereits registriert? Anmelden'}</button></div></div>);

  if(!data)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)',color:'var(--text3)'}}>Daten laden...</div>;

  // Onboarding
  if(!onboarded)return<OnboardWizard user={user} reload={ld} onDone={()=>{setOnboarded(true);try{localStorage.setItem('ca-ob','1')}catch{}}}/>;

  const rented=data.properties.filter(p=>p.status==='vermietet');
  const totalRent=rented.reduce((s,p)=>s+(p.total_rent||0),0);
  const totalValue=data.properties.reduce((s,p)=>s+(p.market_value||0),0);
  const totalLoan=data.properties.reduce((s,p)=>s+(p.loan_amount||0),0);
  const openActions=data.tickets.filter(t=>t.status==='offen').length+data.tasks.filter(t=>t.status==='offen').length;
  const missingPay=data.payments.filter(p=>p.expected>0&&p.received<p.expected);

  return(
    <div className="app">
      {sideOpen&&<div className="ov" onClick={()=>setSideOpen(false)}/>}
      <aside className={`side${sideOpen?' open':''}`}>
        <div className="sb"><h1 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:22,fontWeight:400,color:'#fff'}}>CA Homes</h1><p style={{fontSize:10,color:'rgba(255,255,255,.35)',letterSpacing:1.5,textTransform:'uppercase',marginTop:2}}>Property Management</p></div>
        <nav className="sn">
          <button className={`ni${view==='home'?' act':''}`} onClick={()=>nav('home')}>{IC.home}<span>Übersicht</span>{(missingPay.length+openActions)>0&&<span style={{marginLeft:'auto',background:'#C4534A',color:'#fff',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10}}>{missingPay.length+openActions}</span>}</button>
          <button className={`ni${view==='props'?' act':''}`} onClick={()=>nav('props')}>{IC.bld}<span>Wohnungen</span><span style={{marginLeft:'auto',color:'rgba(255,255,255,.3)',fontSize:12}}>{data.properties.length}</span></button>
          <button className={`ni${view==='payments'?' act':''}`} onClick={()=>nav('payments')}>{IC.eur}<span>Einnahmen</span></button>
          <button className={`ni${view==='costs'?' act':''}`} onClick={()=>nav('costs')}>{IC.calc}<span>Kosten</span></button>
          <button className={`ni${view==='vorgaenge'?' act':''}`} onClick={()=>nav('vorgaenge')}>{IC.wrn}<span>Vorgänge</span></button>
          <button className={`ni${view==='documents'?' act':''}`} onClick={()=>nav('documents')}>{IC.file}<span>Dokumente</span></button>
          <div className="nl">Schnellzugriff</div>
          {rented.slice(0,4).map(p=><button key={p.id} className={`ni${view==='detail'&&propId===p.id?' act':''}`} onClick={()=>nav('detail',p.id)} style={{fontSize:13}}><span style={{width:8,height:8,borderRadius:4,background:'#5DA06E',flexShrink:0}}/><span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name.replace(/wohnung/i,'').trim()}</span></button>)}
        </nav>
        <div className="sf">
          <button className="ni" onClick={()=>nav('settings')}>{IC.gear}<span>Einstellungen</span></button>
          <button className="ni" style={{fontSize:12}} onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{IC.moon}<span>{theme==='dark'?'Hellmodus':'Dunkelmodus'}</span></button>
          <button className="ni" style={{fontSize:12}} onClick={()=>supabase.auth.signOut()}>{IC.out}<span>{user.email?.split('@')[0]}</span></button>
        </div>
      </aside>
      <main className="mn">
        <div className="tb"><button onClick={()=>setSideOpen(true)} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:'var(--text)'}}>☰</button><span style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:18}}>CA Homes</span></div>
        <div className="ct">
          {view==='home'&&<HomePage data={data} nav={nav} totalRent={totalRent} totalValue={totalValue} totalLoan={totalLoan} openActions={openActions} missingPay={missingPay}/>}
          {view==='props'&&<PropsPage data={data} user={user} reload={ld} nav={nav}/>}
          {view==='detail'&&prop&&<DetailPage p={prop} data={data} user={user} reload={ld} nav={nav}/>}
          {view==='payments'&&<PayPage data={data} user={user} reload={ld}/>}
          {view==='costs'&&<CostPage data={data} user={user} reload={ld}/>}
          {view==='vorgaenge'&&<VorgPage data={data} user={user} reload={ld}/>}
          {view==='documents'&&<DocPage data={data} user={user} reload={ld}/>}
          {view==='settings'&&<SetPage user={user} theme={theme} setTheme={setTheme} hh={hh} members={members} invEmail={invEmail} setInvEmail={setInvEmail} invMsg={invMsg} inv={inv} data={data}/>}
        </div>
      </main>
    </div>
  );
}

// ═══ ONBOARDING ═══
function OnboardWizard({user,reload,onDone}){
  const [step,setStep]=useState(0);const [f,sF]=useState({name:'',address:'',status:'vermietet',cold_rent:'',utilities:'',total_rent:'',area:'',rooms:''});
  const save=async()=>{const row={...f,user_id:user.id,cold_rent:Number(f.cold_rent)||0,utilities:Number(f.utilities)||0,total_rent:Number(f.total_rent)||0,area:Number(f.area)||0,rooms:Number(f.rooms)||0};await supabase.from('properties').insert(row);await reload();onDone();};
  return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'var(--bg)',padding:20}}>
    <div style={{background:'var(--surface)',borderRadius:20,padding:40,maxWidth:480,width:'100%',boxShadow:'var(--shadow-lg)'}}>
      <h1 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:28,marginBottom:4}}>Willkommen bei CA Homes</h1>
      <p style={{color:'var(--text2)',fontSize:14,marginBottom:28}}>Lass uns deine erste Wohnung anlegen.</p>
      <div style={{display:'flex',gap:6,marginBottom:24}}>{[0,1,2].map(i=><div key={i} style={{height:4,flex:1,borderRadius:2,background:i<=step?'var(--accent)':'var(--border)'}}/>)}</div>
      {step===0&&<div><F label="Name der Wohnung"><input value={f.name} onChange={e=>sF(p=>({...p,name:e.target.value}))} placeholder="z.B. Stadtwohnung Stuttgart"/></F><F label="Adresse"><input value={f.address} onChange={e=>sF(p=>({...p,address:e.target.value}))} placeholder="Straße, PLZ Ort"/></F><F label="Status"><select value={f.status} onChange={e=>sF(p=>({...p,status:e.target.value}))}><option>vermietet</option><option>selbst genutzt</option></select></F><button className="btn bp" style={{width:'100%',marginTop:12}} onClick={()=>setStep(1)}>Weiter</button></div>}
      {step===1&&<div><div className="fr"><F label="Fläche (m²)"><input type="number" value={f.area} onChange={e=>sF(p=>({...p,area:e.target.value}))}/></F><F label="Zimmer"><input type="number" value={f.rooms} onChange={e=>sF(p=>({...p,rooms:e.target.value}))}/></F></div>{f.status==='vermietet'&&<><div className="fr"><F label="Kaltmiete (€)"><input type="number" value={f.cold_rent} onChange={e=>sF(p=>({...p,cold_rent:e.target.value}))}/></F><F label="NK (€)"><input type="number" value={f.utilities} onChange={e=>sF(p=>({...p,utilities:e.target.value}))}/></F></div><F label="Gesamtmiete (€)"><input type="number" value={f.total_rent} onChange={e=>sF(p=>({...p,total_rent:e.target.value}))}/></F></>}<div style={{display:'flex',gap:8,marginTop:12}}><button className="btn bs" onClick={()=>setStep(0)}>Zurück</button><button className="btn bp" style={{flex:1}} onClick={()=>setStep(2)}>Weiter</button></div></div>}
      {step===2&&<div><div className="card" style={{padding:20,marginBottom:20}}>
        <strong style={{fontSize:16}}>{f.name||'Unbenannt'}</strong><div className="text-sm" style={{color:'var(--text2)',marginTop:4}}>{f.address||'–'}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13,marginTop:12}}>{f.area&&<div>Fläche: <strong>{f.area} m²</strong></div>}{f.rooms&&<div>Zimmer: <strong>{f.rooms}</strong></div>}{f.total_rent&&<div>Miete: <strong>{fmt(f.total_rent)}</strong></div>}<div>Status: <strong>{f.status}</strong></div></div>
      </div><div style={{display:'flex',gap:8}}><button className="btn bs" onClick={()=>setStep(1)}>Zurück</button><button className="btn bp" style={{flex:1}} onClick={save}>Wohnung anlegen</button></div><button onClick={onDone} style={{background:'none',border:'none',color:'var(--text3)',fontSize:12,marginTop:16,cursor:'pointer',width:'100%',textAlign:'center'}}>Überspringen — später anlegen</button></div>}
    </div>
  </div>);
}

// ═══ HOME (Aufmerksamkeits-basiert) ═══
function HomePage({data,nav,totalRent,totalValue,totalLoan,openActions,missingPay}){
  const tasks=[...data.tasks].filter(t=>t.status==='offen').sort((a,b)=>(a.due||'').localeCompare(b.due||'')).slice(0,5);
  const openTickets=data.tickets.filter(t=>t.status==='offen');
  const actions=[...missingPay.map(p=>({id:'p'+p.id,type:'pay',title:'Miete ausstehend',sub:`${data.properties.find(x=>x.id===p.property_id)?.name||'–'} · ${fmt(p.expected)}`,propId:p.property_id})),...openTickets.map(t=>({id:'t'+t.id,type:'repair',title:t.title,sub:data.properties.find(x=>x.id===t.property_id)?.name||'–',propId:t.property_id}))];
  const last12=useMemo(()=>{const ms=[];const now=new Date();for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);ms.push(d.toISOString().slice(0,7));}return ms.map(m=>({m,l:new Date(m+'-01').toLocaleDateString('de-DE',{month:'short'}),inc:data.payments.filter(p=>p.month===m).reduce((s,p)=>s+(p.received||0),0),cos:data.costs.filter(c=>(c.date||'').startsWith(m)).reduce((s,c)=>s+(c.amount||0),0)}));},[data]);
  const mx=Math.max(...last12.map(m=>Math.max(m.inc,m.cos)),1);
  return(<div>
    <div style={{marginBottom:28}}><h1 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:32,fontWeight:400,letterSpacing:-.5}}>Guten Tag</h1><p style={{color:'var(--text2)',fontSize:14,marginTop:4}}>{actions.length>0?`${actions.length} ${actions.length===1?'Sache braucht':'Sachen brauchen'} deine Aufmerksamkeit`:'Alles läuft — keine offenen Punkte'}</p></div>
    {actions.length>0&&<div style={{marginBottom:28}}><div className="sl"><span style={{color:'var(--red)'}}>{IC.alert}</span> Jetzt handeln</div><div className="card" style={{padding:0}}>{actions.map(a=><div key={a.id} className="arow" onClick={()=>nav('detail',a.propId)}><div className="ic" style={{background:a.type==='pay'?'var(--red-light)':'var(--amber-light)',color:a.type==='pay'?'var(--red)':'var(--amber)'}}>{a.type==='pay'?IC.eur:IC.wrn}</div><div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:14}}>{a.title}</div><div style={{color:'var(--text2)',fontSize:12,marginTop:2}}>{a.sub}</div></div><span className="pill pr">Offen</span><span style={{color:'var(--text3)'}}>{IC.chv}</span></div>)}</div></div>}
    {tasks.length>0&&<div style={{marginBottom:28}}><div className="sl">{IC.clock} Kommt bald</div><div className="card" style={{padding:0}}>{tasks.map(t=>{const pr=t.property_id&&t.property_id!=='all'?data.properties.find(p=>p.id===t.property_id):null;return<div key={t.id} className="arow"><div className="ic" style={{background:'var(--surface2)',color:'var(--text2)'}}>{IC.clock}</div><div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>{t.title}</div><div style={{color:'var(--text2)',fontSize:12,marginTop:2}}>{t.category}{pr?' · '+pr.name:''} · {fmtD(t.due)}</div></div><span className="pill pg">{fmtD(t.due)}</span></div>})}</div></div>}
    <div className="sl">{IC.trend} 12-Monats-Verlauf</div>
    <div className="card" style={{marginBottom:24,padding:20}}>
      <div style={{display:'flex',alignItems:'flex-end',gap:6,height:120}}>{last12.map((m,i)=><div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}><div style={{width:'100%',display:'flex',gap:2,alignItems:'flex-end',height:90}}><div style={{flex:1,background:'var(--accent)',borderRadius:'3px 3px 0 0',height:`${Math.max((m.inc/mx)*100,2)}%`,minHeight:2}}/><div style={{flex:1,background:'var(--red)',borderRadius:'3px 3px 0 0',height:`${Math.max((m.cos/mx)*100,2)}%`,minHeight:2,opacity:.7}}/></div><div style={{fontSize:10,color:'var(--text3)'}}>{m.l}</div></div>)}</div>
      <div style={{display:'flex',gap:16,marginTop:12,fontSize:12,color:'var(--text2)',flexWrap:'wrap'}}><span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--accent)'}}/> Einnahmen</span><span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--red)',opacity:.7}}/> Kosten</span><span style={{marginLeft:'auto'}}>CF: <strong style={{color:last12.reduce((s,m)=>s+m.inc-m.cos,0)>=0?'var(--accent)':'var(--red)'}}>{fmt(last12.reduce((s,m)=>s+m.inc-m.cos,0))}</strong></span></div>
    </div>
    <div className="sl">{IC.trend} Portfolio</div>
    <div className="sgrid">{[{l:'Monatl. Miete',v:fmt(totalRent),c:'var(--accent)'},{l:'Portfoliowert',v:fmtK(totalValue),c:'var(--text)'},{l:'Eigenkapital',v:fmtK(totalValue-totalLoan),c:'var(--blue)'},{l:'Restdarlehen',v:fmtK(totalLoan),c:'var(--red)'}].map((s,i)=><div key={i} className="scard"><div className="sl2">{s.l}</div><div className="sv" style={{color:s.c}}>{s.v}</div></div>)}</div>
  </div>);
}

// ═══ PROPERTIES LIST (skalierbar) ═══
function PropsPage({data,user,reload,nav}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [search,setSearch]=useState('');const [filter,setFilter]=useState('all');
  const Fv=(k,v)=>setForm(f=>({...f,[k]:v}));
  const setNk=(k,v)=>setForm(f=>({...f,nk:{...f.nk,[k]:v}}));
  const empty={name:'',address:'',type:'Wohnung',status:'vermietet',area:'',rooms:'',year:'',floor:'',total_floors:'',balcony:false,cellar:false,elevator:false,energy_class:'',heating_type:'',description:'',has_parking:false,parking_rent:'',cold_rent:'',utilities:'',total_rent:'',rent_start:'',deposit:'',purchase_price:'',market_value:'',loan_amount:'',loan_rate:'',loan_monthly_payment:'',maintenance_reserve:'',maintenance_reserve_total:'',notes:'',nk:{}};
  const save=async()=>{const row={...form,nk:form.nk||{}};['area','rooms','year','floor','total_floors','parking_rent','cold_rent','utilities','total_rent','deposit','purchase_price','market_value','loan_amount','loan_rate','loan_monthly_payment','maintenance_reserve','maintenance_reserve_total'].forEach(k=>{row[k]=Number(row[k])||0;});NKK.forEach(k=>{if(row.nk[k])row.nk[k]=Number(row.nk[k])||0;});if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('properties').insert(row);}else{const{id,user_id,created_at,household_id,...upd}=row;await supabase.from('properties').update(upd).eq('id',id);}await reload();setModal(null);};
  const del=async(id)=>{if(confirm('Löschen?')){await supabase.from('properties').delete().eq('id',id);await reload();}};
  const filtered=useMemo(()=>{let l=data.properties;if(filter!=='all')l=l.filter(p=>p.status===filter);if(search)l=l.filter(p=>(p.name+p.address).toLowerCase().includes(search.toLowerCase()));return l;},[data.properties,search,filter]);
  const editP=(p)=>{const f={...empty};Object.keys(empty).forEach(k=>{f[k]=p[k]||empty[k];});f.id=p.id;f.nk=p.nk||{};setForm(f);setModal('edit');};

  return(<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}>
      <div><h2 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:28,fontWeight:400}}>Wohnungen</h2><p style={{color:'var(--text2)',fontSize:14,marginTop:2}}>{data.properties.length} Objekte · {data.properties.filter(p=>p.status==='vermietet').length} vermietet</p></div>
      <button className="btn bp" onClick={()=>{setForm(empty);setModal('new');}}>{IC.plus} Neue Wohnung</button>
    </div>
    <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
      <div className="sbox" style={{flex:1,minWidth:200}}>{IC.srch}<input placeholder="Suchen..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div style={{display:'flex',gap:4,background:'var(--surface2)',padding:3,borderRadius:12}}>{[['all','Alle'],['vermietet','Vermietet'],['selbst genutzt','Selbst']].map(([v,l])=><button key={v} className={`tab${filter===v?' act':''}`} onClick={()=>setFilter(v)}>{l}</button>)}</div>
    </div>
    <div className="card-grid">{filtered.map(p=>{const t=data.tenants.find(x=>x.property_id===p.id);const br=p.purchase_price?(((p.cold_rent||0)+(p.parking_rent||0))*12/p.purchase_price*100).toFixed(1):null;return(<div key={p.id} className="card" style={{cursor:'pointer'}} onClick={()=>nav('detail',p.id)}>
      <div style={{padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><strong style={{fontSize:15}}>{p.name}</strong><span className={`pill ${p.status==='vermietet'?'pg':'pgy'}`}>{p.status}</span></div>
        <div style={{fontSize:12,color:'var(--text2)',display:'flex',alignItems:'center',gap:4,marginBottom:12}}>{IC.pin} {p.address}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,fontSize:12}}>
          <div><span style={{color:'var(--text3)'}}>Fläche</span><div style={{fontWeight:600,fontSize:15,marginTop:2}}>{p.area} m²</div></div>
          <div><span style={{color:'var(--text3)'}}>Miete</span><div style={{fontWeight:600,fontSize:15,marginTop:2,color:p.total_rent?'var(--accent)':'var(--text3)'}}>{p.total_rent?fmt(p.total_rent):'–'}</div></div>
          <div><span style={{color:'var(--text3)'}}>Wert</span><div style={{fontWeight:600,fontSize:15,marginTop:2}}>{fmtK(p.market_value)}</div></div>
        </div>
        {t&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)',fontSize:13,color:'var(--text2)'}}><span style={{color:'var(--accent)'}}>{IC.user}</span>{t.name}{br&&<span className="pill pg" style={{marginLeft:'auto',fontSize:11}}>{br}%</span>}</div>}
        <div style={{display:'flex',gap:6,marginTop:12}} onClick={e=>e.stopPropagation()}>
          <button className="ib" onClick={()=>editP(p)}>{IC.edit}</button>
          <button className="ib" style={{color:'var(--red)'}} onClick={()=>del(p.id)}>{IC.del}</button>
        </div>
      </div>
    </div>);})}</div>
    {filtered.length===0&&<div className="empty">Keine Wohnungen gefunden</div>}

    {modal&&<Modal title={modal==='new'?'Neue Wohnung':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn bs" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn bp" onClick={save}>Speichern</button></>}>
      <F label="Name"><input value={form.name} onChange={e=>Fv('name',e.target.value)}/></F>
      <F label="Adresse"><input value={form.address} onChange={e=>Fv('address',e.target.value)}/></F>
      <div className="fr"><F label="Status"><select value={form.status} onChange={e=>Fv('status',e.target.value)}><option>vermietet</option><option>selbst genutzt</option></select></F><F label="Typ"><input value={form.type} onChange={e=>Fv('type',e.target.value)}/></F></div>
      <div className="fr"><F label="Fläche m²"><input type="number" value={form.area} onChange={e=>Fv('area',e.target.value)}/></F><F label="Zimmer"><input type="number" value={form.rooms} onChange={e=>Fv('rooms',e.target.value)}/></F></div>
      <div className="fr"><F label="Baujahr"><input type="number" value={form.year} onChange={e=>Fv('year',e.target.value)}/></F><F label="Etage/Ges."><div className="fr"><input type="number" placeholder="OG" value={form.floor} onChange={e=>Fv('floor',e.target.value)}/><input type="number" placeholder="von" value={form.total_floors} onChange={e=>Fv('total_floors',e.target.value)}/></div></F></div>
      <div className="fr"><F label="Heizung"><input value={form.heating_type} onChange={e=>Fv('heating_type',e.target.value)}/></F><F label="Energie"><input value={form.energy_class} onChange={e=>Fv('energy_class',e.target.value)}/></F></div>
      <div style={{display:'flex',gap:16,marginBottom:14,fontSize:13,flexWrap:'wrap'}}><label><input type="checkbox" checked={form.balcony||false} onChange={e=>Fv('balcony',e.target.checked)}/> Balkon</label><label><input type="checkbox" checked={form.cellar||false} onChange={e=>Fv('cellar',e.target.checked)}/> Keller</label><label><input type="checkbox" checked={form.elevator||false} onChange={e=>Fv('elevator',e.target.checked)}/> Aufzug</label><label><input type="checkbox" checked={form.has_parking||false} onChange={e=>Fv('has_parking',e.target.checked)}/> Stellplatz</label></div>
      {form.has_parking&&<F label="Stellplatzmiete"><input type="number" value={form.parking_rent} onChange={e=>Fv('parking_rent',e.target.value)}/></F>}
      <F label="Beschreibung"><textarea value={form.description} onChange={e=>Fv('description',e.target.value)}/></F>
      <div className="sep"><strong>Mietdaten</strong></div>
      <div className="fr"><F label="Kaltmiete"><input type="number" value={form.cold_rent} onChange={e=>Fv('cold_rent',e.target.value)}/></F><F label="NK"><input type="number" value={form.utilities} onChange={e=>Fv('utilities',e.target.value)}/></F></div>
      <div className="fr"><F label="Gesamtmiete"><input type="number" value={form.total_rent} onChange={e=>Fv('total_rent',e.target.value)}/></F><F label="Kaution"><input type="number" value={form.deposit} onChange={e=>Fv('deposit',e.target.value)}/></F></div>
      <F label="Mietbeginn"><input type="date" value={form.rent_start} onChange={e=>Fv('rent_start',e.target.value)}/></F>
      <div className="sep"><strong>NK-Aufschlüsselung (mtl.)</strong></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{NKK.map(k=><F key={k} label={NKL[k]}><input type="number" value={form.nk?.[k]||''} onChange={e=>setNk(k,e.target.value)} placeholder="0"/></F>)}</div>
      <div className="sep"><strong>Finanzdaten</strong></div>
      <div className="fr"><F label="Kaufpreis"><input type="number" value={form.purchase_price} onChange={e=>Fv('purchase_price',e.target.value)}/></F><F label="Marktwert"><input type="number" value={form.market_value} onChange={e=>Fv('market_value',e.target.value)}/></F></div>
      <div className="fr"><F label="Darlehen"><input type="number" value={form.loan_amount} onChange={e=>Fv('loan_amount',e.target.value)}/></F><F label="Zins %"><input type="number" step="0.01" value={form.loan_rate} onChange={e=>Fv('loan_rate',e.target.value)}/></F></div>
      <F label="Rate/M"><input type="number" value={form.loan_monthly_payment} onChange={e=>Fv('loan_monthly_payment',e.target.value)}/></F>
      <div className="fr"><F label="Rücklage/M"><input type="number" value={form.maintenance_reserve} onChange={e=>Fv('maintenance_reserve',e.target.value)}/></F><F label="Rücklage ges."><input type="number" value={form.maintenance_reserve_total} onChange={e=>Fv('maintenance_reserve_total',e.target.value)}/></F></div>
      <F label="Notizen"><textarea value={form.notes} onChange={e=>Fv('notes',e.target.value)}/></F>
    </Modal>}
  </div>);
}

// ═══ DETAIL PAGE ═══
function DetailPage({p,data,user,reload,nav}){
  const t=data.tenants.find(x=>x.property_id===p.id);const allT=data.tenants.filter(x=>x.property_id===p.id);
  const pCosts=data.costs.filter(c=>c.property_id===p.id);const pDocs=data.documents.filter(d=>d.property_id===p.id);
  const [tab,setTab]=useState('overview');const [scout,setScout]=useState('');const [tM,setTM]=useState(null);const [tf,setTf]=useState({});const [nkY,setNkY]=useState('2025');
  const [photos,setPhotos]=useState([]);const [vp,setVp]=useState(null);const [upl,setUpl]=useState(false);
  const nk=p.nk||{};const nkT=Object.values(nk).reduce((s,v)=>s+(v||0),0);
  const aR=((p.cold_rent||0)+(p.parking_rent||0))*12;const aC=(p.maintenance_reserve||0)*12;const aL=(p.loan_monthly_payment||0)*12;
  const bR=p.purchase_price?(aR/p.purchase_price*100):0;const nR=p.purchase_price?((aR-aC-aL)/p.purchase_price*100):0;const mCF=(p.cold_rent||0)+(p.parking_rent||0)-(p.loan_monthly_payment||0)-(p.maintenance_reserve||0);
  const proj=Array.from({length:10},(_,y)=>({y:2026+y,inc:aR*Math.pow(1.015,y),res:aC,ln:aL,cf:aR*Math.pow(1.015,y)-aC-aL}));
  const mxCF=Math.max(...proj.map(r=>Math.abs(r.cf)),1);
  const feat=[p.balcony&&'Balkon',p.cellar&&'Keller',p.elevator&&'Aufzug',p.has_parking&&'TG-Stellplatz'].filter(Boolean);
  const ps=p.area?(p.cold_rent/p.area):0;
  const genNk=()=>{const um=pCosts.filter(c=>(c.date||'').startsWith(nkY)&&['Hausgeld','Versicherung'].includes(c.category));const tot=um.reduce((s,c)=>s+(c.amount||0),0);const vz=(p.utilities||0)*12;return{um,tot,vz,d:vz-tot};};
  const savT=async()=>{const row={...tf,deposit:Number(tf.deposit)||0};if(tM==='new'){delete row.id;row.user_id=user.id;row.property_id=p.id;await supabase.from('tenants').insert(row);}else{const{id,user_id,created_at,household_id,...u}=row;await supabase.from('tenants').update(u).eq('id',id);}await reload();setTM(null);};
  const delT=async(id)=>{if(confirm('Entfernen?')){await supabase.from('tenants').delete().eq('id',id);await reload();}};
  const cp=(t)=>{navigator.clipboard?.writeText(t).then(()=>alert('Kopiert!')).catch(()=>{});};
  const loadPh=async()=>{const{data:ph}=await supabase.from('photos').select('*').eq('property_id',p.id).order('created_at');setPhotos(ph||[]);};
  const upPh=async(e)=>{const files=e.target.files;if(!files?.length)return;setUpl(true);try{for(const f of files){const path=await upFile(user.id,f,'photos/'+p.id);await supabase.from('photos').insert({user_id:user.id,property_id:p.id,file_path:path,name:f.name});}await loadPh();}catch(er){alert('Fehler: '+er.message);}setUpl(false);};
  const delPh=async(ph)=>{await supabase.storage.from('cahomes').remove([ph.file_path]);await supabase.from('photos').delete().eq('id',ph.id);await loadPh();};
  useEffect(()=>{loadPh();},[p.id]);
  const genS=()=>{setScout(`IMMOSCOUT24 INSERAT\n\n${p.rooms}-Zi ${p.address?.split(',').pop()?.trim()||''} | ${p.area}m²${p.balcony?' | Balkon':''}${p.has_parking?' | Stellplatz':''}\n\n${p.description||''}\n\nObjekt: ${p.area}m² · ${p.rooms}Zi · ${p.floor||'–'}/${p.total_floors||'–'}OG · Bj.${p.year}\nHeizung: ${p.heating_type||'–'} · Energie: ${p.energy_class||'–'}\n${feat.join(', ')}\n\nMiete: Kalt ${fmt(p.cold_rent)} · NK ${fmt(p.utilities)} · Gesamt ${fmt(p.total_rent)}\nKaution: ${fmt(p.deposit)}\n\nVerfügbar: ${t?'Nach Kündigung':'Sofort'}`);};

  return(<div>
    <button onClick={()=>nav('props')} style={{display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',color:'var(--text2)',fontSize:13,fontWeight:500,marginBottom:20,padding:0}}>{IC.back} Alle Wohnungen</button>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:24,flexWrap:'wrap',gap:12}}>
      <div><h2 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:28,fontWeight:400,letterSpacing:-.5}}>{p.name}</h2><div style={{display:'flex',alignItems:'center',gap:6,color:'var(--text2)',fontSize:13,marginTop:6}}>{IC.pin} {p.address}</div></div>
      <span className={`pill ${p.status==='vermietet'?'pg':'pgy'}`} style={{fontSize:13,padding:'6px 16px'}}>{p.status}</span>
    </div>
    <div style={{display:'flex',gap:4,marginBottom:24,background:'var(--surface2)',padding:4,borderRadius:14,overflowX:'auto',flexWrap:'wrap'}}>
      {[['overview','Übersicht'],['fotos','Fotos'],['mieter','Mieter'],['rendite','Rendite'],['cashflow','10J-CF'],['mietanpassung','Anpassung'],['nkabrechnung','NK-Abr.'],['nk','NK-Details'],['scout','ImmoScout']].map(([k,l])=><button key={k} className={`tab${tab===k?' act':''}`} onClick={()=>setTab(k)}>{l}</button>)}
    </div>

    {tab==='overview'&&<div className="dgrid">
      <div>
        <div className="card" style={{padding:24,marginBottom:16}}><div className="sl">Objektdaten</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,fontSize:13}}>{[['Fläche',`${p.area} m²`],['Zimmer',p.rooms],['Etage',`${p.floor||'–'}/${p.total_floors||'–'}`],['Baujahr',p.year],['Heizung',p.heating_type||'–'],['Energie',p.energy_class||'–']].map(([l,v],i)=><div key={i}><div style={{color:'var(--text3)',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>{l}</div><div style={{fontWeight:600,fontSize:16,marginTop:2}}>{v}</div></div>)}</div>{feat.length>0&&<div style={{display:'flex',gap:6,marginTop:14,flexWrap:'wrap'}}>{feat.map(f=><span key={f} className="pill pgy">{f}</span>)}</div>}</div>
        {p.cold_rent>0&&<div className="card" style={{padding:24,marginBottom:16}}><div className="sl">Mietdaten</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,fontSize:13}}>{[['Kaltmiete',fmt(p.cold_rent)],['NK',fmt(p.utilities)],['Gesamt',fmt(p.total_rent)],['€/m²',ps.toFixed(2)+' €'],['Kaution',fmt(p.deposit)],['Start',fmtD(p.rent_start)]].map(([l,v],i)=><div key={i}><div style={{color:'var(--text3)',fontSize:11,fontWeight:600,textTransform:'uppercase'}}>{l}</div><div style={{fontWeight:i===2?700:600,fontSize:i===2?20:16,marginTop:2,color:i===2?'var(--accent)':'inherit'}}>{v}</div></div>)}</div></div>}
        {t&&<div className="card" style={{padding:24}}><div className="sl">Mieter</div><div style={{display:'flex',alignItems:'center',gap:14}}><div style={{width:48,height:48,borderRadius:14,background:'var(--accent-light)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--accent)'}}>{IC.user}</div><div><div style={{fontWeight:600,fontSize:17}}>{t.name}</div><div style={{display:'flex',gap:16,marginTop:6,fontSize:12,color:'var(--text2)',flexWrap:'wrap'}}><span style={{display:'flex',alignItems:'center',gap:4}}>{IC.ph} {t.phone}</span><span style={{display:'flex',alignItems:'center',gap:4}}>{IC.ml} {t.email}</span></div></div></div></div>}
      </div>
      <div>
        <div className="card" style={{padding:24,marginBottom:16}}><div className="sl">Finanzen</div><div style={{display:'grid',gap:10,fontSize:13}}>{[['Marktwert',fmt(p.market_value),'var(--accent)',20],['Kaufpreis',fmt(p.purchase_price),'var(--text)',15],['Darlehen',fmt(p.loan_amount),'var(--red)',15],['EK',fmt((p.market_value||0)-(p.loan_amount||0)),'var(--blue)',15],['Rate',fmt(p.loan_monthly_payment)+'/M','var(--text)',14],['Brutto-R.',bR.toFixed(2)+'%','var(--accent)',14],['CF/M',fmt(mCF),mCF>=0?'var(--accent)':'var(--red)',14]].map(([l,v,c,s],i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'6px 0',borderBottom:i<6?'1px solid var(--border)':'none'}}><span style={{color:'var(--text2)'}}>{l}</span><span style={{fontWeight:700,fontSize:s,color:c}}>{v}</span></div>)}</div></div>
        <div className="card" style={{padding:16}}><div className="sl" style={{padding:'4px 8px'}}>Schnellaktionen</div>{[{i:IC.eur,l:'Zahlung erfassen',c:'var(--accent)',b:'var(--accent-light)'},{i:IC.wrn,l:'Vorgang melden',c:'var(--amber)',b:'var(--amber-light)'},{i:IC.file,l:'Dokument',c:'var(--blue)',b:'var(--blue-light)'},{i:IC.cam,l:'Foto hochladen',c:'var(--text2)',b:'var(--surface2)'},{i:IC.globe,l:'ImmoScout',c:'var(--accent)',b:'var(--accent-light)'},{i:IC.calc,l:'NK-Abrechnung',c:'var(--amber)',b:'var(--amber-light)'}].map((a,i)=><div key={i} className="qa"><div style={{width:36,height:36,borderRadius:10,background:a.b,display:'flex',alignItems:'center',justifyContent:'center',color:a.c}}>{a.i}</div><span style={{fontWeight:500,fontSize:14,flex:1}}>{a.l}</span><span style={{color:'var(--text3)'}}>{IC.chv}</span></div>)}</div>
      </div>
    </div>}

    {tab==='fotos'&&<div style={{maxWidth:700}}><div className="photo-grid">{photos.map(ph=><div key={ph.id} className="photo-thumb"><img src={fileUrl(ph.file_path)} alt={ph.name} onClick={()=>setVp(ph)}/><button className="photo-del" onClick={()=>delPh(ph)}>✕</button></div>)}<label className="photo-upload"><input type="file" accept="image/*" multiple onChange={upPh} style={{display:'none'}}/>{upl?'Lädt...':'Fotos hochladen'}</label></div>{vp&&<div className="photo-modal" onClick={()=>setVp(null)}><img src={fileUrl(vp.file_path)} alt=""/></div>}</div>}

    {tab==='mieter'&&<div style={{maxWidth:600}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div className="sl">Mieterverwaltung</div><button className="btn bp" style={{fontSize:12}} onClick={()=>{setTf({name:'',phone:'',email:'',move_in:'',deposit:'',contract:'Unbefristet',notes:''});setTM('new');}}>{IC.plus} Mieter</button></div>
      {allT.map((t,i)=><div key={t.id} className="card" style={{marginBottom:12,padding:20}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div><strong>{t.name}</strong>{i===0?<span className="pill pg" style={{marginLeft:8,fontSize:10}}>Aktuell</span>:<span className="pill pgy" style={{marginLeft:8,fontSize:10}}>Vormieter</span>}</div><div style={{display:'flex',gap:4}}><button className="ib" onClick={()=>{setTf({...t,deposit:t.deposit||'',notes:t.notes||''});setTM('edit');}}>{IC.edit}</button><button className="ib" style={{color:'var(--red)'}} onClick={()=>delT(t.id)}>{IC.del}</button></div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13}}><div>Tel: {t.phone||'–'}</div><div>Mail: {t.email||'–'}</div><div>Einzug: {fmtD(t.move_in)}</div><div>Kaution: {fmt(t.deposit)}</div></div>{t.notes&&<div style={{fontSize:12,color:'var(--text2)',marginTop:6}}>{t.notes}</div>}</div>)}
      {allT.length===0&&<div className="empty">Kein Mieter</div>}
      {tM&&<Modal title={tM==='new'?'Neuer Mieter':'Bearbeiten'} onClose={()=>setTM(null)} footer={<><button className="btn bs" onClick={()=>setTM(null)}>Abbrechen</button><button className="btn bp" onClick={savT}>Speichern</button></>}><F label="Name"><input value={tf.name} onChange={e=>setTf(f=>({...f,name:e.target.value}))}/></F><div className="fr"><F label="Telefon"><input value={tf.phone} onChange={e=>setTf(f=>({...f,phone:e.target.value}))}/></F><F label="E-Mail"><input value={tf.email} onChange={e=>setTf(f=>({...f,email:e.target.value}))}/></F></div><div className="fr"><F label="Einzug"><input type="date" value={tf.move_in} onChange={e=>setTf(f=>({...f,move_in:e.target.value}))}/></F><F label="Kaution"><input type="number" value={tf.deposit} onChange={e=>setTf(f=>({...f,deposit:e.target.value}))}/></F></div><F label="Notizen"><textarea value={tf.notes} onChange={e=>setTf(f=>({...f,notes:e.target.value}))}/></F></Modal>}
    </div>}

    {tab==='rendite'&&<div style={{maxWidth:550}}><div className="sgrid">{[{l:'Brutto',v:bR.toFixed(2)+'%',c:'var(--accent)'},{l:'Netto',v:nR.toFixed(2)+'%',c:nR>=0?'var(--accent)':'var(--red)'},{l:'Markt-R.',v:(p.market_value?(aR/p.market_value*100):0).toFixed(2)+'%'},{l:'CF/M',v:fmt(mCF),c:mCF>=0?'var(--accent)':'var(--red)'}].map((s,i)=><div key={i} className="scard"><div className="sl2">{s.l}</div><div className="sv" style={{color:s.c}}>{s.v}</div></div>)}</div><div className="card" style={{padding:20}}><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><tbody>{[['Jahresmiete',fmt(aR)],['Rücklage','−'+fmt(aC)],['Darlehen','−'+fmt(aL)],['Netto-CF',fmt(aR-aC-aL)]].map(([l,v],i)=><tr key={i}><td style={{padding:'10px 0',borderBottom:i<3?'1px solid var(--border)':'none',fontWeight:i===3?700:400}}>{l}</td><td style={{textAlign:'right',fontWeight:i===3?700:600,padding:'10px 0',borderBottom:i<3?'1px solid var(--border)':'none',color:i===3?(aR-aC-aL>=0?'var(--accent)':'var(--red)'):'inherit'}}>{v}</td></tr>)}</tbody></table></div></div>}

    {tab==='cashflow'&&<div><div style={{color:'var(--text2)',fontSize:13,marginBottom:16}}>10-Jahres-Projektion (1,5%/J)</div><div className="card" style={{padding:0,overflow:'auto'}}><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><thead><tr>{['Jahr','Einnahmen','Rücklage','Darlehen','CF',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:600,textTransform:'uppercase',color:'var(--text2)',borderBottom:'2px solid var(--border)'}}>{h}</th>)}</tr></thead><tbody>{proj.map(r=><tr key={r.y}><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',fontWeight:600}}>{r.y}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.inc)}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.res)}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.ln)}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',fontWeight:700,color:r.cf>=0?'var(--accent)':'var(--red)'}}>{fmt(r.cf)}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',width:100}}><div style={{height:8,borderRadius:4,background:r.cf>=0?'var(--accent)':'var(--red)',width:`${Math.max(Math.abs(r.cf)/mxCF*100,4)}%`}}/></td></tr>)}</tbody></table></div></div>}

    {tab==='mietanpassung'&&<div style={{maxWidth:600}}><div className="sgrid">{[{l:'Kaltmiete',v:fmt(p.cold_rent),s:ps.toFixed(2)+' €/m²'},{l:'Kappung 20%',v:fmt(p.cold_rent*1.2),s:'+'+fmt(p.cold_rent*0.2*12)+'/J'}].map((s,i)=><div key={i} className="scard"><div className="sl2">{s.l}</div><div className="sv">{s.v}</div>{s.s&&<div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{s.s}</div>}</div>)}</div><div className="card" style={{padding:20}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{[10,20].map(pct=><div key={pct} style={{padding:14,background:'var(--surface2)',borderRadius:10}}><div style={{fontSize:12,color:'var(--text2)'}}>+{pct}%</div><div style={{fontWeight:700,fontSize:20,marginTop:4}}>{fmt(p.cold_rent*(1+pct/100))}</div><div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{p.area?((p.cold_rent*(1+pct/100))/p.area).toFixed(2):'-'} €/m²</div></div>)}</div><div style={{fontSize:12,color:'var(--text2)',marginTop:14,lineHeight:1.6}}>§558 BGB: Frühestens 15 Monate nach letzter Erhöhung. Max 20% in 3 Jahren. Begründung: Mietspiegel/Gutachten.</div></div></div>}

    {tab==='nkabrechnung'&&<div style={{maxWidth:650}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div className="sl">NK-Abrechnung</div><select value={nkY} onChange={e=>setNkY(e.target.value)} style={{padding:'6px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--surface)',color:'var(--text)',fontSize:13}}>{[2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select></div>
      {(()=>{const nka=genNk();return(<><div className="sgrid">{[{l:'Vorauszahlung',v:fmt(nka.vz)},{l:'Kosten',v:fmt(nka.tot)},{l:nka.d>=0?'Guthaben':'Nachzahlung',v:fmt(Math.abs(nka.d)),c:nka.d>=0?'var(--accent)':'var(--red)'}].map((s,i)=><div key={i} className="scard"><div className="sl2">{s.l}</div><div className="sv" style={{color:s.c}}>{s.v}</div></div>)}</div>
        <div className="card" style={{padding:20,marginBottom:16}}>{nka.um.length===0?<div style={{color:'var(--text3)',fontSize:13}}>Keine Kosten für {nkY}</div>:<table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><tbody>{nka.um.map(c=><tr key={c.id}><td style={{padding:'6px 0',borderBottom:'1px solid var(--border)'}}>{fmtD(c.date)}</td><td style={{borderBottom:'1px solid var(--border)'}}>{c.category}</td><td style={{textAlign:'right',fontWeight:600,borderBottom:'1px solid var(--border)'}}>{fmt(c.amount)}</td></tr>)}<tr><td colSpan={2} style={{fontWeight:700,paddingTop:8}}>Gesamt</td><td style={{textAlign:'right',fontWeight:700,paddingTop:8}}>{fmt(nka.tot)}</td></tr></tbody></table>}</div>
        <button className="btn bp" onClick={()=>cp(`NK-ABRECHNUNG ${nkY}\n${p.name}\nMieter: ${t?.name||'–'}\n\n${nka.um.map(c=>`${fmtD(c.date)} | ${c.category} | ${fmt(c.amount)}`).join('\n')}\n\nGesamt: ${fmt(nka.tot)}\nVorauszahlung: ${fmt(nka.vz)}\n${nka.d>=0?'GUTHABEN':'NACHZAHLUNG'}: ${fmt(Math.abs(nka.d))}`)}}>Kopieren</button>
      </>);})()}</div>}

    {tab==='nk'&&<div style={{maxWidth:500}}><div className="card" style={{padding:20}}><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><tbody>{Object.entries(NKL).map(([k,l])=><tr key={k}><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>{l}</td><td style={{textAlign:'right',fontWeight:600,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>{fmt(nk[k]||0)}</td></tr>)}<tr><td style={{fontWeight:700,paddingTop:8}}>Gesamt</td><td style={{textAlign:'right',fontWeight:700,paddingTop:8}}>{fmt(nkT)}</td></tr></tbody></table></div></div>}

    {tab==='scout'&&<div>{!scout?<button className="btn bp" onClick={genS}>Inserat generieren</button>:<div><div style={{display:'flex',gap:8,marginBottom:16}}><button className="btn bp" onClick={()=>cp(scout)}>Kopieren</button><button className="btn bs" onClick={genS}>Neu</button></div><div style={{background:'var(--surface2)',borderRadius:10,padding:16,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:500,overflow:'auto'}}>{scout}</div></div>}</div>}
  </div>);
}

// ═══ EINNAHMEN ═══
function PayPage({data,user,reload}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [tab,setTab]=useState('monthly');const [gen,setGen]=useState(false);
  const rented=data.properties.filter(p=>p.status==='vermietet');
  const save=async()=>{const row={...form,expected:Number(form.expected)||0,received:Number(form.received)||0};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('payments').insert(row);}else{const{id,user_id,created_at,household_id,...u}=row;await supabase.from('payments').update(u).eq('id',id);}await reload();setModal(null);};
  const months=[...new Set(data.payments.map(p=>p.month))].sort().reverse();
  const tR=data.payments.reduce((s,p)=>s+(p.received||0),0);const tE=data.payments.reduce((s,p)=>s+(p.expected||0),0);const tC=data.costs.reduce((s,c)=>s+(c.amount||0),0);
  const autoG=async()=>{const cm=new Date().toISOString().slice(0,7);setGen(true);let c=0;for(const p of rented){if(!data.payments.find(pay=>pay.property_id===p.id&&pay.month===cm)&&p.total_rent>0){await supabase.from('payments').insert({user_id:user.id,property_id:p.id,month:cm,expected:p.total_rent,received:0,notes:'Auto'});c++;}}await reload();setGen(false);alert(c>0?`${c} erstellt`:'Bereits vorhanden');};
  const conf=async(p)=>{const{id,user_id,created_at,household_id,...u}=p;await supabase.from('payments').update({...u,received:p.expected}).eq('id',id);await reload();};
  return(<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}><div><h2 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:28,fontWeight:400}}>Einnahmen</h2></div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="btn bs" onClick={autoG} disabled={gen}>{gen?'Lädt...':'Vorausfüllen'}</button><button className="btn bp" onClick={()=>{const p=rented[0];setForm({property_id:p?.id||'',month:new Date().toISOString().slice(0,7),expected:p?.total_rent||'',received:'',notes:''});setModal('new');}}>{IC.plus} Zahlung</button></div></div>
    <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--surface2)',padding:3,borderRadius:12,maxWidth:300}}><button className={`tab${tab==='monthly'?' act':''}`} style={{flex:1}} onClick={()=>setTab('monthly')}>Monatlich</button><button className={`tab${tab==='yearly'?' act':''}`} style={{flex:1}} onClick={()=>setTab('yearly')}>Jahresübersicht</button></div>
    {tab==='yearly'&&<div className="sgrid">{[{l:'Einnahmen',v:fmt(tR),c:'var(--accent)'},{l:'Ausstehend',v:fmt(tE-tR),c:tE-tR>0?'var(--red)':'var(--accent)'},{l:'Kosten',v:fmt(tC),c:'var(--red)'},{l:'Cashflow',v:fmt(tR-tC),c:tR-tC>=0?'var(--accent)':'var(--red)'}].map((s,i)=><div key={i} className="scard"><div className="sl2">{s.l}</div><div className="sv" style={{color:s.c}}>{s.v}</div></div>)}</div>}
    {months.map(m=>{const mp=data.payments.filter(p=>p.month===m);const exp=mp.reduce((s,p)=>s+(p.expected||0),0);const rec=mp.reduce((s,p)=>s+(p.received||0),0);return(<div key={m} className="card" style={{marginBottom:16,padding:0}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}><strong>{mName(m)}</strong><div style={{display:'flex',gap:12,fontSize:13}}>Soll: <strong>{fmt(exp)}</strong> Ist: <strong style={{color:rec<exp?'var(--red)':'var(--accent)'}}>{fmt(rec)}</strong>{rec>=exp&&exp>0&&<span className="pill pg">✓</span>}{rec<exp&&<span className="pill pr">−{fmt(exp-rec)}</span>}</div></div>
      {mp.map(p=>{const pr=data.properties.find(x=>x.id===p.property_id);const paid=p.received>=p.expected&&p.expected>0;return(<div key={p.id} style={{padding:'10px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,flexWrap:'wrap',gap:8}}><span style={{fontWeight:600}}>{pr?.name||'–'}</span><div style={{display:'flex',gap:10,alignItems:'center'}}>{fmt(p.expected)} <strong style={{color:paid?'var(--accent)':'var(--red)'}}>{fmt(p.received)}</strong>{!paid&&p.expected>0&&<button className="btn bp" style={{padding:'4px 10px',fontSize:11}} onClick={()=>conf(p)}>✓</button>}<button className="ib" onClick={()=>{setForm({...p,expected:p.expected||'',received:p.received||'',notes:p.notes||''});setModal('edit');}}>{IC.edit}</button></div></div>);})}
    </div>);})}
    {data.payments.length===0&&<div className="empty">Klicke "Vorausfüllen"</div>}
    {modal&&<Modal title={modal==='new'?'Zahlung':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn bs" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn bp" onClick={save}>Speichern</button></>}>
      <F label="Immobilie"><select value={form.property_id} onChange={e=>{const pr=rented.find(p=>p.id===e.target.value);setForm(f=>({...f,property_id:e.target.value,expected:pr?.total_rent||f.expected}));}}>{rented.map(p=><option key={p.id} value={p.id}>{p.name} ({fmt(p.total_rent)})</option>)}</select></F>
      <F label="Monat"><input type="month" value={form.month} onChange={e=>setForm(f=>({...f,month:e.target.value}))}/></F>
      <div className="fr"><F label="Soll"><input type="number" value={form.expected} onChange={e=>setForm(f=>({...f,expected:e.target.value}))}/></F><F label="Ist"><input type="number" value={form.received} onChange={e=>setForm(f=>({...f,received:e.target.value}))}/></F></div>
      <F label="Notizen"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></F>
    </Modal>}
  </div>);
}

// ═══ KOSTEN ═══
function CostPage({data,user,reload}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [filter,setFilter]=useState({p:'all',c:'all'});
  const save=async()=>{const row={...form,amount:Number(form.amount)||0};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('costs').insert(row);}else{const{id,user_id,created_at,household_id,...u}=row;await supabase.from('costs').update(u).eq('id',id);}await reload();setModal(null);};
  const del=async(id)=>{if(confirm('Löschen?')){await supabase.from('costs').delete().eq('id',id);await reload();}};
  const f=data.costs.filter(c=>(filter.p==='all'||c.property_id===filter.p)&&(filter.c==='all'||c.category===filter.c));
  return(<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}><div><h2 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:28,fontWeight:400}}>Kosten</h2><p style={{color:'var(--text2)',fontSize:14,marginTop:2}}>{fmt(f.reduce((s,c)=>s+(c.amount||0),0))}</p></div><button className="btn bp" onClick={()=>{setForm({property_id:data.properties[0]?.id||'',date:td(),category:CCATS[0],amount:'',notes:''});setModal('new');}}>{IC.plus} Kosten</button></div>
    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}><select value={filter.p} onChange={e=>setFilter(x=>({...x,p:e.target.value}))} className="fsel"><option value="all">Alle</option>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={filter.c} onChange={e=>setFilter(x=>({...x,c:e.target.value}))} className="fsel"><option value="all">Alle Kat.</option>{CCATS.map(c=><option key={c}>{c}</option>)}</select></div>
    <div className="card" style={{padding:0}}>{f.map(c=>{const pr=data.properties.find(p=>p.id===c.property_id);return(<div key={c.id} style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13,flexWrap:'wrap',gap:8}}><div>{fmtD(c.date)} <strong>{pr?.name||'–'}</strong> <span className="pill pgy">{c.category}</span></div><div style={{display:'flex',gap:8,alignItems:'center'}}><strong>{fmt(c.amount)}</strong><button className="ib" onClick={()=>{setForm({...c,amount:c.amount||'',notes:c.notes||''});setModal('edit');}}>{IC.edit}</button><button className="ib" style={{color:'var(--red)'}} onClick={()=>del(c.id)}>{IC.del}</button></div></div>);})}</div>
    {f.length===0&&<div className="empty">Keine Kosten</div>}
    {modal&&<Modal title={modal==='new'?'Kosten':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn bs" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn bp" onClick={save}>Speichern</button></>}>
      <F label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
      <div className="fr"><F label="Datum"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></F><F label="Kategorie"><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CCATS.map(c=><option key={c}>{c}</option>)}</select></F></div>
      <F label="Betrag"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></F>
      <F label="Notizen"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></F>
    </Modal>}
  </div>);
}

// ═══ VORGÄNGE ═══
function VorgPage({data,user,reload}){
  const [tab,setTab]=useState('tickets');const [modal,setModal]=useState(null);const [form,setForm]=useState({});
  const savTk=async()=>{const row={...form,cost:Number(form.cost)||0};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('tickets').insert(row);}else{const{id,user_id,created_at,household_id,...u}=row;await supabase.from('tickets').update(u).eq('id',id);}await reload();setModal(null);};
  const savTa=async()=>{const row={...form};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('tasks').insert(row);}else{const{id,user_id,created_at,household_id,...u}=row;await supabase.from('tasks').update(u).eq('id',id);}await reload();setModal(null);};
  const tog=async(id)=>{const t=data.tasks.find(x=>x.id===id);await supabase.from('tasks').update({status:t.status==='erledigt'?'offen':'erledigt'}).eq('id',id);await reload();};
  return(<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}><h2 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:28,fontWeight:400}}>Vorgänge</h2><button className="btn bp" onClick={()=>{if(tab==='tickets')setForm({property_id:data.properties[0]?.id||'',title:'',description:'',date:td(),status:'offen',cost:'',notes:''});else setForm({title:'',due:'',property_id:'all',category:TCATS[0],status:'offen',notes:''});setModal('new');}}>{IC.plus} {tab==='tickets'?'Vorgang':'Aufgabe'}</button></div>
    <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--surface2)',padding:3,borderRadius:12,maxWidth:320}}><button className={`tab${tab==='tickets'?' act':''}`} style={{flex:1}} onClick={()=>setTab('tickets')}>Reparaturen ({data.tickets.length})</button><button className={`tab${tab==='tasks'?' act':''}`} style={{flex:1}} onClick={()=>setTab('tasks')}>Aufgaben ({data.tasks.length})</button></div>
    {tab==='tickets'&&<div className="card-grid">{data.tickets.map(t=>{const pr=data.properties.find(p=>p.id===t.property_id);return(<div key={t.id} className="card" style={{padding:20}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span className={`pill ${t.status==='offen'?'pr':t.status==='in Bearbeitung'?'pa':'pg'}`}>{t.status}</span><span style={{fontSize:12,color:'var(--text3)'}}>{fmtD(t.date)}</span></div><div style={{fontWeight:600}}>{t.title}</div><div style={{fontSize:13,color:'var(--text2)'}}>{pr?.name}</div>{t.cost>0&&<div style={{fontSize:13,marginTop:4}}>Kosten: {fmt(t.cost)}</div>}<button className="btn bs" style={{marginTop:10,fontSize:12}} onClick={()=>{setForm({...t,cost:t.cost||'',notes:t.notes||''});setModal('edit');}}>{IC.edit} Bearbeiten</button></div>);})}{data.tickets.length===0&&<div className="empty">Keine Vorgänge</div>}</div>}
    {tab==='tasks'&&<div>{data.tasks.map(t=>{const pr=t.property_id!=='all'?data.properties.find(p=>p.id===t.property_id):null;return(<div key={t.id} className="card" style={{marginBottom:8,padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}><button onClick={()=>tog(t.id)} style={{width:24,height:24,borderRadius:'50%',border:`2px solid ${t.status==='erledigt'?'var(--accent)':'var(--border)'}`,background:t.status==='erledigt'?'var(--accent)':'transparent',cursor:'pointer',flexShrink:0,color:'#fff',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>{t.status==='erledigt'?'✓':''}</button><div style={{flex:1,opacity:t.status==='erledigt'?.5:1}}><div style={{fontWeight:600,fontSize:14}}>{t.title}</div><div style={{fontSize:12,color:'var(--text2)'}}>{t.category}{pr?' · '+pr.name:''}</div></div><span style={{fontSize:13,color:'var(--text2)'}}>{fmtD(t.due)}</span><button className="ib" onClick={()=>{setForm({...t,notes:t.notes||''});setModal('edit');}}>{IC.edit}</button></div>);})}{data.tasks.length===0&&<div className="empty">Keine Aufgaben</div>}</div>}
    {modal&&tab==='tickets'&&<Modal title={modal==='new'?'Vorgang':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn bs" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn bp" onClick={savTk}>Speichern</button></>}><F label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></F><F label="Titel"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></F><F label="Beschreibung"><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></F><div className="fr"><F label="Datum"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></F><F label="Status"><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{TSTAT.map(s=><option key={s}>{s}</option>)}</select></F></div><F label="Kosten"><input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}/></F></Modal>}
    {modal&&tab==='tasks'&&<Modal title={modal==='new'?'Aufgabe':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn bs" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn bp" onClick={savTa}>Speichern</button></>}><F label="Titel"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></F><div className="fr"><F label="Fällig"><input type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))}/></F><F label="Kategorie"><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{TCATS.map(c=><option key={c}>{c}</option>)}</select></F></div><F label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}><option value="all">Alle</option>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></F></Modal>}
  </div>);
}

// ═══ DOKUMENTE ═══
function DocPage({data,user,reload}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [upl,setUpl]=useState(false);const [genM,setGenM]=useState(null);
  const save=async()=>{const row={...form};if(modal==='new'){delete row.id;row.user_id=user.id;if(row.category==='E-Mail'&&!row.name)row.name=row.email_subject||'E-Mail';await supabase.from('documents').insert(row);}else{const{id,user_id,created_at,household_id,tenant_id,...u}=row;await supabase.from('documents').update(u).eq('id',id);}await reload();setModal(null);};
  const del=async(id)=>{if(confirm('Löschen?')){await supabase.from('documents').delete().eq('id',id);await reload();}};
  const upF=async(e,doc)=>{const file=e.target.files?.[0];if(!file)return;setUpl(true);try{const path=await upFile(user.id,file,'docs');if(doc)await supabase.from('documents').update({file_path:path}).eq('id',doc.id);else setForm(f=>({...f,file_path:path,name:f.name||file.name}));await reload();}catch(er){alert('Fehler: '+er.message);}setUpl(false);};
  const grouped=data.properties.map(p=>({p,docs:data.documents.filter(d=>d.property_id===p.id)})).filter(g=>g.docs.length>0);

  const genDoc=(type)=>{const prop=data.properties.find(p=>p.id===form.property_id)||data.properties[0];const ten=data.tenants.find(t=>t.property_id===prop?.id);const feat=[prop?.balcony&&'Balkon',prop?.cellar&&'Keller',prop?.elevator&&'Aufzug',prop?.has_parking&&'Stellplatz'].filter(Boolean);
    if(type==='mietvertrag')return`MIETVERTRAG\n${'═'.repeat(40)}\nVermieter: [Name]\nMieter: ${ten?.name||'[Name]'}\nObjekt: ${prop?.name||''}\n${prop?.address||''}\n\n§1 Mietobjekt\n${prop?.rooms||'–'}-Zi, ${prop?.area||'–'} m², ${prop?.floor||'–'}.OG\n${feat.join(', ')}\n\n§2 Miete\nKalt: ${fmt(prop?.cold_rent)}\nNK: ${fmt(prop?.utilities)}\nGesamt: ${fmt(prop?.total_rent)}\nKaution: ${fmt(prop?.deposit)}\n\n§3 Mietbeginn: ${fmtD(prop?.rent_start)}\nVertrag: Unbefristet`;
    return`ÜBERGABEPROTOKOLL\n${'═'.repeat(40)}\n${prop?.name||''}\n${prop?.address||''}\nDatum: ${td()}\nMieter: ${ten?.name||'[Name]'}\nArt: ${genM==='einzug'?'EINZUG':'AUSZUG'}\n\nZähler: Strom ___ · Gas ___ · Wasser ___\nSchlüssel: Haustür __ · Wohnung __ · Keller __\n\nRäume:\n${['Flur','Wohnzimmer','Schlafzimmer','Küche','Bad'].map(r=>`${r}: Wände ☐ · Boden ☐ · Fenster ☐`).join('\n')}\n\nMängel:\n___`;
  };

  return(<div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24,flexWrap:'wrap',gap:12}}><div><h2 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:28,fontWeight:400}}>Dokumente</h2><p style={{color:'var(--text2)',fontSize:14,marginTop:2}}>{data.documents.length} Einträge</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button className="btn bs" style={{fontSize:12}} onClick={()=>{setForm({property_id:data.properties[0]?.id||''});setGenM('mietvertrag');}}>Mietvertrag</button><button className="btn bs" style={{fontSize:12}} onClick={()=>{setForm({property_id:data.properties[0]?.id||''});setGenM('einzug');}}>Einzug</button><button className="btn bs" style={{fontSize:12}} onClick={()=>{setForm({property_id:data.properties[0]?.id||''});setGenM('auszug');}}>Auszug</button><button className="btn bp" onClick={()=>{setForm({property_id:data.properties[0]?.id||'',category:DCATS[0],name:'',date:td(),notes:'',file_path:'',email_from:'',email_to:'',email_subject:'',email_body:''});setModal('new');}}>{IC.plus} Dokument</button></div></div>
    {grouped.map(({p,docs})=><div key={p.id} style={{marginBottom:20}}><div style={{padding:'10px 16px',background:'var(--surface2)',borderRadius:'12px 12px 0 0',border:'1px solid var(--border)',borderBottom:'none',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:8}}><span style={{color:'var(--accent)'}}>{IC.bld}</span>{p.name} <span style={{color:'var(--text3)',fontWeight:400}}>{docs.length}</span></div><div className="card" style={{borderRadius:'0 0 12px 12px',padding:0}}>{docs.map(d=><div key={d.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}>
      <div style={{flex:1,minWidth:0}}><strong>{d.category==='E-Mail'?(d.email_subject||d.name):(d.name||'–')}</strong><span className="pill pb" style={{marginLeft:8,fontSize:10}}>{d.category}</span><span style={{color:'var(--text3)',marginLeft:8,fontSize:12}}>{fmtD(d.date)}</span></div>
      <div style={{display:'flex',gap:4,alignItems:'center'}}>{d.file_path&&<a href={fileUrl(d.file_path)} target="_blank" rel="noreferrer" className="ib" title="Download">{IC.dl}</a>}{!d.file_path&&<label style={{cursor:'pointer'}}><input type="file" onChange={e=>upF(e,d)} style={{display:'none'}}/><span className="ib">{IC.ul}</span></label>}<button className="ib" onClick={()=>{setForm({...d,notes:d.notes||'',email_from:d.email_from||'',email_to:d.email_to||'',email_subject:d.email_subject||'',email_body:d.email_body||''});setModal('edit');}}>{IC.edit}</button><button className="ib" style={{color:'var(--red)'}} onClick={()=>del(d.id)}>{IC.del}</button></div>
    </div>)}</div></div>)}
    {data.documents.length===0&&<div className="empty">Noch keine Dokumente</div>}

    {genM&&<Modal title={genM==='mietvertrag'?'Mietvertrag':'Übergabeprotokoll'} onClose={()=>setGenM(null)} footer={<button className="btn bs" onClick={()=>setGenM(null)}>Schließen</button>}>
      <F label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
      <div style={{background:'var(--surface2)',borderRadius:10,padding:16,fontSize:12,lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:400,overflow:'auto',marginTop:12}}>{genDoc(genM==='mietvertrag'?'mietvertrag':'protokoll')}</div>
      <div style={{display:'flex',gap:8,marginTop:12}}><button className="btn bp" onClick={()=>{navigator.clipboard?.writeText(genDoc(genM==='mietvertrag'?'mietvertrag':'protokoll'));alert('Kopiert!');}}>Kopieren</button><button className="btn bs" onClick={async()=>{const type=genM==='mietvertrag'?'Mietvertrag':'Abnahmeprotokoll';await supabase.from('documents').insert({user_id:user.id,property_id:form.property_id,category:type,name:`${type}_${td()}.txt`,date:td(),generated_content:genDoc(genM==='mietvertrag'?'mietvertrag':'protokoll')});await reload();setGenM(null);alert('Gespeichert!');}}>Speichern</button></div>
    </Modal>}

    {modal&&<Modal title={modal==='new'?'Dokument':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn bs" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn bp" onClick={save}>Speichern</button></>}>
      <F label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></F>
      <F label="Kategorie"><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{DCATS.map(c=><option key={c}>{c}</option>)}</select></F>
      {form.category==='E-Mail'?<><div className="fr"><F label="Von"><input value={form.email_from} onChange={e=>setForm(f=>({...f,email_from:e.target.value}))}/></F><F label="An"><input value={form.email_to} onChange={e=>setForm(f=>({...f,email_to:e.target.value}))}/></F></div><F label="Betreff"><input value={form.email_subject} onChange={e=>setForm(f=>({...f,email_subject:e.target.value}))}/></F><F label="Text"><textarea value={form.email_body} onChange={e=>setForm(f=>({...f,email_body:e.target.value}))} style={{minHeight:100}}/></F></>:<F label="Name"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></F>}
      <F label="Datei">{upl?<div style={{fontSize:13,color:'var(--text2)'}}>Lädt...</div>:<div><input type="file" onChange={e=>upF(e,null)}/>{form.file_path&&<div style={{fontSize:12,color:'var(--accent)',marginTop:4}}>✓ {form.file_path.split('/').pop()}</div>}</div>}</F>
      <F label="Datum"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></F>
      <F label="Notizen"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></F>
    </Modal>}
  </div>);
}

// ═══ EINSTELLUNGEN ═══
function SetPage({user,theme,setTheme,hh,members,invEmail,setInvEmail,invMsg,inv,data}){
  const [sY,setSY]=useState('2025');const cp=(t)=>{navigator.clipboard?.writeText(t).then(()=>alert('Kopiert!')).catch(()=>{});};
  const genAV=()=>{const r=data.properties.filter(p=>p.status==='vermietet');let t=`ANLAGE V – ${sY}\n${'═'.repeat(50)}\n\n`;let tE=0,tW=0;r.forEach((p,i)=>{const yP=data.payments.filter(pay=>pay.property_id===p.id&&(pay.month||'').startsWith(sY));const yC=data.costs.filter(c=>c.property_id===p.id&&(c.date||'').startsWith(sY));const ein=yP.reduce((s,pay)=>s+(pay.received||0),0);const wk=yC.reduce((s,c)=>s+(c.amount||0),0);const zins=(p.loan_amount||0)*(p.loan_rate||0)/100;const afa=p.year<1925?((p.purchase_price||0)*0.025):((p.purchase_price||0)*0.02);const tw=wk+zins+afa;tE+=ein;tW+=tw;t+=`OBJEKT ${i+1}: ${p.name}\n${p.address}\nEinnahmen: ${fmt(ein)}\nSchuldzinsen: ${fmt(zins)}\nAfA: ${fmt(afa)}\nKosten: ${fmt(wk)}\nWK gesamt: ${fmt(tw)}\nErgebnis: ${fmt(ein-tw)}\n\n`;});t+=`${'═'.repeat(50)}\nGESAMT: ${fmt(tE)} Einnahmen · ${fmt(tW)} WK · ${fmt(tE-tW)} Ergebnis`;return t;};
  const csvExp=()=>{const rows=[['Immobilie','Adresse','Status','Fläche','Kaltmiete','Gesamt','Marktwert','Darlehen']];data.properties.forEach(p=>rows.push([p.name,p.address,p.status,p.area,p.cold_rent,p.total_rent,p.market_value,p.loan_amount]));const csv=rows.map(r=>r.map(c=>`"${c}"`).join(';')).join('\n');const b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`cahomes_${td()}.csv`;a.click();};
  const jsonExp=()=>{const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`cahomes_backup_${td()}.json`;a.click();};
  return(<div>
    <h2 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:28,fontWeight:400,marginBottom:24}}>Einstellungen</h2>
    <div style={{display:'grid',gap:16,maxWidth:600}}>
      <div className="card" style={{padding:24}}><div style={{fontWeight:600,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>{IC.users} Haushalt</div>
        {members.map(m=><div key={m.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><span>{m.invited_email||user.email}</span><span className={`pill ${m.status==='active'?'pg':'pa'}`}>{m.status==='active'?'Aktiv':'Eingeladen'}</span></div>)}
        <div style={{background:'var(--surface2)',borderRadius:10,padding:16,marginTop:12}}><div style={{display:'flex',gap:8}}><input type="email" placeholder="E-Mail einladen" value={invEmail} onChange={e=>setInvEmail(e.target.value)} style={{flex:1,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--input-bg)',color:'var(--text)',outline:'none',fontSize:13}}/><button className="btn bp" style={{fontSize:12}} onClick={inv}>Einladen</button></div>{invMsg&&<div style={{fontSize:12,marginTop:8,color:invMsg.startsWith('F')?'var(--red)':'var(--accent)'}}>{invMsg}</div>}</div>
      </div>
      <div className="card" style={{padding:24}}><div style={{fontWeight:600,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>{IC.calc} Steuerexport (Anlage V)</div><div style={{display:'flex',gap:8,alignItems:'center'}}><select value={sY} onChange={e=>setSY(e.target.value)} className="fsel">{[2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select><button className="btn bp" style={{fontSize:12}} onClick={()=>cp(genAV())}>Kopieren</button><button className="btn bs" style={{fontSize:12}} onClick={()=>{const w=window.open('','_blank');w.document.write(`<pre style="font-family:monospace;padding:24px;font-size:13px">${genAV()}</pre>`);w.print();}}>Drucken</button></div></div>
      <div className="card" style={{padding:24}}><div style={{fontWeight:600,marginBottom:12}}>Darstellung</div><button className="btn bs" onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='dark'?'Hellmodus':'Dunkelmodus'}</button></div>
      <div className="card" style={{padding:24}}><div style={{fontWeight:600,marginBottom:12}}>Export</div><div style={{display:'flex',gap:8}}><button className="btn bp" style={{fontSize:12}} onClick={csvExp}>CSV</button><button className="btn bs" style={{fontSize:12}} onClick={jsonExp}>JSON Backup</button></div></div>
      <div className="card" style={{padding:24}}><div style={{fontWeight:600,marginBottom:12}}>Account</div><div style={{fontSize:13,color:'var(--text2)',marginBottom:8}}>{user.email}</div><button className="btn bs" onClick={()=>supabase.auth.signOut()}>Abmelden</button></div>
    </div>
  </div>);
}


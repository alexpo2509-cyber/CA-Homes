'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const fmt = (n) => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n||0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '–';
const td = () => new Date().toISOString().split('T')[0];
const monthName = (m) => { const [y,mo]=m.split('-'); return new Date(y,mo-1).toLocaleDateString('de-DE',{month:'long',year:'numeric'}); };
const COST_CATS=['Reparatur','Hausgeld','Versicherung','Verwaltung','Renovierung','Sonstiges'];
const TASK_CATS=['Nebenkostenabrechnung','Versicherung','Hausgeld','Mieterhöhung','Wartung','Sonstiges'];
const DOC_CATS=['Mietvertrag','Abnahmeprotokoll','Nebenkostenabrechnung','Rechnung','Versicherung','E-Mail','Foto','Sonstiges'];
const TICKET_STATUS=['offen','in Bearbeitung','erledigt'];
const NK_LABELS={heating:'Heizkosten',water:'Wasser/Abwasser',garbage:'Müllabfuhr',insurance:'Gebäudeversicherung',management:'Hausverwaltung',elevator:'Aufzug',cleaning:'Treppenhausreinigung',garden:'Gartenpflege',cableTV:'Kabelanschluss',other:'Sonstige'};

function Modal({title,onClose,children,footer}){return(<div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modal-header"><h3>{title}</h3><button className="btn-ghost" onClick={onClose}>✕</button></div><div className="modal-body">{children}</div>{footer&&<div className="modal-footer">{footer}</div>}</div></div>);}
function Field({label,children}){return <div className="form-group"><label>{label}</label>{children}</div>;}

export default function Home(){
  const [user,setUser]=useState(null);const [loading,setLoading]=useState(true);
  const [authMode,setAuthMode]=useState('login');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');
  const [data,setData]=useState(null);const [page,setPage]=useState('dashboard');const [theme,setTheme]=useState('light');
  const [household,setHousehold]=useState(null);const [members,setMembers]=useState([]);const [inviteEmail,setInviteEmail]=useState('');const [inviteMsg,setInviteMsg]=useState('');

  useEffect(()=>{try{const s=localStorage.getItem('ca-theme');if(s)setTheme(s)}catch{};},[]);
  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme);try{localStorage.setItem('ca-theme',theme)}catch{}},[theme]);
  useEffect(()=>{supabase.auth.getUser().then(({data:{user}})=>{setUser(user);setLoading(false)});const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setUser(s?.user??null));return()=>subscription.unsubscribe();},[]);

  const loadData=useCallback(async()=>{if(!user)return;
    const[p,t,pay,c,tk,ta,d]=await Promise.all([supabase.from('properties').select('*').order('created_at'),supabase.from('tenants').select('*'),supabase.from('payments').select('*').order('month',{ascending:false}),supabase.from('costs').select('*').order('date',{ascending:false}),supabase.from('tickets').select('*').order('date',{ascending:false}),supabase.from('tasks').select('*').order('due'),supabase.from('documents').select('*').order('date',{ascending:false})]);
    setData({properties:p.data||[],tenants:t.data||[],payments:pay.data||[],costs:c.data||[],tickets:tk.data||[],tasks:ta.data||[],documents:d.data||[]});
    const{data:mem}=await supabase.from('household_members').select('*,households(*)').eq('user_id',user.id);
    if(mem?.length>0){setHousehold(mem[0].households);const{data:all}=await supabase.from('household_members').select('*').eq('household_id',mem[0].household_id);setMembers(all||[]);}
  },[user]);
  useEffect(()=>{if(user)loadData();},[user,loadData]);

  const handleAuth=async(e)=>{e.preventDefault();setError('');const{error}=authMode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});if(error)setError(error.message);};
  const inviteMember=async()=>{if(!inviteEmail||!household)return;const{error}=await supabase.from('household_members').insert({household_id:household.id,invited_email:inviteEmail,role:'member',status:'pending',user_id:user.id});setInviteMsg(error?'Fehler: '+error.message:`${inviteEmail} eingeladen!`);if(!error){setInviteEmail('');loadData();}};

  if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)',color:'var(--text3)'}}>Laden...</div>;
  if(!user)return(<div className="login-wrap"><div className="login-card"><h1 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:30,marginBottom:4}}>CA Homes</h1><p style={{color:'var(--text2)',fontSize:13,marginBottom:28}}>{authMode==='login'?'Anmelden':'Registrieren'}</p>{error&&<div className="login-error">{error}</div>}<form onSubmit={handleAuth}><input type="email" placeholder="E-Mail" value={email} onChange={e=>{setEmail(e.target.value);setError('')}} style={{width:'100%',padding:'12px 16px',border:'1px solid var(--border)',borderRadius:10,fontSize:15,marginBottom:14,outline:'none',background:'var(--input-bg)',color:'var(--text)'}}/><input type="password" placeholder="Passwort" value={password} onChange={e=>{setPassword(e.target.value);setError('')}} style={{width:'100%',padding:'12px 16px',border:'1px solid var(--border)',borderRadius:10,fontSize:15,marginBottom:14,outline:'none',background:'var(--input-bg)',color:'var(--text)'}}/><button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:12,fontSize:15}}>{authMode==='login'?'Anmelden':'Account erstellen'}</button></form><button onClick={()=>setAuthMode(a=>a==='login'?'signup':'login')} style={{background:'none',border:'none',color:'var(--accent)',fontSize:13,marginTop:16,cursor:'pointer'}}>{authMode==='login'?'Noch kein Account? Registrieren':'Bereits registriert? Anmelden'}</button></div></div>);
  if(!data)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'var(--bg)',color:'var(--text3)'}}>Daten laden...</div>;

  return(
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand"><h1 style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:22,fontWeight:400,color:'#fff'}}>CA Homes</h1><p style={{fontSize:11,color:'rgba(255,255,255,0.4)',letterSpacing:1,textTransform:'uppercase',marginTop:2}}>Property Management</p></div>
        <nav className="sidebar-nav">
          {[{id:'dashboard',l:'🏠  Dashboard'},{id:'properties',l:'🏢  Immobilien'},{id:'payments',l:'💶  Einnahmen'},{id:'costs',l:'💳  Kosten'},{id:'vorgaenge',l:'🔧  Vorgänge'},{id:'documents',l:'📁  Dokumente'},{id:'settings',l:'⚙️  Einstellungen'}].map(n=>(
            <button key={n.id} className={(page===n.id||(n.id==='properties'&&page.startsWith('detail:')))?'active':''} onClick={()=>setPage(n.id)}>{n.l}</button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='dark'?'☀️ Hell':'🌙 Dunkel'}</button>
          <button onClick={()=>supabase.auth.signOut()}>🚪 {user.email?.split('@')[0]}</button>
        </div>
      </aside>
      <main className="main"><div className="content">
        {page==='dashboard'&&<DashboardPage data={data} setPage={setPage}/>}
        {page==='properties'&&<PropertiesPage data={data} user={user} reload={loadData} setPage={setPage}/>}
        {page.startsWith('detail:')&&<PropertyDetailPage id={page.split(':')[1]} data={data} user={user} reload={loadData} setPage={setPage}/>}
        {page==='payments'&&<PaymentsPage data={data} user={user} reload={loadData}/>}
        {page==='costs'&&<CostsPage data={data} user={user} reload={loadData}/>}
        {page==='vorgaenge'&&<VorgaengePage data={data} user={user} reload={loadData}/>}
        {page==='documents'&&<DocumentsPage data={data} user={user} reload={loadData}/>}
        {page==='settings'&&<SettingsPage user={user} theme={theme} setTheme={setTheme} household={household} members={members} inviteEmail={inviteEmail} setInviteEmail={setInviteEmail} inviteMsg={inviteMsg} inviteMember={inviteMember} data={data}/>}
      </div></main>
    </div>
  );
}

// ══════ DASHBOARD (mit 12-Monats-Verlauf) ══════
function DashboardPage({data,setPage}){
  const rented=data.properties.filter(p=>p.status==='vermietet');
  const totalRent=rented.reduce((s,p)=>s+(p.total_rent||0),0);
  const totalValue=data.properties.reduce((s,p)=>s+(p.market_value||0),0);
  const totalLoan=data.properties.reduce((s,p)=>s+(p.loan_amount||0),0);
  const totalReserves=data.properties.reduce((s,p)=>s+(p.maintenance_reserve_total||0),0);
  const open=data.tickets.filter(t=>t.status==='offen').length+data.tasks.filter(t=>t.status==='offen').length;
  const upcomingTasks=[...data.tasks].filter(t=>t.status==='offen').sort((a,b)=>(a.due||'').localeCompare(b.due||'')).slice(0,5);

  // 12-Monats-Verlauf berechnen
  const last12=useMemo(()=>{
    const months=[];const now=new Date();
    for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.toISOString().slice(0,7));}
    return months.map(m=>{
      const income=data.payments.filter(p=>p.month===m).reduce((s,p)=>s+(p.received||0),0);
      const costs=data.costs.filter(c=>(c.date||'').startsWith(m)).reduce((s,c)=>s+(c.amount||0),0);
      return{month:m,label:new Date(m+'-01').toLocaleDateString('de-DE',{month:'short'}),income,costs,cashflow:income-costs};
    });
  },[data.payments,data.costs]);
  const maxBar=Math.max(...last12.map(m=>Math.max(m.income,m.costs)),1);

  return(<div>
    <div className="page-header"><div><h2>Dashboard</h2><p>Übersicht deiner Immobilien</p></div></div>
    <div className="stat-grid">
      <div className="stat-card"><div className="label">Wohnungen</div><div className="value">{data.properties.length}</div><div className="sub">{rented.length} vermietet</div></div>
      <div className="stat-card"><div className="label">Monatl. Miete</div><div className="value" style={{color:'var(--accent)'}}>{fmt(totalRent)}</div></div>
      <div className="stat-card"><div className="label">Portfoliowert</div><div className="value">{fmt(totalValue)}</div><div className="sub">EK: {fmt(totalValue-totalLoan)}</div></div>
      <div className="stat-card"><div className="label">Restdarlehen</div><div className="value" style={{color:'var(--red)'}}>{fmt(totalLoan)}</div><div className="sub">Rücklagen: {fmt(totalReserves)}</div></div>
      <div className="stat-card"><div className="label">Offene Vorgänge</div><div className="value" style={{color:open>0?'var(--amber)':'var(--accent)'}}>{open}</div></div>
    </div>

    {/* 12-Monats-Verlauf */}
    <div className="card" style={{marginBottom:20}}>
      <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:16}}>12-Monats-Verlauf</div>
      <div style={{display:'flex',alignItems:'flex-end',gap:6,height:140}}>
        {last12.map((m,i)=><div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
          <div style={{width:'100%',display:'flex',gap:2,alignItems:'flex-end',height:100}}>
            <div style={{flex:1,background:'var(--accent)',borderRadius:'3px 3px 0 0',height:`${Math.max((m.income/maxBar)*100,2)}%`,minHeight:2,transition:'height .3s'}} title={`Einnahmen: ${fmt(m.income)}`}/>
            <div style={{flex:1,background:'var(--red)',borderRadius:'3px 3px 0 0',height:`${Math.max((m.costs/maxBar)*100,2)}%`,minHeight:2,transition:'height .3s',opacity:.7}} title={`Kosten: ${fmt(m.costs)}`}/>
          </div>
          <div style={{fontSize:10,color:'var(--text3)'}}>{m.label}</div>
        </div>)}
      </div>
      <div style={{display:'flex',gap:16,marginTop:12,fontSize:12,color:'var(--text2)'}}>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--accent)'}}/> Einnahmen</span>
        <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--red)',opacity:.7}}/> Kosten</span>
        <span style={{marginLeft:'auto'}}>Cashflow letzte 12M: <strong style={{color:last12.reduce((s,m)=>s+m.cashflow,0)>=0?'var(--accent)':'var(--red)'}}>{fmt(last12.reduce((s,m)=>s+m.cashflow,0))}</strong></span>
      </div>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
      {/* Immobilien */}
      <div>
        <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Immobilien</div>
        {data.properties.map(p=>{const t=data.tenants.find(x=>x.property_id===p.id);return(<div key={p.id} className="card" style={{cursor:'pointer',marginBottom:10,padding:14}} onClick={()=>setPage('detail:'+p.id)}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><strong style={{fontSize:14}}>{p.name}</strong><span className={`badge ${p.status==='vermietet'?'badge-green':'badge-gray'}`}>{p.status}</span></div>
          <div className="text-xs text-muted">{p.address}</div>
          {p.total_rent>0&&<div className="text-sm" style={{marginTop:6}}>Miete: <strong>{fmt(p.total_rent)}</strong></div>}
          {t&&<div className="text-xs text-muted" style={{marginTop:2}}>Mieter: {t.name}</div>}
        </div>);})}
      </div>
      {/* Aufgaben */}
      <div>
        <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Nächste Aufgaben</div>
        {upcomingTasks.map(t=>{const prop=t.property_id&&t.property_id!=='all'?data.properties.find(p=>p.id===t.property_id):null;return(<div key={t.id} className="card" style={{marginBottom:8,padding:12,cursor:'pointer'}} onClick={()=>setPage('vorgaenge')}>
          <div className="fw-600 text-sm">{t.title}</div>
          <div className="text-xs text-muted">{t.category}{prop?' · '+prop.name:''} · Fällig: {fmtDate(t.due)}</div>
        </div>);})}
        {upcomingTasks.length===0&&<div className="text-sm text-muted">Keine offenen Aufgaben</div>}
      </div>
    </div>
  </div>);
}

// ══════ IMMOBILIEN ══════
function PropertiesPage({data,user,reload,setPage}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});
  const F=(k,v)=>setForm(f=>({...f,[k]:v}));
  const empty={name:'',address:'',type:'Wohnung',status:'vermietet',area:'',rooms:'',year:'',floor:'',total_floors:'',balcony:false,cellar:false,elevator:false,energy_class:'',heating_type:'',description:'',has_parking:false,parking_rent:'',cold_rent:'',utilities:'',total_rent:'',rent_start:'',deposit:'',purchase_price:'',market_value:'',loan_amount:'',loan_rate:'',loan_monthly_payment:'',maintenance_reserve:'',maintenance_reserve_total:'',notes:''};
  const save=async()=>{const row={...form};['area','rooms','year','floor','total_floors','parking_rent','cold_rent','utilities','total_rent','deposit','purchase_price','market_value','loan_amount','loan_rate','loan_monthly_payment','maintenance_reserve','maintenance_reserve_total'].forEach(k=>{row[k]=Number(row[k])||0;});if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('properties').insert(row);}else{const{id,user_id,created_at,household_id,...upd}=row;await supabase.from('properties').update(upd).eq('id',id);}await reload();setModal(null);};
  const del=async(id)=>{if(confirm('Immobilie wirklich löschen?')){await supabase.from('properties').delete().eq('id',id);await reload();}};

  return(<div>
    <div className="page-header"><div><h2>Immobilien</h2><p>{data.properties.length} Objekte</p></div><button className="btn btn-primary" onClick={()=>{setForm(empty);setModal('new');}}>+ Neue Immobilie</button></div>
    <div className="card-grid">{data.properties.map(p=>{const t=data.tenants.find(x=>x.property_id===p.id);const bruttoR=p.purchase_price?(((p.cold_rent||0)+(p.parking_rent||0))*12/p.purchase_price*100).toFixed(1):null;return(<div key={p.id} className="card">
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><strong style={{cursor:'pointer',color:'var(--accent)'}} onClick={()=>setPage('detail:'+p.id)}>{p.name}</strong><span className={`badge ${p.status==='vermietet'?'badge-green':'badge-gray'}`}>{p.status}</span></div>
      <div className="text-sm text-muted mb-2">{p.address}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:13}}>
        {p.area>0&&<div><span className="text-muted">Fläche:</span> {p.area} m²</div>}
        {p.rooms>0&&<div><span className="text-muted">Zimmer:</span> {p.rooms}</div>}
        {p.cold_rent>0&&<div><span className="text-muted">Kaltmiete:</span> {fmt(p.cold_rent)}</div>}
        {p.total_rent>0&&<div><span className="text-muted">Gesamt:</span> {fmt(p.total_rent)}</div>}
        {p.market_value>0&&<div><span className="text-muted">Marktwert:</span> {fmt(p.market_value)}</div>}
        {p.loan_amount>0&&<div><span className="text-muted">Darlehen:</span> {fmt(p.loan_amount)}</div>}
      </div>
      {t&&<div className="text-sm" style={{marginTop:8}}><span className="text-muted">Mieter:</span> {t.name}</div>}
      {p.has_parking&&<div style={{marginTop:6}}><span className="badge badge-blue">Stellplatz {p.parking_rent?fmt(p.parking_rent):''}</span></div>}
      {bruttoR&&<div style={{marginTop:6}}><span className="badge badge-green">Rendite {bruttoR}%</span></div>}
      <div style={{display:'flex',gap:8,marginTop:12}}><button className="btn btn-secondary btn-sm" onClick={()=>{setForm({...p,...Object.fromEntries(Object.keys(empty).map(k=>[k,p[k]||empty[k]]))});setModal('edit');}}>✏️ Bearbeiten</button><button className="btn btn-ghost btn-sm" onClick={()=>del(p.id)}>🗑️</button><div style={{flex:1}}/><button className="btn btn-secondary btn-sm" onClick={()=>setPage('detail:'+p.id)}>📋 Details</button></div>
    </div>);})}</div>
    {data.properties.length===0&&<div className="empty"><p>Noch keine Immobilien. Klicke oben auf "+ Neue Immobilie".</p></div>}
    {modal&&<Modal title={modal==='new'?'Neue Immobilie':'Immobilie bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <Field label="Name"><input value={form.name} onChange={e=>F('name',e.target.value)} placeholder="z.B. Stadtwohnung Stuttgart"/></Field>
      <Field label="Adresse"><input value={form.address} onChange={e=>F('address',e.target.value)}/></Field>
      <div className="form-row"><Field label="Status"><select value={form.status} onChange={e=>F('status',e.target.value)}><option>vermietet</option><option>selbst genutzt</option></select></Field><Field label="Typ"><input value={form.type} onChange={e=>F('type',e.target.value)}/></Field></div>
      <div className="form-row"><Field label="Fläche (m²)"><input type="number" value={form.area} onChange={e=>F('area',e.target.value)}/></Field><Field label="Zimmer"><input type="number" value={form.rooms} onChange={e=>F('rooms',e.target.value)}/></Field></div>
      <div className="form-row"><Field label="Baujahr"><input type="number" value={form.year} onChange={e=>F('year',e.target.value)}/></Field><Field label="Etage / Gesamt"><div className="form-row"><input type="number" placeholder="Etage" value={form.floor} onChange={e=>F('floor',e.target.value)}/><input type="number" placeholder="von" value={form.total_floors} onChange={e=>F('total_floors',e.target.value)}/></div></Field></div>
      <div className="form-row"><Field label="Heizung"><input value={form.heating_type} onChange={e=>F('heating_type',e.target.value)}/></Field><Field label="Energieklasse"><input value={form.energy_class} onChange={e=>F('energy_class',e.target.value)}/></Field></div>
      <div style={{display:'flex',gap:16,marginBottom:14,fontSize:13}}><label><input type="checkbox" checked={form.balcony||false} onChange={e=>F('balcony',e.target.checked)}/> Balkon</label><label><input type="checkbox" checked={form.cellar||false} onChange={e=>F('cellar',e.target.checked)}/> Keller</label><label><input type="checkbox" checked={form.elevator||false} onChange={e=>F('elevator',e.target.checked)}/> Aufzug</label><label><input type="checkbox" checked={form.has_parking||false} onChange={e=>F('has_parking',e.target.checked)}/> Stellplatz</label></div>
      {form.has_parking&&<Field label="Stellplatzmiete (€)"><input type="number" value={form.parking_rent} onChange={e=>F('parking_rent',e.target.value)}/></Field>}
      <Field label="Beschreibung"><textarea value={form.description} onChange={e=>F('description',e.target.value)}/></Field>
      <div style={{borderTop:'2px solid var(--border)',margin:'16px 0',paddingTop:12}}><strong style={{color:'var(--accent)',fontSize:12,textTransform:'uppercase',letterSpacing:.5}}>Mietdaten</strong></div>
      <div className="form-row"><Field label="Kaltmiete"><input type="number" value={form.cold_rent} onChange={e=>F('cold_rent',e.target.value)}/></Field><Field label="Nebenkosten"><input type="number" value={form.utilities} onChange={e=>F('utilities',e.target.value)}/></Field></div>
      <div className="form-row"><Field label="Gesamtmiete"><input type="number" value={form.total_rent} onChange={e=>F('total_rent',e.target.value)}/></Field><Field label="Kaution"><input type="number" value={form.deposit} onChange={e=>F('deposit',e.target.value)}/></Field></div>
      <Field label="Mietbeginn"><input type="date" value={form.rent_start} onChange={e=>F('rent_start',e.target.value)}/></Field>
      <div style={{borderTop:'2px solid var(--border)',margin:'16px 0',paddingTop:12}}><strong style={{color:'var(--accent)',fontSize:12,textTransform:'uppercase',letterSpacing:.5}}>Finanzdaten</strong></div>
      <div className="form-row"><Field label="Kaufpreis"><input type="number" value={form.purchase_price} onChange={e=>F('purchase_price',e.target.value)}/></Field><Field label="Marktwert"><input type="number" value={form.market_value} onChange={e=>F('market_value',e.target.value)}/></Field></div>
      <div className="form-row"><Field label="Darlehen"><input type="number" value={form.loan_amount} onChange={e=>F('loan_amount',e.target.value)}/></Field><Field label="Zinssatz (%)"><input type="number" step="0.01" value={form.loan_rate} onChange={e=>F('loan_rate',e.target.value)}/></Field></div>
      <Field label="Monatl. Rate"><input type="number" value={form.loan_monthly_payment} onChange={e=>F('loan_monthly_payment',e.target.value)}/></Field>
      <div className="form-row"><Field label="Rücklage/Monat"><input type="number" value={form.maintenance_reserve} onChange={e=>F('maintenance_reserve',e.target.value)}/></Field><Field label="Rücklage Gesamt"><input type="number" value={form.maintenance_reserve_total} onChange={e=>F('maintenance_reserve_total',e.target.value)}/></Field></div>
      <Field label="Notizen"><textarea value={form.notes} onChange={e=>F('notes',e.target.value)}/></Field>
    </Modal>}
  </div>);
}

// ══════ PROPERTY DETAIL (alle Tabs) ══════
function PropertyDetailPage({id,data,user,reload,setPage}){
  const p=data.properties.find(x=>x.id===id);const tenant=data.tenants.find(t=>t.property_id===id);const allTenants=data.tenants.filter(t=>t.property_id===id);
  const propCosts=data.costs.filter(c=>c.property_id===id);const propDocs=data.documents.filter(d=>d.property_id===id);
  const [tab,setTab]=useState('info');const [scoutText,setScoutText]=useState('');const [tenantModal,setTenantModal]=useState(null);const [tf,setTf]=useState({});const [nkYear,setNkYear]=useState('2025');
  if(!p)return<div><button className="btn btn-secondary" onClick={()=>setPage('properties')}>← Zurück</button><p style={{marginTop:16}}>Nicht gefunden.</p></div>;
  const nk=p.nk||{};const nkTotal=Object.values(nk).reduce((s,v)=>s+(v||0),0);
  const annualRent=((p.cold_rent||0)+(p.parking_rent||0))*12;const annualCosts=(p.maintenance_reserve||0)*12;const annualLoan=(p.loan_monthly_payment||0)*12;
  const bruttoR=p.purchase_price?(annualRent/p.purchase_price*100):0;const nettoR=p.purchase_price?((annualRent-annualCosts-annualLoan)/p.purchase_price*100):0;const marketR=p.market_value?(annualRent/p.market_value*100):0;const monthlyCF=(p.cold_rent||0)+(p.parking_rent||0)-(p.loan_monthly_payment||0)-(p.maintenance_reserve||0);
  const projection=[];for(let y=0;y<10;y++){const rg=Math.pow(1.015,y);projection.push({year:2026+y,income:annualRent*rg,reserve:annualCosts,loan:annualLoan,netCF:annualRent*rg-annualCosts-annualLoan});}
  const maxCF=Math.max(...projection.map(r=>Math.abs(r.netCF)),1);
  const features=[];if(p.balcony)features.push('Balkon');if(p.cellar)features.push('Keller');if(p.elevator)features.push('Aufzug');if(p.has_parking)features.push('TG-Stellplatz');
  const pricePerSqm=p.area?(p.cold_rent/p.area):0;
  const lastIncrease=propDocs.filter(d=>d.notes?.toLowerCase().includes('mieterhöhung')||d.notes?.toLowerCase().includes('mieterhoehung')).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
  const monthsSince=lastIncrease?.date?Math.floor((new Date()-new Date(lastIncrease.date))/(1000*60*60*24*30)):null;
  const nextAllowed=monthsSince!==null?Math.max(0,15-monthsSince):null;
  const genNk=()=>{const yc=propCosts.filter(c=>(c.date||'').startsWith(nkYear));const um=yc.filter(c=>['Hausgeld','Versicherung'].includes(c.category));const tot=um.reduce((s,c)=>s+(c.amount||0),0);const vz=(p.utilities||0)*12;return{um,tot,vz,diff:vz-tot};};
  const saveTenant=async()=>{const row={...tf,deposit:Number(tf.deposit)||0};if(tenantModal==='new'){delete row.id;row.user_id=user.id;row.property_id=id;await supabase.from('tenants').insert(row);}else{const{id:tid,user_id,created_at,household_id,...upd}=row;await supabase.from('tenants').update(upd).eq('id',tid);}await reload();setTenantModal(null);};
  const delTenant=async(tid)=>{if(confirm('Mieter entfernen?')){await supabase.from('tenants').delete().eq('id',tid);await reload();}};
  const genScout=()=>{setScoutText(`═══ IMMOSCOUT24 INSERAT ═══\n\nTITEL: ${p.rooms}-Zi-${p.type} ${p.address?.split(',').pop()?.trim()||''} | ${p.area}m²${p.balcony?' | Balkon':''}${p.has_parking?' | Stellplatz':''}\n\nBESCHREIBUNG:\n${p.description||`Schöne ${p.rooms}-Zimmer-Wohnung.`}\n\nOBJEKT: ${p.area}m² · ${p.rooms}Zi · ${p.floor||'–'}/${p.total_floors||'–'}OG · Bj.${p.year}\nHeizung: ${p.heating_type||'–'} · Energie: ${p.energy_class||'–'}\nAusstattung: ${features.join(', ')||'–'}\n\nMIETE: Kalt ${fmt(p.cold_rent)} · NK ${fmt(p.utilities)} · Gesamt ${fmt(p.total_rent)}\n${p.has_parking?`Stellplatz: ${fmt(p.parking_rent)}\n`:''}Kaution: ${fmt(p.deposit)}\n\nNK: ${Object.entries(NK_LABELS).map(([k,l])=>`${l}: ${fmt(nk[k]||0)}`).join(' · ')}\n\nVERFÜGBAR: ${tenant?'Nach Kündigung':'Sofort'}`);};
  const cp=(t)=>{navigator.clipboard?.writeText(t).then(()=>alert('Kopiert!')).catch(()=>{});};
  return(<div>
    <button className="btn btn-secondary" onClick={()=>setPage('properties')} style={{marginBottom:16}}>← Zurück</button>
    <div className="page-header"><div><h2>{p.name}</h2><p>{p.address}</p></div><span className={`badge ${p.status==='vermietet'?'badge-green':'badge-gray'}`} style={{fontSize:13,padding:'6px 14px'}}>{p.status}</span></div>
    <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--surface2)',padding:3,borderRadius:10,flexWrap:'wrap'}}>
      {[['info','Übersicht'],['mieter','Mieter'],['rendite','Rendite'],['cashflow','10J-CF'],['mietanpassung','Anpassung'],['nkabrechnung','NK-Abr.'],['nk','NK-Details'],['scout','ImmoScout']].map(([k,l])=><button key={k} className={`btn btn-sm ${tab===k?'btn-primary':'btn-ghost'}`} onClick={()=>setTab(k)}>{l}</button>)}
    </div>

    {tab==='info'&&<div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
      <div>
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Objektdaten</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,fontSize:13}}>
            <div><span className="text-muted">Fläche:</span> {p.area} m²</div><div><span className="text-muted">Zimmer:</span> {p.rooms}</div>
            <div><span className="text-muted">Etage:</span> {p.floor||'–'}/{p.total_floors||'–'}</div><div><span className="text-muted">Baujahr:</span> {p.year}</div>
            <div><span className="text-muted">Heizung:</span> {p.heating_type||'–'}</div><div><span className="text-muted">Energie:</span> {p.energy_class||'–'}</div>
            {features.length>0&&<div style={{gridColumn:'1/-1'}}><span className="text-muted">Ausstattung:</span> {features.join(', ')}</div>}
          </div>
          {p.description&&<div className="text-sm" style={{marginTop:12,color:'var(--text2)',lineHeight:1.6}}>{p.description}</div>}
        </div>
        {p.cold_rent>0&&<div className="card" style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Mietdaten</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,fontSize:13}}><div><span className="text-muted">Kaltmiete:</span> {fmt(p.cold_rent)}</div><div><span className="text-muted">NK:</span> {fmt(p.utilities)}</div><div><span className="text-muted">Gesamt:</span> <strong style={{color:'var(--accent)',fontSize:16}}>{fmt(p.total_rent)}</strong></div><div><span className="text-muted">Kaution:</span> {fmt(p.deposit)}</div><div><span className="text-muted">Mietbeginn:</span> {fmtDate(p.rent_start)}</div><div><span className="text-muted">€/m²:</span> {pricePerSqm.toFixed(2)} €</div></div></div>}
        {tenant&&<div className="card" style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Mieter</div><div className="fw-600" style={{fontSize:16}}>{tenant.name}</div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13,marginTop:8}}><div><span className="text-muted">Tel:</span> {tenant.phone}</div><div><span className="text-muted">Mail:</span> {tenant.email}</div><div><span className="text-muted">Einzug:</span> {fmtDate(tenant.move_in)}</div><div><span className="text-muted">Vertrag:</span> {tenant.contract}</div></div></div>}
      </div>
      <div>
        <div className="card" style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Finanzen</div><div style={{display:'grid',gap:8,fontSize:13}}>
          <div><span className="text-muted">Marktwert:</span> <strong style={{fontSize:18,color:'var(--accent)'}}>{fmt(p.market_value)}</strong></div>
          <div><span className="text-muted">Kaufpreis:</span> {fmt(p.purchase_price)}</div>
          {p.market_value>0&&p.purchase_price>0&&<div><span className="text-muted">Wertentwicklung:</span> <strong style={{color:p.market_value>=p.purchase_price?'var(--accent)':'var(--red)'}}>{fmt(p.market_value-p.purchase_price)} ({((p.market_value-p.purchase_price)/p.purchase_price*100).toFixed(1)}%)</strong></div>}
          <div style={{borderTop:'1px solid var(--border)',paddingTop:8}}><span className="text-muted">Darlehen:</span> {fmt(p.loan_amount)} · {p.loan_rate}%</div>
          <div><span className="text-muted">Rate:</span> {fmt(p.loan_monthly_payment)}/M</div>
          <div><span className="text-muted">EK:</span> <strong style={{color:'var(--accent)'}}>{fmt((p.market_value||0)-(p.loan_amount||0))}</strong></div>
          <div style={{borderTop:'1px solid var(--border)',paddingTop:8}}><span className="text-muted">Rücklage:</span> {fmt(p.maintenance_reserve)}/M · Ges: {fmt(p.maintenance_reserve_total)}</div>
        </div></div>
        {propCosts.length>0&&<div className="card" style={{padding:'8px 0'}}><div style={{padding:'8px 16px',fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)'}}>Kosten</div>{propCosts.slice(0,4).map(c=><div key={c.id} style={{padding:'6px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',fontSize:12}}><div><span className="badge badge-gray" style={{fontSize:10}}>{c.category}</span> {fmtDate(c.date)}</div><strong>{fmt(c.amount)}</strong></div>)}</div>}
      </div>
    </div>}

    {tab==='mieter'&&<div style={{maxWidth:600}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div className="text-sm text-muted">Mieterverwaltung & Historie</div><button className="btn btn-primary btn-sm" onClick={()=>{setTf({name:'',phone:'',email:'',move_in:'',deposit:'',contract:'Unbefristet',notes:''});setTenantModal('new');}}>+ Mieter</button></div>
      {allTenants.length===0&&<div className="empty"><p>Kein Mieter hinterlegt.</p></div>}
      {allTenants.map((t,i)=><div key={t.id} className="card" style={{marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div><strong>{t.name}</strong>{i===0&&<span className="badge badge-green" style={{marginLeft:8,fontSize:10}}>Aktuell</span>}{i>0&&<span className="badge badge-gray" style={{marginLeft:8,fontSize:10}}>Vormieter</span>}</div><div style={{display:'flex',gap:4}}><button className="btn-ghost btn-sm" onClick={()=>{setTf({...t,deposit:t.deposit||'',notes:t.notes||''});setTenantModal('edit');}}>✏️</button><button className="btn-ghost btn-sm" onClick={()=>delTenant(t.id)}>🗑️</button></div></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13}}><div><span className="text-muted">Tel:</span> {t.phone||'–'}</div><div><span className="text-muted">Mail:</span> {t.email||'–'}</div><div><span className="text-muted">Einzug:</span> {fmtDate(t.move_in)}</div><div><span className="text-muted">Kaution:</span> {fmt(t.deposit)}</div></div>
        {t.notes&&<div className="text-xs text-muted" style={{marginTop:6}}>{t.notes}</div>}
      </div>)}
      {tenantModal&&<Modal title={tenantModal==='new'?'Neuer Mieter':'Bearbeiten'} onClose={()=>setTenantModal(null)} footer={<><button className="btn btn-secondary" onClick={()=>setTenantModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={saveTenant}>Speichern</button></>}>
        <Field label="Name"><input value={tf.name} onChange={e=>setTf(f=>({...f,name:e.target.value}))}/></Field>
        <div className="form-row"><Field label="Telefon"><input value={tf.phone} onChange={e=>setTf(f=>({...f,phone:e.target.value}))}/></Field><Field label="E-Mail"><input value={tf.email} onChange={e=>setTf(f=>({...f,email:e.target.value}))}/></Field></div>
        <div className="form-row"><Field label="Einzug"><input type="date" value={tf.move_in} onChange={e=>setTf(f=>({...f,move_in:e.target.value}))}/></Field><Field label="Kaution"><input type="number" value={tf.deposit} onChange={e=>setTf(f=>({...f,deposit:e.target.value}))}/></Field></div>
        <Field label="Vertrag"><select value={tf.contract} onChange={e=>setTf(f=>({...f,contract:e.target.value}))}><option>Unbefristet</option><option>Befristet</option></select></Field>
        <Field label="Notizen"><textarea value={tf.notes} onChange={e=>setTf(f=>({...f,notes:e.target.value}))} placeholder="Auszug, Kautionsrückgabe..."/></Field>
      </Modal>}
    </div>}

    {tab==='rendite'&&<div style={{maxWidth:550}}>
      <div className="stat-grid">
        <div className="stat-card"><div className="label">Brutto</div><div className="value" style={{color:'var(--accent)'}}>{bruttoR.toFixed(2)}%</div></div>
        <div className="stat-card"><div className="label">Netto</div><div className="value" style={{color:nettoR>=0?'var(--accent)':'var(--red)'}}>{nettoR.toFixed(2)}%</div></div>
        <div className="stat-card"><div className="label">Marktwert-R.</div><div className="value">{marketR.toFixed(2)}%</div></div>
        <div className="stat-card"><div className="label">CF/Monat</div><div className="value" style={{color:monthlyCF>=0?'var(--accent)':'var(--red)'}}>{fmt(monthlyCF)}</div></div>
      </div>
      <div className="card"><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><tbody>
        <tr><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>Jahres-Kaltmiete</td><td style={{textAlign:'right',fontWeight:600,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>{fmt(annualRent)}</td></tr>
        <tr><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>Rücklage/J</td><td style={{textAlign:'right',fontWeight:600,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>−{fmt(annualCosts)}</td></tr>
        <tr><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>Darlehen/J</td><td style={{textAlign:'right',fontWeight:600,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>−{fmt(annualLoan)}</td></tr>
        <tr><td style={{padding:'8px 0',fontWeight:700}}>Netto-CF/J</td><td style={{textAlign:'right',fontWeight:700,color:annualRent-annualCosts-annualLoan>=0?'var(--accent)':'var(--red)',padding:'8px 0'}}>{fmt(annualRent-annualCosts-annualLoan)}</td></tr>
      </tbody></table></div>
    </div>}

    {tab==='cashflow'&&<div>
      <div className="text-sm text-muted" style={{marginBottom:16}}>10-Jahres-Projektion (1,5%/J Mietsteigerung)</div>
      <div className="card" style={{padding:0,overflow:'auto'}}><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
        <thead><tr>{['Jahr','Einnahmen','Rücklage','Darlehen','Netto-CF',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:600,textTransform:'uppercase',color:'var(--text2)',borderBottom:'2px solid var(--border)'}}>{h}</th>)}</tr></thead>
        <tbody>{projection.map(r=><tr key={r.year}><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',fontWeight:600}}>{r.year}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.income)}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.reserve)}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.loan)}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',fontWeight:700,color:r.netCF>=0?'var(--accent)':'var(--red)'}}>{fmt(r.netCF)}</td><td style={{padding:'8px 14px',borderBottom:'1px solid var(--border)',width:120}}><div style={{height:8,borderRadius:4,background:r.netCF>=0?'var(--accent)':'var(--red)',width:`${Math.max(Math.abs(r.netCF)/maxCF*100,4)}%`}}/></td></tr>)}
        <tr><td style={{padding:'8px 14px',fontWeight:700}}>Σ 10J</td><td style={{padding:'8px 14px',fontWeight:700}}>{fmt(projection.reduce((s,r)=>s+r.income,0))}</td><td style={{padding:'8px 14px',fontWeight:700}}>{fmt(projection.reduce((s,r)=>s+r.reserve,0))}</td><td style={{padding:'8px 14px',fontWeight:700}}>{fmt(projection.reduce((s,r)=>s+r.loan,0))}</td><td style={{padding:'8px 14px',fontWeight:700,color:'var(--accent)'}}>{fmt(projection.reduce((s,r)=>s+r.netCF,0))}</td><td/></tr>
        </tbody></table></div>
    </div>}

    {tab==='mietanpassung'&&<div style={{maxWidth:600}}>
      <div className="text-sm text-muted" style={{marginBottom:16}}>Mietanpassung nach §558 BGB</div>
      <div className="stat-grid">
        <div className="stat-card"><div className="label">Kaltmiete</div><div className="value">{fmt(p.cold_rent)}</div><div className="sub">{pricePerSqm.toFixed(2)} €/m²</div></div>
        <div className="stat-card"><div className="label">Letzte Anpassung</div><div className="value" style={{fontSize:16}}>{lastIncrease?fmtDate(lastIncrease.date):'–'}</div><div className="sub">{monthsSince!==null?`vor ${monthsSince}M`:''}</div></div>
        <div className="stat-card"><div className="label">Nächste möglich</div><div className="value" style={{color:nextAllowed===0?'var(--accent)':'var(--amber)',fontSize:16}}>{nextAllowed===0?'Jetzt':nextAllowed?`in ${nextAllowed}M`:'–'}</div><div className="sub">15M Sperrfrist</div></div>
        <div className="stat-card"><div className="label">Kappung 20%</div><div className="value" style={{fontSize:16}}>{fmt(p.cold_rent*1.2)}</div><div className="sub">Max in 3 Jahren</div></div>
      </div>
      <div className="card">
        <div className="fw-600" style={{marginBottom:12}}>Rechner</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:13}}>
          <div style={{padding:12,background:'var(--surface2)',borderRadius:8}}><div className="text-xs text-muted">+10% (Mietspiegel)</div><div className="fw-600" style={{fontSize:18}}>{fmt(p.cold_rent*1.1)}</div><div className="text-xs text-muted">{p.area?((p.cold_rent*1.1)/p.area).toFixed(2):'-'} €/m² · +{fmt(p.cold_rent*0.1*12)}/J</div></div>
          <div style={{padding:12,background:'var(--surface2)',borderRadius:8}}><div className="text-xs text-muted">+20% (Maximum)</div><div className="fw-600" style={{fontSize:18}}>{fmt(p.cold_rent*1.2)}</div><div className="text-xs text-muted">{p.area?((p.cold_rent*1.2)/p.area).toFixed(2):'-'} €/m² · +{fmt(p.cold_rent*0.2*12)}/J</div></div>
        </div>
        <div className="text-xs text-muted" style={{marginTop:12,lineHeight:1.6}}><strong>§558 BGB:</strong> Frühestens 15 Monate nach letzter Erhöhung. Max 20% in 3 Jahren (teils 15%). Begründung: Mietspiegel/Gutachten. Zustimmungsfrist: 2 Monate.</div>
      </div>
    </div>}

    {tab==='nkabrechnung'&&<div style={{maxWidth:650}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}><div className="text-sm text-muted">Nebenkostenabrechnung</div><select value={nkYear} onChange={e=>setNkYear(e.target.value)} style={{padding:'6px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--surface)',color:'var(--text)',fontSize:13}}>{[2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select></div>
      {(()=>{const nka=genNk();return(<>
        <div className="stat-grid">
          <div className="stat-card"><div className="label">Vorauszahlung</div><div className="value">{fmt(nka.vz)}</div><div className="sub">{fmt(p.utilities)}/M × 12</div></div>
          <div className="stat-card"><div className="label">Tatsächliche Kosten</div><div className="value">{fmt(nka.tot)}</div><div className="sub">{nka.um.length} Positionen</div></div>
          <div className="stat-card"><div className="label">{nka.diff>=0?'Guthaben':'Nachzahlung'}</div><div className="value" style={{color:nka.diff>=0?'var(--accent)':'var(--red)'}}>{fmt(Math.abs(nka.diff))}</div></div>
        </div>
        <div className="card" style={{marginBottom:16}}>
          <div className="fw-600" style={{marginBottom:12}}>Umlagefähige Kosten {nkYear}</div>
          {nka.um.length===0?<div className="text-sm text-muted">Keine Kosten für {nkYear}. Erfasse Kosten unter "Kosten".</div>:
          <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><tbody>
            {nka.um.map(c=><tr key={c.id}><td style={{padding:'6px 0',borderBottom:'1px solid var(--border)'}}>{fmtDate(c.date)}</td><td style={{borderBottom:'1px solid var(--border)'}}><span className="badge badge-gray" style={{fontSize:10}}>{c.category}</span></td><td style={{borderBottom:'1px solid var(--border)'}}>{c.notes}</td><td style={{textAlign:'right',fontWeight:600,borderBottom:'1px solid var(--border)'}}>{fmt(c.amount)}</td></tr>)}
            <tr><td colSpan={3} style={{fontWeight:700,paddingTop:8}}>Gesamt</td><td style={{textAlign:'right',fontWeight:700,paddingTop:8}}>{fmt(nka.tot)}</td></tr>
            <tr><td colSpan={3} style={{color:'var(--text2)'}}>Vorauszahlung</td><td style={{textAlign:'right'}}>−{fmt(nka.vz)}</td></tr>
            <tr><td colSpan={3} style={{fontWeight:700,borderTop:'2px solid var(--border)',paddingTop:8}}>{nka.diff>=0?'Guthaben':'Nachzahlung'}</td><td style={{textAlign:'right',fontWeight:700,borderTop:'2px solid var(--border)',paddingTop:8,color:nka.diff>=0?'var(--accent)':'var(--red)'}}>{fmt(Math.abs(nka.diff))}</td></tr>
          </tbody></table>}
        </div>
        <button className="btn btn-primary" onClick={()=>{cp(`NK-ABRECHNUNG ${nkYear}\n${p.name} · ${tenant?.name||'–'}\n${'═'.repeat(40)}\n\nKosten:\n${nka.um.map(c=>`${fmtDate(c.date)} | ${c.category} | ${fmt(c.amount)}`).join('\n')}\n\nGesamt: ${fmt(nka.tot)}\nVorauszahlung: ${fmt(nka.vz)}\n${nka.diff>=0?'GUTHABEN':'NACHZAHLUNG'}: ${fmt(Math.abs(nka.diff))}`)}}>📋 Kopieren</button>
      </>);})()}
    </div>}

    {tab==='nk'&&<div style={{maxWidth:500}}>
      <div className="card"><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><tbody>
        {Object.entries(NK_LABELS).map(([k,l])=><tr key={k}><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>{l}</td><td style={{textAlign:'right',fontWeight:600,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>{fmt(nk[k]||0)}</td></tr>)}
        <tr><td style={{fontWeight:700,paddingTop:8}}>Gesamt</td><td style={{textAlign:'right',fontWeight:700,paddingTop:8}}>{fmt(nkTotal)}</td></tr>
      </tbody></table></div>
      {p.utilities>0&&<div className="text-sm text-muted" style={{marginTop:12}}>Vorauszahlung: {fmt(p.utilities)} · Diff: <strong style={{color:p.utilities>=nkTotal?'var(--accent)':'var(--red)'}}>{fmt(p.utilities-nkTotal)}</strong></div>}
    </div>}

    {tab==='scout'&&<div>
      {!scoutText?<button className="btn btn-primary" onClick={genScout}>🌐 ImmoScout-Inserat generieren</button>:<div>
        <div style={{display:'flex',gap:8,marginBottom:16}}><button className="btn btn-primary" onClick={()=>cp(scoutText)}>📋 Kopieren</button><button className="btn btn-secondary" onClick={genScout}>🔄 Neu</button></div>
        <div style={{background:'var(--surface2)',borderRadius:10,padding:16,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:500,overflow:'auto'}}>{scoutText}</div>
      </div>}
    </div>}
  </div>);
}
// ══════ EINNAHMEN (mit Auto-Vorausfüllung) ══════
function PaymentsPage({data,user,reload}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [tab,setTab]=useState('monthly');const [generating,setGenerating]=useState(false);
  const rented=data.properties.filter(p=>p.status==='vermietet');
  const save=async()=>{const row={...form,expected:Number(form.expected)||0,received:Number(form.received)||0};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('payments').insert(row);}else{const{id,user_id,created_at,household_id,...upd}=row;await supabase.from('payments').update(upd).eq('id',id);}await reload();setModal(null);};
  const months=[...new Set(data.payments.map(p=>p.month))].sort().reverse();
  const totalRec=data.payments.reduce((s,p)=>s+(p.received||0),0);const totalExp=data.payments.reduce((s,p)=>s+(p.expected||0),0);const totalCosts=data.costs.reduce((s,c)=>s+(c.amount||0),0);

  // Auto-Generate: Erstellt Soll-Einträge für den aktuellen Monat basierend auf Immobiliendaten
  const autoGenerate=async()=>{
    const currentMonth=new Date().toISOString().slice(0,7);
    setGenerating(true);
    let count=0;
    for(const p of rented){
      const existing=data.payments.find(pay=>pay.property_id===p.id&&pay.month===currentMonth);
      if(!existing&&p.total_rent>0){
        await supabase.from('payments').insert({user_id:user.id,property_id:p.id,month:currentMonth,expected:p.total_rent,received:0,notes:'Automatisch erstellt'});
        count++;
      }
    }
    await reload();
    setGenerating(false);
    if(count>0)alert(`${count} Zahlungen für ${monthName(currentMonth)} erstellt!`);
    else alert('Alle Zahlungen für diesen Monat existieren bereits.');
  };

  // Quick-Confirm: Markiere Zahlung als eingegangen (Ist = Soll)
  const confirmPayment=async(p)=>{
    const{id,user_id,created_at,household_id,...upd}=p;
    await supabase.from('payments').update({...upd,received:p.expected,notes:p.notes?p.notes+' | Bestätigt':'Bestätigt'}).eq('id',id);
    await reload();
  };

  return(<div>
    <div className="page-header"><div><h2>Einnahmen</h2></div>
      <div style={{display:'flex',gap:8}}>
        <button className="btn btn-secondary" onClick={autoGenerate} disabled={generating}>{generating?'⏳ Wird erstellt...':'⚡ Monat vorausfüllen'}</button>
        <button className="btn btn-primary" onClick={()=>{const p=rented[0];setForm({property_id:p?.id||'',month:new Date().toISOString().slice(0,7),expected:p?.total_rent||'',received:'',notes:''});setModal('new');}}>+ Zahlung</button>
      </div>
    </div>
    <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--surface2)',padding:3,borderRadius:10,maxWidth:300}}><button className={`btn btn-sm ${tab==='monthly'?'btn-primary':'btn-ghost'}`} style={{flex:1}} onClick={()=>setTab('monthly')}>Monatlich</button><button className={`btn btn-sm ${tab==='yearly'?'btn-primary':'btn-ghost'}`} style={{flex:1}} onClick={()=>setTab('yearly')}>Jahresübersicht</button></div>
    {tab==='yearly'&&<div className="stat-grid"><div className="stat-card"><div className="label">Einnahmen</div><div className="value" style={{color:'var(--accent)'}}>{fmt(totalRec)}</div></div><div className="stat-card"><div className="label">Ausstehend</div><div className="value" style={{color:totalExp-totalRec>0?'var(--red)':'var(--accent)'}}>{fmt(totalExp-totalRec)}</div></div><div className="stat-card"><div className="label">Kosten</div><div className="value" style={{color:'var(--red)'}}>{fmt(totalCosts)}</div></div><div className="stat-card"><div className="label">Cashflow</div><div className="value" style={{color:totalRec-totalCosts>=0?'var(--accent)':'var(--red)'}}>{fmt(totalRec-totalCosts)}</div></div></div>}
    {months.map(m=>{const mp=data.payments.filter(p=>p.month===m);const exp=mp.reduce((s,p)=>s+(p.expected||0),0);const rec=mp.reduce((s,p)=>s+(p.received||0),0);return(<div key={m} className="card" style={{marginBottom:16,padding:0}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong>{monthName(m)}</strong><div style={{display:'flex',gap:12,fontSize:13}}><span>Soll: <strong>{fmt(exp)}</strong></span><span>Ist: <strong style={{color:rec<exp?'var(--red)':'var(--accent)'}}>{fmt(rec)}</strong></span>{rec<exp&&<span className="badge badge-red">−{fmt(exp-rec)}</span>}{rec>=exp&&exp>0&&<span className="badge badge-green">✓ Vollständig</span>}</div></div>
      {mp.map(p=>{const prop=data.properties.find(x=>x.id===p.property_id);const paid=p.received>=p.expected&&p.expected>0;return(<div key={p.id} style={{padding:'10px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}><span className="fw-600">{prop?.name||'–'}</span>{paid&&<span className="badge badge-green" style={{fontSize:10}}>✓</span>}</div>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          <span>{fmt(p.expected)}</span>
          <span style={{color:p.received<p.expected?'var(--red)':'var(--accent)',fontWeight:600}}>{fmt(p.received)}</span>
          {!paid&&p.expected>0&&<button className="btn btn-primary btn-sm" onClick={()=>confirmPayment(p)} title="Zahlungseingang bestätigen">✓ Erhalten</button>}
          <button className="btn-ghost btn-sm" onClick={()=>{setForm({...p,expected:p.expected||'',received:p.received||'',notes:p.notes||''});setModal('edit');}}>✏️</button>
        </div>
      </div>);})}
    </div>);})}
    {data.payments.length===0&&<div className="empty"><p>Noch keine Zahlungen. Klicke "⚡ Monat vorausfüllen" um die Soll-Mieten automatisch zu erstellen.</p></div>}
    {modal&&<Modal title={modal==='new'?'Zahlung erfassen':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <Field label="Immobilie"><select value={form.property_id} onChange={e=>{const prop=rented.find(p=>p.id===e.target.value);setForm(f=>({...f,property_id:e.target.value,expected:prop?.total_rent||f.expected}));}}>{rented.map(p=><option key={p.id} value={p.id}>{p.name} ({fmt(p.total_rent)})</option>)}</select></Field>
      <Field label="Monat"><input type="month" value={form.month} onChange={e=>setForm(f=>({...f,month:e.target.value}))}/></Field>
      <div className="form-row"><Field label="Soll-Miete (€)"><input type="number" value={form.expected} onChange={e=>setForm(f=>({...f,expected:e.target.value}))}/></Field><Field label="Ist-Zahlung (€)"><input type="number" value={form.received} onChange={e=>setForm(f=>({...f,received:e.target.value}))}/></Field></div>
      <Field label="Notizen"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
    </Modal>}
  </div>);
}

// ══════ KOSTEN ══════
function CostsPage({data,user,reload}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [filter,setFilter]=useState({prop:'all',cat:'all'});
  const save=async()=>{const row={...form,amount:Number(form.amount)||0};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('costs').insert(row);}else{const{id,user_id,created_at,household_id,...upd}=row;await supabase.from('costs').update(upd).eq('id',id);}await reload();setModal(null);};
  const del=async(id)=>{if(confirm('Löschen?')){await supabase.from('costs').delete().eq('id',id);await reload();}};
  const filtered=data.costs.filter(c=>(filter.prop==='all'||c.property_id===filter.prop)&&(filter.cat==='all'||c.category===filter.cat));
  const total=filtered.reduce((s,c)=>s+(c.amount||0),0);
  return(<div>
    <div className="page-header"><div><h2>Kosten</h2><p>Gesamt: {fmt(total)}</p></div><button className="btn btn-primary" onClick={()=>{setForm({property_id:data.properties[0]?.id||'',date:td(),category:COST_CATS[0],amount:'',notes:''});setModal('new');}}>+ Kosten</button></div>
    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}><select value={filter.prop} onChange={e=>setFilter(f=>({...f,prop:e.target.value}))} style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:8,fontSize:12,background:'var(--surface)',color:'var(--text)'}}><option value="all">Alle Immobilien</option>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={filter.cat} onChange={e=>setFilter(f=>({...f,cat:e.target.value}))} style={{padding:'6px 10px',border:'1px solid var(--border)',borderRadius:8,fontSize:12,background:'var(--surface)',color:'var(--text)'}}><option value="all">Alle Kategorien</option>{COST_CATS.map(c=><option key={c}>{c}</option>)}</select></div>
    <div className="card" style={{padding:0}}>{filtered.map(c=>{const prop=data.properties.find(p=>p.id===c.property_id);return(<div key={c.id} style={{padding:'12px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}><div><span style={{marginRight:8}}>{fmtDate(c.date)}</span><span className="fw-600">{prop?.name||'–'}</span><span className="badge badge-gray" style={{marginLeft:8}}>{c.category}</span>{c.notes&&<span className="text-muted" style={{marginLeft:8}}>{c.notes}</span>}</div><div style={{display:'flex',gap:8,alignItems:'center'}}><strong>{fmt(c.amount)}</strong><button className="btn-ghost btn-sm" onClick={()=>{setForm({...c,amount:c.amount||'',notes:c.notes||''});setModal('edit');}}>✏️</button><button className="btn-ghost btn-sm" onClick={()=>del(c.id)}>🗑️</button></div></div>);})}</div>
    {filtered.length===0&&<div className="empty"><p>Keine Kosten.</p></div>}
    {modal&&<Modal title={modal==='new'?'Kosten erfassen':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <Field label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <div className="form-row"><Field label="Datum"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field><Field label="Kategorie"><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{COST_CATS.map(c=><option key={c}>{c}</option>)}</select></Field></div>
      <Field label="Betrag (€)"><input type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></Field>
      <Field label="Notizen"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
    </Modal>}
  </div>);
}

// ══════ VORGÄNGE ══════
function VorgaengePage({data,user,reload}){
  const [tab,setTab]=useState('tickets');const [modal,setModal]=useState(null);const [form,setForm]=useState({});
  const saveTicket=async()=>{const row={...form,cost:Number(form.cost)||0};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('tickets').insert(row);}else{const{id,user_id,created_at,household_id,...upd}=row;await supabase.from('tickets').update(upd).eq('id',id);}await reload();setModal(null);};
  const saveTask=async()=>{const row={...form};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('tasks').insert(row);}else{const{id,user_id,created_at,household_id,...upd}=row;await supabase.from('tasks').update(upd).eq('id',id);}await reload();setModal(null);};
  const toggleTask=async(id)=>{const t=data.tasks.find(x=>x.id===id);await supabase.from('tasks').update({status:t.status==='erledigt'?'offen':'erledigt'}).eq('id',id);await reload();};
  return(<div>
    <div className="page-header"><div><h2>Vorgänge</h2></div><button className="btn btn-primary" onClick={()=>{if(tab==='tickets')setForm({property_id:data.properties[0]?.id||'',title:'',description:'',date:td(),status:'offen',cost:'',notes:''});else setForm({title:'',due:'',property_id:'all',category:TASK_CATS[0],status:'offen',notes:''});setModal('new');}}>+ {tab==='tickets'?'Vorgang':'Aufgabe'}</button></div>
    <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--surface2)',padding:3,borderRadius:10,maxWidth:320}}><button className={`btn btn-sm ${tab==='tickets'?'btn-primary':'btn-ghost'}`} style={{flex:1}} onClick={()=>setTab('tickets')}>Reparaturen ({data.tickets.length})</button><button className={`btn btn-sm ${tab==='tasks'?'btn-primary':'btn-ghost'}`} style={{flex:1}} onClick={()=>setTab('tasks')}>Aufgaben ({data.tasks.length})</button></div>
    {tab==='tickets'&&<div className="card-grid">{data.tickets.map(t=>{const prop=data.properties.find(p=>p.id===t.property_id);return(<div key={t.id} className="card"><div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span className={`badge ${t.status==='offen'?'badge-red':t.status==='in Bearbeitung'?'badge-amber':'badge-green'}`}>{t.status}</span><span className="text-xs text-muted">{fmtDate(t.date)}</span></div><div className="fw-600">{t.title}</div><div className="text-sm text-muted">{prop?.name}</div>{t.description&&<div className="text-sm" style={{marginTop:6}}>{t.description}</div>}{t.cost>0&&<div className="text-sm" style={{marginTop:4}}>Kosten: <strong>{fmt(t.cost)}</strong></div>}<div style={{marginTop:10}}><button className="btn btn-secondary btn-sm" onClick={()=>{setForm({...t,cost:t.cost||'',notes:t.notes||''});setModal('edit');}}>✏️ Bearbeiten</button></div></div>);})}{data.tickets.length===0&&<div className="empty"><p>Keine Vorgänge</p></div>}</div>}
    {tab==='tasks'&&<div>{data.tasks.map(t=>{const prop=t.property_id&&t.property_id!=='all'?data.properties.find(p=>p.id===t.property_id):null;return(<div key={t.id} className="card" style={{marginBottom:8,padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}><button onClick={()=>toggleTask(t.id)} style={{width:24,height:24,borderRadius:'50%',border:`2px solid ${t.status==='erledigt'?'var(--accent)':'var(--border)'}`,background:t.status==='erledigt'?'var(--accent)':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#fff',fontSize:12}}>{t.status==='erledigt'?'✓':''}</button><div style={{flex:1,opacity:t.status==='erledigt'?.5:1,textDecoration:t.status==='erledigt'?'line-through':'none'}}><div className="fw-600 text-sm">{t.title}</div><div className="text-xs text-muted">{t.category}{prop?' · '+prop.name:''}</div></div><div className="text-sm text-muted">{fmtDate(t.due)}</div><button className="btn-ghost btn-sm" onClick={()=>{setForm({...t,notes:t.notes||''});setModal('edit');}}>✏️</button></div>);})}{data.tasks.length===0&&<div className="empty"><p>Keine Aufgaben</p></div>}</div>}
    {modal&&tab==='tickets'&&<Modal title={modal==='new'?'Neuer Vorgang':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={saveTicket}>Speichern</button></>}><Field label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Titel"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></Field><Field label="Beschreibung"><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></Field><div className="form-row"><Field label="Datum"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field><Field label="Status"><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>{TICKET_STATUS.map(s=><option key={s}>{s}</option>)}</select></Field></div><Field label="Kosten"><input type="number" value={form.cost} onChange={e=>setForm(f=>({...f,cost:e.target.value}))}/></Field><Field label="Notizen"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field></Modal>}
    {modal&&tab==='tasks'&&<Modal title={modal==='new'?'Neue Aufgabe':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={saveTask}>Speichern</button></>}><Field label="Titel"><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></Field><div className="form-row"><Field label="Fällig"><input type="date" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))}/></Field><Field label="Kategorie"><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{TASK_CATS.map(c=><option key={c}>{c}</option>)}</select></Field></div><Field label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}><option value="all">Alle</option>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Notizen"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field></Modal>}
  </div>);
}

// ══════ DOKUMENTE ══════
function DocumentsPage({data,user,reload}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});
  const save=async()=>{const row={...form};if(modal==='new'){delete row.id;row.user_id=user.id;if(row.category==='E-Mail'&&!row.name)row.name=row.email_subject||'E-Mail';await supabase.from('documents').insert(row);}else{const{id,user_id,created_at,household_id,tenant_id,...upd}=row;await supabase.from('documents').update(upd).eq('id',id);}await reload();setModal(null);};
  const del=async(id)=>{if(confirm('Löschen?')){await supabase.from('documents').delete().eq('id',id);await reload();}};
  const grouped=data.properties.map(p=>({p,docs:data.documents.filter(d=>d.property_id===p.id)})).filter(g=>g.docs.length>0);
  return(<div>
    <div className="page-header"><div><h2>Dokumente</h2><p>{data.documents.length} Einträge</p></div><div style={{display:'flex',gap:8}}><button className="btn btn-secondary" onClick={()=>{setForm({property_id:data.properties[0]?.id||'',category:'E-Mail',name:'',date:td(),notes:'',email_from:'',email_to:'',email_subject:'',email_body:''});setModal('new');}}>📧 E-Mail</button><button className="btn btn-primary" onClick={()=>{setForm({property_id:data.properties[0]?.id||'',category:DOC_CATS[0],name:'',date:td(),notes:'',email_from:'',email_to:'',email_subject:'',email_body:''});setModal('new');}}>+ Dokument</button></div></div>
    {grouped.map(({p,docs})=><div key={p.id} style={{marginBottom:20}}>
      <div style={{padding:'10px 16px',background:'var(--surface2)',borderRadius:'10px 10px 0 0',border:'1px solid var(--border)',borderBottom:'none',fontWeight:700,fontSize:14}}>🏢 {p.name} <span className="text-muted fw-600" style={{fontSize:12,marginLeft:8}}>{docs.length}</span></div>
      <div className="card" style={{borderRadius:'0 0 10px 10px',padding:0}}>{docs.map(d=><div key={d.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}>
        <div><span className="fw-600">{d.category==='E-Mail'?(d.email_subject||d.name):(d.name||'–')}</span><span className="badge badge-blue" style={{marginLeft:8,fontSize:10}}>{d.category}</span><span className="text-muted" style={{marginLeft:8}}>{fmtDate(d.date)}</span></div>
        <div style={{display:'flex',gap:4}}><button className="btn-ghost btn-sm" onClick={()=>{setForm({...d,notes:d.notes||'',email_from:d.email_from||'',email_to:d.email_to||'',email_subject:d.email_subject||'',email_body:d.email_body||''});setModal('edit');}}>✏️</button><button className="btn-ghost btn-sm" onClick={()=>del(d.id)}>🗑️</button></div>
      </div>)}</div>
    </div>)}
    {data.documents.length===0&&<div className="empty"><p>Noch keine Dokumente.</p></div>}
    {modal&&<Modal title={modal==='new'?'Dokument hinzufügen':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <Field label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>{data.properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Kategorie"><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{DOC_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
      {form.category==='E-Mail'?<><div className="form-row"><Field label="Von"><input value={form.email_from} onChange={e=>setForm(f=>({...f,email_from:e.target.value}))}/></Field><Field label="An"><input value={form.email_to} onChange={e=>setForm(f=>({...f,email_to:e.target.value}))}/></Field></div><Field label="Betreff"><input value={form.email_subject} onChange={e=>setForm(f=>({...f,email_subject:e.target.value}))}/></Field><Field label="Text"><textarea value={form.email_body} onChange={e=>setForm(f=>({...f,email_body:e.target.value}))} style={{minHeight:120}}/></Field></>:<Field label="Dokumentname"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></Field>}
      <Field label="Datum"><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></Field>
      <Field label="Notizen"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></Field>
    </Modal>}
  </div>);
}

// ══════ EINSTELLUNGEN (mit Steuerexport) ══════
function SettingsPage({user,theme,setTheme,household,members,inviteEmail,setInviteEmail,inviteMsg,inviteMember,data}){
  const [steuerYear,setSteuerYear]=useState('2025');
  const exportCSV=()=>{const rows=[['Immobilie','Adresse','Status','Fläche','Kaltmiete','Gesamtmiete','Marktwert','Darlehen']];data.properties.forEach(p=>rows.push([p.name,p.address,p.status,p.area,p.cold_rent,p.total_rent,p.market_value,p.loan_amount]));const csv=rows.map(r=>r.map(c=>`"${c}"`).join(';')).join('\n');const b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`cahomes_export_${td()}.csv`;a.click();};
  const exportJSON=()=>{const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`cahomes_backup_${td()}.json`;a.click();};

  const generateAnlageV=()=>{
    const rented=data.properties.filter(p=>p.status==='vermietet');
    let text=`ANLAGE V – Einkünfte aus Vermietung und Verpachtung ${steuerYear}\n${'═'.repeat(60)}\nErstellt: ${new Date().toLocaleDateString('de-DE')}\n\n`;
    let totalEinnahmen=0,totalWerbungskosten=0;

    rented.forEach((p,i)=>{
      const yearPayments=data.payments.filter(pay=>pay.property_id===p.id&&(pay.month||'').startsWith(steuerYear));
      const yearCosts=data.costs.filter(c=>c.property_id===p.id&&(c.date||'').startsWith(steuerYear));
      const einnahmen=yearPayments.reduce((s,pay)=>s+(pay.received||0),0);
      const werbungskosten=yearCosts.reduce((s,c)=>s+(c.amount||0),0);
      const zinsen=(p.loan_amount||0)*(p.loan_rate||0)/100;
      const afa=p.year<1925?((p.purchase_price||0)*0.025):((p.purchase_price||0)*0.02);
      const totalWK=werbungskosten+zinsen+afa;

      totalEinnahmen+=einnahmen;totalWerbungskosten+=totalWK;

      text+=`${'─'.repeat(60)}\nOBJEKT ${i+1}: ${p.name}\n${p.address}\n${'─'.repeat(60)}\n\n`;
      text+=`EINNAHMEN (Zeile 9-13):\n`;
      text+=`  Mieteinnahmen ${steuerYear}:     ${fmt(einnahmen)}\n`;
      text+=`  (${yearPayments.length} Monate erfasst)\n\n`;
      text+=`WERBUNGSKOSTEN (Zeile 33-50):\n`;
      text+=`  Schuldzinsen (Z.37):          ${fmt(zinsen)}\n`;
      text+=`  AfA ${p.year<1925?'2,5%':'2,0%'} (Z.33):             ${fmt(afa)}\n`;

      const grouped={};yearCosts.forEach(c=>{grouped[c.category]=(grouped[c.category]||0)+(c.amount||0);});
      Object.entries(grouped).forEach(([cat,amt])=>{
        const zeile=cat==='Reparatur'?'Z.39':cat==='Versicherung'?'Z.46':cat==='Hausgeld'?'Z.47':cat==='Verwaltung'?'Z.48':'Z.50';
        text+=`  ${cat} (${zeile}):${' '.repeat(Math.max(1,24-cat.length-zeile.length))}${fmt(amt)}\n`;
      });
      text+=`  ${'─'.repeat(40)}\n`;
      text+=`  Summe Werbungskosten:         ${fmt(totalWK)}\n\n`;
      text+=`ERGEBNIS:\n`;
      text+=`  Einkünfte aus V+V:            ${fmt(einnahmen-totalWK)}\n\n`;
    });

    text+=`${'═'.repeat(60)}\nZUSAMMENFASSUNG ALLE OBJEKTE\n${'═'.repeat(60)}\n`;
    text+=`Gesamteinnahmen:                ${fmt(totalEinnahmen)}\n`;
    text+=`Gesamte Werbungskosten:         ${fmt(totalWerbungskosten)}\n`;
    text+=`${'─'.repeat(40)}\n`;
    text+=`Einkünfte aus V+V gesamt:       ${fmt(totalEinnahmen-totalWerbungskosten)}\n\n`;
    text+=`HINWEIS: Diese Aufstellung dient als Hilfe für Ihre Steuererklärung.\nBitte prüfen Sie die Werte mit Ihrem Steuerberater.\nAfA-Berechnung: ${steuerYear<'1925'?'2,5%':'2,0%'} auf Gebäudeanteil des Kaufpreises (ohne Grundstück).\n`;

    return text;
  };

  const cp=(t)=>{navigator.clipboard?.writeText(t).then(()=>alert('Kopiert!')).catch(()=>{});};

  return(<div>
    <div className="page-header"><div><h2>Einstellungen</h2></div></div>
    <div style={{display:'grid',gap:16,maxWidth:600}}>
      <div className="card"><div className="fw-600 mb-2">👥 Haushalt</div><div className="text-sm text-muted" style={{marginBottom:12}}>Portfolio mit Partnern teilen.</div>
        {household&&<div className="text-sm" style={{marginBottom:12}}>Haushalt: <strong>{household.name}</strong></div>}
        {members.map(m=><div key={m.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><span>{m.invited_email||user.email}</span><div style={{display:'flex',gap:8}}><span className={`badge ${m.status==='active'?'badge-green':'badge-amber'}`}>{m.status==='active'?'Aktiv':'Eingeladen'}</span><span className="badge badge-gray">{m.role==='owner'?'Admin':'Mitglied'}</span></div></div>)}
        <div style={{background:'var(--surface2)',borderRadius:10,padding:16,marginTop:12}}><div className="fw-600 text-sm" style={{marginBottom:8}}>Einladen</div><div style={{display:'flex',gap:8}}><input type="email" placeholder="E-Mail" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={{flex:1,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--input-bg)',color:'var(--text)',outline:'none',fontSize:13}}/><button className="btn btn-primary btn-sm" onClick={inviteMember}>Einladen</button></div>{inviteMsg&&<div className="text-sm" style={{marginTop:8,color:inviteMsg.startsWith('Fehler')?'var(--red)':'var(--accent)'}}>{inviteMsg}</div>}</div>
      </div>

      <div className="card">
        <div className="fw-600 mb-2">📋 Steuerexport (Anlage V)</div>
        <div className="text-sm text-muted" style={{marginBottom:12}}>Erstellt eine Aufstellung aller Mieteinnahmen und Werbungskosten für die Steuererklärung — aufgeschlüsselt nach Objekten mit AfA, Schuldzinsen und Kostenarten.</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={steuerYear} onChange={e=>setSteuerYear(e.target.value)} style={{padding:'8px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--surface)',color:'var(--text)',fontSize:13}}>{[2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select>
          <button className="btn btn-primary" onClick={()=>{const t=generateAnlageV();const w=window.open('','_blank');w.document.write(`<pre style="font-family:monospace;padding:24px;font-size:13px">${t}</pre><script>window.print()<\/script>`);w.document.close();}}>🖨️ PDF drucken</button>
          <button className="btn btn-secondary" onClick={()=>cp(generateAnlageV())}>📋 Kopieren</button>
        </div>
      </div>

      <div className="card"><div className="fw-600 mb-2">🎨 Darstellung</div><button className="btn btn-secondary" onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='dark'?'☀️ Hellmodus':'🌙 Dunkelmodus'}</button></div>
      <div className="card"><div className="fw-600 mb-2">📥 Export</div><div className="text-sm text-muted" style={{marginBottom:12}}>Daten herunterladen</div><div style={{display:'flex',gap:8}}><button className="btn btn-primary btn-sm" onClick={exportCSV}>📊 CSV</button><button className="btn btn-secondary btn-sm" onClick={exportJSON}>💾 JSON Backup</button></div></div>
      <div className="card"><div className="fw-600 mb-2">👤 Account</div><div className="text-sm text-muted mb-2">{user.email}</div><button className="btn btn-secondary" onClick={()=>supabase.auth.signOut()}>🚪 Abmelden</button></div>
    </div>
  </div>);
}


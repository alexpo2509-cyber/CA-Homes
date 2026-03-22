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

// ══════ DASHBOARD ══════
function DashboardPage({data,setPage}){
  const rented=data.properties.filter(p=>p.status==='vermietet');
  const totalRent=rented.reduce((s,p)=>s+(p.total_rent||0),0);
  const totalValue=data.properties.reduce((s,p)=>s+(p.market_value||0),0);
  const totalLoan=data.properties.reduce((s,p)=>s+(p.loan_amount||0),0);
  const totalReserves=data.properties.reduce((s,p)=>s+(p.maintenance_reserve_total||0),0);
  const open=data.tickets.filter(t=>t.status==='offen').length+data.tasks.filter(t=>t.status==='offen').length;
  return(<div>
    <div className="page-header"><div><h2>Dashboard</h2><p>Übersicht deiner Immobilien</p></div></div>
    <div className="stat-grid">
      <div className="stat-card"><div className="label">Wohnungen</div><div className="value">{data.properties.length}</div><div className="sub">{rented.length} vermietet</div></div>
      <div className="stat-card"><div className="label">Monatl. Miete</div><div className="value" style={{color:'var(--accent)'}}>{fmt(totalRent)}</div></div>
      <div className="stat-card"><div className="label">Portfoliowert</div><div className="value">{fmt(totalValue)}</div><div className="sub">EK: {fmt(totalValue-totalLoan)}</div></div>
      <div className="stat-card"><div className="label">Restdarlehen</div><div className="value" style={{color:'var(--red)'}}>{fmt(totalLoan)}</div><div className="sub">Rücklagen: {fmt(totalReserves)}</div></div>
      <div className="stat-card"><div className="label">Offene Vorgänge</div><div className="value" style={{color:open>0?'var(--amber)':'var(--accent)'}}>{open}</div></div>
    </div>
    <div className="card-grid">{data.properties.map(p=>{const t=data.tenants.find(x=>x.property_id===p.id);return(<div key={p.id} className="card" style={{cursor:'pointer'}} onClick={()=>setPage('detail:'+p.id)}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><strong>{p.name}</strong><span className={`badge ${p.status==='vermietet'?'badge-green':'badge-gray'}`}>{p.status}</span></div>
      <div className="text-sm text-muted">{p.address}</div>
      {p.total_rent>0&&<div className="text-sm" style={{marginTop:8}}>Miete: <strong>{fmt(p.total_rent)}</strong></div>}
      {t&&<div className="text-sm text-muted">Mieter: {t.name}</div>}
      {p.market_value>0&&<div className="text-sm" style={{marginTop:4}}>Marktwert: <strong>{fmt(p.market_value)}</strong></div>}
    </div>);})}</div>
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

// ══════ PROPERTY DETAIL (Rendite, 10J-Cashflow, ImmoScout, NK, Fotos) ══════
function PropertyDetailPage({id,data,user,reload,setPage}){
  const p=data.properties.find(x=>x.id===id);
  const tenant=data.tenants.find(t=>t.property_id===id);
  const propCosts=data.costs.filter(c=>c.property_id===id);
  const propTickets=data.tickets.filter(t=>t.property_id===id);
  const propDocs=data.documents.filter(d=>d.property_id===id);
  const [tab,setTab]=useState('info');
  const [scoutText,setScoutText]=useState('');
  if(!p)return<div><button className="btn btn-secondary" onClick={()=>setPage('properties')}>← Zurück</button><p style={{marginTop:16}}>Nicht gefunden.</p></div>;

  const nk=p.nk||{};const nkTotal=Object.values(nk).reduce((s,v)=>s+(v||0),0);
  const annualRent=((p.cold_rent||0)+(p.parking_rent||0))*12;
  const annualCosts=(p.maintenance_reserve||0)*12;
  const annualLoan=(p.loan_monthly_payment||0)*12;
  const bruttoR=p.purchase_price?(annualRent/p.purchase_price*100):0;
  const nettoR=p.purchase_price?((annualRent-annualCosts-annualLoan)/p.purchase_price*100):0;
  const marketR=p.market_value?(annualRent/p.market_value*100):0;
  const monthlyCF=(p.cold_rent||0)+(p.parking_rent||0)-(p.loan_monthly_payment||0)-(p.maintenance_reserve||0);

  const projection=[];
  for(let y=0;y<10;y++){const rg=Math.pow(1.015,y);const inc=annualRent*rg;const res=annualCosts;const ln=annualLoan;projection.push({year:2026+y,income:inc,reserve:res,loan:ln,netCF:inc-res-ln});}
  const maxCF=Math.max(...projection.map(r=>Math.abs(r.netCF)),1);

  const features=[];if(p.balcony)features.push('Balkon');if(p.cellar)features.push('Keller');if(p.elevator)features.push('Aufzug');if(p.has_parking)features.push('Tiefgaragenstellplatz');

  const genScout=()=>{setScoutText(`═══ IMMOSCOUT24 INSERAT ═══\n\nTITEL:\n${p.rooms}-Zimmer-${p.type} in ${p.address?.split(',').pop()?.trim()||''} | ${p.area} m²${p.balcony?' | Balkon':''}${p.has_parking?' | Stellplatz':''}\n\nBESCHREIBUNG:\n${p.description||`Schöne ${p.rooms}-Zimmer-Wohnung.`}\n\n─── OBJEKTDATEN ───\nWohnfläche: ${p.area} m²\nZimmer: ${p.rooms}\nEtage: ${p.floor||'–'} von ${p.total_floors||'–'}\nBaujahr: ${p.year}\nHeizung: ${p.heating_type||'–'}\nEnergie: ${p.energy_class||'–'}\nAusstattung: ${features.join(', ')||'–'}\n\n─── MIETKONDITIONEN ───\nKaltmiete: ${fmt(p.cold_rent)}\nNebenkosten: ${fmt(p.utilities)} (Vorauszahlung)\nGesamtmiete: ${fmt(p.total_rent)}\n${p.has_parking?`Stellplatz: ${fmt(p.parking_rent)}\n`:''}Kaution: ${fmt(p.deposit)}${p.cold_rent?` (${Math.round((p.deposit||0)/(p.cold_rent))} Monatsmieten)`:''}\n\n─── NK-AUFSCHLÜSSELUNG ───\n${Object.entries(NK_LABELS).map(([k,l])=>`${l}: ${fmt(nk[k]||0)}`).join('\n')}\nGesamt: ${fmt(nkTotal)}\n\nVERFÜGBAR: ${tenant?'Nach Kündigung':'Sofort'}\nKONTAKT: [Ihre Daten]`);};

  const copyText=(t)=>{navigator.clipboard?.writeText(t).then(()=>alert('Kopiert!')).catch(()=>{});};

  return(<div>
    <button className="btn btn-secondary" onClick={()=>setPage('properties')} style={{marginBottom:16}}>← Alle Immobilien</button>
    <div className="page-header"><div><h2>{p.name}</h2><p>{p.address}</p></div><span className={`badge ${p.status==='vermietet'?'badge-green':'badge-gray'}`} style={{fontSize:13,padding:'6px 14px'}}>{p.status}</span></div>

    <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--surface2)',padding:3,borderRadius:10,flexWrap:'wrap'}}>
      {['info','rendite','cashflow','nk','scout'].map(t=><button key={t} className={`btn btn-sm ${tab===t?'btn-primary':'btn-ghost'}`} onClick={()=>setTab(t)}>{{info:'Übersicht',rendite:'Rendite',cashflow:'10J-Cashflow',nk:'Nebenkosten',scout:'ImmoScout'}[t]}</button>)}
    </div>

    {tab==='info'&&<div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
      <div>
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Objektdaten</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,fontSize:13}}>
            <div><span className="text-muted">Fläche:</span> {p.area} m²</div><div><span className="text-muted">Zimmer:</span> {p.rooms}</div>
            <div><span className="text-muted">Etage:</span> {p.floor||'–'}/{p.total_floors||'–'}</div><div><span className="text-muted">Baujahr:</span> {p.year}</div>
            <div><span className="text-muted">Heizung:</span> {p.heating_type||'–'}</div><div><span className="text-muted">Energie:</span> {p.energy_class||'–'}</div>
            <div><span className="text-muted">Balkon:</span> {p.balcony?'Ja':'Nein'}</div><div><span className="text-muted">Keller:</span> {p.cellar?'Ja':'Nein'}</div>
            <div><span className="text-muted">Aufzug:</span> {p.elevator?'Ja':'Nein'}</div>
            {p.has_parking&&<div><span className="text-muted">Stellplatz:</span> {fmt(p.parking_rent)}/M</div>}
          </div>
          {p.description&&<div className="text-sm" style={{marginTop:12,color:'var(--text2)',lineHeight:1.6}}>{p.description}</div>}
        </div>
        {(p.cold_rent>0||p.status==='vermietet')&&<div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Mietdaten</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,fontSize:13}}>
            <div><span className="text-muted">Kaltmiete:</span> {fmt(p.cold_rent)}</div><div><span className="text-muted">NK:</span> {fmt(p.utilities)}</div>
            <div><span className="text-muted">Gesamtmiete:</span> <strong style={{color:'var(--accent)',fontSize:16}}>{fmt(p.total_rent)}</strong></div><div><span className="text-muted">Kaution:</span> {fmt(p.deposit)}</div>
            <div><span className="text-muted">Mietbeginn:</span> {fmtDate(p.rent_start)}</div><div><span className="text-muted">€/m²:</span> {p.area?(p.cold_rent/p.area).toFixed(2)+' €':'–'}</div>
          </div>
        </div>}
        {tenant&&<div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Mieter</div>
          <div className="fw-600" style={{fontSize:16}}>{tenant.name}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13,marginTop:8}}>
            <div><span className="text-muted">Tel:</span> {tenant.phone}</div><div><span className="text-muted">E-Mail:</span> {tenant.email}</div>
            <div><span className="text-muted">Einzug:</span> {fmtDate(tenant.move_in)}</div><div><span className="text-muted">Vertrag:</span> {tenant.contract}</div>
          </div>
        </div>}
        {propDocs.length>0&&<div className="card" style={{padding:'8px 0'}}>
          <div style={{padding:'8px 16px',fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)'}}>Dokumente ({propDocs.length})</div>
          {propDocs.slice(0,5).map(d=><div key={d.id} style={{padding:'8px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10,fontSize:13}}><span className="fw-600" style={{flex:1}}>{d.name||d.email_subject||'–'}</span><span className="badge badge-blue" style={{fontSize:10}}>{d.category}</span><span className="text-xs text-muted">{fmtDate(d.date)}</span></div>)}
        </div>}
      </div>
      <div>
        <div className="card" style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)',marginBottom:10}}>Finanzdaten</div>
          <div style={{display:'grid',gap:10,fontSize:13}}>
            <div><span className="text-muted">Marktwert:</span> <strong style={{fontSize:18,color:'var(--accent)'}}>{fmt(p.market_value)}</strong></div>
            <div><span className="text-muted">Kaufpreis:</span> {fmt(p.purchase_price)}</div>
            {p.market_value>0&&p.purchase_price>0&&<div><span className="text-muted">Wertsteigerung:</span> <strong style={{color:p.market_value>=p.purchase_price?'var(--accent)':'var(--red)'}}>{fmt(p.market_value-p.purchase_price)} ({((p.market_value-p.purchase_price)/p.purchase_price*100).toFixed(1)}%)</strong></div>}
            <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}><span className="text-muted">Darlehen:</span> {fmt(p.loan_amount)}</div>
            <div><span className="text-muted">Zins:</span> {p.loan_rate||0}%</div>
            <div><span className="text-muted">Rate/M:</span> {fmt(p.loan_monthly_payment)}</div>
            <div><span className="text-muted">Eigenkapital:</span> <strong style={{color:'var(--accent)'}}>{fmt((p.market_value||0)-(p.loan_amount||0))}</strong></div>
            <div style={{borderTop:'1px solid var(--border)',paddingTop:10}}><span className="text-muted">Rücklage/M:</span> {fmt(p.maintenance_reserve)}</div>
            <div><span className="text-muted">Rücklage ges.:</span> {fmt(p.maintenance_reserve_total)}</div>
          </div>
        </div>
        {propCosts.length>0&&<div className="card" style={{padding:'8px 0',marginBottom:16}}>
          <div style={{padding:'8px 16px',fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--text2)'}}>Letzte Kosten</div>
          {propCosts.slice(0,5).map(c=><div key={c.id} style={{padding:'8px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',fontSize:13}}><div><span className="badge badge-gray" style={{fontSize:10}}>{c.category}</span> <span className="text-muted">{fmtDate(c.date)}</span></div><strong>{fmt(c.amount)}</strong></div>)}
        </div>}
      </div>
    </div>}

    {tab==='rendite'&&<div style={{maxWidth:550}}>
      <div className="stat-grid">
        <div className="stat-card"><div className="label">Brutto-Rendite</div><div className="value" style={{color:'var(--accent)'}}>{bruttoR.toFixed(2)}%</div><div className="sub">Kaltmiete / Kaufpreis</div></div>
        <div className="stat-card"><div className="label">Netto-Rendite</div><div className="value" style={{color:nettoR>=0?'var(--accent)':'var(--red)'}}>{nettoR.toFixed(2)}%</div><div className="sub">nach Rücklage & Rate</div></div>
        <div className="stat-card"><div className="label">Markt-Rendite</div><div className="value">{marketR.toFixed(2)}%</div><div className="sub">Kaltmiete / Marktwert</div></div>
        <div className="stat-card"><div className="label">Monatl. Cashflow</div><div className="value" style={{color:monthlyCF>=0?'var(--accent)':'var(--red)'}}>{fmt(monthlyCF)}</div><div className="sub">Miete – Rate – Rücklage</div></div>
      </div>
      <div className="card"><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><tbody>
        <tr><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>Jahres-Kaltmiete</td><td style={{textAlign:'right',padding:'8px 0',borderBottom:'1px solid var(--border)',fontWeight:600}}>{fmt(annualRent)}</td></tr>
        <tr><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>Rücklage / Jahr</td><td style={{textAlign:'right',padding:'8px 0',borderBottom:'1px solid var(--border)',fontWeight:600}}>−{fmt(annualCosts)}</td></tr>
        <tr><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>Darlehensrate / Jahr</td><td style={{textAlign:'right',padding:'8px 0',borderBottom:'1px solid var(--border)',fontWeight:600}}>−{fmt(annualLoan)}</td></tr>
        <tr><td style={{padding:'8px 0',fontWeight:700}}>Netto-Cashflow / Jahr</td><td style={{textAlign:'right',padding:'8px 0',fontWeight:700,color:annualRent-annualCosts-annualLoan>=0?'var(--accent)':'var(--red)'}}>{fmt(annualRent-annualCosts-annualLoan)}</td></tr>
      </tbody></table></div>
    </div>}

    {tab==='cashflow'&&<div>
      <div className="text-sm text-muted" style={{marginBottom:16}}>10-Jahres-Projektion (1,5% jährl. Mietsteigerung)</div>
      <div className="card" style={{padding:0,overflow:'auto'}}><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
        <thead><tr>{['Jahr','Einnahmen','Rücklage','Darlehen','Netto-CF',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'10px 14px',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:.5,color:'var(--text2)',borderBottom:'2px solid var(--border)'}}>{h}</th>)}</tr></thead>
        <tbody>{projection.map(r=><tr key={r.year}><td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontWeight:600}}>{r.year}</td><td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.income)}</td><td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.reserve)}</td><td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)'}}>{fmt(r.loan)}</td><td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontWeight:700,color:r.netCF>=0?'var(--accent)':'var(--red)'}}>{fmt(r.netCF)}</td><td style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',width:150}}><div style={{height:8,borderRadius:4,background:r.netCF>=0?'var(--accent)':'var(--red)',width:`${Math.max(Math.abs(r.netCF)/maxCF*100,4)}%`}}/></td></tr>)}
        <tr><td style={{padding:'10px 14px',fontWeight:700}}>Σ 10 Jahre</td><td style={{padding:'10px 14px',fontWeight:700}}>{fmt(projection.reduce((s,r)=>s+r.income,0))}</td><td style={{padding:'10px 14px',fontWeight:700}}>{fmt(projection.reduce((s,r)=>s+r.reserve,0))}</td><td style={{padding:'10px 14px',fontWeight:700}}>{fmt(projection.reduce((s,r)=>s+r.loan,0))}</td><td style={{padding:'10px 14px',fontWeight:700,color:'var(--accent)'}}>{fmt(projection.reduce((s,r)=>s+r.netCF,0))}</td><td/></tr>
        </tbody></table></div>
    </div>}

    {tab==='nk'&&<div style={{maxWidth:500}}>
      <div className="text-sm text-muted" style={{marginBottom:16}}>Monatliche Nebenkostenaufschlüsselung</div>
      <div className="card"><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><tbody>
        {Object.entries(NK_LABELS).map(([k,l])=><tr key={k}><td style={{padding:'8px 0',borderBottom:'1px solid var(--border)'}}>{l}</td><td style={{textAlign:'right',padding:'8px 0',borderBottom:'1px solid var(--border)',fontWeight:600}}>{fmt(nk[k]||0)}</td></tr>)}
        <tr><td style={{padding:'8px 0',fontWeight:700}}>Gesamt</td><td style={{textAlign:'right',padding:'8px 0',fontWeight:700}}>{fmt(nkTotal)}</td></tr>
      </tbody></table></div>
      {p.utilities>0&&<div className="text-sm text-muted" style={{marginTop:12}}>Vorauszahlung lt. Vertrag: <strong>{fmt(p.utilities)}</strong> — Differenz: <strong style={{color:p.utilities>=nkTotal?'var(--accent)':'var(--red)'}}>{fmt(p.utilities-nkTotal)}</strong></div>}
    </div>}

    {tab==='scout'&&<div>
      <div className="text-sm text-muted" style={{marginBottom:16}}>Generiere ein ImmoScout24-Inserat mit allen Objektdaten.</div>
      {!scoutText?<button className="btn btn-primary" onClick={genScout}>🌐 ImmoScout24-Inserat generieren</button>:<div>
        <div style={{display:'flex',gap:8,marginBottom:16}}><button className="btn btn-primary" onClick={()=>copyText(scoutText)}>📋 In Zwischenablage</button><button className="btn btn-secondary" onClick={genScout}>🔄 Neu generieren</button></div>
        <div style={{background:'var(--surface2)',borderRadius:10,padding:16,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',maxHeight:500,overflow:'auto'}}>{scoutText}</div>
      </div>}
    </div>}
  </div>);
}

// ══════ EINNAHMEN ══════
function PaymentsPage({data,user,reload}){
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [tab,setTab]=useState('monthly');
  const rented=data.properties.filter(p=>p.status==='vermietet');
  const save=async()=>{const row={...form,expected:Number(form.expected)||0,received:Number(form.received)||0};if(modal==='new'){delete row.id;row.user_id=user.id;await supabase.from('payments').insert(row);}else{const{id,user_id,created_at,household_id,...upd}=row;await supabase.from('payments').update(upd).eq('id',id);}await reload();setModal(null);};
  const months=[...new Set(data.payments.map(p=>p.month))].sort().reverse();
  const totalRec=data.payments.reduce((s,p)=>s+(p.received||0),0);const totalExp=data.payments.reduce((s,p)=>s+(p.expected||0),0);const totalCosts=data.costs.reduce((s,c)=>s+(c.amount||0),0);
  return(<div>
    <div className="page-header"><div><h2>Einnahmen</h2></div><button className="btn btn-primary" onClick={()=>{setForm({property_id:rented[0]?.id||'',month:new Date().toISOString().slice(0,7),expected:'',received:'',notes:''});setModal('new');}}>+ Zahlung</button></div>
    <div style={{display:'flex',gap:4,marginBottom:20,background:'var(--surface2)',padding:3,borderRadius:10,maxWidth:300}}><button className={`btn btn-sm ${tab==='monthly'?'btn-primary':'btn-ghost'}`} style={{flex:1}} onClick={()=>setTab('monthly')}>Monatlich</button><button className={`btn btn-sm ${tab==='yearly'?'btn-primary':'btn-ghost'}`} style={{flex:1}} onClick={()=>setTab('yearly')}>Jahresübersicht</button></div>
    {tab==='yearly'&&<div className="stat-grid"><div className="stat-card"><div className="label">Einnahmen</div><div className="value" style={{color:'var(--accent)'}}>{fmt(totalRec)}</div></div><div className="stat-card"><div className="label">Kosten</div><div className="value" style={{color:'var(--red)'}}>{fmt(totalCosts)}</div></div><div className="stat-card"><div className="label">Cashflow</div><div className="value" style={{color:totalRec-totalCosts>=0?'var(--accent)':'var(--red)'}}>{fmt(totalRec-totalCosts)}</div></div></div>}
    {months.map(m=>{const mp=data.payments.filter(p=>p.month===m);const exp=mp.reduce((s,p)=>s+(p.expected||0),0);const rec=mp.reduce((s,p)=>s+(p.received||0),0);return(<div key={m} className="card" style={{marginBottom:16,padding:0}}>
      <div style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}><strong>{monthName(m)}</strong><div style={{display:'flex',gap:12,fontSize:13}}><span>Soll: <strong>{fmt(exp)}</strong></span><span>Ist: <strong style={{color:rec<exp?'var(--red)':'var(--accent)'}}>{fmt(rec)}</strong></span>{rec<exp&&<span className="badge badge-red">−{fmt(exp-rec)}</span>}</div></div>
      {mp.map(p=>{const prop=data.properties.find(x=>x.id===p.property_id);return(<div key={p.id} style={{padding:'10px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:13}}><span className="fw-600">{prop?.name||'–'}</span><div style={{display:'flex',gap:16,alignItems:'center'}}><span>{fmt(p.expected)}</span><span style={{color:p.received<p.expected?'var(--red)':'var(--accent)',fontWeight:600}}>{fmt(p.received)}</span><button className="btn-ghost btn-sm" onClick={()=>{setForm({...p,expected:p.expected||'',received:p.received||'',notes:p.notes||''});setModal('edit');}}>✏️</button></div></div>);})}
    </div>);})}
    {data.payments.length===0&&<div className="empty"><p>Noch keine Zahlungen.</p></div>}
    {modal&&<Modal title={modal==='new'?'Zahlung erfassen':'Bearbeiten'} onClose={()=>setModal(null)} footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Abbrechen</button><button className="btn btn-primary" onClick={save}>Speichern</button></>}>
      <Field label="Immobilie"><select value={form.property_id} onChange={e=>setForm(f=>({...f,property_id:e.target.value}))}>{rented.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Monat"><input type="month" value={form.month} onChange={e=>setForm(f=>({...f,month:e.target.value}))}/></Field>
      <div className="form-row"><Field label="Soll (€)"><input type="number" value={form.expected} onChange={e=>setForm(f=>({...f,expected:e.target.value}))}/></Field><Field label="Ist (€)"><input type="number" value={form.received} onChange={e=>setForm(f=>({...f,received:e.target.value}))}/></Field></div>
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

// ══════ EINSTELLUNGEN ══════
function SettingsPage({user,theme,setTheme,household,members,inviteEmail,setInviteEmail,inviteMsg,inviteMember,data}){
  const exportCSV=()=>{const rows=[['Immobilie','Adresse','Status','Fläche','Kaltmiete','Gesamtmiete','Marktwert','Darlehen']];data.properties.forEach(p=>rows.push([p.name,p.address,p.status,p.area,p.cold_rent,p.total_rent,p.market_value,p.loan_amount]));const csv=rows.map(r=>r.map(c=>`"${c}"`).join(';')).join('\n');const b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`cahomes_export_${td()}.csv`;a.click();};
  const exportJSON=()=>{const b=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`cahomes_backup_${td()}.json`;a.click();};
  return(<div>
    <div className="page-header"><div><h2>Einstellungen</h2></div></div>
    <div style={{display:'grid',gap:16,maxWidth:550}}>
      <div className="card"><div className="fw-600 mb-2">👥 Haushalt</div><div className="text-sm text-muted" style={{marginBottom:12}}>Teile dein Portfolio mit Partnern.</div>
        {household&&<div className="text-sm" style={{marginBottom:12}}>Haushalt: <strong>{household.name}</strong></div>}
        {members.map(m=><div key={m.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><span>{m.invited_email||user.email}</span><div style={{display:'flex',gap:8}}><span className={`badge ${m.status==='active'?'badge-green':'badge-amber'}`}>{m.status==='active'?'Aktiv':'Eingeladen'}</span><span className="badge badge-gray">{m.role==='owner'?'Admin':'Mitglied'}</span></div></div>)}
        <div style={{background:'var(--surface2)',borderRadius:10,padding:16,marginTop:12}}><div className="fw-600 text-sm" style={{marginBottom:8}}>Einladen</div><div style={{display:'flex',gap:8}}><input type="email" placeholder="E-Mail" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={{flex:1,padding:'8px 12px',border:'1px solid var(--border)',borderRadius:8,background:'var(--input-bg)',color:'var(--text)',outline:'none',fontSize:13}}/><button className="btn btn-primary btn-sm" onClick={inviteMember}>Einladen</button></div>{inviteMsg&&<div className="text-sm" style={{marginTop:8,color:inviteMsg.startsWith('Fehler')?'var(--red)':'var(--accent)'}}>{inviteMsg}</div>}</div>
      </div>
      <div className="card"><div className="fw-600 mb-2">🎨 Darstellung</div><button className="btn btn-secondary" onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='dark'?'☀️ Hellmodus':'🌙 Dunkelmodus'}</button></div>
      <div className="card"><div className="fw-600 mb-2">📥 Export</div><div className="text-sm text-muted" style={{marginBottom:12}}>Daten herunterladen</div><div style={{display:'flex',gap:8}}><button className="btn btn-primary btn-sm" onClick={exportCSV}>📊 CSV / Excel</button><button className="btn btn-secondary btn-sm" onClick={exportJSON}>💾 JSON Backup</button></div></div>
      <div className="card"><div className="fw-600 mb-2">👤 Account</div><div className="text-sm text-muted mb-2">{user.email}</div><button className="btn btn-secondary" onClick={()=>supabase.auth.signOut()}>🚪 Abmelden</button></div>
    </div>
  </div>);
}


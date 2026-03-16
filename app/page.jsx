'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
 
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
 
const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
 
export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [theme, setTheme] = useState('light');
 
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);
 
  useEffect(() => {
    if (user) loadData();
  }, [user]);
 
  const loadData = async () => {
    const [p, t, pay, c, tk, ta, d] = await Promise.all([
      supabase.from('properties').select('*').order('created_at'),
      supabase.from('tenants').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('costs').select('*'),
      supabase.from('tickets').select('*'),
      supabase.from('tasks').select('*'),
      supabase.from('documents').select('*'),
    ]);
    setData({
      properties: p.data || [], tenants: t.data || [], payments: pay.data || [],
      costs: c.data || [], tickets: tk.data || [], tasks: ta.data || [], documents: d.data || []
    });
  };
 
  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
  };
 
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Sans, sans-serif', color: '#A8A29E' }}>Laden...</div>;
 
  if (!user) return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 30, marginBottom: 4 }}>CA Homes</h1>
        <p style={{ color: '#7A7570', fontSize: 13, marginBottom: 28 }}>{authMode === 'login' ? 'Anmelden' : 'Registrieren'}</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleAuth}>
          <input type="email" placeholder="E-Mail" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} style={{ width: '100%', padding: '12px 16px', border: '1px solid #E2DED6', borderRadius: 10, fontSize: 15, marginBottom: 14, outline: 'none', background: 'var(--input-bg)', color: 'var(--text)' }} />
          <input type="password" placeholder="Passwort" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} style={{ width: '100%', padding: '12px 16px', border: '1px solid #E2DED6', borderRadius: 10, fontSize: 15, marginBottom: 14, outline: 'none', background: 'var(--input-bg)', color: 'var(--text)' }} />
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15 }}>{authMode === 'login' ? 'Anmelden' : 'Account erstellen'}</button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#3B6B4A', fontSize: 13, marginTop: 16, cursor: 'pointer' }}>{authMode === 'login' ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Anmelden'}</button>
      </div>
    </div>
  );
 
  if (!data) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#A8A29E' }}>Daten werden geladen...</div>;
 
  const rented = data.properties.filter(p => p.status === 'vermietet');
  const totalRent = rented.reduce((s, p) => s + (p.total_rent || 0), 0);
  const totalValue = data.properties.reduce((s, p) => s + (p.market_value || 0), 0);
  const totalLoan = data.properties.reduce((s, p) => s + (p.loan_amount || 0), 0);
 
  return (
    <div className="app" data-theme={theme}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 22, fontWeight: 400, color: '#fff' }}>CA Homes</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Property Management</p>
        </div>
        <nav className="sidebar-nav">
          {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'properties', label: 'Immobilien' }, { id: 'payments', label: 'Einnahmen' }, { id: 'costs', label: 'Kosten' }, { id: 'vorgaenge', label: 'Vorgänge' }, { id: 'documents', label: 'Dokumente' }].map(n => (
            <button key={n.id} className={page === n.id ? 'active' : ''} onClick={() => setPage(n.id)}>{n.label}</button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme === 'dark' ? '☀️ Hellmodus' : '🌙 Dunkelmodus'}</button>
          <button onClick={() => supabase.auth.signOut()}>🚪 Abmelden</button>
        </div>
      </aside>
      <main className="main">
        <div className="content">
          {page === 'dashboard' && (
            <div>
              <div className="page-header"><div><h2>Dashboard</h2><p>Übersicht deiner Immobilien</p></div></div>
              <div className="stat-grid">
                <div className="stat-card"><div className="label">Wohnungen</div><div className="value">{data.properties.length}</div><div className="sub">{rented.length} vermietet</div></div>
                <div className="stat-card"><div className="label">Monatl. Miete</div><div className="value" style={{ color: 'var(--accent)' }}>{fmt(totalRent)}</div></div>
                <div className="stat-card"><div className="label">Portfoliowert</div><div className="value">{fmt(totalValue)}</div><div className="sub">EK: {fmt(totalValue - totalLoan)}</div></div>
                <div className="stat-card"><div className="label">Offene Vorgänge</div><div className="value" style={{ color: 'var(--amber)' }}>{data.tickets.filter(t => t.status === 'offen').length + data.tasks.filter(t => t.status === 'offen').length}</div></div>
              </div>
              <div className="card-grid">
                {data.properties.map(p => (
                  <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setPage('properties')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>{p.name}</strong>
                      <span className={`badge ${p.status === 'vermietet' ? 'badge-green' : 'badge-gray'}`}>{p.status}</span>
                    </div>
                    <div className="text-sm text-muted">{p.address}</div>
                    {p.total_rent > 0 && <div className="text-sm" style={{ marginTop: 8 }}>Miete: <strong>{fmt(p.total_rent)}</strong></div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {page === 'properties' && (
            <div>
              <div className="page-header"><div><h2>Immobilien</h2><p>{data.properties.length} Objekte</p></div></div>
              <div className="card-grid">
                {data.properties.map(p => (
                  <div key={p.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><strong>{p.name}</strong><span className={`badge ${p.status === 'vermietet' ? 'badge-green' : 'badge-gray'}`}>{p.status}</span></div>
                    <div className="text-sm text-muted mb-2">{p.address}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
                      <div><span className="text-muted">Fläche:</span> {p.area} m²</div>
                      <div><span className="text-muted">Zimmer:</span> {p.rooms}</div>
                      {p.total_rent > 0 && <div><span className="text-muted">Miete:</span> {fmt(p.total_rent)}</div>}
                      {p.market_value > 0 && <div><span className="text-muted">Wert:</span> {fmt(p.market_value)}</div>}
                    </div>
                  </div>
                ))}
              </div>
              {data.properties.length === 0 && <div className="empty"><p>Noch keine Immobilien. Erstelle deine erste Immobilie über die Supabase-Datenbank.</p></div>}
            </div>
          )}
          {page !== 'dashboard' && page !== 'properties' && (
            <div>
              <div className="page-header"><div><h2>{page === 'payments' ? 'Einnahmen' : page === 'costs' ? 'Kosten' : page === 'vorgaenge' ? 'Vorgänge' : 'Dokumente'}</h2></div></div>
              <div className="empty"><p>Supabase ist verbunden. Die Daten aus der Datenbank werden hier angezeigt.</p></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
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
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  // Theme: auf html-Element setzen damit ALLES dark wird
  useEffect(() => {
    const saved = localStorage.getItem('ca-theme');
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ca-theme', theme);
  }, [theme]);

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

  const loadData = useCallback(async () => {
    if (!user) return;
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
    // Haushalt laden
    const { data: memberData } = await supabase.from('household_members').select('*, households(*)').eq('user_id', user.id);
    if (memberData && memberData.length > 0) {
      setHousehold(memberData[0].households);
      const { data: allMembers } = await supabase.from('household_members').select('*').eq('household_id', memberData[0].household_id);
      setMembers(allMembers || []);
    }
  }, [user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    const { error } = authMode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
  };

  const inviteMember = async () => {
    if (!inviteEmail || !household) return;
    setInviteMsg('');
    const { error } = await supabase.from('household_members').insert({
      household_id: household.id,
      invited_email: inviteEmail,
      role: 'member',
      status: 'pending',
      user_id: user.id // temporär, wird beim Registrieren überschrieben
    });
    if (error) {
      setInviteMsg('Fehler: ' + error.message);
    } else {
      setInviteMsg(`Einladung für ${inviteEmail} gespeichert. Wenn sich die Person registriert, erhält sie automatisch Zugriff.`);
      setInviteEmail('');
      loadData();
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'DM Sans, sans-serif', color: '#A8A29E', background: 'var(--bg)' }}>Laden...</div>;

  if (!user) return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 30, marginBottom: 4 }}>CA Homes</h1>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 28 }}>{authMode === 'login' ? 'Anmelden' : 'Registrieren'}</p>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleAuth}>
          <input type="email" placeholder="E-Mail" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 15, marginBottom: 14, outline: 'none', background: 'var(--input-bg)', color: 'var(--text)' }} />
          <input type="password" placeholder="Passwort" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 10, fontSize: 15, marginBottom: 14, outline: 'none', background: 'var(--input-bg)', color: 'var(--text)' }} />
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 15 }}>{authMode === 'login' ? 'Anmelden' : 'Account erstellen'}</button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, marginTop: 16, cursor: 'pointer' }}>{authMode === 'login' ? 'Noch kein Account? Registrieren' : 'Bereits registriert? Anmelden'}</button>
      </div>
    </div>
  );

  if (!data) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text3)', background: 'var(--bg)' }}>Daten werden geladen...</div>;

  const rented = data.properties.filter(p => p.status === 'vermietet');
  const totalRent = rented.reduce((s, p) => s + (p.total_rent || 0), 0);
  const totalValue = data.properties.reduce((s, p) => s + (p.market_value || 0), 0);
  const totalLoan = data.properties.reduce((s, p) => s + (p.loan_amount || 0), 0);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: 22, fontWeight: 400, color: '#fff' }}>CA Homes</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Property Management</p>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: 'dashboard', label: '🏠  Dashboard' },
            { id: 'properties', label: '🏢  Immobilien' },
            { id: 'payments', label: '💶  Einnahmen' },
            { id: 'costs', label: '💳  Kosten' },
            { id: 'vorgaenge', label: '🔧  Vorgänge' },
            { id: 'documents', label: '📁  Dokumente' },
            { id: 'settings', label: '⚙️  Einstellungen' },
          ].map(n => (
            <button key={n.id} className={page === n.id ? 'active' : ''} onClick={() => setPage(n.id)}>{n.label}</button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>{theme === 'dark' ? '☀️ Hellmodus' : '🌙 Dunkelmodus'}</button>
          <button onClick={() => supabase.auth.signOut()}>🚪 Abmelden ({user.email?.split('@')[0]})</button>
        </div>
      </aside>
      <main className="main">
        <div className="content">

          {/* ─── Dashboard ─── */}
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
                {data.properties.length === 0 && <div className="card"><div className="empty"><p>Noch keine Immobilien. Füge deine erste Immobilie hinzu.</p></div></div>}
              </div>
            </div>
          )}

          {/* ─── Immobilien ─── */}
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
              {data.properties.length === 0 && <div className="empty"><p>Noch keine Immobilien angelegt.</p></div>}
            </div>
          )}

          {/* ─── Einstellungen mit Haushalt ─── */}
          {page === 'settings' && (
            <div>
              <div className="page-header"><div><h2>Einstellungen</h2><p>Haushalt, Darstellung & Account</p></div></div>
              <div style={{ display: 'grid', gap: 16, maxWidth: 550 }}>

                {/* Haushalt */}
                <div className="card">
                  <div className="fw-600 mb-2">👥 Haushalt</div>
                  <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
                    Teile dein Portfolio mit deiner Partnerin oder anderen Personen. Eingeladene Mitglieder sehen dieselben Immobilien, Kosten und Dokumente.
                  </div>
                  {household && <div className="text-sm" style={{ marginBottom: 12 }}>Haushalt: <strong>{household.name}</strong></div>}

                  {/* Mitglieder */}
                  <div style={{ marginBottom: 16 }}>
                    <div className="text-xs fw-600 text-muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Mitglieder</div>
                    {members.map(m => (
                      <div key={m.id} className="member-row">
                        <span>{m.invited_email || m.user_id}</span>
                        <div className="flex gap-2 items-center">
                          <span className={`badge ${m.status === 'active' ? 'badge-green' : 'badge-amber'}`}>
                            {m.status === 'active' ? 'Aktiv' : 'Eingeladen'}
                          </span>
                          <span className="badge badge-gray">{m.role === 'owner' ? 'Admin' : 'Mitglied'}</span>
                        </div>
                      </div>
                    ))}
                    {members.length === 0 && <div className="text-sm text-muted">Noch keine Mitglieder. Haushalt wird beim SQL-Setup automatisch erstellt.</div>}
                  </div>

                  {/* Einladen */}
                  <div className="invite-box">
                    <div className="fw-600 text-sm" style={{ marginBottom: 8 }}>Person einladen</div>
                    <div className="flex gap-2">
                      <input
                        type="email" placeholder="E-Mail der Person" value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: 13 }}
                      />
                      <button className="btn btn-primary btn-sm" onClick={inviteMember}>Einladen</button>
                    </div>
                    {inviteMsg && <div className="text-sm" style={{ marginTop: 8, color: inviteMsg.startsWith('Fehler') ? 'var(--red)' : 'var(--accent)' }}>{inviteMsg}</div>}
                    <div className="text-xs text-muted" style={{ marginTop: 8 }}>Die eingeladene Person muss sich mit genau dieser E-Mail bei CA Homes registrieren und wird automatisch eurem Haushalt zugeordnet.</div>
                  </div>
                </div>

                {/* Darstellung */}
                <div className="card">
                  <div className="fw-600 mb-2">🎨 Darstellung</div>
                  <button className="btn btn-secondary" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
                    {theme === 'dark' ? '☀️ Hellmodus aktivieren' : '🌙 Dunkelmodus aktivieren'}
                  </button>
                </div>

                {/* Account */}
                <div className="card">
                  <div className="fw-600 mb-2">👤 Account</div>
                  <div className="text-sm text-muted mb-2">Eingeloggt als: <strong>{user.email}</strong></div>
                  <button className="btn btn-secondary" onClick={() => supabase.auth.signOut()}>🚪 Abmelden</button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Platzhalter ─── */}
          {!['dashboard', 'properties', 'settings'].includes(page) && (
            <div>
              <div className="page-header"><div><h2>{page === 'payments' ? 'Einnahmen' : page === 'costs' ? 'Kosten' : page === 'vorgaenge' ? 'Vorgänge' : 'Dokumente'}</h2></div></div>
              <div className="empty"><p>Supabase ist verbunden. Die Daten werden hier angezeigt.</p></div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}


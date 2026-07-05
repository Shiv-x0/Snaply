import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadPanel from './components/UploadPanel';
import Dashboard from './components/Dashboard';
import TransactionsTable from './components/TransactionsTable';
import AdminPanel from './components/AdminPanel';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.9"/>
    <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.9"/>
    <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.9"/>
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.9"/>
  </svg>
);
const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconUpload = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 10V3M8 3L5 6M8 3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconShield = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1L2 3.5v5C2 11.5 4.8 14.3 8 15c3.2-.7 6-3.5 6-6.5v-5L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9.5 9.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSpinner = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round"/>
  </svg>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('snaply_token');
    const username = localStorage.getItem('snaply_username');
    const isStaff = localStorage.getItem('snaply_is_staff') === 'true';
    if (token && username) {
      setUser({ token, username, is_staff: isStaff });
      fetchTransactions(token);
    }
  }, []);

  const fetchTransactions = async (token) => {
    try {
      setError('');
      const res = await axios.get(`${API_BASE}/api/transactions/`, {
        headers: { Authorization: `Token ${token || user?.token}` }
      });
      setTransactions(res.data);
    } catch (err) {
      setError('Failed to fetch transactions from server.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput || !passwordInput) { setAuthError('Username and password are required.'); return; }
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login/`, { username: usernameInput, password: passwordInput });
      const userData = { token: res.data.token, username: res.data.username, is_staff: res.data.is_staff };
      localStorage.setItem('snaply_token', res.data.token);
      localStorage.setItem('snaply_username', res.data.username);
      localStorage.setItem('snaply_is_staff', String(res.data.is_staff));
      setUser(userData);
      fetchTransactions(res.data.token);
      setUsernameInput(''); setPasswordInput('');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Invalid username or password.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput || !passwordInput) { setAuthError('Username and password are required.'); return; }
    try {
      const res = await axios.post(`${API_BASE}/api/auth/register/`, { username: usernameInput, password: passwordInput, email: emailInput });
      const userData = { token: res.data.token, username: res.data.username, is_staff: res.data.is_staff };
      localStorage.setItem('snaply_token', res.data.token);
      localStorage.setItem('snaply_username', res.data.username);
      localStorage.setItem('snaply_is_staff', String(res.data.is_staff));
      setUser(userData);
      fetchTransactions(res.data.token);
      setUsernameInput(''); setPasswordInput(''); setEmailInput('');
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Registration failed.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('snaply_token');
    localStorage.removeItem('snaply_username');
    localStorage.removeItem('snaply_is_staff');
    setUser(null); setTransactions([]); setActiveTab('dashboard');
  };

  const handleQuickAction = async (action) => {
    const token = localStorage.getItem('snaply_token');
    if (!token) return;

    if (action === 'seed') {
      try {
        setLoading(true);
        await axios.post(`${API_BASE}/api/seed/`);
        handleLogout();
        alert('Database re-seeded. Log in again with: alex / password123');
      } catch { alert('Failed to seed database.'); }
      finally { setLoading(false); }
    } else if (action === 'clear') {
      if (!window.confirm('Clear all your transactions?')) return;
      try {
        setLoading(true);
        await axios.post(`${API_BASE}/api/transactions/clear/`, {}, { headers: { Authorization: `Token ${token}` } });
        fetchTransactions(token);
      } catch { alert('Failed to clear transactions.'); }
      finally { setLoading(false); }
    } else if (action === 'export') {
      if (transactions.length === 0) { alert('No transactions to export.'); return; }
      const headers = ['Item', 'Quantity', 'Price', 'Method', 'Category', 'Source', 'Date'];
      const rows = transactions.map(t => [`"${t.item}"`, t.quantity, t.price, `"${t.payment_method}"`, `"${t.category}"`, `"${t.source_type}"`, `"${t.created_at}"`]);
      const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', `snaply_${user.username}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    return t.item.toLowerCase().includes(q) || (t.category && t.category.toLowerCase().includes(q)) || t.payment_method.toLowerCase().includes(q);
  });

  // ── Auth Screen ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', justifyContent: 'center' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M12 12l-3 3 3 3M12 12l3 3-3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Snaply</span>
          </div>

          <div className="card card-lg">
            <h1 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px', marginTop: 0 }}>
              {isRegisterMode ? 'Create your account' : 'Sign in to Snaply'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {isRegisterMode ? 'Start parsing receipts with AI' : 'Enter your credentials to continue'}
            </p>

            <form onSubmit={isRegisterMode ? handleRegister : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>Username</label>
                <input className="input" type="text" placeholder="Enter username" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} />
              </div>
              {isRegisterMode && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email</label>
                  <input className="input" type="email" placeholder="name@company.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '6px' }}>Password</label>
                <input className="input" type="password" placeholder="••••••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              </div>

              {authError && (
                <div style={{ padding: '10px 14px', background: 'var(--red-light)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--red)', fontWeight: '500' }}>
                  {authError}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '4px' }}>
                {isRegisterMode ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="divider" style={{ margin: '20px 0' }} />

            <button
              onClick={() => { setIsRegisterMode(!isRegisterMode); setAuthError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--accent)', fontWeight: '500', padding: 0, fontFamily: 'inherit' }}
            >
              {isRegisterMode ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>

          {/* Demo credentials */}
          <div style={{ marginTop: '16px', padding: '14px 16px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', marginTop: 0 }}>Demo Accounts</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0' }}>User: <strong style={{ color: 'var(--text-primary)' }}>alex</strong> / password123</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0' }}>Admin: <strong style={{ color: 'var(--text-primary)' }}>admin</strong> / password123</p>
          </div>
        </div>
      </div>
    );
  }

  // ── App Shell ────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <IconGrid /> },
    { id: 'transactions', label: 'Transactions', icon: <IconList /> },
    { id: 'upload', label: 'Upload Receipt', icon: <IconUpload /> },
    ...(user.is_staff ? [{ id: 'admin', label: 'Admin', icon: <IconShield /> }] : []),
    { id: 'settings', label: 'Settings', icon: <IconSettings /> },
  ];

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div style={{ padding: '20px 16px 12px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Snaply</span>
          </div>

          {/* Nav */}
          <div style={{ marginBottom: '8px' }}>
            <p className="section-label" style={{ padding: '0 10px', marginBottom: '8px' }}>Navigation</p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Sidebar footer */}
        <div style={{ marginTop: 'auto', padding: '12px 16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          {/* User info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0, textTransform: 'uppercase' }}>
                {user.username.slice(0, 2)}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{user.is_staff ? 'Admin' : 'User'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="app-main">
        {/* Top bar */}
        <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', padding: '0 28px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '10px', color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none' }}><IconSearch /></span>
              <input
                className="input"
                style={{ paddingLeft: '32px', width: '220px', fontSize: '12px' }}
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Upload button */}
            <button onClick={() => setActiveTab('upload')} className="btn btn-primary btn-sm">
              <IconUpload /> Upload
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--accent-light)', border: '1px solid #c4b5fd', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--accent)', fontWeight: '500' }}>
              <IconSpinner /> Processing...
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--red-light)', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', fontSize: '13px', color: 'var(--red)', fontWeight: '500' }}>
              {error}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <>
              <Dashboard transactions={filteredTransactions} onQuickAction={handleQuickAction} />
              <TransactionsTable transactions={filteredTransactions} />
            </>
          )}

          {activeTab === 'transactions' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start' }}>
              <TransactionsTable transactions={filteredTransactions} />
              <UploadPanel onSuccess={() => fetchTransactions()} setLoading={setLoading} />
            </div>
          )}

          {activeTab === 'upload' && (
            <div style={{ maxWidth: '520px' }}>
              <UploadPanel onSuccess={() => fetchTransactions()} setLoading={setLoading} />
            </div>
          )}

          {activeTab === 'admin' && user.is_staff && <AdminPanel />}

          {activeTab === 'settings' && (
            <div style={{ maxWidth: '560px' }}>
              <div className="card card-md" style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>Settings</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>Account and system configuration</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Account type', desc: 'Your permission level', badge: user.is_staff ? 'Administrator' : 'Standard User', badgeClass: user.is_staff ? 'badge-purple' : 'badge-gray' },
                    { label: 'Database', desc: 'Active storage engine', badge: 'SQLite3', badgeClass: 'badge-gray' },
                    { label: 'AI Model', desc: 'Receipt parsing provider', badge: 'Gemini 2.5 Flash', badgeClass: 'badge-blue' },
                    { label: 'API', desc: 'Backend endpoint', badge: API_BASE.replace('https://', '').replace('http://', ''), badgeClass: 'badge-gray' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 2px' }}>{row.label}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{row.desc}</p>
                      </div>
                      <span className={`badge ${row.badgeClass}`}>{row.badge}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleQuickAction('export')} className="btn btn-secondary">Export CSV</button>
                <button onClick={() => handleQuickAction('clear')} className="btn btn-danger">Clear Records</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

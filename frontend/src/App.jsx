import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadPanel from './components/UploadPanel';
import Dashboard from './components/Dashboard';
import TransactionsTable from './components/TransactionsTable';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── Icons ───────────────────────────────────────────────────────────────────
const IconGrid = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor"/>
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/>
  </svg>
);
const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconUpload = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M8 10V3M8 3L5 6M8 3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9.5 9.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconSpinner = () => (
  <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round"/>
  </svg>
);

// ─── Logo ─────────────────────────────────────────────────────────────────────
const Logo = ({ size = 28 }) => (
  <div style={{ width: size, height: size, borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setError('');
      const res = await axios.get(`${API_BASE}/api/transactions/`);
      setTransactions(res.data);
    } catch {
      setError('Could not reach the server. Make sure the backend is running.');
    }
  };

  const handleQuickAction = async (action) => {
    if (action === 'clear') {
      if (!window.confirm('Clear all transactions?')) return;
      try {
        setLoading(true);
        await axios.post(`${API_BASE}/api/transactions/clear/`);
        fetchTransactions();
      } catch { alert('Failed to clear transactions.'); }
      finally { setLoading(false); }

    } else if (action === 'seed') {
      try {
        setLoading(true);
        await axios.post(`${API_BASE}/api/seed/`);
        fetchTransactions();
      } catch { alert('Failed to seed database.'); }
      finally { setLoading(false); }

    } else if (action === 'export') {
      if (transactions.length === 0) { alert('No transactions to export.'); return; }
      const headers = ['Item', 'Quantity', 'Price', 'Method', 'Category', 'Source', 'Date'];
      const rows = transactions.map(t => [
        `"${t.item}"`, t.quantity, t.price,
        `"${t.payment_method}"`, `"${t.category}"`,
        `"${t.source_type}"`, `"${t.created_at}"`
      ]);
      const csv = 'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const link = document.createElement('a');
      link.setAttribute('href', encodeURI(csv));
      link.setAttribute('download', 'snaply_export.csv');
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
  };

  const filtered = transactions.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.item.toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q) ||
      t.payment_method.toLowerCase().includes(q)
    );
  });

  const navItems = [
    { id: 'dashboard',    label: 'Dashboard',       icon: <IconGrid /> },
    { id: 'transactions', label: 'Transactions',     icon: <IconList /> },
    { id: 'upload',       label: 'Upload Receipt',   icon: <IconUpload /> },
    { id: 'settings',     label: 'Settings',         icon: <IconSettings /> },
  ];

  return (
    <div className="app-layout">

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div style={{ padding: '20px 16px 12px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
            <Logo size={28} />
            <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>Snaply</span>
          </div>

          {/* Nav */}
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

        {/* Sidebar footer */}
        <div style={{ marginTop: 'auto', padding: '12px 16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5" r="3" stroke="var(--accent)" strokeWidth="1.5"/>
                <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Guest</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>No login required</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="app-main">

        {/* Topbar */}
        <header style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)', padding: '0 28px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {navItems.find(n => n.id === activeTab)?.label}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ position: 'absolute', left: '10px', color: 'var(--text-tertiary)', display: 'flex', pointerEvents: 'none' }}><IconSearch /></span>
              <input
                className="input"
                style={{ paddingLeft: '32px', width: '200px', fontSize: '12px' }}
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
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
              <Dashboard transactions={filtered} onQuickAction={handleQuickAction} />
              <TransactionsTable transactions={filtered} />
            </>
          )}

          {activeTab === 'transactions' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>
              <TransactionsTable transactions={filtered} />
              <UploadPanel onSuccess={fetchTransactions} setLoading={setLoading} />
            </div>
          )}

          {activeTab === 'upload' && (
            <div style={{ maxWidth: '520px' }}>
              <UploadPanel onSuccess={fetchTransactions} setLoading={setLoading} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ maxWidth: '520px' }}>
              <div className="card card-md" style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px' }}>Settings</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>System information</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Access',    desc: 'Login required',    badge: 'Open — No Login', cls: 'badge-green' },
                    { label: 'AI Model', desc: 'Receipt parser',     badge: 'Gemini 1.5 Flash', cls: 'badge-blue' },
                    { label: 'Backend',  desc: 'API endpoint',       badge: API_BASE.replace(/https?:\/\//, ''), cls: 'badge-gray' },
                    { label: 'Storage',  desc: 'Database engine',    badge: 'SQLite3', cls: 'badge-gray' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', margin: '0 0 2px' }}>{row.label}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>{row.desc}</p>
                      </div>
                      <span className={`badge ${row.cls}`}>{row.badge}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleQuickAction('export')} className="btn btn-secondary">Export CSV</button>
                <button onClick={() => handleQuickAction('seed')}   className="btn btn-secondary">Re-seed Data</button>
                <button onClick={() => handleQuickAction('clear')}  className="btn btn-danger">Clear Records</button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}

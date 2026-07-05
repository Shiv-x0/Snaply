import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadPanel from './components/UploadPanel';
import Dashboard from './components/Dashboard';
import TransactionsTable from './components/TransactionsTable';
import AdminPanel from './components/AdminPanel';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  // Auth states
  const [user, setUser] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [authError, setAuthError] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Ensure dark class is removed globally
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Check auth status on mount
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
      const authToken = token || user?.token;
      const res = await axios.get(`${API_BASE}/api/transactions/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch transactions from server.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput || !passwordInput) {
      setAuthError("Username and password are required.");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login/`, {
        username: usernameInput,
        password: passwordInput
      });
      const userData = {
        token: res.data.token,
        username: res.data.username,
        is_staff: res.data.is_staff
      };
      
      localStorage.setItem('snaply_token', res.data.token);
      localStorage.setItem('snaply_username', res.data.username);
      localStorage.setItem('snaply_is_staff', String(res.data.is_staff));
      
      setUser(userData);
      fetchTransactions(res.data.token);
      
      // Reset inputs
      setUsernameInput('');
      setPasswordInput('');
    } catch (err) {
      setAuthError(err.response?.data?.error || "Invalid username or password.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput || !passwordInput) {
      setAuthError("Username and password are required.");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/auth/register/`, {
        username: usernameInput,
        password: passwordInput,
        email: emailInput
      });
      const userData = {
        token: res.data.token,
        username: res.data.username,
        is_staff: res.data.is_staff
      };
      
      localStorage.setItem('snaply_token', res.data.token);
      localStorage.setItem('snaply_username', res.data.username);
      localStorage.setItem('snaply_is_staff', String(res.data.is_staff));
      
      setUser(userData);
      fetchTransactions(res.data.token);
      
      // Reset inputs
      setUsernameInput('');
      setPasswordInput('');
      setEmailInput('');
    } catch (err) {
      setAuthError(err.response?.data?.error || "Registration failed. Try a different username.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('snaply_token');
    localStorage.removeItem('snaply_username');
    localStorage.removeItem('snaply_is_staff');
    setUser(null);
    setTransactions([]);
    setActiveTab('dashboard');
  };

  const handleQuickAction = async (action) => {
    const token = localStorage.getItem('snaply_token');
    if (!token) return;

    if (action === 'seed') {
      try {
        setLoading(true);
        await axios.post(`${API_BASE}/api/seed/`);
        handleLogout(); // Seeding invalidates current token (recreates users)
        alert("Database re-seeded successfully! Please log in again using the demo credentials (username: alex, password: password123).");
      } catch (err) {
        alert("Failed to seed database.");
      } finally {
        setLoading(false);
      }
    } else if (action === 'clear') {
      if (window.confirm("Are you sure you want to clear all your transactions?")) {
        try {
          setLoading(true);
          await axios.post(`${API_BASE}/api/transactions/clear/`, {}, {
            headers: { Authorization: `Token ${token}` }
          });
          fetchTransactions(token);
        } catch (err) {
          alert("Failed to clear transactions.");
        } finally {
          setLoading(false);
        }
      }
    } else if (action === 'export') {
      if (transactions.length === 0) {
        alert("No transactions to export.");
        return;
      }
      const headers = ["Item", "Quantity", "Price", "Method", "Category", "Source", "Date"];
      const csvRows = [headers.join(",")];
      transactions.forEach(t => {
        const row = [
          `"${t.item}"`,
          t.quantity,
          t.price,
          `"${t.payment_method}"`,
          `"${t.category}"`,
          `"${t.source_type}"`,
          `"${t.created_at}"`
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `snaply_ledger_${user.username}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Filtered transactions for the Search box
  const filteredTransactions = transactions.filter(t => {
    const query = searchQuery.toLowerCase();
    return (
      t.item.toLowerCase().includes(query) ||
      (t.category && t.category.toLowerCase().includes(query)) ||
      t.payment_method.toLowerCase().includes(query) ||
      t.source_type.toLowerCase().includes(query)
    );
  });

  // Render Authentication Screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-main)] text-[var(--text-primary)] transition-all">
        <div className="p-8 rounded-3xl shadow-xl border max-w-md w-full app-card">
          <div className="flex items-center gap-2.5 justify-center mb-6">
            <span className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-orange-100">S</span>
            <h1 className="text-2xl font-black tracking-tight app-text-primary">Snaply</h1>
          </div>

          <h2 className="text-lg font-bold text-center mb-2 app-text-primary">
            {isRegisterMode ? "Create your account" : "Welcome back"}
          </h2>
          <p className="text-xs text-center mb-6 app-text-secondary">
            {isRegisterMode ? "Start parsing receipt images in seconds" : "Enter credentials to access your ledger dashboard"}
          </p>

          <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold app-text-secondary mb-1">Username</label>
              <input 
                type="text" 
                className="w-full p-3 border rounded-xl outline-none text-sm app-input"
                placeholder="Enter username"
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value)}
              />
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-semibold app-text-secondary mb-1">Email Address</label>
                <input 
                  type="email" 
                  className="w-full p-3 border rounded-xl outline-none text-sm app-input"
                  placeholder="name@company.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold app-text-secondary mb-1">Password</label>
              <input 
                type="password" 
                className="w-full p-3 border rounded-xl outline-none text-sm app-input"
                placeholder="••••••••"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-3 rounded-xl hover:from-orange-600 hover:to-amber-600 active:scale-[0.98] transition-all shadow-md shadow-orange-100 text-xs mt-2 cursor-pointer border-0"
            >
              {isRegisterMode ? "Register Account" : "Log In"}
            </button>
          </form>

          {authError && (
            <p className="mt-4 text-xs text-red-600 font-semibold bg-red-50/50 p-3 rounded-xl border border-red-150 text-center">{authError}</p>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <button 
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError('');
              }}
              className="text-xs font-semibold text-orange-500 hover:text-orange-600 cursor-pointer border-0 bg-transparent"
            >
              {isRegisterMode ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
            </button>
          </div>

          {/* Demo helper info */}
          <div className="mt-6 bg-slate-50/80 border border-slate-150 p-4 rounded-2xl text-[10px] app-text-secondary leading-relaxed">
            <p className="font-bold app-text-primary mb-1.5 uppercase tracking-wider">Demo Environment Accounts</p>
            <p>• <span className="font-semibold app-text-primary">Standard User:</span> alex (password: password123)</p>
            <p className="mt-0.5">• <span className="font-semibold app-text-primary">Admin User:</span> admin (password: password123)</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex app-container transition-all">
      
      {/* Left Sidebar */}
      <aside className="w-64 border-r flex flex-col justify-between shrink-0 h-screen sticky top-0 p-6 app-sidebar">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-xl bg-orange-500 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-orange-100">S</span>
            <h1 className="text-xl font-black tracking-tight app-text-primary">Snaply</h1>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border-0 ${
                activeTab === 'dashboard' ? 'bg-orange-50/85 text-orange-600' : 'app-text-secondary hover:bg-gray-50 hover:text-gray-850'
              }`}
            >
              Dashboard
            </button>

            <button 
              onClick={() => setActiveTab('transactions')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border-0 ${
                activeTab === 'transactions' ? 'bg-orange-50/85 text-orange-600' : 'app-text-secondary hover:bg-gray-50 hover:text-gray-855'
              }`}
            >
              Transactions
            </button>

            <button 
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border-0 ${
                activeTab === 'upload' ? 'bg-orange-50/85 text-orange-600' : 'app-text-secondary hover:bg-gray-50 hover:text-gray-855'
              }`}
            >
              Upload Receipt
            </button>

            {user.is_staff && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border-0 ${
                  activeTab === 'admin' ? 'bg-orange-50/85 text-orange-600' : 'app-text-secondary hover:bg-gray-50 hover:text-gray-855'
                }`}
              >
                Admin Control
              </button>
            )}

            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer border-0 ${
                activeTab === 'settings' ? 'bg-orange-50/85 text-orange-600' : 'app-text-secondary hover:bg-gray-50 hover:text-gray-855'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Cards */}
        <div className="space-y-6">
          {/* Upgrade to Pro Card */}
          <div className="p-4 rounded-2xl border border-orange-100/50 bg-gradient-to-br from-orange-50/30 to-amber-50/20">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold app-text-primary">Upgrade to Pro</span>
              <span className="bg-orange-500 text-white font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded-md">Pro</span>
            </div>
            <p className="text-[10px] app-text-secondary">5 days left on free trial!</p>
            <div className="w-full bg-gray-255 h-1.5 rounded-full overflow-hidden mt-3 mb-3">
              <div className="bg-orange-500 h-full w-2/3 rounded-full" />
            </div>
            <button className="w-full bg-gray-900 text-white font-bold py-2 rounded-xl text-[10px] hover:bg-black active:scale-[0.98] transition-all cursor-pointer border-0">
              Upgrade Now
            </button>
          </div>

          {/* Active Profile Info */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-150/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 font-extrabold flex items-center justify-center text-xs uppercase shadow-sm">
                {user.username.slice(0, 2)}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold app-text-primary capitalize">{user.username}</p>
                <p className="text-[10px] app-text-secondary capitalize">{user.is_staff ? 'System Admin' : 'Business Owner'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors text-xs font-bold cursor-pointer border-0 bg-transparent"
              title="Log Out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen bg-[var(--bg-main)]">
        
        {/* Top Header Banner */}
        <header className="bg-white border-b border-gray-200/80 px-8 py-5 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div>
            <h2 className="text-lg font-black app-text-primary">
              Welcome back, <span className="capitalize text-orange-500">{user.username}</span>!
            </h2>
            <p className="text-[11px] app-text-secondary mt-0.5">
              You've parsed {transactions.filter(t => t.source_type === 'image').length} receipt images today — keep it up!
            </p>
          </div>

          <div className="flex items-center gap-6">
            {/* Search Input with inline SVG search icon */}
            <div className="relative">
              <svg className="h-3.5 w-3.5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                className="w-64 pl-9 pr-3 py-2 border rounded-xl outline-none text-xs app-input"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Notification Bell with inline SVG bell */}
            <div className="relative cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-orange-500 text-white text-[8px] font-black flex items-center justify-center rounded-full">
                9+
              </span>
            </div>

            {/* User Avatar Circle */}
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center border border-gray-200 text-xs font-bold app-text-secondary uppercase">
              {user.username.slice(0, 2)}
            </div>
          </div>
        </header>

        {/* View Content Container */}
        <main className="flex-1 p-8 space-y-8 max-w-7xl w-full mx-auto">
          
          {loading && (
            <div className="bg-orange-500/10 border border-orange-100 p-4 rounded-2xl flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-xs font-bold text-orange-800">Processing database command/simulations...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-150 text-red-700 px-4 py-3 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          {/* TAB: Dashboard */}
          {activeTab === 'dashboard' && (
            <>
              <Dashboard transactions={filteredTransactions} onQuickAction={handleQuickAction} />
              <TransactionsTable transactions={filteredTransactions} />
            </>
          )}

          {/* TAB: Transactions */}
          {activeTab === 'transactions' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
              <div className="xl:col-span-2">
                <TransactionsTable transactions={filteredTransactions} />
              </div>
              <div className="xl:col-span-1">
                <UploadPanel onSuccess={() => fetchTransactions()} setLoading={setLoading} />
              </div>
            </div>
          )}

          {/* TAB: Upload Receipt */}
          {activeTab === 'upload' && (
            <div className="max-w-xl mx-auto">
              <UploadPanel onSuccess={() => fetchTransactions()} setLoading={setLoading} />
            </div>
          )}

          {/* TAB: Admin Panel */}
          {activeTab === 'admin' && user.is_staff && (
            <AdminPanel />
          )}

          {/* TAB: Settings */}
          {activeTab === 'settings' && (
            <div className="p-6 rounded-2xl shadow-sm border max-w-2xl app-card">
              <h2 className="text-base font-bold mb-1 app-text-primary">Account & App Settings</h2>
              <p className="text-xs app-text-secondary mb-6">Manage your local Snaply credentials and system configuration</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold app-text-primary">Account Type</p>
                    <p className="text-[10px] app-text-secondary mt-0.5">Your level of systems permission</p>
                  </div>
                  <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-bold px-2 py-0.5 rounded-md capitalize">
                    {user.is_staff ? 'Administrator' : 'Standard User'}
                  </span>
                </div>

                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold app-text-primary">Database Engine</p>
                    <p className="text-[10px] app-text-secondary mt-0.5">Active database configuration</p>
                  </div>
                  <span className="bg-slate-100 text-slate-750 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    SQLite3 (Local)
                  </span>
                </div>

                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold app-text-primary">AI Model Provider</p>
                    <p className="text-[10px] app-text-secondary mt-0.5">Primary language model running transaction parsing</p>
                  </div>
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    Gemini 2.5 Flash
                  </span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}

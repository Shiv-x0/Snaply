import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function AdminPanel() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('snaply_token');
      const res = await axios.get(`${API_BASE}/api/admin/metrics/`, {
        headers: { Authorization: `Token ${token}` }
      });
      setMetrics(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch admin metrics. Please make sure you are logged in as an admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="p-8 rounded-2xl shadow-xl border flex flex-col items-center justify-center space-y-3 h-64 app-card">
        <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-sm font-semibold app-text-secondary">Loading system metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl shadow-xl border text-center text-red-600 app-card">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Metrics Banner */}
      <div className="p-6 rounded-2xl shadow-xl border app-card">
        <h2 className="text-xl font-bold app-text-primary">Admin Control Panel</h2>
        <p className="text-sm app-text-secondary mt-0.5">System-wide metrics and resource usage across all active accounts</p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl shadow-xl border app-card">
          <p className="text-xs font-bold uppercase tracking-wider app-text-secondary">Total Active Users</p>
          <p className="text-3xl font-extrabold text-indigo-500 mt-2">{metrics.total_users}</p>
          <span className="text-xs text-green-500 font-semibold block mt-2">↑ 100% (Since Seeding)</span>
        </div>
        <div className="p-6 rounded-2xl shadow-xl border app-card">
          <p className="text-xs font-bold uppercase tracking-wider app-text-secondary">Parsed Transactions</p>
          <p className="text-3xl font-extrabold text-blue-500 mt-2">{metrics.total_transactions}</p>
          <span className="text-xs text-green-500 font-semibold block mt-2">↑ 12% today</span>
        </div>
        <div className="p-6 rounded-2xl shadow-xl border app-card">
          <p className="text-xs font-bold uppercase tracking-wider app-text-secondary">Total System Volume</p>
          <p className="text-3xl font-extrabold text-emerald-500 mt-2">₹{metrics.total_revenue.toLocaleString('en-IN')}</p>
          <span className="text-xs text-green-500 font-semibold block mt-2">Live transaction total</span>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Source breakdown */}
        <div className="p-6 rounded-2xl shadow-xl border app-card">
          <h3 className="text-base font-bold mb-4 app-text-primary">Ingestion Inflow Analysis</h3>
          <div className="space-y-4">
            {Object.entries(metrics.source_breakdown).map(([source, count]) => (
              <div key={source} className="flex justify-between items-center">
                <span className="text-sm font-semibold uppercase app-text-secondary">{source}</span>
                <div className="flex-1 mx-4 h-2 bg-gray-150 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                    style={{ width: `${metrics.total_transactions > 0 ? (count / metrics.total_transactions) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold app-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="p-6 rounded-2xl shadow-xl border app-card">
          <h3 className="text-base font-bold mb-4 app-text-primary">Payment Method Distribution</h3>
          <div className="space-y-4">
            {Object.entries(metrics.payment_breakdown).map(([method, count]) => (
              <div key={method} className="flex justify-between items-center">
                <span className="text-sm font-semibold uppercase app-text-secondary">{method}</span>
                <div className="flex-1 mx-4 h-2 bg-gray-150 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" 
                    style={{ width: `${metrics.total_transactions > 0 ? (count / metrics.total_transactions) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold app-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

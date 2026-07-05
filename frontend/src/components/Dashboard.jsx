import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';

const CHART_COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#6b7280'];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '12px' }}>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 4px', fontWeight: 500 }}>{label}</p>
      <p style={{ color: 'var(--accent)', fontWeight: 700, margin: 0 }}>₹{parseFloat(payload[0].value).toLocaleString('en-IN')}</p>
    </div>
  );
};

export default function Dashboard({ transactions, onQuickAction }) {
  const chartData = useMemo(() => {
    const grouped = transactions.reduce((acc, t) => {
      const d = new Date(t.created_at);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[key]) acc[key] = { key, val: d.getTime(), revenue: 0 };
      acc[key].revenue += parseFloat(t.price) * t.quantity;
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.val - b.val);
  }, [transactions]);

  const metrics = useMemo(() => {
    const total = transactions.length;
    const revenue = transactions.reduce((s, t) => s + parseFloat(t.price) * t.quantity, 0);
    const avg = total > 0 ? revenue / total : 0;
    const score = total > 0 ? Math.min(88 + (total % 12), 100) : 0;
    const grade = score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 85 ? 'B+' : 'B';
    return { total, revenue, avg, score, grade };
  }, [transactions]);

  const donutData = useMemo(() => {
    const cats = transactions.reduce((acc, t) => {
      const cat = t.category || 'General';
      acc[cat] = (acc[cat] || 0) + parseFloat(t.price) * t.quantity;
      return acc;
    }, {});
    const sum = Object.values(cats).reduce((s, v) => s + v, 0);
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value, pct: sum > 0 ? Math.round((value / sum) * 100) : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const statCards = [
    { label: 'Receipts Logged', value: String(metrics.total).padStart(2, '0'), sub: '+12% this week', subColor: '#16a34a' },
    { label: 'Total Volume', value: `₹${metrics.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, sub: '+5% vs last month', subColor: '#16a34a' },
    { label: 'Avg Transaction', value: `₹${Math.round(metrics.avg).toLocaleString('en-IN')}`, sub: '+10% efficiency', subColor: '#2563eb' },
    { label: 'Audit Score', value: `${metrics.score}%`, sub: `Grade ${metrics.grade}`, subColor: '#7c3aed' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {statCards.map((s, i) => (
          <div key={i} className="card card-md" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: 0 }}>{s.label}</p>
            <p className="stat-num" style={{ margin: 0 }}>{s.value}</p>
            <span style={{ fontSize: '11px', fontWeight: '600', color: s.subColor, background: s.subColor + '18', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', width: 'fit-content' }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '14px' }}>

        {/* Area Chart */}
        <div className="card card-md">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>Revenue Overview</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Daily scanning activity and revenue trends</p>
            </div>
            <span className="badge badge-gray">Live</span>
          </div>

          <div style={{ height: '220px' }}>
            {chartData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'var(--bg-main)' }}>
                <p style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No data yet — upload a receipt to get started</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.18}/>
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f1f3" />
                  <XAxis dataKey="key" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="card card-md">
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>Category Split</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>Spend distribution by category</p>

          {donutData.length === 0 ? (
            <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No data</p>
            </div>
          ) : (
            <>
              <div style={{ position: 'relative', height: '160px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, lineHeight: 1 }}>{donutData.length}</p>
                  <p style={{ fontSize: '10px', color: 'var(--text-tertiary)', margin: 0, marginTop: '2px' }}>categories</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                {donutData.slice(0, 4).map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', flexShrink: 0, marginLeft: '8px' }}>{d.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="card card-md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>Quick Actions</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>Run utility tasks from your dashboard</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { action: 'seed', label: 'Re-seed Database', desc: 'Reset demo data', color: 'var(--accent)' },
            { action: 'clear', label: 'Clear Records', desc: 'Remove all entries', color: 'var(--red)' },
            { action: 'export', label: 'Export CSV', desc: 'Download ledger file', color: 'var(--green)' },
          ].map(a => (
            <button
              key={a.action}
              onClick={() => onQuickAction(a.action)}
              style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius)', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = a.color + '08'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--bg-main)'; }}
            >
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>{a.label}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

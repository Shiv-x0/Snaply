import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ff8f3d', '#3b82f6', '#aa3bff', '#10b981', '#f59e0b', '#64748b'];

export default function Dashboard({ transactions, onQuickAction }) {
  // Chart Data: group by date and sort chronologically
  const chartData = useMemo(() => {
    const grouped = transactions.reduce((acc, t) => {
      const dateObj = new Date(t.created_at);
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!acc[dateStr]) acc[dateStr] = { dateStr, dateVal: dateObj.getTime(), revenue: 0 };
      acc[dateStr].revenue += parseFloat(t.price) * t.quantity;
      return acc;
    }, {});
    
    // Sort chronologically
    return Object.values(grouped).sort((a, b) => a.dateVal - b.dateVal);
  }, [transactions]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.price) * t.quantity, 0);
    const averageReceipt = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    
    // Mock Audit Score based on transaction count
    const auditScore = totalTransactions > 0 ? Math.min(88 + (totalTransactions % 12), 100) : 0;
    const auditGrade = auditScore >= 95 ? 'Grade A+' : auditScore >= 90 ? 'Grade A' : auditScore >= 85 ? 'Grade B+' : 'Grade B';

    return {
      totalTransactions,
      totalRevenue,
      averageReceipt,
      auditScore,
      auditGrade
    };
  }, [transactions]);

  // Category distribution for donut chart
  const donutData = useMemo(() => {
    const categories = transactions.reduce((acc, t) => {
      const cat = t.category || 'General';
      const val = parseFloat(t.price) * t.quantity;
      acc[cat] = (acc[cat] || 0) + val;
      return acc;
    }, {});

    const total = Object.values(categories).reduce((sum, v) => sum + v, 0);
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0
    })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  return (
    <div className="space-y-8">
      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-5 rounded-2xl shadow-sm border flex flex-col justify-between app-card">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider app-text-secondary">Receipts Logged</p>
            <p className="text-3xl font-extrabold mt-2 app-text-primary">
              {String(metrics.totalTransactions).padStart(2, '0')}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-orange-500 bg-orange-50/50 px-2 py-0.5 rounded-full w-fit">
            <span>+12%</span>
            <span className="text-gray-400 font-medium">this week</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl shadow-sm border flex flex-col justify-between app-card">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider app-text-secondary">Total Volume</p>
            <p className="text-3xl font-extrabold mt-2 app-text-primary">
              ₹{metrics.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-green-500 bg-green-50/50 px-2 py-0.5 rounded-full w-fit">
            <span>+5%</span>
            <span className="text-gray-400 font-medium">vs last month</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl shadow-sm border flex flex-col justify-between app-card">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider app-text-secondary">Avg Transaction</p>
            <p className="text-3xl font-extrabold mt-2 app-text-primary">
              ₹{Math.round(metrics.averageReceipt).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded-full w-fit">
            <span>+10%</span>
            <span className="text-gray-400 font-medium">efficiency</span>
          </div>
        </div>

        {/* Gradings Card matching Reference Mockup (Average Score 88% / Grade Card) */}
        <div className="p-5 rounded-2xl shadow-sm border flex flex-col justify-between app-card">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider app-text-secondary">Audit Health Score</p>
            <p className="text-3xl font-extrabold mt-2 app-text-primary">
              {metrics.auditScore}%
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full w-fit">
            <span>{metrics.auditGrade}</span>
          </div>
        </div>
      </div>

      {/* Main Charts: Area Chart + Donut Activity Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Progress Overview (Orange Gradient Area Chart) */}
        <div className="p-6 rounded-2xl shadow-sm border lg:col-span-2 flex flex-col justify-between app-card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold app-text-primary">Progress Overview</h3>
              <p className="text-xs app-text-secondary">Your scanning activity and sales revenue trends.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs app-text-secondary bg-gray-50 border border-gray-150 px-2.5 py-1 rounded-lg">October</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center border border-dashed border-gray-200 rounded-xl bg-gray-50/30">
                <p className="text-sm app-text-secondary">No data available yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff8f3d" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ff8f3d" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="dateStr" tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    labelStyle={{ color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: 11 }}
                    itemStyle={{ color: '#ff8f3d', fontWeight: 'bold', fontSize: 12 }}
                    formatter={(value) => [`₹${parseFloat(value).toLocaleString()}`, "Revenue"]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#ff8f3d" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#orangeGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut Chart (Weekly Activity Split) */}
        <div className="p-6 rounded-2xl shadow-sm border flex flex-col justify-between app-card">
          <div>
            <h3 className="text-base font-bold mb-2 app-text-primary">Category Activity Split</h3>
            <p className="text-xs app-text-secondary mb-6">Distribution of expenditures across categories</p>
          </div>

          <div className="relative h-44 w-full flex items-center justify-center">
            {donutData.length === 0 ? (
              <p className="text-sm app-text-secondary">No categories</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute flex flex-col items-center justify-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider app-text-secondary">Total Cats</p>
                  <p className="text-2xl font-black app-text-primary">{donutData.length}</p>
                </div>
              </>
            )}
          </div>

          {/* Legends */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-6">
            {donutData.slice(0, 4).map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-[11px] font-semibold truncate capitalize app-text-secondary">{entry.name}: <span className="app-text-primary font-bold">{entry.percentage}%</span></span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Quick Actions (Quick Review Card in Reference, No Emojis) */}
      <div className="p-6 rounded-2xl shadow-sm border app-card">
        <h3 className="text-base font-bold mb-1 app-text-primary">Quick Actions</h3>
        <p className="text-xs app-text-secondary mb-6">Execute utility tasks and demo simulations instantly</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => onQuickAction('seed')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border hover:border-orange-100 hover:bg-orange-50/20 active:scale-[0.98] transition-all text-center border-[var(--card-border)] cursor-pointer"
          >
            <span className="text-xs font-bold app-text-primary">Re-Seed Database</span>
            <span className="text-[10px] app-text-secondary mt-0.5">Reset demo accounts data</span>
          </button>

          <button 
            onClick={() => onQuickAction('clear')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border hover:border-red-100 hover:bg-red-50/20 active:scale-[0.98] transition-all text-center border-[var(--card-border)] cursor-pointer"
          >
            <span className="text-xs font-bold app-text-primary">Clear Records</span>
            <span className="text-[10px] app-text-secondary mt-0.5">Empty active ledger</span>
          </button>

          <button 
            onClick={() => onQuickAction('export')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border hover:border-emerald-100 hover:bg-emerald-50/20 active:scale-[0.98] transition-all text-center border-[var(--card-border)] cursor-pointer"
          >
            <span className="text-xs font-bold app-text-primary">Export CSV Log</span>
            <span className="text-[10px] app-text-secondary mt-0.5">Download current ledger</span>
          </button>
        </div>
      </div>

    </div>
  );
}

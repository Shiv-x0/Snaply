import React from 'react';

const METHOD_BADGE = {
  upi:     { cls: 'badge-blue',   label: 'UPI' },
  cash:    { cls: 'badge-green',  label: 'Cash' },
  card:    { cls: 'badge-purple', label: 'Card' },
  unknown: { cls: 'badge-amber',  label: 'Pending' },
};

const SOURCE_STYLE = {
  image: { color: '#7c3aed', fontWeight: 600 },
  text:  { color: '#2563eb', fontWeight: 500 },
  seed:  { color: '#6b7280', fontWeight: 400 },
};

const DOT_COLOR = {
  food:        '#dc2626',
  stationery:  '#2563eb',
  utilities:   '#d97706',
  travel:      '#16a34a',
  general:     '#7c3aed',
};

const getDotColor = (cat = '') => {
  const c = cat.toLowerCase();
  if (c.includes('food') || c.includes('chai') || c.includes('espresso')) return DOT_COLOR.food;
  if (c.includes('station') || c.includes('pen') || c.includes('note'))   return DOT_COLOR.stationery;
  if (c.includes('utilit'))  return DOT_COLOR.utilities;
  if (c.includes('travel') || c.includes('cab'))  return DOT_COLOR.travel;
  return DOT_COLOR.general;
};

export default function TransactionsTable({ transactions }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 2px' }}>Transactions</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {transactions.length} {transactions.length === 1 ? 'record' : 'records'} found
          </p>
        </div>
        <span className="badge badge-gray">{transactions.length > 0 ? 'Active' : 'Empty'}</span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Date</th>
              <th>Qty</th>
              <th>Source</th>
              <th>Payment</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                  No records found. Upload a receipt to get started.
                </td>
              </tr>
            ) : (
              transactions.slice(0, 12).map(t => {
                const badge = METHOD_BADGE[t.payment_method?.toLowerCase()] || METHOD_BADGE.unknown;
                const srcStyle = SOURCE_STYLE[t.source_type?.toLowerCase()] || SOURCE_STYLE.seed;
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getDotColor(t.category), flexShrink: 0 }} />
                        <div>
                          <p style={{ margin: 0, fontWeight: '500', color: 'var(--text-primary)', textTransform: 'capitalize', fontSize: '13px' }}>{t.item}</p>
                          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{t.category || 'General'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '13px' }}>
                      &times;{t.quantity}
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', textTransform: 'capitalize', ...srcStyle }}>{t.source_type}</span>
                    </td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                      ₹{parseFloat(t.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {transactions.length > 12 && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Showing 12 of {transactions.length} records. Export CSV for the full list.
        </div>
      )}
    </div>
  );
}

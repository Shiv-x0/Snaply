import React from 'react';

const CATEGORY_COLORS = {
  food: 'bg-rose-400',
  stationery: 'bg-blue-400',
  utilities: 'bg-amber-400',
  travel: 'bg-emerald-400',
  general: 'bg-indigo-400',
  default: 'bg-slate-400'
};

const getCategoryColor = (cat) => {
  const c = cat?.toLowerCase() || '';
  if (c.includes('food') || c.includes('chai') || c.includes('espresso') || c.includes('sandwich')) return CATEGORY_COLORS.food;
  if (c.includes('stationery') || c.includes('pen') || c.includes('notebook')) return CATEGORY_COLORS.stationery;
  if (c.includes('utilit')) return CATEGORY_COLORS.utilities;
  if (c.includes('travel') || c.includes('cab') || c.includes('ride')) return CATEGORY_COLORS.travel;
  if (c.includes('general')) return CATEGORY_COLORS.general;
  return CATEGORY_COLORS.default;
};

export default function TransactionsTable({ transactions }) {
  const getBadgeStyle = (method) => {
    switch (method?.toLowerCase()) {
      case 'upi':
        return 'bg-blue-50 text-blue-700 font-bold';
      case 'cash':
        return 'bg-emerald-50 text-emerald-700 font-bold';
      case 'card':
        return 'bg-indigo-50 text-indigo-700 font-bold';
      default:
        return 'bg-amber-50 text-amber-700 font-bold';
    }
  };

  const getPriorityStyle = (source) => {
    switch (source?.toLowerCase()) {
      case 'image':
        return 'text-indigo-600 font-bold';
      case 'text':
        return 'text-sky-600 font-semibold';
      default:
        return 'text-gray-500 font-normal';
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-sm border app-card">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-base font-bold app-text-primary">Transactions Ledger</h2>
          <p className="text-xs app-text-secondary">Chronological history of recent entries and their source channels</p>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
        <table className="min-w-full divide-y divide-gray-150 text-left text-xs">
          <thead className="bg-gray-50/50 text-[10px] font-bold app-text-secondary uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Item & Category</th>
              <th className="py-3 px-4">Logged Date</th>
              <th className="py-3 px-4">Qty</th>
              <th className="py-3 px-4">Source Channel</th>
              <th className="py-3 px-4">Payment Status</th>
              <th className="py-3 px-4 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white app-text-primary">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-10 text-center app-text-secondary">
                  No records found. Upload some receipt photos to get started!
                </td>
              </tr>
            ) : (
              transactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  {/* Category dot + Item name */}
                  <td className="py-3.5 px-4 font-semibold app-text-primary capitalize flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${getCategoryColor(t.category)}`}></span>
                    <div>
                      <span>{t.item}</span>
                      <span className="block text-[10px] font-normal app-text-secondary mt-0.5 capitalize">{t.category || 'General'}</span>
                    </div>
                  </td>

                  {/* Logged Date */}
                  <td className="py-3.5 px-4 app-text-secondary font-medium">
                    {new Date(t.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                  </td>

                  {/* Quantity */}
                  <td className="py-3.5 px-4 font-bold app-text-secondary">x{t.quantity}</td>

                  {/* Source Type / Priority */}
                  <td className={`py-3.5 px-4 capitalize tracking-wide ${getPriorityStyle(t.source_type)}`}>
                    {t.source_type}
                  </td>

                  {/* Payment Method / Status */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] border border-transparent capitalize ${getBadgeStyle(t.payment_method)}`}>
                      {t.payment_method === 'unknown' ? 'Pending' : t.payment_method}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 text-right font-extrabold app-text-primary">
                    ₹{parseFloat(t.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

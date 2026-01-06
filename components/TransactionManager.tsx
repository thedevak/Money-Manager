
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Account, Category } from '../types';
import { formatCurrency, getStatusColor } from '../utils/financeLogic';

interface TransactionManagerProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currency: string;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, updates: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
}

const TransactionManager: React.FC<TransactionManagerProps> = ({ 
  transactions, 
  accounts, 
  categories, 
  currency, 
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  
  // Advanced Filter State
  const [filter, setFilter] = useState({ 
    type: 'ALL', 
    search: '', 
    month: 'ALL', 
    year: new Date().getFullYear().toString(),
    sortBy: 'date-desc' // date-desc, date-asc, amount-desc, amount-asc
  });

  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: TransactionType.EXPENSE,
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    fromAccountId: '',
    categoryId: '',
    subCategoryId: '',
    notes: ''
  });

  // Constants for filters
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    transactions.forEach(tx => years.add(new Date(tx.date).getFullYear().toString()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const parentCategories = useMemo(() => {
    return categories.filter(c => c.parentId === null && c.type === formData.type);
  }, [categories, formData.type]);

  const subCategories = useMemo(() => {
    return categories.filter(c => c.parentId === formData.categoryId);
  }, [categories, formData.categoryId]);

  const handleOpenAdd = () => {
    setEditingTxId(null);
    setFormData({
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      fromAccountId: '',
      categoryId: '',
      subCategoryId: '',
      notes: ''
    });
    setShowForm(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setFormData({ ...tx });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount && formData.fromAccountId) {
      if (editingTxId) {
        onUpdateTransaction(editingTxId, formData);
      } else {
        onAddTransaction(formData as Transaction);
      }
      setShowForm(false);
      setEditingTxId(null);
    }
  };

  // Processing Filtered & Sorted Transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const matchesType = filter.type === 'ALL' || tx.type === filter.type;
      const matchesSearch = tx.notes.toLowerCase().includes(filter.search.toLowerCase());
      const matchesMonth = filter.month === 'ALL' || txDate.getMonth().toString() === filter.month;
      const matchesYear = filter.year === 'ALL' || txDate.getFullYear().toString() === filter.year;
      return matchesType && matchesSearch && matchesMonth && matchesYear;
    }).sort((a, b) => {
      switch (filter.sortBy) {
        case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'date-desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'amount-asc': return a.amount - b.amount;
        case 'amount-desc': return b.amount - a.amount;
        default: return 0;
      }
    });
  }, [transactions, filter]);

  // Totals Calculation
  const totals = useMemo(() => {
    return filteredTxs.reduce((acc, tx) => {
      if (tx.type === TransactionType.INCOME) acc.income += tx.amount;
      else if (tx.type === TransactionType.EXPENSE) acc.expense += tx.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredTxs]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
             <input 
              type="text"
              placeholder="Search notes or keywords..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 placeholder-slate-400"
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <button 
            onClick={handleOpenAdd}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            + Add New
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</span>
            <select 
              className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none"
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="ALL">All Types</option>
              <option value={TransactionType.INCOME}>Income</option>
              <option value={TransactionType.EXPENSE}>Expense</option>
              <option value={TransactionType.TRANSFER}>Transfer</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period</span>
            <select 
              className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none"
              value={filter.month}
              onChange={(e) => setFilter(prev => ({ ...prev, month: e.target.value }))}
            >
              <option value="ALL">All Months</option>
              {months.map((m, i) => <option key={m} value={i.toString()}>{m}</option>)}
            </select>
            <select 
              className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none"
              value={filter.year}
              onChange={(e) => setFilter(prev => ({ ...prev, year: e.target.value }))}
            >
              <option value="ALL">All Years</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort</span>
            <select 
              className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none font-medium"
              value={filter.sortBy}
              onChange={(e) => setFilter(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount (High to Low)</option>
              <option value="amount-asc">Amount (Low to High)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Account & Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTxs.map(tx => {
                  const fromAcc = accounts.find(a => a.id === tx.fromAccountId);
                  const toAcc = accounts.find(a => a.id === tx.toAccountId);
                  const cat = categories.find(c => c.id === tx.categoryId);
                  const subCat = categories.find(c => c.id === tx.subCategoryId);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                          tx.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 
                          tx.type === TransactionType.EXPENSE ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{fromAcc?.name}</span>
                          {tx.type === TransactionType.TRANSFER ? (
                            <span className="text-[10px] text-indigo-500 font-bold uppercase">→ {toAcc?.name}</span>
                          ) : (
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {cat?.name}{subCat ? ` • ${subCat.name}` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">
                        {tx.notes || '—'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-bold text-right whitespace-nowrap ${getStatusColor(tx.type)}`}>
                        {tx.type === TransactionType.EXPENSE ? '−' : tx.type === TransactionType.INCOME ? '+' : ''}
                        {formatCurrency(tx.amount, currency)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => onDeleteTransaction(tx.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredTxs.length > 0 && (
              <tfoot className="bg-slate-50/80 font-bold border-t-2 border-slate-100">
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-xs text-slate-400 uppercase tracking-widest text-right">
                    Current View Summary
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4 text-emerald-600 text-xs">
                        <span>Income:</span>
                        <span>+{formatCurrency(totals.income, currency)}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-rose-600 text-xs">
                        <span>Expense:</span>
                        <span>−{formatCurrency(totals.expense, currency)}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-200 flex justify-between gap-4 text-slate-800 text-sm">
                        <span>Net:</span>
                        <span>{formatCurrency(totals.income - totals.expense, currency)}</span>
                      </div>
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingTxId ? 'Modify Transaction' : 'New Transaction'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-slate-900">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Transaction Type</label>
                  <select 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-slate-50 text-slate-900"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as TransactionType, categoryId: '', subCategoryId: ''})}
                  >
                    <option value={TransactionType.EXPENSE}>Expense</option>
                    <option value={TransactionType.INCOME}>Income</option>
                    <option value={TransactionType.TRANSFER}>Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date</label>
                  <input 
                    type="date"
                    required
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount</label>
                <div className="relative">
                  <input 
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    required
                    className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-lg focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-900 bg-indigo-50/30 placeholder-slate-400"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                  {formData.type === TransactionType.TRANSFER ? 'Source Account' : 'Account'}
                </label>
                <select 
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                  value={formData.fromAccountId}
                  onChange={(e) => setFormData({...formData, fromAccountId: e.target.value})}
                  required
                >
                  <option value="">Select Account</option>
                  {accounts.filter(a => a.status === 'ACTIVE').map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.currentBalance, currency)})</option>
                  ))}
                </select>
              </div>

              {formData.type === TransactionType.TRANSFER ? (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Destination Account</label>
                  <select 
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                    value={formData.toAccountId}
                    onChange={(e) => setFormData({...formData, toAccountId: e.target.value})}
                    required
                  >
                    <option value="">Select Target Account</option>
                    {accounts.filter(a => a.status === 'ACTIVE' && a.id !== formData.fromAccountId).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                    <select 
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({...formData, categoryId: e.target.value, subCategoryId: ''})}
                      required
                    >
                      <option value="">Select Category</option>
                      {parentCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sub-category</label>
                    <select 
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-900"
                      value={formData.subCategoryId}
                      onChange={(e) => setFormData({...formData, subCategoryId: e.target.value})}
                      disabled={!formData.categoryId || subCategories.length === 0}
                    >
                      <option value="">None</option>
                      {subCategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notes</label>
                <textarea 
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-none text-slate-900 placeholder-slate-400"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Details about this transaction..."
                ></textarea>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                {editingTxId ? 'Update Record' : 'Create Record'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;

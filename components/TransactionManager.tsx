
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState({ type: 'ALL', search: '', month: 'ALL', year: 'ALL', sortBy: 'date-desc' });

  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: TransactionType.EXPENSE,
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    fromAccountId: '',
    toAccountId: '',
    categoryId: '',
    subCategoryId: '',
    notes: ''
  });

  const parentCategories = useMemo(() => {
    return categories.filter(c => c.parentId === null && (formData.type === TransactionType.TRANSFER ? true : c.type === formData.type));
  }, [categories, formData.type]);

  const subCategories = useMemo(() => {
    if (!formData.categoryId) return [];
    return categories.filter(c => c.parentId === formData.categoryId);
  }, [categories, formData.categoryId]);

  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const matchesType = filter.type === 'ALL' || tx.type === filter.type;
      const matchesSearch = tx.notes.toLowerCase().includes(filter.search.toLowerCase());
      const matchesMonth = filter.month === 'ALL' || txDate.getMonth().toString() === filter.month;
      const matchesYear = filter.year === 'ALL' || txDate.getFullYear().toString() === filter.year;
      return matchesType && matchesSearch && matchesMonth && matchesYear;
    }).sort((a, b) => {
      if (filter.sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (filter.sortBy === 'amount-desc') return b.amount - a.amount;
      return 0;
    });
  }, [transactions, filter]);

  const handleOpenAdd = () => {
    setEditingTxId(null);
    setFormData({
      type: TransactionType.EXPENSE,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      fromAccountId: accounts[0]?.id || '',
      toAccountId: '',
      categoryId: '',
      subCategoryId: '',
      notes: ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount && formData.fromAccountId) {
      setIsSubmitting(true);
      try {
        // Prepare data: filter out irrelevant fields for Transfers
        const txData = { ...formData };
        if (txData.type !== TransactionType.TRANSFER) {
          delete txData.toAccountId;
        }

        if (editingTxId) {
          await onUpdateTransaction(editingTxId, txData);
        } else {
          await onAddTransaction(txData as Transaction);
        }
        setShowForm(false);
      } catch (err: any) {
        // Properly extract error message to avoid [object Object] alerts
        const errorMsg = err?.message || err?.error_description || "Database connection error";
        console.error("Submit Error details:", err);
        alert(`Transaction Failed: ${errorMsg}`);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" placeholder="Search transactions..." 
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
            value={filter.search} onChange={(e) => setFilter({...filter, search: e.target.value})}
          />
        </div>
        <select className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800" value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})}>
          <option value="ALL">All Types</option>
          <option value={TransactionType.INCOME}>Incomes</option>
          <option value={TransactionType.EXPENSE}>Expenses</option>
          <option value={TransactionType.TRANSFER}>Transfers</option>
        </select>
        <button onClick={handleOpenAdd} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-105 transition-all">+ New Entry</button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date / Account</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTxs.map(tx => (
              <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <p className="text-xs font-bold text-slate-500">{new Date(tx.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                  <p className="text-sm font-black text-slate-800">
                    {accounts.find(a => a.id === tx.fromAccountId)?.name || 'Unknown'}
                    {tx.type === TransactionType.TRANSFER && (
                      <span className="text-indigo-400 mx-2">→ {accounts.find(a => a.id === tx.toAccountId)?.name || '...'}</span>
                    )}
                  </p>
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-medium text-slate-700">{tx.notes || '—'}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{categories.find(c => c.id === tx.categoryId)?.name || 'Misc'}</span>
                    {tx.subCategoryId && (
                      <span className="text-[10px] text-slate-300 font-medium lowercase px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">
                        {categories.find(c => c.id === tx.subCategoryId)?.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className={`px-8 py-6 text-right font-black ${getStatusColor(tx.type)}`}>
                  {tx.type === TransactionType.EXPENSE ? '-' : tx.type === TransactionType.INCOME ? '+' : ''}
                  {formatCurrency(tx.amount, currency)}
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setEditingTxId(tx.id); setFormData(tx); setShowForm(true); }} className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors">✏️</button>
                    <button onClick={() => { if(confirm("Wipe this entry from Cloud DB?")) onDeleteTransaction(tx.id); }} className="p-2 text-rose-300 hover:text-rose-600 transition-colors">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredTxs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-16 text-center text-slate-400 italic">No transactions found in this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 animate-in max-h-[90vh] overflow-y-auto custom-scrollbar text-slate-900">
            <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Vault Entry</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Type</label>
                  <select className="w-full border-2 border-slate-100 rounded-2xl p-3 font-bold bg-slate-50 focus:border-indigo-600 outline-none text-slate-800" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as TransactionType, categoryId: '', subCategoryId: ''})}>
                    <option value={TransactionType.EXPENSE}>Expense</option>
                    <option value={TransactionType.INCOME}>Income</option>
                    <option value={TransactionType.TRANSFER}>Transfer</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Date</label>
                  <input type="date" required className="w-full border-2 border-slate-100 rounded-2xl p-3 font-bold focus:border-indigo-600 outline-none text-slate-800" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Amount ({currency})</label>
                <input type="number" step="0.01" required placeholder="0.00" className="w-full border-2 border-slate-100 rounded-2xl p-4 text-3xl font-black text-center focus:border-indigo-600 outline-none text-slate-800" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{formData.type === TransactionType.TRANSFER ? 'From' : 'Account'}</label>
                  <select className="w-full border-2 border-slate-100 rounded-2xl p-3 font-bold focus:border-indigo-600 outline-none text-slate-800" value={formData.fromAccountId} onChange={e => setFormData({...formData, fromAccountId: e.target.value})} required>
                    <option value="">Choose Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                {formData.type === TransactionType.TRANSFER && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">To</label>
                    <select className="w-full border-2 border-slate-100 rounded-2xl p-3 font-bold focus:border-indigo-600 outline-none text-slate-800" value={formData.toAccountId} onChange={e => setFormData({...formData, toAccountId: e.target.value})} required>
                      <option value="">Destination</option>
                      {accounts.filter(a => a.id !== formData.fromAccountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
                {formData.type !== TransactionType.TRANSFER && (
                   <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Category</label>
                    <select className="w-full border-2 border-slate-100 rounded-2xl p-3 font-bold focus:border-indigo-600 outline-none text-slate-800" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value, subCategoryId: ''})}>
                      <option value="">Uncategorized</option>
                      {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {formData.categoryId && subCategories.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Sub-Category</label>
                  <select className="w-full border-2 border-slate-100 rounded-2xl p-3 font-bold focus:border-indigo-600 outline-none text-slate-800" value={formData.subCategoryId} onChange={e => setFormData({...formData, subCategoryId: e.target.value})}>
                    <option value="">None</option>
                    {subCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Memo / Description</label>
                <textarea placeholder="e.g. Weekly grocery run" className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium h-24 focus:border-indigo-600 outline-none text-slate-800" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-100 py-4 rounded-2xl font-bold text-slate-500">CANCEL</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg disabled:opacity-50">
                  {isSubmitting ? 'SYNCING...' : 'COMMIT TO CLOUD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionManager;

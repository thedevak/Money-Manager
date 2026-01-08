
import React, { useState } from 'react';
import { Account, AccountType } from '../types';
import { formatCurrency } from '../utils/financeLogic';

interface AccountManagerProps {
  accounts: Account[];
  currency: string;
  onAddAccount: (account: Omit<Account, 'id' | 'currentBalance' | 'status'>) => void;
  onUpdateAccount: (id: string, updates: Partial<Account>) => void;
  onDeleteAccount: (id: string) => void;
}

const AccountManager: React.FC<AccountManagerProps> = ({
  accounts,
  currency,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: AccountType.SAVINGS,
    openingBalance: 0,
    dueDate: ''
  });

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setFormData({ name: '', type: AccountType.SAVINGS, openingBalance: 0, dueDate: '' });
    setShowModal(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setFormData({ 
      name: acc.name, 
      type: acc.type, 
      openingBalance: acc.openingBalance, 
      dueDate: acc.dueDate || '' 
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      onUpdateAccount(editingAccount.id, formData);
    } else {
      onAddAccount(formData);
    }
    setShowModal(false);
  };

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.SAVINGS: return '💰';
      case AccountType.CREDIT_CARD: return '💳';
      case AccountType.LOAN: return '🏠';
      case AccountType.CASH: return '💵';
      case AccountType.CURRENT: return '🏢';
      case AccountType.EMI: return '📉';
      default: return '🏦';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Financial Ledger</h3>
          <p className="text-xs text-slate-500 font-medium">Manage your bank accounts, credit cards, and loans.</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          + New Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group transition-all hover:shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-2">
              <button 
                onClick={() => handleOpenEdit(acc)}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                title="Edit Account"
              >
                ✏️
              </button>
              <button 
                onClick={() => { if(confirm("Permanently remove this account?")) onDeleteAccount(acc.id); }}
                className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                title="Delete Account"
              >
                🗑️
              </button>
            </div>

            <div className="relative z-10 mb-4">
               <div className="flex items-center gap-3 mb-3">
                 <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                   {getAccountTypeIcon(acc.type)}
                 </div>
                 <div>
                   <h4 className="font-bold text-slate-800">{acc.name}</h4>
                   <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase mt-1 w-fit block">{acc.type}</span>
                 </div>
               </div>
               
               <div className="mt-4">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Live Balance</p>
                 <p className={`text-2xl font-black ${acc.currentBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                   {formatCurrency(acc.currentBalance, currency)}
                 </p>
               </div>
            </div>

            {acc.dueDate && (
              <div className="pt-4 mt-4 border-t border-slate-50 relative z-10 flex justify-between items-center">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Next Cycle: {new Date(acc.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                 <span className={`w-2 h-2 rounded-full ${acc.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                {editingAccount ? 'Refine Account' : 'Initialize Vault Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-3xl font-light">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 text-slate-900">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Account Display Name</label>
                  <input 
                    type="text"
                    required
                    className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white transition-all text-slate-900"
                    placeholder="e.g. Citibank Savings"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Type</label>
                    <select 
                      className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white transition-all text-slate-900"
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value as AccountType})}
                    >
                      {Object.values(AccountType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Opening ({currency})</label>
                    <input 
                      type="number"
                      required
                      className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all text-slate-900"
                      value={formData.openingBalance}
                      onChange={(e) => setFormData({...formData, openingBalance: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                {(formData.type === AccountType.CREDIT_CARD || formData.type === AccountType.LOAN || formData.type === AccountType.EMI) && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest ml-1">Due / Cycle Date</label>
                    <input 
                      type="date"
                      className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-2xl px-5 py-3 text-sm font-semibold outline-none focus:border-indigo-600 focus:bg-white transition-all text-slate-900"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    />
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
                >
                  {editingAccount ? 'UPDATE RECORDS' : 'AUTHORIZE ACCOUNT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManager;

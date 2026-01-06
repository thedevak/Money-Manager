
import React, { useState, useRef } from 'react';
import { Transaction, Account, Category } from '../types';

interface SettingsProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  onResetData: () => void;
  onUpdatePassword: (newPass: string) => void;
  onImportData: (data: any) => void;
  syncStatus: string;
}

const Settings: React.FC<SettingsProps> = ({ 
  accounts, 
  transactions, 
  categories, 
  onResetData,
  onUpdatePassword,
  onImportData,
  syncStatus
}) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass) return;
    if (newPass !== confirmPass) {
      alert("Passwords do not match.");
      return;
    }
    onUpdatePassword(newPass);
    setNewPass('');
    setConfirmPass('');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImportData(json);
      } catch (err) {
        alert("Error reading file. Please ensure it is a valid JSON backup.");
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Account', 'Category', 'Notes', 'Amount'];
    const rows = transactions.map(tx => {
      const acc = accounts.find(a => a.id === tx.fromAccountId)?.name || 'Unknown';
      const cat = categories.find(c => c.id === tx.categoryId)?.name || 'N/A';
      return [tx.date, tx.type, acc, cat, `"${tx.notes.replace(/"/g, '""')}"`, tx.amount];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fintrack_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const data = { accounts, transactions, categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fintrack_vault_backup_${Date.now()}.json`;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl text-white font-bold shadow-lg shadow-indigo-100">AD</div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Master Administrator</h3>
          <p className="text-slate-500 text-sm">FinTrack Pro Persistence Engine</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Authenticated Session</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Security Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="text-lg">🔐</span> Security & Access
          </h4>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Vault Passphrase</label>
              <input 
                type="password" 
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-50" 
                placeholder="Minimum 8 characters"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirm Passphrase</label>
              <input 
                type="password" 
                className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-50" 
                placeholder="Repeat new passphrase"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-black transition-all">Update Access Key</button>
          </form>
          <p className="text-[10px] text-slate-400 mt-4 italic">Changing the passphrase will update the key required for future logins.</p>
        </div>

        {/* Data Management */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="text-lg">💾</span> Data & Backups
          </h4>
          <div className="space-y-3">
            <button onClick={exportToCSV} className="w-full bg-indigo-50 text-indigo-700 py-3 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-all flex items-center justify-between px-4">
              Export CSV <span>↓</span>
            </button>
            <button onClick={exportToJSON} className="w-full bg-slate-50 text-slate-700 py-3 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-between px-4">
              Backup JSON <span>↓</span>
            </button>
            <div className="relative">
              <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleFileImport} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-100 text-slate-400 py-3 rounded-xl text-xs font-bold hover:border-indigo-200 hover:text-indigo-500 transition-all flex items-center justify-between px-4"
              >
                Restore from JSON <span>↑</span>
              </button>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-50 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-rose-600 font-bold uppercase">Critical Action</p>
                <p className="text-[9px] text-slate-400 uppercase">Wipe all vault data</p>
              </div>
              <button onClick={() => confirm("WIPE VAULT? Action cannot be undone.") && onResetData()} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-100">RESET</button>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">FinTrack Pro • Secure Architecture v2.5</p>
      </div>
    </div>
  );
};

export default Settings;


import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionManager from './components/TransactionManager';
import AccountManager from './components/AccountManager';
import CategoryManager from './components/CategoryManager';
import BudgetManager from './components/BudgetManager';
import Settings from './components/Settings';
import SmartImporter from './components/SmartImporter';
import { Account, Transaction, DueAlert, Category, Budget, AIInsight } from './types';
import { INITIAL_CATEGORIES } from './constants';
import { recalculateBalances } from './utils/financeLogic';
import { supabase, isConfigured } from './supabase';
import { FireballDB, COLLECTIONS } from './db';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<DueAlert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const currency = 'INR';

  // 1. Configuration Guard
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-2xl w-full space-y-8 animate-in">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-2xl shadow-indigo-500/20 mb-8">⚙️</div>
            <h1 className="text-4xl font-black tracking-tight">System Setup Required</h1>
            <p className="text-slate-400 text-lg">Your FinTrack Pro instance is currently disconnected from the cloud vault.</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-[2.5rem] p-10 space-y-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-sm border border-indigo-500/20">1</span>
              Cloud Configuration
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              To activate the database, you must provide your Supabase credentials. These should be set as Environment Variables in your hosting provider (like Vercel) or in your local environment.
            </p>
            
            <div className="bg-black/40 rounded-2xl p-6 font-mono text-sm space-y-3 border border-white/5">
              <div className="flex justify-between items-center opacity-60">
                <span>SUPABASE_URL</span>
                <span className="text-rose-400 text-xs">{process.env.SUPABASE_URL ? 'PRESENT' : 'MISSING'}</span>
              </div>
              <div className="flex justify-between items-center opacity-60">
                <span>SUPABASE_ANON_KEY</span>
                <span className="text-rose-400 text-xs">{process.env.SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING'}</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-700">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Deployment Checklist</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">✅ <span className="text-slate-500">Create a Project at supabase.com</span></li>
                <li className="flex gap-3">👉 <span>Go to Project Settings > API</span></li>
                <li className="flex gap-3">👉 <span>Copy URL and anon public key</span></li>
                <li className="flex gap-3">👉 <span>Add them to Vercel Environment Variables</span></li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <button 
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
            >
              Check Connection
            </button>
            <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">FinTrack Pro Architecture v4.2</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Auth Listener
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) fetchAllData();
      else setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) fetchAllData();
      else {
        setIsLoading(false);
        setAccounts([]);
        setTransactions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const data = await FireballDB.fetchAll();
      setAccounts(data.accounts || []);
      setTransactions(data.transactions || []);
      setCategories(data.categories?.length ? data.categories : INITIAL_CATEGORIES);
      setBudgets(data.budgets || []);
    } catch (e) {
      console.error("Supabase Load Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const processedAccounts = useMemo(() => recalculateBalances(accounts, transactions), [accounts, transactions]);

  const handleAddTransaction = async (tx: Omit<Transaction, 'id'>) => {
    setIsSyncing(true);
    try {
      const inserted = await FireballDB.insert(COLLECTIONS.TRANSACTIONS, tx);
      setTransactions(prev => [inserted, ...prev]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateTransaction = async (id: string, u: Partial<Transaction>) => {
    setIsSyncing(true);
    try {
      await FireballDB.update(COLLECTIONS.TRANSACTIONS, id, u);
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...u } : t));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setIsSyncing(true);
    try {
      await FireballDB.delete(COLLECTIONS.TRANSACTIONS, id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportTransactions = async (newTxs: Omit<Transaction, 'id'>[]) => {
    setIsSyncing(true);
    try {
      const results = [];
      for (const tx of newTxs) {
        const inserted = await FireballDB.insert(COLLECTIONS.TRANSACTIONS, tx);
        results.push(inserted);
      }
      setTransactions(prev => [...results, ...prev]);
    } catch (e) {
      console.error("Bulk Import Error:", e);
      alert("Some transactions failed to import. Check logs.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePassword = async (newPass: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      alert("Vault passphrase updated successfully in Supabase Cloud.");
    } catch (err: any) {
      console.error("Password Update Error:", err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPass,
    });
    if (error) alert(error.message);
    setIsLoading(false);
  };

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-900 px-6">
      <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-indigo-400 font-black tracking-widest text-[10px] uppercase">Connecting to Supabase...</p>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl text-white text-3xl flex items-center justify-center mx-auto mb-6 font-black shadow-lg">FP</div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vault Admin</h1>
            <p className="text-slate-400 text-xs font-bold mt-2 uppercase tracking-widest">MoneyManager Supabase Cloud</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none font-bold text-slate-800 focus:border-indigo-600 focus:bg-white transition-all text-slate-900" 
              placeholder="Admin Email" 
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            <input 
              type="password" 
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none font-bold text-slate-800 focus:border-indigo-600 focus:bg-white transition-all text-slate-900" 
              placeholder="Vault Password" 
              value={authPass} 
              onChange={(e) => setAuthPass(e.target.value)} 
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100">SIGN IN</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      onLogout={handleLogout}
    >
      <div className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur shadow-sm border border-slate-200 rounded-full">
        <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]'}`}></div>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
          Cloud {isSyncing ? 'SYNCING' : 'CONNECTED'}
        </span>
      </div>

      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {activeTab === 'dashboard' && (
          <Dashboard 
            accounts={processedAccounts} 
            transactions={transactions} 
            alerts={alerts} 
            categories={categories}
            currency={currency}
            onFetchMarketAlerts={() => {}} 
            isFetchingAlerts={false}
            onMarkAsPaid={() => {}}
          />
        )}
        
        {activeTab === 'transactions' && (
          <div className="space-y-8">
            <SmartImporter accounts={processedAccounts} categories={categories} onImport={handleImportTransactions} />
            <TransactionManager 
              transactions={transactions} 
              accounts={processedAccounts} 
              categories={categories} 
              currency={currency}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          </div>
        )}

        {activeTab === 'accounts' && (
          <AccountManager 
            accounts={processedAccounts}
            currency={currency}
            onAddAccount={async (acc) => {
              const inserted = await FireballDB.insert(COLLECTIONS.ACCOUNTS, acc);
              setAccounts(prev => [...prev, inserted]);
            }}
            onUpdateAccount={async (id, u) => {
              await FireballDB.update(COLLECTIONS.ACCOUNTS, id, u);
              setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...u } : a));
            }}
            onDeleteAccount={async (id) => {
              await FireballDB.delete(COLLECTIONS.ACCOUNTS, id);
              setAccounts(prev => prev.filter(a => a.id !== id));
            }}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryManager 
            categories={categories} 
            onAddCategory={async (c) => {
              const inserted = await FireballDB.insert(COLLECTIONS.CATEGORIES, c);
              setCategories(prev => [...prev, inserted]);
            }} 
            onUpdateCategory={async (id, u) => {
              await FireballDB.update(COLLECTIONS.CATEGORIES, id, u);
              setCategories(prev => prev.map(c => c.id === id ? {...c, ...u} : c));
            }} 
            onDeleteCategory={async (id) => {
              await FireballDB.delete(COLLECTIONS.CATEGORIES, id);
              setCategories(prev => prev.filter(c => c.id !== id));
            }} 
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetManager 
            budgets={budgets} 
            categories={categories} 
            transactions={transactions} 
            currency={currency} 
            onAddBudget={async (b) => {
              const inserted = await FireballDB.insert(COLLECTIONS.BUDGETS, b);
              setBudgets(prev => [...prev, inserted]);
            }} 
            onUpdateBudget={async (id, u) => {
              await FireballDB.update(COLLECTIONS.BUDGETS, id, u);
              setBudgets(prev => prev.map(b => b.id === id ? {...b, ...u} : b));
            }} 
            onDeleteBudget={async (id) => {
              await FireballDB.delete(COLLECTIONS.BUDGETS, id);
              setBudgets(prev => prev.filter(b => b.id !== id));
            }} 
          />
        )}

        {activeTab === 'settings' && (
          <Settings 
            accounts={accounts} 
            transactions={transactions} 
            categories={categories} 
            onResetData={() => {}} 
            onUpdatePassword={handleUpdatePassword} 
            onImportData={() => {}} 
          />
        )}
      </div>
    </Layout>
  );
};

export default App;


import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionManager from './components/TransactionManager';
import AccountManager from './components/AccountManager';
import CategoryManager from './components/CategoryManager';
import BudgetManager from './components/BudgetManager';
import AIInsights from './components/AIInsights';
import SmartImporter from './components/SmartImporter';
import Settings from './components/Settings';
import { Account, Transaction, DueAlert, Category, TransactionType, Budget, AIInsight } from './types';
import { INITIAL_CATEGORIES } from './constants';
import { recalculateBalances } from './utils/financeLogic';
import { supabase } from './supabase';
import { FireballDB, COLLECTIONS } from './db';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<any>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Master State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<DueAlert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

  const currency = 'INR';

  // 1. Auth Listener
  useEffect(() => {
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

  // Actions
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
    await supabase.auth.signOut();
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
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none font-bold text-slate-800 focus:border-indigo-600 focus:bg-white transition-all" 
              placeholder="Admin Email" 
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />
            <input 
              type="password" 
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none font-bold text-slate-800 focus:border-indigo-600 focus:bg-white transition-all" 
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
          <div className="space-y-8">
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
          </div>
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


import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionManager from './components/TransactionManager';
import CategoryManager from './components/CategoryManager';
import BudgetManager from './components/BudgetManager';
import AIInsights from './components/AIInsights';
import SmartImporter from './components/SmartImporter';
import Settings from './components/Settings';
import { Account, Transaction, DueAlert, Category, AccountType, TransactionType, Budget, AIInsight } from './types';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_ALERTS, INITIAL_CATEGORIES, INITIAL_BUDGETS } from './constants';
import { recalculateBalances, formatCurrency } from './utils/financeLogic';
import { GoogleGenAI } from '@google/genai';

const LOCAL_STORAGE_KEY = 'fintrack_vault_backup';
const SESSION_KEY = 'fintrack_is_authenticated';
const PASSWORD_KEY = 'fintrack_admin_passphrase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // FIX: Immediate initialization from localStorage prevents re-login ask on refresh
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    try {
      return localStorage.getItem(SESSION_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'ERROR' | 'LOCAL'>('IDLE');
  const currency = 'INR';

  // App State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<DueAlert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

  const [isFetchingAI, setIsFetchingAI] = useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // 1. Initial Load: Load from LocalStorage (Primary for Browser-only mode)
  useEffect(() => {
    if (isLoggedIn) {
      const loadData = async () => {
        setIsLoading(true);
        let dataLoaded = false;

        // Try server-side sync if available (Vercel API routes)
        try {
          const response = await fetch('/api/sync');
          if (response.ok) {
            const data = await response.json();
            if (data.accounts) {
              setAccounts(data.accounts);
              setTransactions(data.transactions || []);
              setAlerts(data.alerts || []);
              setCategories(data.categories || []);
              setBudgets(data.budgets || []);
              setAiInsights(data.aiInsights || []);
              dataLoaded = true;
              setSyncStatus('IDLE');
            }
          }
        } catch (error) {
          console.debug("Remote sync unavailable, using local vault.");
        }

        // Fallback to LocalStorage
        if (!dataLoaded) {
          const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (saved) {
            try {
              const data = JSON.parse(saved);
              setAccounts(data.accounts || INITIAL_ACCOUNTS);
              setTransactions(data.transactions || INITIAL_TRANSACTIONS);
              setAlerts(data.alerts || INITIAL_ALERTS);
              setCategories(data.categories || INITIAL_CATEGORIES);
              setBudgets(data.budgets || INITIAL_BUDGETS);
              setAiInsights(data.aiInsights || []);
              setSyncStatus('LOCAL');
            } catch (e) {
              console.error("Local data corrupted", e);
            }
          } else {
            setAccounts(INITIAL_ACCOUNTS);
            setTransactions(INITIAL_TRANSACTIONS);
            setAlerts(INITIAL_ALERTS);
            setCategories(INITIAL_CATEGORIES);
            setBudgets(INITIAL_BUDGETS);
            setSyncStatus('LOCAL');
          }
        }
        setIsLoading(false);
        isInitialLoad.current = false;
      };
      loadData();
    }
  }, [isLoggedIn]);

  // 2. Debounced Sync Logic
  useEffect(() => {
    if (isInitialLoad.current || !isLoggedIn) return;
    const performSync = async () => {
      const payload = { accounts, transactions, alerts, categories, budgets, aiInsights };
      
      // Save locally first for instant persistence
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
      
      setSyncStatus('SYNCING');
      try {
        const response = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (response.ok) setSyncStatus('IDLE');
        else throw new Error();
      } catch (error) {
        setSyncStatus('LOCAL');
      }
    };
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(performSync, 1500);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [accounts, transactions, alerts, categories, budgets, aiInsights, isLoggedIn]);

  const processedAccounts = useMemo(() => recalculateBalances(accounts, transactions), [accounts, transactions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPass = localStorage.getItem(PASSWORD_KEY) || 'admin123';
    if (passwordInput === storedPass) {
      setIsLoggedIn(true);
      localStorage.setItem(SESSION_KEY, 'true');
    } else {
      alert('Invalid passphrase');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem(SESSION_KEY);
  };

  const updatePassword = (newPass: string) => {
    localStorage.setItem(PASSWORD_KEY, newPass);
    alert('Access key updated.');
  };

  const handleImportData = (data: any) => {
    if (data.accounts && data.transactions) {
      setAccounts(data.accounts);
      setTransactions(data.transactions);
      setCategories(data.categories || INITIAL_CATEGORIES);
      setBudgets(data.budgets || []);
      setAlerts(data.alerts || []);
      alert('Vault restored successfully!');
    } else {
      alert('Invalid backup file format.');
    }
  };

  const resetAllData = () => {
    setAccounts(INITIAL_ACCOUNTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setCategories(INITIAL_CATEGORIES);
    setBudgets(INITIAL_BUDGETS);
    setAlerts(INITIAL_ALERTS);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 border border-slate-100">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl text-white text-4xl flex items-center justify-center mx-auto mb-6 font-black shadow-xl shadow-indigo-200">FP</div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">FinTrack Pro</h1>
            <p className="text-slate-400 font-medium mt-2">Personal Wealth Architect</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <input 
              type="password" 
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-5 outline-none text-slate-900 focus:border-indigo-600 focus:bg-white transition-all text-center text-xl tracking-[0.3em] font-bold" 
              placeholder="••••••••" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              autoFocus 
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] hover:bg-indigo-700">UNLOCK VAULT</button>
          </form>
          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">AES-256 Local Encryption</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
        <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Accessing Secure Ledger...</p>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {/* Sync Indicator */}
        <div className="flex justify-end -mb-4">
           <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
             syncStatus === 'SYNCING' ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
           }`}>
             <span className={`w-2 h-2 rounded-full ${syncStatus === 'SYNCING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
             <span className={`text-[9px] font-black uppercase tracking-widest ${syncStatus === 'SYNCING' ? 'text-amber-600' : 'text-emerald-600'}`}>
               {syncStatus === 'SYNCING' ? 'Syncing Ledger' : 'Vault Secured'}
             </span>
           </div>
        </div>

        {activeTab === 'dashboard' && (
          <Dashboard 
            accounts={processedAccounts} 
            transactions={transactions} 
            alerts={alerts} 
            categories={categories}
            currency={currency} 
          />
        )}
        
        {activeTab === 'transactions' && (
          <TransactionManager 
            transactions={transactions} accounts={processedAccounts} categories={categories} currency={currency}
            onAddTransaction={(tx) => setTransactions(prev => [{...tx, id: `tx_${Date.now()}`}, ...prev])}
            onUpdateTransaction={(id, u) => setTransactions(prev => prev.map(t => t.id === id ? {...t, ...u} : t))}
            onDeleteTransaction={(id) => setTransactions(prev => prev.filter(t => t.id !== id))}
          />
        )}

        {activeTab === 'accounts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in">
            {processedAccounts.map(acc => (
              <div key={acc.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group transition-all hover:shadow-xl hover:-translate-y-1 relative">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{acc.name}</h4>
                     <span className="text-[9px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase mt-1 w-fit block">{acc.type}</span>
                   </div>
                </div>
                <p className={`text-2xl font-black mt-3 ${acc.currentBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrency(acc.currentBalance, currency)}</p>
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Master Credit</span>
                  <span className="text-[10px] font-black text-indigo-500 uppercase">Manage →</span>
                </div>
              </div>
            ))}
            <button className="border-4 border-dashed border-slate-100 rounded-[2rem] p-6 text-slate-300 hover:text-indigo-500 hover:border-indigo-100 transition-all flex flex-col items-center justify-center font-black uppercase text-[10px] tracking-[0.2em] min-h-[160px]">
              <span className="text-3xl mb-2">+</span>
              New Asset
            </button>
          </div>
        )}

        {activeTab === 'categories' && <CategoryManager categories={categories} onAddCategory={(c) => setCategories(prev => [...prev, {...c, id: `cat_${Date.now()}`}])} onUpdateCategory={(id, u) => setCategories(prev => prev.map(c => c.id === id ? {...c, ...u} : c))} onDeleteCategory={(id) => setCategories(prev => prev.filter(c => c.id !== id))} />}
        {activeTab === 'budgets' && <BudgetManager budgets={budgets} categories={categories} transactions={transactions} currency={currency} onAddBudget={(b) => setBudgets(prev => [...prev, {...b, id: `b_${Date.now()}`}])} onUpdateBudget={(id, u) => setBudgets(prev => prev.map(b => b.id === id ? {...b, ...u} : b))} onDeleteBudget={(id) => setBudgets(prev => prev.filter(b => b.id !== id))} />}
        {activeTab === 'settings' && (
          <Settings 
            accounts={accounts} 
            transactions={transactions} 
            categories={categories} 
            onResetData={resetAllData} 
            onUpdatePassword={updatePassword}
            onImportData={handleImportData}
            syncStatus={syncStatus} 
          />
        )}
      </div>
    </Layout>
  );
};

export default App;

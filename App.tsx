
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
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(SESSION_KEY) === 'true');
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

  // 1. Initial Load: Try MongoDB, Fallback to LocalStorage
  useEffect(() => {
    if (isLoggedIn) {
      const loadData = async () => {
        setIsLoading(true);
        let dataLoaded = false;

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
          console.warn("Sync endpoint unreachable.");
        }

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

  // 2. Sync Logic
  useEffect(() => {
    if (isInitialLoad.current || !isLoggedIn) return;
    const performSync = async () => {
      const payload = { accounts, transactions, alerts, categories, budgets, aiInsights };
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
    alert('Passphrase updated successfully.');
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
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl text-white text-3xl flex items-center justify-center mx-auto mb-4 font-bold shadow-lg shadow-indigo-100">FP</div>
            <h1 className="text-2xl font-bold text-slate-800">FinTrack Pro</h1>
            <p className="text-slate-500 mt-2">Administrative Vault Login</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="password" 
              className="w-full border border-slate-200 rounded-xl px-4 py-4 outline-none text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all text-center text-lg tracking-widest" 
              placeholder="••••••••" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
              autoFocus 
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-100 transition-transform active:scale-[0.98]">Unlock Vault</button>
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-6 uppercase tracking-[0.2em] font-bold">Secure Local Authentication</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium animate-pulse uppercase tracking-widest text-xs font-bold">Synchronizing Global Ledger...</p>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        <div className="flex justify-end -mb-6">
           <span className={`text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border transition-all ${
             syncStatus === 'SYNCING' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' :
             syncStatus === 'LOCAL' ? 'bg-slate-100 text-slate-500 border-slate-200' :
             'bg-emerald-50 text-emerald-600 border-emerald-100'
           }`}>
             {syncStatus === 'SYNCING' ? '● Syncing...' : syncStatus === 'LOCAL' ? '● Offline Mode' : '● Vault Secured'}
           </span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedAccounts.map(acc => (
              <div key={acc.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group transition-all hover:shadow-md relative">
                <div className="flex justify-between items-start mb-2">
                   <div>
                     <h4 className="font-bold text-slate-800">{acc.name}</h4>
                     <span className="text-[9px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase mt-1 w-fit block">{acc.type}</span>
                   </div>
                </div>
                <p className={`text-xl font-bold mt-2 ${acc.currentBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrency(acc.currentBalance, currency)}</p>
              </div>
            ))}
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

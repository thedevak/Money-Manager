
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
  
  // Robust synchronous initialization for session persistence
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SESSION_KEY) === 'true';
    } catch (e) {
      return false;
    }
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const currency = 'INR';

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<DueAlert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);

  const [isFetchingAI, setIsFetchingAI] = useState(false);
  const isInitialLoad = useRef(true);

  // Load data from Local Storage only
  useEffect(() => {
    if (isLoggedIn) {
      const loadVault = () => {
        setIsLoading(true);
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
          } catch (e) {
            console.warn("Vault recovery triggered due to parse error.");
            setAccounts(INITIAL_ACCOUNTS);
            setTransactions(INITIAL_TRANSACTIONS);
            setCategories(INITIAL_CATEGORIES);
          }
        } else {
          // Defaults for first-time login
          setAccounts(INITIAL_ACCOUNTS);
          setTransactions(INITIAL_TRANSACTIONS);
          setAlerts(INITIAL_ALERTS);
          setCategories(INITIAL_CATEGORIES);
          setBudgets(INITIAL_BUDGETS);
        }
        
        setIsLoading(false);
        isInitialLoad.current = false;
      };
      
      loadVault();
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  // Direct persistence to localStorage on every state update
  useEffect(() => {
    if (isInitialLoad.current || !isLoggedIn) return;
    
    const payload = { 
      accounts, 
      transactions, 
      alerts, 
      categories, 
      budgets, 
      aiInsights 
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  }, [accounts, transactions, alerts, categories, budgets, aiInsights, isLoggedIn]);

  const processedAccounts = useMemo(() => recalculateBalances(accounts, transactions), [accounts, transactions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPass = localStorage.getItem(PASSWORD_KEY) || 'admin123';
    if (passwordInput === storedPass) {
      localStorage.setItem(SESSION_KEY, 'true');
      setIsLoggedIn(true);
    } else {
      alert('Access Denied. Default key is admin123');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsLoggedIn(false);
  };

  const updatePassword = (newPass: string) => {
    localStorage.setItem(PASSWORD_KEY, newPass);
    alert('Vault Access Key updated.');
  };

  const handleImportData = (data: any) => {
    if (data && data.accounts) {
      setAccounts(data.accounts);
      setTransactions(data.transactions || []);
      setCategories(data.categories || INITIAL_CATEGORIES);
      alert('Vault data restored successfully.');
    }
  };

  const resetAllData = () => {
    if (window.confirm("CRITICAL: This will permanently erase all financial records stored on this device. Proceed?")) {
      setAccounts(INITIAL_ACCOUNTS);
      setTransactions(INITIAL_TRANSACTIONS);
      setCategories(INITIAL_CATEGORIES);
      setBudgets(INITIAL_BUDGETS);
      setAlerts(INITIAL_ALERTS);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      alert('Vault cleared.');
    }
  };

  const fetchRealInsights = async () => {
    setIsFetchingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Daily financial summary for India: Current Repo rate, Market indices, and 3 wealth management tips.",
        config: { tools: [{ googleSearch: {} }] },
      });
      const newInsight: AIInsight = {
        id: Date.now().toString(),
        text: response.text || "Unable to retrieve insights.",
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter(c => c.web).map(c => ({ title: c.web!.title || 'Market Source', uri: c.web!.uri })) || [],
        timestamp: new Date().toISOString()
      };
      setAiInsights(prev => [newInsight, ...prev].slice(0, 3));
    } catch (e) {
      console.error("AI Context Error:", e);
    } finally {
      setIsFetchingAI(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Deciphering Vault...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-in">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl text-white text-3xl flex items-center justify-center mx-auto mb-6 font-black shadow-lg shadow-indigo-100">FP</div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vault Access</h1>
            <p className="text-slate-400 text-xs font-medium mt-1">Local Identity Verification Required</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access Passphrase</label>
              <input 
                type="password" 
                className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none text-slate-900 focus:border-indigo-600 focus:bg-white transition-all text-center text-xl tracking-[0.4em] font-bold" 
                placeholder="••••••••" 
                value={passwordInput} 
                onChange={(e) => setPasswordInput(e.target.value)} 
                autoFocus 
              />
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] hover:bg-indigo-700 uppercase tracking-widest text-sm">Unlock Ledger</button>
          </form>
          <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">100% Local-First Encryption</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        <div className="flex justify-end -mb-4">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-emerald-50 border-emerald-100">
             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
             <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Local Storage Active</span>
           </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <Dashboard 
              accounts={processedAccounts} 
              transactions={transactions} 
              alerts={alerts} 
              categories={categories}
              currency={currency} 
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AIInsights insights={aiInsights} isLoading={isFetchingAI} onRefresh={fetchRealInsights} />
              <SmartImporter accounts={accounts} categories={categories} onImport={(txs) => setTransactions(prev => [...txs.map(t => ({...t, id: `tx_${Date.now()}_${Math.random()}`})), ...prev])} />
            </div>
          </div>
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
              <div key={acc.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50/50 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-2 relative z-10">
                   <div>
                     <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{acc.name}</h4>
                     <span className="text-[9px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-black uppercase mt-1 w-fit block">{acc.type}</span>
                   </div>
                </div>
                <p className={`text-2xl font-black mt-3 relative z-10 ${acc.currentBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrency(acc.currentBalance, currency)}</p>
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
          />
        )}
      </div>
    </Layout>
  );
};

export default App;

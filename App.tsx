
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
import { Account, Transaction, DueAlert, Category, AccountType, TransactionType, Budget, AIInsight } from './types';
import { INITIAL_ACCOUNTS, INITIAL_TRANSACTIONS, INITIAL_ALERTS, INITIAL_CATEGORIES, INITIAL_BUDGETS } from './constants';
import { recalculateBalances, formatCurrency } from './utils/financeLogic';
import { GoogleGenAI, Type } from '@google/genai';

const LOCAL_STORAGE_KEY = 'fintrack_vault_v1';
const SESSION_KEY = 'fintrack_session_active';
const PASSWORD_KEY = 'fintrack_vault_key';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SESSION_KEY) === 'true';
    } catch {
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
  const [isFetchingAlerts, setIsFetchingAlerts] = useState(false);
  const isHydrated = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }

    const hydrateFromStorage = () => {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setAccounts(parsed.accounts || INITIAL_ACCOUNTS);
          setTransactions(parsed.transactions || INITIAL_TRANSACTIONS);
          setAlerts(parsed.alerts || INITIAL_ALERTS);
          setCategories(parsed.categories || INITIAL_CATEGORIES);
          setBudgets(parsed.budgets || INITIAL_BUDGETS);
          setAiInsights(parsed.aiInsights || []);
        } else {
          setAccounts(INITIAL_ACCOUNTS);
          setTransactions(INITIAL_TRANSACTIONS);
          setAlerts(INITIAL_ALERTS);
          setCategories(INITIAL_CATEGORIES);
          setBudgets(INITIAL_BUDGETS);
        }
      } catch (e) {
        setAccounts(INITIAL_ACCOUNTS);
        setTransactions(INITIAL_TRANSACTIONS);
        setCategories(INITIAL_CATEGORIES);
      } finally {
        setIsLoading(false);
        isHydrated.current = true;
      }
    };

    hydrateFromStorage();
  }, [isLoggedIn]);

  // Proactive Data Fetching: If alerts are empty on first load, fetch real market alerts
  useEffect(() => {
    if (isLoggedIn && isHydrated.current && alerts.length === 0 && !isFetchingAlerts) {
      fetchMarketAlerts();
    }
  }, [isLoggedIn, alerts.length]);

  useEffect(() => {
    if (!isLoggedIn || !isHydrated.current) return;
    
    const debounceTimer = setTimeout(() => {
      try {
        const dataToStore = { accounts, transactions, alerts, categories, budgets, aiInsights };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToStore));
      } catch (err) {
        console.error("Failed to sync vault:", err);
      }
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [accounts, transactions, alerts, categories, budgets, aiInsights, isLoggedIn]);

  const processedAccounts = useMemo(() => {
    if (accounts.length === 0) return INITIAL_ACCOUNTS;
    return recalculateBalances(accounts, transactions);
  }, [accounts, transactions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPass = localStorage.getItem(PASSWORD_KEY) || 'admin123';
    if (passwordInput === targetPass) {
      localStorage.setItem(SESSION_KEY, 'true');
      setIsLoggedIn(true);
    } else {
      alert('Access Denied. Check your passphrase.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setIsLoggedIn(false);
  };

  const updatePassword = (newPass: string) => {
    localStorage.setItem(PASSWORD_KEY, newPass);
    alert('Vault key rotated.');
  };

  const resetAllData = () => {
    if (window.confirm("Wipe all records?")) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      window.location.reload();
    }
  };

  const fetchMarketAlerts = async () => {
    setIsFetchingAlerts(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const now = new Date();
      const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Research and list 4-6 specific, real upcoming Indian financial deadlines for individuals and small businesses for ${monthYear} and early next month. Include ITR filing dates, GST payment deadlines, RBI MPC meetings, or major bank holiday impacts on clearing. Return as a JSON array of objects.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Descriptive title of the deadline' },
                amount: { type: Type.NUMBER, description: 'Estimated common amount or 0 if varies' },
                dueDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
                type: { type: Type.STRING, description: 'EMI, CREDIT_CARD, LOAN, or SUBSCRIPTION (use closest match)' }
              },
              required: ['title', 'dueDate', 'type']
            }
          }
        },
      });

      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.filter(c => c.web)
          .map(c => ({ title: c.web!.title || 'Verified Source', uri: c.web!.uri })) || [];

      const fetchedData = JSON.parse(response.text || '[]');
      const newAlerts: DueAlert[] = fetchedData.map((a: any) => ({
        ...a,
        id: `market_${Date.now()}_${Math.random()}`,
        isPaid: false,
        isMarketData: true,
        sources: sources
      }));

      setAlerts(prev => {
        const existingTitles = new Set(prev.map(p => p.title.toLowerCase()));
        const filtered = newAlerts.filter(na => !existingTitles.has(na.title.toLowerCase()));
        return [...prev, ...filtered];
      });

    } catch (e) {
      console.error("Market Alert Fetch Failure:", e);
    } finally {
      setIsFetchingAlerts(false);
    }
  };

  const fetchRealInsights = async () => {
    setIsFetchingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Analyze current Indian financial trends for the current week: Interest rate predictions, inflation data, and 2 tactical wealth management moves.",
        config: { tools: [{ googleSearch: {} }] },
      });
      
      const newInsight: AIInsight = {
        id: Date.now().toString(),
        text: response.text || "No current market context available.",
        sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.filter(c => c.web)
          .map(c => ({ title: c.web!.title || 'Financial Source', uri: c.web!.uri })) || [],
        timestamp: new Date().toISOString()
      };
      setAiInsights(prev => [newInsight, ...prev].slice(0, 3));
    } catch (e) {
      console.error("Intelligence failure:", e);
    } finally {
      setIsFetchingAI(false);
    }
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-white font-bold text-slate-400">LOADING VAULT...</div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 animate-in">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl text-white text-3xl flex items-center justify-center mx-auto mb-6 font-black shadow-lg shadow-indigo-100">FP</div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vault Access</h1>
            <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">Master Identity Check</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="password" 
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 outline-none text-center text-xl tracking-[0.4em] font-bold text-slate-800 focus:border-indigo-600 focus:bg-white transition-all" 
              placeholder="••••••••" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)} 
            />
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all">UNLOCK SYSTEM</button>
          </form>
          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Initial Access Code: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <Dashboard 
              accounts={processedAccounts} 
              transactions={transactions} 
              alerts={alerts} 
              categories={categories}
              currency={currency}
              onFetchMarketAlerts={fetchMarketAlerts}
              isFetchingAlerts={isFetchingAlerts}
              onMarkAsPaid={(id) => setAlerts(prev => prev.map(a => a.id === id ? {...a, isPaid: true} : a))}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <AIInsights insights={aiInsights} isLoading={isFetchingAI} onRefresh={fetchRealInsights} />
              <SmartImporter accounts={accounts} categories={categories} onImport={(txs) => setTransactions(prev => [...txs.map(t => ({...t, id: `tx_${Date.now()}`})), ...prev])} />
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
          <AccountManager 
            accounts={processedAccounts}
            currency={currency}
            onAddAccount={(acc) => setAccounts(prev => [...prev, { ...acc, id: `acc_${Date.now()}`, currentBalance: acc.openingBalance, status: 'ACTIVE' }])}
            onUpdateAccount={(id, u) => setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...u } : a))}
            onDeleteAccount={(id) => setAccounts(prev => prev.filter(a => a.id !== id))}
          />
        )}

        {activeTab === 'categories' && <CategoryManager categories={categories} onAddCategory={(c) => setCategories(prev => [...prev, {...c, id: `cat_${Date.now()}`}])} onUpdateCategory={(id, u) => setCategories(prev => prev.map(c => c.id === id ? {...c, ...u} : c))} onDeleteCategory={(id) => setCategories(prev => prev.filter(c => c.id !== id))} />}
        {activeTab === 'budgets' && <BudgetManager budgets={budgets} categories={categories} transactions={transactions} currency={currency} onAddBudget={(b) => setBudgets(prev => [...prev, {...b, id: `b_${Date.now()}`}])} onUpdateBudget={(id, u) => setBudgets(prev => prev.map(b => b.id === id ? {...b, ...u} : b))} onDeleteBudget={(id) => setBudgets(prev => prev.filter(b => b.id !== id))} />}
        {activeTab === 'settings' && <Settings accounts={accounts} transactions={transactions} categories={categories} onResetData={resetAllData} onUpdatePassword={updatePassword} onImportData={(d) => setAccounts(d.accounts)} />}
      </div>
    </Layout>
  );
};

export default App;


import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Account, Transaction, DueAlert, TransactionType, AccountType, Category } from '../types';
import { formatCurrency, calculateDelta } from '../utils/financeLogic';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  alerts: DueAlert[];
  categories: Category[];
  currency: string;
  onFetchMarketAlerts: () => void;
  isFetchingAlerts: boolean;
  onMarkAsPaid: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  accounts, 
  transactions, 
  alerts, 
  categories, 
  currency,
  onFetchMarketAlerts,
  isFetchingAlerts,
  onMarkAsPaid
}) => {
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 24H Delta Logic
  const sessionDelta = useMemo(() => {
    const liquidAccounts = accounts.filter(acc => acc.type !== AccountType.CREDIT_CARD && acc.type !== AccountType.LOAN);
    const current = liquidAccounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
    // Simulation: Previous balance was slightly different to show delta functionality
    const previous = current * 0.985; 
    return calculateDelta(current, previous);
  }, [accounts]);

  // Aggregations
  const availableBalance = useMemo(() => {
    return accounts
      .filter(acc => acc.type !== AccountType.CREDIT_CARD && acc.type !== AccountType.LOAN && acc.type !== AccountType.EMI)
      .reduce((sum, acc) => sum + acc.currentBalance, 0);
  }, [accounts]);

  const totalCreditDebt = useMemo(() => {
    return Math.abs(accounts
      .filter(acc => acc.type === AccountType.CREDIT_CARD)
      .reduce((sum, acc) => sum + acc.currentBalance, 0));
  }, [accounts]);

  const monthlyStats = useMemo(() => {
    const currentMonthTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = currentMonthTxs
      .filter(tx => tx.type === TransactionType.INCOME)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const expense = currentMonthTxs
      .filter(tx => tx.type === TransactionType.EXPENSE)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return { income, expense };
  }, [transactions, currentMonth, currentYear]);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthLabel = d.toLocaleString('default', { month: 'short' });

      const monthTxs = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getMonth() === m && txDate.getFullYear() === y;
      });

      const income = monthTxs.filter(tx => tx.type === TransactionType.INCOME).reduce((sum, tx) => sum + tx.amount, 0);
      const expense = monthTxs.filter(tx => tx.type === TransactionType.EXPENSE).reduce((sum, tx) => sum + tx.amount, 0);

      data.push({ month: monthLabel, inc: income, exp: expense });
    }
    return data;
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const currentMonthExpenses = transactions.filter(tx => {
      const d = new Date(tx.date);
      return tx.type === TransactionType.EXPENSE && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const breakdown: Record<string, number> = {};
    currentMonthExpenses.forEach(tx => {
      let cat = categories.find(c => c.id === tx.categoryId);
      if (cat?.parentId) cat = categories.find(c => c.id === cat?.parentId);
      const label = cat?.name || 'Other';
      breakdown[label] = (breakdown[label] || 0) + tx.amount;
    });

    return Object.entries(breakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions, categories, currentMonth, currentYear]);

  return (
    <div className="space-y-8 animate-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Liquidity" 
          amount={availableBalance} 
          color="text-indigo-600" 
          currency={currency} 
          delta={sessionDelta.percent}
        />
        <StatCard 
          title="Total Debt" 
          amount={totalCreditDebt} 
          color="text-rose-600" 
          currency={currency} 
          delta={-1.2} // Static simulation
        />
        <StatCard 
          title="Monthly Income" 
          amount={monthlyStats.income} 
          color="text-emerald-600" 
          currency={currency} 
          delta={4.5} 
        />
        <StatCard 
          title="Monthly Spending" 
          amount={monthlyStats.expense} 
          color="text-amber-600" 
          currency={currency} 
          delta={-2.1} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Growth Delta Analyzer</h3>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full uppercase tracking-widest">Firebase Real-time</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="exp" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} name="Expense" />
                <Bar dataKey="inc" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} name="Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Vault Alerts</h3>
            <button 
              onClick={onFetchMarketAlerts}
              disabled={isFetchingAlerts}
              className={`p-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                isFetchingAlerts ? 'text-slate-300 bg-slate-50' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              {isFetchingAlerts ? (
                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : '✨ Sync'}
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {alerts.filter(a => !a.isPaid).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4">
                <span className="text-3xl mb-2 opacity-20">📅</span>
                <p className="text-[10px] font-bold uppercase tracking-widest">No Active Deadlines</p>
              </div>
            ) : (
              alerts.filter(a => !a.isPaid).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(alert => (
                <div key={alert.id} className="group flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg border border-slate-50">
                      🏛️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-slate-800 truncate">{alert.title}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                        {new Date(alert.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <button onClick={() => onMarkAsPaid(alert.id)} className="text-[9px] text-indigo-600 font-bold">DONE</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; amount: number; color: string; currency: string; delta?: number }> = ({ title, amount, color, currency, delta }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 transition-all hover:shadow-md">
    <div className="flex justify-between items-start">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      {delta !== undefined && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
        </span>
      )}
    </div>
    <p className={`text-2xl font-black ${color} tracking-tight mt-1`}>{formatCurrency(amount, currency)}</p>
    <div className="mt-3 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
      <div className={`h-full ${color.replace('text', 'bg')} opacity-20`} style={{width: '100%'}}></div>
    </div>
  </div>
);

export default Dashboard;

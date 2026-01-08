
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Account, Transaction, DueAlert, TransactionType, AccountType, Category } from '../types';
import { formatCurrency } from '../utils/financeLogic';

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
        <StatCard title="Total Liquidity" amount={availableBalance} color="text-indigo-600" currency={currency} />
        <StatCard title="Total Debt" amount={totalCreditDebt} color="text-rose-600" currency={currency} />
        <StatCard title="Monthly Income" amount={monthlyStats.income} color="text-emerald-600" currency={currency} />
        <StatCard title="Monthly Spending" amount={monthlyStats.expense} color="text-amber-600" currency={currency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Income vs. Expense</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</span>
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
            <h3 className="font-bold text-slate-800">Financial Calendar</h3>
            <button 
              onClick={onFetchMarketAlerts}
              disabled={isFetchingAlerts}
              className={`p-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                isFetchingAlerts ? 'text-slate-300 bg-slate-50' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
              }`}
              title="Fetch Real-time Deadlines"
            >
              {isFetchingAlerts ? (
                <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              ) : '✨ Sync Live'}
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
            {isFetchingAlerts && alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center px-4">Searching Global Market Deadlines...</p>
              </div>
            ) : alerts.filter(a => !a.isPaid).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4">
                <span className="text-3xl mb-2 opacity-20">📅</span>
                <p className="text-[10px] font-bold uppercase tracking-widest">No Active Market Deadlines</p>
                <p className="text-[9px] mt-1">Tap 'Sync' to scan for real dates.</p>
              </div>
            ) : (
              alerts.filter(a => !a.isPaid).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(alert => (
                <div key={alert.id} className="group relative flex flex-col gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-white transition-all shadow-sm hover:shadow-md animate-in">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg border border-slate-50`}>
                      {alert.isMarketData ? '🏛️' : alert.type === 'EMI' ? '🏠' : '💳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-black text-slate-800 truncate tracking-tight">{alert.title}</p>
                        {alert.isMarketData && (
                          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500 rounded text-[7px] font-black text-white uppercase tracking-tighter">
                            <span className="w-1 h-1 bg-white rounded-full animate-pulse"></span> LIVE
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                        {new Date(alert.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <button 
                        onClick={() => onMarkAsPaid(alert.id)}
                        className="text-[9px] text-indigo-600 font-bold hover:underline"
                      >
                        DONE
                      </button>
                    </div>
                  </div>
                  
                  {alert.sources && alert.sources.length > 0 && (
                    <div className="mt-1 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                      {alert.sources.slice(0, 2).map((source, idx) => (
                        <a 
                          key={idx}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all truncate max-w-[140px]"
                        >
                          🔗 {source.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-slate-800">Liquidity Pulse</h3>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Accounts</span>
           </div>
           <div className="space-y-2">
             {accounts.map(acc => (
               <div key={acc.id} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 transition-colors group">
                 <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${acc.currentBalance < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                   <div>
                     <p className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600">{acc.name}</p>
                     <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{acc.type}</p>
                   </div>
                 </div>
                 <p className={`text-sm font-bold ${acc.currentBalance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                   {formatCurrency(acc.currentBalance, currency)}
                 </p>
               </div>
             ))}
           </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Monthly Allocation</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spending Share</span>
          </div>
          <div className="h-64 flex items-center">
            {categoryBreakdown.length === 0 ? (
              <div className="w-full text-center text-slate-300 py-12">No transactions this month</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{fontSize: '11px', color: '#64748b'}} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; amount: number; color: string; currency: string }> = ({ title, amount, color, currency }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 transition-all hover:shadow-md">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
    <p className={`text-2xl font-bold ${color} tracking-tight`}>{formatCurrency(amount, currency)}</p>
    <div className="mt-3 flex items-center gap-1.5">
      <div className="h-1 flex-1 bg-slate-50 rounded-full overflow-hidden">
        <div className={`h-full ${color.replace('text', 'bg')} opacity-20`} style={{width: '100%'}}></div>
      </div>
    </div>
  </div>
);

export default Dashboard;

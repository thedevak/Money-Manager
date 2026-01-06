
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
}

const Dashboard: React.FC<DashboardProps> = ({ accounts, transactions, alerts, categories, currency }) => {
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Stat Card Aggregations
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

  // 2. Real Monthly Trend (Last 6 Months)
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

      const income = monthTxs
        .filter(tx => tx.type === TransactionType.INCOME)
        .reduce((sum, tx) => sum + tx.amount, 0);

      const expense = monthTxs
        .filter(tx => tx.type === TransactionType.EXPENSE)
        .reduce((sum, tx) => sum + tx.amount, 0);

      data.push({
        month: monthLabel,
        inc: income,
        exp: expense
      });
    }
    return data;
  }, [transactions]);

  // 3. Real Expense Distribution (Current Month)
  const categoryBreakdown = useMemo(() => {
    const currentMonthExpenses = transactions.filter(tx => {
      const d = new Date(tx.date);
      return tx.type === TransactionType.EXPENSE && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const breakdown: Record<string, number> = {};

    currentMonthExpenses.forEach(tx => {
      let cat = categories.find(c => c.id === tx.categoryId);
      if (cat?.parentId) {
        cat = categories.find(c => c.id === cat?.parentId);
      }
      const label = cat?.name || 'Other';
      breakdown[label] = (breakdown[label] || 0) + tx.amount;
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories, currentMonth, currentYear]);

  return (
    <div className="space-y-8 animate-in">
      {/* Real-time Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Liquidity" amount={availableBalance} color="text-indigo-600" currency={currency} />
        <StatCard title="Total Debt" amount={totalCreditDebt} color="text-rose-600" currency={currency} />
        <StatCard title="Monthly Income" amount={monthlyStats.income} color="text-emerald-600" currency={currency} />
        <StatCard title="Monthly Spending" amount={monthlyStats.expense} color="text-amber-600" currency={currency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real Performance Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Income vs. Expense</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real Data Only</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(0)+'k' : val}`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}} 
                  formatter={(value: number) => [formatCurrency(value, currency), '']}
                />
                <Bar dataKey="exp" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} name="Expense" />
                <Bar dataKey="inc" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} name="Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Payment Schedule */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
            Upcoming Payments
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Live Feed</span>
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            {alerts.filter(a => !a.isPaid).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4">
                <span className="text-3xl mb-2">✅</span>
                <p className="text-xs font-bold uppercase tracking-tight">Vault Clear</p>
              </div>
            ) : (
              alerts.filter(a => !a.isPaid).map(alert => (
                <div key={alert.id} className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm border border-slate-50">
                    {alert.type === 'CREDIT_CARD' ? '💳' : alert.type === 'EMI' ? '🏠' : '📡'}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-slate-800 leading-tight truncate">{alert.title}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Due: {new Date(alert.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-600">{formatCurrency(alert.amount, currency)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Real Account Status */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-slate-800">Liquidity Pulse</h3>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Accounts</span>
           </div>
           <div className="space-y-2">
             {accounts.map(acc => (
               <div key={acc.id} className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                 <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${acc.currentBalance < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                   <div>
                     <p className="text-[13px] font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{acc.name}</p>
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

        {/* Real Allocation Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Monthly Allocation</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expense Share</span>
          </div>
          <div className="h-64 flex items-center">
            {categoryBreakdown.length === 0 ? (
              <div className="w-full text-center text-slate-300 py-12 flex flex-col items-center">
                <span className="text-4xl grayscale opacity-20 mb-2">📊</span>
                <p className="text-[10px] font-bold uppercase tracking-widest">No Spending Tracked</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => formatCurrency(value, currency)}
                  />
                  <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" wrapperStyle={{paddingLeft: '20px', fontSize: '11px', fontWeight: 600, color: '#64748b'}} />
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
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 transition-all hover:shadow-md cursor-default">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
    <p className={`text-2xl font-bold ${color} tracking-tight`}>{formatCurrency(amount, currency)}</p>
    <div className="mt-3 flex items-center gap-1.5">
      <div className={`h-1 flex-1 bg-slate-50 rounded-full overflow-hidden`}>
        <div className={`h-full ${color.replace('text', 'bg')} opacity-20`} style={{width: '100%'}}></div>
      </div>
      <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Verified</span>
    </div>
  </div>
);

export default Dashboard;


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
  categories: Category[]; // Added categories prop to resolve parent names
  currency: string;
}

const Dashboard: React.FC<DashboardProps> = ({ accounts, transactions, alerts, categories, currency }) => {
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

  // 1. Calculations: Stat Cards
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
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

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

    return { income, expense, savings: income - expense };
  }, [transactions]);

  // 2. Calculation: Real Monthly Trend (Last 6 Months)
  const trendData = useMemo(() => {
    const data = [];
    const now = new Date();
    
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

  // 3. Calculation: Real Expense Breakdown (Current Month)
  const categoryBreakdown = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthExpenses = transactions.filter(tx => {
      const d = new Date(tx.date);
      return tx.type === TransactionType.EXPENSE && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const breakdown: Record<string, number> = {};

    currentMonthExpenses.forEach(tx => {
      // Find the parent category for accurate grouping
      let cat = categories.find(c => c.id === tx.categoryId);
      if (cat?.parentId) {
        cat = categories.find(c => c.id === cat?.parentId);
      }
      const label = cat?.name || 'Uncategorized';
      breakdown[label] = (breakdown[label] || 0) + tx.amount;
    });

    return Object.entries(breakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Available" amount={availableBalance} color="text-indigo-600" currency={currency} />
        <StatCard title="Credit Card Debt" amount={totalCreditDebt} color="text-rose-600" currency={currency} />
        <StatCard title="Monthly Income" amount={monthlyStats.income} color="text-emerald-600" currency={currency} />
        <StatCard title="Monthly Expense" amount={monthlyStats.expense} color="text-amber-600" currency={currency} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Financial Trajectory</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last 6 Months</span>
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

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center justify-between">
            Payment Calendar
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Upcoming Dues</span>
          </h3>
          <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar">
            {alerts.filter(a => !a.isPaid).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-4">
                <span className="text-3xl mb-2">🎉</span>
                <p className="text-xs font-medium uppercase tracking-tight">All dues cleared</p>
              </div>
            ) : (
              alerts.filter(a => !a.isPaid).map(alert => (
                <div key={alert.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm group-hover:shadow-md transition-shadow">
                    {alert.type === 'CREDIT_CARD' ? '💳' : alert.type === 'EMI' ? '🏠' : '📡'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 leading-tight">{alert.title}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Due: {new Date(alert.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
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
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-slate-800">Liquidity Pulse</h3>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Accounts</span>
           </div>
           <div className="space-y-3">
             {accounts.map(acc => (
               <div key={acc.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                 <div className="flex items-center gap-3">
                   <div className={`w-2.5 h-2.5 rounded-full ${acc.currentBalance < 0 ? 'bg-rose-500 shadow-sm shadow-rose-200' : 'bg-emerald-500 shadow-sm shadow-emerald-200'}`}></div>
                   <div>
                     <p className="text-sm font-bold text-slate-700">{acc.name}</p>
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
            <h3 className="font-bold text-slate-800">Expense Distribution</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Month</span>
          </div>
          <div className="h-64 flex items-center">
            {categoryBreakdown.length === 0 ? (
              <div className="w-full text-center text-slate-400 py-12">
                <p className="text-xs font-bold uppercase tracking-widest">No expenses tracked this month</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
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
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-1 transition-all hover:shadow-md cursor-default group">
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">{title}</p>
    <p className={`text-2xl font-bold ${color} tracking-tight`}>{formatCurrency(amount, currency)}</p>
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
      <div className="h-1 flex-1 bg-slate-50 rounded-full overflow-hidden">
        <div className={`h-full ${color.replace('text', 'bg')} opacity-20`} style={{width: '60%'}}></div>
      </div>
      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Active Track</span>
    </div>
  </div>
);

export default Dashboard;


import React, { useState, useMemo } from 'react';
import { Budget, Category, Transaction, TransactionType } from '../types';
import { formatCurrency, calculateSpentForCategory } from '../utils/financeLogic';

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  currency: string;
  onAddBudget: (budget: Omit<Budget, 'id'>) => void;
  onUpdateBudget: (id: string, updates: Partial<Budget>) => void;
  onDeleteBudget: (id: string) => void;
}

const BudgetManager: React.FC<BudgetManagerProps> = ({
  budgets,
  categories,
  transactions,
  currency,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  
  const [viewDate, setViewDate] = useState({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: 0
  });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    transactions.forEach(tx => years.add(new Date(tx.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Find all top-level expense categories
  const parentExpenseCategories = useMemo(() => {
    return categories.filter(c => (c.parentId === null || c.parentId === '') && c.type === TransactionType.EXPENSE);
  }, [categories]);

  // Determine if the selected category in the form already has a budget
  const existingBudgetForSelection = useMemo(() => {
    if (!formData.categoryId || editingBudget) return null;
    return budgets.find(b => b.categoryId === formData.categoryId);
  }, [formData.categoryId, budgets, editingBudget]);

  const budgetsWithSpending = useMemo(() => {
    return budgets.map(budget => ({
      ...budget,
      spent: calculateSpentForCategory(transactions, budget.categoryId, categories, viewDate.month, viewDate.year)
    }));
  }, [budgets, transactions, categories, viewDate]);

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetsWithSpending.reduce((sum, b) => sum + b.spent, 0);

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setFormData({ categoryId: '', amount: 0 });
    setShowModal(true);
  };

  const handleOpenEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({ categoryId: budget.categoryId, amount: budget.amount });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId || formData.amount <= 0) {
      alert("Please select a category and enter a valid amount.");
      return;
    }

    if (editingBudget) {
      onUpdateBudget(editingBudget.id, { amount: formData.amount });
    } else if (existingBudgetForSelection) {
      // If user tries to "add" a category that already exists, update it instead
      onUpdateBudget(existingBudgetForSelection.id, { amount: formData.amount });
    } else {
      onAddBudget({ ...formData, period: 'MONTHLY' });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Time Selector & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracking Period:</span>
          <select 
            className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100"
            value={viewDate.month}
            onChange={(e) => setViewDate(prev => ({ ...prev, month: parseInt(e.target.value) }))}
          >
            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select 
            className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100"
            value={viewDate.year}
            onChange={(e) => setViewDate(prev => ({ ...prev, year: parseInt(e.target.value) }))}
          >
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          + Create Allowance
        </button>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-4xl opacity-10">💰</div>
          <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-1">Total Budgeted</p>
          <h3 className="text-2xl font-bold">{formatCurrency(totalBudgeted, currency)}</h3>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 text-4xl opacity-5">📉</div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Spent This Month</p>
          <h3 className={`text-2xl font-bold ${totalSpent > totalBudgeted ? 'text-rose-600' : 'text-slate-800'}`}>
            {formatCurrency(totalSpent, currency)}
          </h3>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 text-4xl opacity-5">🛡️</div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Remaining Safety</p>
          <h3 className={`text-2xl font-bold ${totalBudgeted - totalSpent < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatCurrency(Math.max(0, totalBudgeted - totalSpent), currency)}
          </h3>
        </div>
      </div>

      {/* Detailed Budget List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgetsWithSpending.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-slate-500 font-medium">No budgets defined for category tracking.</p>
            <button onClick={handleOpenAdd} className="text-indigo-600 text-sm font-bold mt-2 hover:underline">Start budgeting now →</button>
          </div>
        ) : (
          budgetsWithSpending.map(budget => {
            const category = categories.find(c => c.id === budget.categoryId);
            const percent = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
            const isOver = budget.spent > budget.amount;
            const isNear = percent >= 80 && !isOver;

            return (
              <div key={budget.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 group hover:border-indigo-100 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      {category?.name || 'Unknown Category'}
                      {isOver && <span className="text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md font-bold uppercase">Overspent</span>}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Monthly Allowance</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenEdit(budget)} 
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Edit Limit"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => { if(window.confirm("Delete budget allowance for category '" + (category?.name || 'Unknown') + "'?")) onDeleteBudget(budget.id); }} 
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Remove Budget"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-2">
                  <div className="flex flex-col">
                    <span className={`text-lg font-bold ${isOver ? 'text-rose-600' : 'text-slate-800'}`}>
                      {formatCurrency(budget.spent, currency)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium uppercase">Utilized</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-600">{formatCurrency(budget.amount, currency)}</span>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Total Limit</p>
                  </div>
                </div>

                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full transition-all duration-700 ${isOver ? 'bg-rose-500' : isNear ? 'bg-amber-400' : 'bg-indigo-500'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                  <span className={isOver ? 'text-rose-500' : isNear ? 'text-amber-500' : 'text-indigo-500'}>
                    {percent.toFixed(1)}% of limit used
                  </span>
                  <span className="text-slate-400">
                    {isOver 
                      ? `${formatCurrency(budget.spent - budget.amount, currency)} over limit` 
                      : `${formatCurrency(budget.amount - budget.spent, currency)} remaining`
                    }
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">
                {editingBudget ? 'Adjust Allowance' : 'Setup New Budget'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl transition-transform hover:rotate-90">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-slate-900">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Target Expense Category</label>
                {parentExpenseCategories.length > 0 ? (
                  <select 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-slate-50 disabled:text-slate-400 transition-all appearance-none bg-no-repeat bg-[right_1rem_center]"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    required
                    disabled={!!editingBudget}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1rem' }}
                  >
                    <option value="">Choose a Category...</option>
                    {parentExpenseCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {budgets.some(b => b.categoryId === cat.id) && !editingBudget ? ' (Already Budgeted)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700 font-medium leading-relaxed">
                    You haven't created any parent Expense categories yet. Please go to the <strong>Categories</strong> tab to create some first.
                  </div>
                )}
                <p className="text-[10px] text-slate-400 mt-2 italic px-1 leading-relaxed">
                  Budget will track spending for this parent category and all its related sub-categories.
                </p>
                {existingBudgetForSelection && (
                  <p className="text-[10px] text-indigo-600 mt-1 font-bold animate-pulse">
                    Note: An allowance already exists for this category. Saving will update the existing limit.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 tracking-widest">Monthly Allowance ({currency})</label>
                <div className="relative group">
                  <input 
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full border border-slate-200 rounded-xl px-4 py-4 text-xl focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-900 bg-slate-50/30 transition-all placeholder-slate-400"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={parentExpenseCategories.length === 0}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingBudget ? 'Update Allowance' : existingBudgetForSelection ? 'Update Existing Budget' : 'Establish Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManager;

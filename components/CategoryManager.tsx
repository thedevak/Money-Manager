
import React, { useState } from 'react';
import { Category, TransactionType } from '../types';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ 
  categories, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory 
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: TransactionType.EXPENSE,
    parentId: null as string | null
  });

  const parents = categories.filter(c => c.parentId === null);

  const handleOpenAdd = (parentId: string | null = null, type: TransactionType = TransactionType.EXPENSE) => {
    setEditingCategory(null);
    setFormData({ name: '', type, parentId });
    setShowModal(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, type: cat.type, parentId: cat.parentId });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      onUpdateCategory(editingCategory.id, { name: formData.name });
    } else {
      onAddCategory({ ...formData });
    }
    setShowModal(false);
  };

  const renderCategoryList = (type: TransactionType) => {
    const typeParents = parents.filter(p => p.type === type);
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className={`font-bold text-sm uppercase tracking-widest ${type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
            {type} Categories
          </h4>
          <button 
            onClick={() => handleOpenAdd(null, type)}
            className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            + Add Parent
          </button>
        </div>
        
        {typeParents.length === 0 && (
          <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed rounded-xl">No {type.toLowerCase()} categories created yet.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {typeParents.map(parent => (
            <div key={parent.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:border-indigo-100 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-bold text-slate-800">{parent.name}</h5>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenEdit(parent)} className="text-slate-400 hover:text-indigo-600 text-xs">Edit</button>
                  <button onClick={() => onDeleteCategory(parent.id)} className="text-slate-400 hover:text-rose-600 text-xs">Delete</button>
                </div>
              </div>
              
              <div className="space-y-2 ml-2 border-l-2 border-slate-50 pl-4">
                {categories.filter(c => c.parentId === parent.id).map(sub => (
                  <div key={sub.id} className="flex justify-between items-center text-sm group">
                    <span className="text-slate-600">{sub.name}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenEdit(sub)} className="text-[10px] text-slate-400 hover:text-indigo-600">Edit</button>
                      <button onClick={() => onDeleteCategory(sub.id)} className="text-[10px] text-slate-400 hover:text-rose-600">Delete</button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => handleOpenAdd(parent.id, type)}
                  className="text-[10px] text-indigo-500 font-bold hover:text-indigo-700 mt-2"
                >
                  + Add Sub-category
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12">
      {renderCategoryList(TransactionType.EXPENSE)}
      {renderCategoryList(TransactionType.INCOME)}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">
                {editingCategory ? 'Edit Category' : formData.parentId ? 'Add Sub-category' : 'Add New Parent Category'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                <input 
                  type="text"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 outline-none text-slate-900 placeholder-slate-400"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Groceries, Freelance, Rent..."
                />
              </div>

              {!formData.parentId && !editingCategory && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Transaction Type</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: TransactionType.EXPENSE})}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${formData.type === TransactionType.EXPENSE ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      Expense
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: TransactionType.INCOME})}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${formData.type === TransactionType.INCOME ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                    >
                      Income
                    </button>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
              >
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;

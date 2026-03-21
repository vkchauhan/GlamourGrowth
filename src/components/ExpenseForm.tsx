import React, { useState } from 'react';
import { X, IndianRupee, Calendar, Tag, FileText, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { saveExpense } from '../services/bookingService';
import { auth } from '../services/firebase';

interface ExpenseFormProps {
  onClose: () => void;
  onSuccess: () => void;
  language: string;
  translations: any;
}

const CATEGORIES = [
  'Rent',
  'Electricity',
  'Water',
  'Salaries',
  'Equipment',
  'Supplies',
  'Marketing',
  'Maintenance',
  'Taxes',
  'Other'
];

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, onSuccess, language, translations: t }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: 'Supplies',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setLoading(true);
    try {
      await saveExpense({
        user_id: auth.currentUser.uid,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        notes: formData.notes,
        createdAt: new Date().toISOString()
      });
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Record Expense</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Add new business cost</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-premium-gold" />
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input 
                type="number" 
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-premium-gold focus:bg-white rounded-2xl outline-none transition-all text-lg font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Tag className="w-4 h-4 text-premium-gold" />
                Category
              </label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-premium-gold focus:bg-white rounded-2xl outline-none transition-all font-medium appearance-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-premium-gold" />
                Date
              </label>
              <input 
                type="date" 
                required
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-premium-gold focus:bg-white rounded-2xl outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-premium-gold" />
              Notes (Optional)
            </label>
            <textarea 
              placeholder="What was this for?"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-premium-gold focus:bg-white rounded-2xl outline-none transition-all font-medium resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-[2] py-4 bg-premium-ink text-white font-bold rounded-2xl hover:bg-[#333] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Save Expense</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ExpenseForm;

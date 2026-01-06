
import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Transaction, TransactionType, Account, Category } from '../types';

interface SmartImporterProps {
  accounts: Account[];
  categories: Category[];
  onImport: (transactions: Omit<Transaction, 'id'>[]) => void;
}

const SmartImporter: React.FC<SmartImporterProps> = ({ accounts, categories, onImport }) => {
  const [rawText, setRawText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Omit<Transaction, 'id'>[] | null>(null);

  const handleProcess = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Parse the following bank statement text and extract transactions.
        Available Accounts: ${accounts.map(a => `${a.name} (ID: ${a.id})`).join(', ')}
        Available Categories: ${categories.map(c => `${c.name} (ID: ${c.id})`).join(', ')}

        Text to parse:
        ${rawText}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING, description: 'ISO date YYYY-MM-DD' },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, description: 'EXPENSE or INCOME' },
                fromAccountId: { type: Type.STRING, description: 'Matching ID from available accounts' },
                categoryId: { type: Type.STRING, description: 'Matching ID from available categories' },
                notes: { type: Type.STRING }
              },
              required: ['date', 'amount', 'type', 'fromAccountId', 'notes']
            }
          }
        }
      });

      const parsed = JSON.parse(response.text);
      setResults(parsed);
    } catch (error) {
      console.error("AI Parsing Error:", error);
      alert("Failed to parse statement. Please ensure the text is clear.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (results) {
      onImport(results);
      setResults(null);
      setRawText('');
      alert(`Imported ${results.length} transactions successfully.`);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
        <span className="text-xl">📄</span> AI Smart Import
      </h3>
      <p className="text-xs text-slate-500 mb-4">Paste raw text from your bank app, email, or statement to automatically generate transactions.</p>
      
      {!results ? (
        <div className="space-y-4">
          <textarea 
            className="w-full h-40 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-100 outline-none bg-slate-50/50"
            placeholder="Paste your bank statement text here..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          ></textarea>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || !rawText}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Parsing Statement...</>
            ) : 'Analyze with Gemini AI'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl bg-slate-50 p-2">
            {results.map((tx, i) => (
              <div key={i} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 bg-white rounded-lg mb-1">
                <div className="text-xs">
                  <p className="font-bold text-slate-800">{tx.notes}</p>
                  <p className="text-slate-400">{tx.date} • {accounts.find(a => a.id === tx.fromAccountId)?.name}</p>
                </div>
                <p className={`text-sm font-bold ${tx.type === 'EXPENSE' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {tx.type === 'EXPENSE' ? '-' : '+'}${tx.amount}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setResults(null)}
              className="flex-1 border border-slate-200 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-2 bg-emerald-600 text-white py-3 px-8 rounded-xl font-bold hover:bg-emerald-700 transition-all"
            >
              Confirm Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartImporter;

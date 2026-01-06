
import React from 'react';
import { AIInsight } from '../types';

interface AIInsightsProps {
  insights: AIInsight[];
  isLoading: boolean;
  onRefresh: () => void;
}

const AIInsights: React.FC<AIInsightsProps> = ({ insights, isLoading, onRefresh }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="text-xl">✨</span> AI Financial Context
          </h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time Global Market Data</p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          ) : '🔄'}
        </button>
      </div>
      
      <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
        {insights.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 italic">No market context fetched yet.</p>
            <button onClick={onRefresh} className="text-indigo-600 text-xs font-bold mt-2 hover:underline">Fetch Real Data Now</button>
          </div>
        )}

        {insights.map((insight) => (
          <div key={insight.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap mb-3">
              {insight.text}
            </p>
            {insight.sources.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {insight.sources.map((source, i) => (
                    <a 
                      key={i} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[10px] bg-white px-2 py-1 rounded border border-slate-200 text-indigo-600 hover:border-indigo-300 transition-all truncate max-w-[150px]"
                      title={source.title}
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 text-[9px] text-slate-400 text-right">
              Refreshed at: {new Date(insight.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
            <div className="h-24 bg-slate-100 rounded-xl w-full"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;

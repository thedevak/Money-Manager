
import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Critical Application Crash:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8 text-center">
          <div className="max-w-md bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">⚠️</div>
            <h1 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Vault Error</h1>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              An unexpected error prevented the application from loading. This might be due to incompatible browser settings or corrupted local storage.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100"
              >
                Reload Application
              </button>
              <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200"
              >
                Reset System (Clears Data)
              </button>
            </div>
            {this.state.error && (
              <pre className="mt-8 p-3 bg-slate-50 rounded-lg text-[10px] text-slate-400 overflow-x-auto text-left whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Target container 'root' not found.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

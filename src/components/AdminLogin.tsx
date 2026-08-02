import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight, X } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onCancel
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === 'admin123' || passcode === 'aps2025' || passcode === '1234') {
      onLoginSuccess();
    } else {
      setError('Invalid Admin Passcode. Access Denied.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 sm:p-8 relative">
        
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl p-0.5 mx-auto mb-3 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center border border-amber-400/40">
              <Lock className="w-7 h-7 text-amber-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white">Election Officer Admin Login</h3>
          <p className="text-xs text-slate-400 mt-1">Authorized Army Public School Personnel Only</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
              Admin Access Key / Passcode
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError('');
              }}
              placeholder="Enter Admin Passcode"
              autoFocus
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl text-white placeholder-slate-500 focus:outline-none text-center font-mono text-lg tracking-widest"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.01] transition text-sm"
          >
            <span>Authenticate Admin Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
};

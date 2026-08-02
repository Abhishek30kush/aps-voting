import React from 'react';
import { Shield, Award, UserCheck, RefreshCw } from 'lucide-react';

interface NavbarProps {
  currentView: 'login' | 'confirm' | 'ballot' | 'success' | 'admin';
  voterName?: string;
  isVotingOpen: boolean;
  onLogout?: () => void;
  onReturnToHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  voterName,
  isVotingOpen,
  onLogout,
  onReturnToHome
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Army Public School Branding */}
        <div 
          onClick={onReturnToHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-emerald-950 rounded-[10px] flex items-center justify-center border border-amber-400/40">
              <Shield className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide uppercase font-serif">
                Army Public School
              </h1>
              <span className="bg-amber-500/10 text-amber-400 text-xs font-semibold px-2 py-0.5 rounded border border-amber-500/30">
                APS E-VOTE
              </span>
            </div>
            <p className="text-xs text-emerald-400/80 font-medium tracking-wider uppercase flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              Truth Is God • Student Council Elections
            </p>
          </div>
        </div>

        {/* Center / Right Control Panel */}
        <div className="flex items-center gap-3">
          {/* Voting Status Indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isVotingOpen 
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
              : 'bg-red-950/80 text-red-300 border-red-500/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isVotingOpen ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
            <span>{isVotingOpen ? 'POLLS OPEN' : 'POLLS CLOSED'}</span>
          </div>

          {/* Active Voter Badge */}
          {voterName && (
            <div className="hidden md:flex items-center gap-2 bg-emerald-900/40 border border-emerald-600/30 px-3 py-1.5 rounded-lg text-xs text-emerald-200">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">{voterName}</span>
            </div>
          )}

          {/* Logout / Exit session button */}
          {onLogout && (currentView === 'ballot' || currentView === 'confirm' || currentView === 'admin') && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{currentView === 'admin' ? 'Exit Admin' : 'Exit'}</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

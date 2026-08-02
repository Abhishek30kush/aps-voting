import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle, ShieldCheck, LogOut } from 'lucide-react';
import type { CouncilType } from '../types';

interface VoteSuccessProps {
  voterName: string;
  voterId: string; // admissionNo or teacherId
  council: CouncilType;
  onReturnToLogin: () => void;
}

export const VoteSuccess: React.FC<VoteSuccessProps> = ({
  voterName,
  voterId,
  council,
  onReturnToLogin
}) => {
  const [countdown, setCountdown] = useState(15);
  const receiptId = 'APS-' + Math.floor(100000 + Math.random() * 900000);
  const voteTime = new Date().toLocaleString();

  useEffect(() => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 400);
    } catch (e) {
      console.log('Confetti failed to trigger:', e);
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onReturnToLogin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onReturnToLogin]);

  return (
    <div className="w-full max-w-xl mx-auto py-8 px-4 animate-scale-up">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-center relative overflow-hidden">
        
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl" />

        <div className="w-20 h-20 bg-emerald-950 border-2 border-emerald-400 rounded-full mx-auto mb-4 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
          <CheckCircle className="w-12 h-12 stroke-[2.5]" />
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Vote Submitted Successfully!
        </h2>
        <p className="text-sm text-emerald-300 font-medium mt-1">
          Thank you for exercising your democratic right at Army Public School
        </p>

        <div className="my-6 bg-slate-950 border border-slate-800 rounded-2xl p-5 text-left space-y-3 relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Official Vote Receipt</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-500/30">
              {receiptId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Voter Name</span>
              <span className="text-white font-bold">{voterName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Admission / ID</span>
              <span className="text-amber-300 font-mono font-bold">{voterId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Council Category</span>
              <span className="text-emerald-300 font-bold capitalize">{council} Council</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Timestamp</span>
              <span className="text-slate-300 text-[11px] font-mono">{voteTime}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status: <strong className="text-emerald-400">MARKED AS VOTED</strong></span>
            <span>APS E-Voting Portal</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-6 text-xs text-slate-300 flex items-center justify-center gap-2">
          <span>Automatically returning to login screen in</span>
          <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold font-mono flex items-center justify-center text-xs">
            {countdown}
          </span>
          <span>seconds</span>
        </div>

        <button
          onClick={onReturnToLogin}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.01] transition text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Return to Portal Login</span>
        </button>

      </div>
    </div>
  );
};

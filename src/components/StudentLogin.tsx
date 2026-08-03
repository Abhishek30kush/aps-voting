import React, { useState } from 'react';
import { User, ShieldCheck, ArrowRight, AlertTriangle, Sparkles, Calendar } from 'lucide-react';
import { dbService } from '../services/databaseService';

interface StudentLoginProps {
  onVerify: (admissionNo: string, dob: string) => void;
  error?: string;
  isLoading?: boolean;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({
  onVerify,
  error,
  isLoading
}) => {
  const [admissionNo, setAdmissionNo] = useState('');
  const [dob, setDob] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (admissionNo.trim()) {
      onVerify(admissionNo, dob);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl p-0.5 mx-auto mb-3 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-emerald-950 rounded-[14px] flex items-center justify-center border border-amber-400/40">
              <ShieldCheck className="w-7 h-7 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Student Verification</h2>
          <p className="text-sm text-slate-400 mt-1">Enter your credentials to cast your vote</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/80 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-200 text-xs sm:text-sm animate-shake">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Authentication Failed</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Admission Number */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
              Admission Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-5 h-5 text-amber-400/80" />
              </div>
              <input
                type="text"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                placeholder="Enter Admission No (e.g. APS2024-001)"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 focus:border-amber-400 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
              Date of Birth (Verification)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-5 h-5 text-amber-400/80" />
              </div>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 focus:border-amber-400 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Enter your date of birth as registered in school ERP records.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !admissionNo.trim()}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>Verify & Proceed to Vote</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Dynamic Registered Students Shortcuts */}
        {dbService.getStudents().length > 0 && (
          <div className="mt-8 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Select from Imported Student Roster ({dbService.getStudents().length}):</span>
              </span>
            </div>
            <select
              onChange={(e) => {
                const selected = dbService.getStudents().find(s => s.admissionNo === e.target.value);
                if (selected) {
                  setAdmissionNo(selected.admissionNo);
                  if (selected.dob) setDob(selected.dob);
                }
              }}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 hover:border-amber-500/50 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            >
              <option value="">-- Choose Student to Auto-fill Credentials --</option>
              {dbService.getStudents().map(s => (
                <option key={s.id} value={s.admissionNo}>
                  {s.name} ({s.admissionNo}) - Class {s.class}-{s.section} [{s.hasVoted ? 'VOTED' : 'PENDING'}]
                </option>
              ))}
            </select>
          </div>
        )}

      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Briefcase, ArrowRight, AlertTriangle, Sparkles, KeyRound } from 'lucide-react';
import { dbService } from '../services/databaseService';

interface TeacherLoginProps {
  onVerify: (teacherId: string, pin: string) => void;
  error?: string;
  isLoading?: boolean;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({
  onVerify,
  error,
  isLoading
}) => {
  const [teacherId, setTeacherId] = useState('');
  const [pin, setPin] = useState('');
  const [teachers, setTeachers] = useState(() => dbService.getTeachers());

  useEffect(() => {
    const updateTeachers = () => setTeachers(dbService.getTeachers());
    dbService.ready.then(updateTeachers);
    const unsubscribe = dbService.subscribe(updateTeachers);
    return () => unsubscribe();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherId.trim()) {
      onVerify(teacherId, pin);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-0.5 mx-auto mb-3 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center border border-blue-400/40">
              <Briefcase className="w-7 h-7 text-blue-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Teacher Authentication</h2>
          <p className="text-sm text-slate-400 mt-1">Enter your Employee ID & Security PIN</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/80 border border-red-500/50 rounded-xl flex items-start gap-3 text-red-200 text-xs sm:text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Authentication Error</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Teacher Code */}
          <div>
            <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">
              Teacher Code / Employee ID (EMP ID)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-5 h-5 text-blue-400/80" />
              </div>
              <input
                type="text"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="Enter Employee ID (e.g. TEA-101)"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 focus:border-blue-400 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
          </div>

          {/* Security PIN */}
          <div>
            <label className="block text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">
              Security PIN / DOB
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-5 h-5 text-blue-400/80" />
              </div>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter your Security PIN"
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-700 focus:border-blue-400 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Enter your Security PIN as assigned by the school administration.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !teacherId.trim()}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 hover:from-blue-400 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50"
          >
            <span>Verify Employee ID & Proceed to Vote</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Dynamic Registered Teachers Shortcuts */}
        {teachers.length > 0 && (
          <div className="mt-8 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-semibold text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Select from Imported Teachers Roster ({teachers.length}):</span>
              </span>
            </div>
            <select
              onChange={(e) => {
                const selected = teachers.find(t => t.teacherId === e.target.value);
                if (selected) {
                  setTeacherId(selected.teacherId);
                  if (selected.pin) setPin(selected.pin);
                }
              }}
              className="w-full p-2.5 bg-slate-950 border border-slate-700 hover:border-blue-500/50 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-400"
            >
              <option value="">-- Choose Teacher to Auto-fill Credentials --</option>
              {teachers.map(t => (
                <option key={t.id} value={t.teacherId}>
                  {t.name} ({t.teacherId}) - {t.designation || t.appt} [{t.hasVoted ? 'VOTED' : 'PENDING'}]
                </option>
              ))}
            </select>
          </div>
        )}

      </div>
    </div>
  );
};


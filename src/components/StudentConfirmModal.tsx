import React, { useState } from 'react';
import { CheckCircle2, ArrowRight, X, Sparkles } from 'lucide-react';
import type { Student, Teacher, CouncilType } from '../types';

interface StudentConfirmModalProps {
  voterType: 'student' | 'teacher';
  student?: Student;
  teacher?: Teacher;
  onConfirm: (assignedCouncil: CouncilType) => void;
  onCancel: () => void;
}

export const StudentConfirmModal: React.FC<StudentConfirmModalProps> = ({
  voterType,
  student,
  teacher,
  onConfirm,
  onCancel
}) => {
  const autoCouncil: CouncilType = student
    ? (student.class <= 5 ? 'junior' : 'senior')
    : 'senior';

  const [selectedCouncil, setSelectedCouncil] = useState<CouncilType>(autoCouncil);

  const getHouseColor = (house?: string) => {
    switch (house) {
      case 'Cariappa': return 'bg-red-500/20 text-red-300 border-red-500/40';
      case 'Manekshaw': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'Thimayya': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Vaidya': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default: return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500" />
        
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <CheckCircle2 className="w-7 h-7 fill-emerald-500/20" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">
              Identity Match Confirmed
            </h3>
            <p className="text-xs text-amber-400 font-medium">
              Please verify your credentials before accessing the voting ballot
            </p>
          </div>
        </div>

        {voterType === 'student' && student && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4 mb-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Student Name</div>
                <div className="text-lg font-bold text-white mt-0.5">{student.name}</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getHouseColor(student.house)}`}>
                {student.house} House
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admission No</span>
                <span className="font-mono font-bold text-amber-300">{student.admissionNo}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Class & Sec</span>
                <span className="font-bold text-white">Class {student.class}-{student.section}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Roll Number</span>
                <span className="font-bold text-white">Roll #{student.rollNo}</span>
              </div>
            </div>

            {(student.fatherName || student.admissionCategory) && (
              <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800/80">
                {student.fatherName && (
                  <div className="bg-slate-900/40 p-2 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Father's Name</span>
                    <span className="font-semibold text-slate-200">{student.fatherName}</span>
                  </div>
                )}
                {student.admissionCategory && (
                  <div className="bg-slate-900/40 p-2 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Category</span>
                    <span className="font-semibold text-amber-300">{student.admissionCategory}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {voterType === 'teacher' && teacher && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4 mb-6">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Teacher Name</div>
                <div className="text-lg font-bold text-white mt-0.5">{teacher.name}</div>
              </div>
              <div className="px-3 py-1 bg-blue-900/40 text-blue-300 border border-blue-500/40 rounded-full text-xs font-bold">
                {teacher.designation}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Teacher Code</span>
                <span className="font-mono font-bold text-blue-300">{teacher.teacherId}</span>
              </div>
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                <span className="font-bold text-white">{teacher.department}</span>
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                Select Council Ballot to Vote:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCouncil('junior')}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                    selectedCouncil === 'junior'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>Junior Council</span>
                  {selectedCouncil === 'junior' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCouncil('senior')}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                    selectedCouncil === 'senior'
                      ? 'bg-amber-950 border-amber-500 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>Senior Council</span>
                  {selectedCouncil === 'senior' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`p-4 rounded-xl border mb-6 flex items-center gap-3 ${
          selectedCouncil === 'junior' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
            : 'bg-amber-950/60 border-amber-500/40 text-amber-200'
        }`}>
          <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white uppercase tracking-wider block">
              Assigned Category: {selectedCouncil === 'junior' ? 'Junior Council Ballot' : 'Senior Council Ballot'}
            </span>
            <span className="text-slate-300">
              {selectedCouncil === 'junior' 
                ? 'Primary Wing - Voting for Junior Head Boy/Girl & Captains' 
                : 'Senior Wing - Voting for School Head Boy/Girl & Council'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="w-1/3 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
          >
            Not You? Back
          </button>
          <button
            onClick={() => onConfirm(selectedCouncil)}
            className="w-2/3 py-3.5 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-xs sm:text-sm flex items-center justify-center gap-2 hover:scale-[1.01] transition"
          >
            <span>Confirm & Enter Voting Ballot</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

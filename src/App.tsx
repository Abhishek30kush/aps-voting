import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StudentLogin } from './components/StudentLogin';
import { TeacherLogin } from './components/TeacherLogin';
import { StudentConfirmModal } from './components/StudentConfirmModal';
import { VotingBallot } from './components/VotingBallot';
import { VoteSuccess } from './components/VoteSuccess';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { dbService } from './services/databaseService';
import type { Student, Teacher, CouncilType, PositionType, Candidate } from './types';
import { UserCheck, Briefcase, Sparkles, Lock } from 'lucide-react';

type RoleTab = 'student' | 'teacher';
type AppView = 'login' | 'confirm' | 'ballot' | 'success' | 'admin';

export const App: React.FC = () => {
  const [roleTab, setRoleTab] = useState<RoleTab>('student');
  const [currentView, setCurrentView] = useState<AppView>('login');

  const [currentStudent, setCurrentStudent] = useState<Student | undefined>();
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | undefined>();
  const [assignedCouncil, setAssignedCouncil] = useState<CouncilType>('senior');
  
  const [authError, setAuthError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);

  const [isVotingOpen, setIsVotingOpen] = useState(true);
  const [ballotCandidates, setBallotCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    const checkHashRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const pathname = window.location.pathname.toLowerCase();
      if (hash.includes('admin') || pathname.includes('admin')) {
        setShowAdminLoginModal(true);
      }
    };

    checkHashRoute();
    window.addEventListener('hashchange', checkHashRoute);
    window.addEventListener('popstate', checkHashRoute);
    return () => {
      window.removeEventListener('hashchange', checkHashRoute);
      window.removeEventListener('popstate', checkHashRoute);
    };
  }, []);

  useEffect(() => {
    const metrics = dbService.getAdminMetrics();
    setIsVotingOpen(metrics.isVotingOpen);
  }, [currentView]);

  const handleVerifyStudent = (admissionNo: string) => {
    setAuthError(undefined);
    const result = dbService.verifyStudent(admissionNo);

    if (result.error) {
      setAuthError(result.error);
      if (result.student) {
        setCurrentStudent(result.student);
      }
      return;
    }

    if (result.student) {
      setCurrentStudent(result.student);
      setCurrentTeacher(undefined);
      setCurrentView('confirm');
    }
  };

  const handleVerifyTeacher = (teacherId: string) => {
    setAuthError(undefined);
    const result = dbService.verifyTeacher(teacherId);

    if (result.error) {
      setAuthError(result.error);
      return;
    }

    if (result.teacher) {
      setCurrentTeacher(result.teacher);
      setCurrentStudent(undefined);
      setCurrentView('confirm');
    }
  };

  const handleConfirmIdentity = (council: CouncilType) => {
    setAssignedCouncil(council);
    const cands = dbService.getCandidatesByCouncil(council);
    setBallotCandidates(cands);
    setCurrentView('ballot');
  };

  const handleSubmitVote = (selections: Record<PositionType, string>) => {
    setIsSubmitting(true);

    let res;
    if (currentStudent) {
      res = dbService.submitVote(
        'student',
        currentStudent.admissionNo,
        currentStudent.name,
        assignedCouncil,
        selections,
        currentStudent.class
      );
    } else if (currentTeacher) {
      res = dbService.submitVote(
        'teacher',
        currentTeacher.teacherId,
        currentTeacher.name,
        assignedCouncil,
        selections
      );
    }

    setIsSubmitting(false);

    if (res && res.success) {
      setCurrentView('success');
    } else {
      alert(res?.error || 'Failed to submit vote. Please try again.');
    }
  };

  const handleResetSession = () => {
    setCurrentStudent(undefined);
    setCurrentTeacher(undefined);
    setAuthError(undefined);
    if (window.location.hash === '#admin') {
      window.location.hash = '';
    }
    setCurrentView('login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      
      <Navbar
        currentView={currentView}
        voterName={currentStudent?.name || currentTeacher?.name}
        isVotingOpen={isVotingOpen}
        onLogout={handleResetSession}
        onReturnToHome={handleResetSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        
        {/* VIEW 1: STUDENT & TEACHER PUBLIC LOGIN */}
        {currentView === 'login' && (
          <div className="space-y-8 animate-fade-in my-auto">
            
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Army Public School Digital Democracy Portal
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase font-serif">
                Student Council Elections
              </h1>
              <p className="text-sm text-slate-400">
                Primary Wing (Junior Council) & Senior Wing (Senior Council)
              </p>
            </div>

            {/* Role Switcher Tabs */}
            <div className="max-w-md mx-auto bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1 shadow-lg">
              <button
                onClick={() => {
                  setRoleTab('student');
                  setAuthError(undefined);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  roleTab === 'student'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Student Voting</span>
              </button>

              <button
                onClick={() => {
                  setRoleTab('teacher');
                  setAuthError(undefined);
                }}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  roleTab === 'teacher'
                    ? 'bg-blue-500 text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Teacher Voting</span>
              </button>
            </div>

            {roleTab === 'student' ? (
              <StudentLogin
                onVerify={handleVerifyStudent}
                error={authError}
              />
            ) : (
              <TeacherLogin
                onVerify={handleVerifyTeacher}
                error={authError}
              />
            )}

          </div>
        )}

        {/* VIEW 2: CONFIRMATION MODAL */}
        {currentView === 'confirm' && (
          <StudentConfirmModal
            voterType={currentStudent ? 'student' : 'teacher'}
            student={currentStudent}
            teacher={currentTeacher}
            onConfirm={handleConfirmIdentity}
            onCancel={handleResetSession}
          />
        )}

        {/* VIEW 3: VOTING BALLOT */}
        {currentView === 'ballot' && (
          <VotingBallot
            council={assignedCouncil}
            voterName={currentStudent?.name || currentTeacher?.name || 'Voter'}
            candidates={ballotCandidates}
            onSubmitVote={handleSubmitVote}
            isSubmitting={isSubmitting}
          />
        )}

        {/* VIEW 4: SUCCESS CELEBRATION */}
        {currentView === 'success' && (
          <VoteSuccess
            voterName={currentStudent?.name || currentTeacher?.name || 'Voter'}
            voterId={currentStudent?.admissionNo || currentTeacher?.teacherId || ''}
            council={assignedCouncil}
            onReturnToLogin={handleResetSession}
          />
        )}

        {/* VIEW 5: ISOLATED ADMIN DASHBOARD */}
        {currentView === 'admin' && (
          <AdminDashboard />
        )}

      </main>

      {/* Admin Passcode Modal */}
      {showAdminLoginModal && (
        <AdminLogin
          onLoginSuccess={() => {
            setShowAdminLoginModal(false);
            setCurrentView('admin');
          }}
          onCancel={() => {
            setShowAdminLoginModal(false);
            if (window.location.hash === '#admin') {
              window.location.hash = '';
            }
          }}
        />
      )}

      {/* Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full px-4">
        <p>© 2025 Army Public School Voting System. Built with React & Tailwind CSS.</p>

        <button
          onClick={() => {
            window.location.hash = '#admin';
            setShowAdminLoginModal(true);
          }}
          className="mt-2 sm:mt-0 text-[11px] text-slate-600 hover:text-amber-400 transition flex items-center gap-1 opacity-60 hover:opacity-100"
        >
          <Lock className="w-3 h-3" />
          <span>Election Official Portal Access (#admin)</span>
        </button>
      </footer>

    </div>
  );
};

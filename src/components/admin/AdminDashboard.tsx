import React, { useState, useEffect } from 'react';
import { 
  Users, Vote, Clock, Percent, Award, Shield, BarChart3, Plus, 
  Trash2, RefreshCcw, RotateCcw, Download, ToggleLeft, ToggleRight, Search, 
  UserPlus, TrendingUp, Upload, FileText, CheckCircle2, AlertCircle, Eye, UserCheck
} from 'lucide-react';
import { dbService } from '../../services/databaseService';
import type { PositionType, CouncilType, HouseType, Student, Teacher } from '../../types';
import { POSITION_LABELS, JUNIOR_POSITIONS, SENIOR_POSITIONS } from '../../types';
import { parseCSV, downloadCSVFile, getSampleStudentCSV, getSampleTeacherCSV } from '../../utils/csvParser';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'candidates' | 'voters' | 'audit' | 'settings'>('overview');
  const [metrics, setMetrics] = useState(dbService.getAdminMetrics());
  const [candidates, setCandidates] = useState(dbService.getAllCandidates());
  const [students, setStudents] = useState(dbService.getStudents());
  const [teachers, setTeachers] = useState(dbService.getTeachers());
  const [voteRecords, setVoteRecords] = useState(dbService.getVoteRecords());

  const [voterSearch, setVoterSearch] = useState('');
  const [voterFilter, setVoterFilter] = useState<'all' | 'voted' | 'pending' | 'junior' | 'senior' | 'teacher'>('all');
  
  const [auditSearch, setAuditSearch] = useState('');
  const [expandedVoteId, setExpandedVoteId] = useState<string | null>(null);

  const [importStatus, setImportStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [showImportModal, setShowImportModal] = useState(false);
  const [stagedCSV, setStagedCSV] = useState<{ type: 'students' | 'teachers'; fileName: string; rows: Record<string, string>[] } | null>(null);
  const [viewERPStudent, setViewERPStudent] = useState<Student | null>(null);
  const [viewERPTeacher, setViewERPTeacher] = useState<Teacher | null>(null);
  const [rosterView, setRosterView] = useState<'students' | 'teachers'>('students');
  const [selectedStudentForCand, setSelectedStudentForCand] = useState<string>('');

  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [newCand, setNewCand] = useState<{
    name: string;
    admissionNo: string;
    class: number;
    section: string;
    house: HouseType;
    position: PositionType;
    council: CouncilType;
    gender: 'M' | 'F';
    photoUrl: string;
    motto: string;
    achievements: string;
  }>({
    name: '',
    admissionNo: '',
    class: 12,
    section: 'A',
    house: 'Cariappa',
    position: 'head_boy',
    council: 'senior',
    gender: 'M',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
    motto: '',
    achievements: ''
  });

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    admissionNo: '',
    name: '',
    dob: '2010-01-01',
    class: 10,
    section: 'A',
    rollNo: 1,
    house: 'Cariappa' as const,
    gender: 'M' as const
  });

  const refreshData = () => {
    setMetrics(dbService.getAdminMetrics());
    setCandidates(dbService.getAllCandidates());
    setStudents(dbService.getStudents());
    setTeachers(dbService.getTeachers());
    setVoteRecords(dbService.getVoteRecords());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleToggleVoting = () => {
    dbService.toggleVotingStatus();
    refreshData();
  };

  const handleRestartFreshElection = async () => {
    if (window.confirm('⚠️ CONFIRM ELECTION RESTART:\n\nAre you sure you want to RESTART THE ELECTION FROM SCRATCH?\n\nThis will:\n1. Open voting polls for all students and teachers.\n2. Clear all submitted vote records and audit logs.\n3. Reset all student & teacher voting statuses back to PENDING.\n4. Reset all candidate vote counts to 0.\n\nClick OK to confirm and start a fresh voting session.')) {
      setIsSyncingFirebase(true);
      setImportStatus({ message: '🔄 Resetting all votes and clearing Firestore database...', type: 'success' });
      await dbService.restartFreshElection();
      refreshData();
      setIsSyncingFirebase(false);
      setImportStatus({
        message: '🎉 Election restarted from scratch! Voting polls are OPEN, all candidate tallies & audit logs reset to ZERO.',
        type: 'success'
      });
    }
  };

  const handleResetVotes = async () => {
    if (window.confirm('Are you sure you want to RESET ALL VOTES? This will clear all cast ballots and reset student voted statuses.')) {
      setIsSyncingFirebase(true);
      await dbService.resetAllVotes();
      refreshData();
      setIsSyncingFirebase(false);
      setImportStatus({ message: '✅ All poll votes cleared! Student & teacher voting statuses set to PENDING.', type: 'success' });
    }
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm('Restore initial default sample dataset for Army Public School?')) {
      setIsSyncingFirebase(true);
      await dbService.restoreDefaultDataset();
      refreshData();
      setIsSyncingFirebase(false);
      setImportStatus({ message: '✅ Demo sample dataset restored successfully.', type: 'success' });
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>, targetType: 'students' | 'teachers') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedRows = parseCSV(text);

        if (parsedRows.length === 0) {
          setImportStatus({ message: 'CSV file is empty or improperly formatted. Please verify column headers and row data.', type: 'error' });
          setStagedCSV(null);
          return;
        }

        setImportStatus({ 
          message: `✅ File "${file.name}" parsed! Found ${parsedRows.length} ${targetType === 'students' ? 'student' : 'teacher'} records. Click "Submit & Save to Database" below to finalize.`, 
          type: 'success' 
        });

        setStagedCSV({
          type: targetType,
          fileName: file.name,
          rows: parsedRows
        });
      } catch (err: any) {
        setImportStatus({ message: `CSV File Error: ${err?.message || 'Invalid file content'}`, type: 'error' });
        setStagedCSV(null);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);

  const handleManualFirebaseSync = async () => {
    setIsSyncingFirebase(true);
    setImportStatus({ message: '🔄 Syncing student and teacher database to Firebase Cloud Firestore...', type: 'success' });
    try {
      const res = await dbService.syncAllDataToFirebase();
      if (res.success) {
        setImportStatus({
          message: '🔥 Firebase Sync Complete! All student and teacher records have been saved to Firebase Firestore.',
          type: 'success'
        });
      } else {
        setImportStatus({
          message: `⚠️ Firebase sync error: ${res.error || 'Check Firestore Database status & rules in Firebase Console.'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setImportStatus({ message: `Firebase Sync Failed: ${err?.message || 'Error syncing data'}`, type: 'error' });
    } finally {
      setIsSyncingFirebase(false);
      refreshData();
    }
  };

  const handleConfirmCSVSubmit = async () => {
    if (!stagedCSV) return;

    try {
      if (stagedCSV.type === 'students') {
        const { added, updated, syncedToFirebase, firebaseError } = await dbService.bulkImportStudents(stagedCSV.rows);
        const fbStatus = syncedToFirebase 
          ? '🔥 Data saved & synced to Firebase Firestore database!' 
          : `💾 Saved locally (${firebaseError ? 'Firebase: ' + firebaseError : 'Firebase sync pending'}).`;
        setImportStatus({
          message: `🎉 Successfully imported Student ERP List! Added: ${added} new students, Updated: ${updated} existing records. ${fbStatus}`,
          type: syncedToFirebase ? 'success' : 'error'
        });
        setRosterView('students');
      } else {
        const { added, updated, syncedToFirebase, firebaseError } = await dbService.bulkImportTeachers(stagedCSV.rows);
        const fbStatus = syncedToFirebase 
          ? '🔥 Data saved & synced to Firebase Firestore database!' 
          : `💾 Saved locally (${firebaseError ? 'Firebase: ' + firebaseError : 'Firebase sync pending'}).`;
        setImportStatus({
          message: `🎉 Successfully imported Teacher & Staff ERP List! Added: ${added} new staff, Updated: ${updated} existing records. ${fbStatus}`,
          type: syncedToFirebase ? 'success' : 'error'
        });
        setRosterView('teachers');
      }

      refreshData();
      setActiveTab('voters');
      setStagedCSV(null);
      setShowImportModal(false);
    } catch (err: any) {
      setImportStatus({ message: `Import Failed: ${err?.message || 'Failed to save to database'}`, type: 'error' });
    }
  };

  const handleSelectStudentForCandidate = (studentId: string) => {
    setSelectedStudentForCand(studentId);
    const found = students.find(s => s.id === studentId || s.admissionNo.toUpperCase() === studentId.toUpperCase());
    if (found) {
      const isJunior = found.class <= 5;
      setNewCand(prev => ({
        ...prev,
        name: found.name,
        admissionNo: found.admissionNo,
        class: found.class,
        section: found.section,
        house: found.house,
        gender: found.gender,
        council: isJunior ? 'junior' : 'senior',
        position: isJunior ? 'head_boy' : 'head_boy'
      }));
    }
  };

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCand.name && newCand.admissionNo) {
      dbService.addCandidate({
        ...newCand,
        achievements: newCand.achievements ? newCand.achievements.split(',').map(s => s.trim()) : []
      });
      setShowAddCandidateModal(false);
      setSelectedStudentForCand('');
      setNewCand({
        name: '',
        admissionNo: '',
        class: 12,
        section: 'A',
        house: 'Cariappa',
        position: 'head_boy',
        council: 'senior',
        gender: 'M',
        photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
        motto: '',
        achievements: ''
      });
      refreshData();
    }
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStudent.admissionNo && newStudent.name) {
      dbService.addStudent(newStudent);
      setShowAddStudentModal(false);
      setNewStudent({
        admissionNo: '',
        name: '',
        dob: '2010-01-01',
        class: 10,
        section: 'A',
        rollNo: 1,
        house: 'Cariappa',
        gender: 'M'
      });
      refreshData();
    }
  };

  const handleDeleteCandidate = (id: string) => {
    if (window.confirm('Delete candidate?')) {
      dbService.deleteCandidate(id);
      refreshData();
    }
  };

  const handleClearAllCandidates = () => {
    if (window.confirm('⚠️ WARNING: Are you sure you want to DELETE ALL CANDIDATES from the roster? This action cannot be undone.')) {
      dbService.clearAllCandidates();
      refreshData();
    }
  };

  const handleDeleteStudent = (id: string, name: string, admNo: string) => {
    if (window.confirm(`Are you sure you want to DELETE student "${name}" (${admNo})?`)) {
      dbService.deleteStudent(id);
      refreshData();
    }
  };

  const handleDeleteTeacher = (id: string, name: string, empId: string) => {
    if (window.confirm(`Are you sure you want to DELETE teacher/staff "${name}" (${empId})?`)) {
      dbService.deleteTeacher(id);
      refreshData();
    }
  };

  const handleClearAllStudents = () => {
    if (window.confirm('⚠️ WARNING: Are you sure you want to DELETE ALL STUDENTS from the database? This action cannot be undone.')) {
      dbService.clearAllStudents();
      refreshData();
    }
  };

  const handleClearAllTeachers = () => {
    if (window.confirm('⚠️ WARNING: Are you sure you want to DELETE ALL TEACHERS from the database? This action cannot be undone.')) {
      dbService.clearAllTeachers();
      refreshData();
    }
  };

  const exportSummaryCSV = () => {
    const headers = ['Vote ID', 'Voter Type', 'Voter ID', 'Voter Name', 'Council', 'Timestamp'];
    const rows = voteRecords.map(v => [
      v.id,
      v.voterType,
      v.voterId,
      `"${v.voterName}"`,
      v.council,
      v.timestamp
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    downloadCSVFile(`APS_Election_Summary_${new Date().toISOString().slice(0,10)}.csv`, csvContent);
  };

  const exportDetailedAuditCSV = () => {
    const candidateMap = new Map(candidates.map(c => [c.id, c.name]));
    const headers = ['Vote ID', 'Timestamp', 'Voter Type', 'Voter ID', 'Voter Name', 'Council', 'Position', 'Selected Candidate ID', 'Selected Candidate Name'];
    
    const rows: string[] = [];
    voteRecords.forEach(v => {
      Object.entries(v.selections).forEach(([posKey, candidateId]) => {
        if (candidateId) {
          const candName = candidateMap.get(candidateId) || candidateId;
          const posTitle = POSITION_LABELS[posKey as PositionType]?.title || posKey;
          rows.push([
            v.id,
            v.timestamp,
            v.voterType,
            v.voterId,
            `"${v.voterName}"`,
            v.council,
            `"${posTitle}"`,
            candidateId,
            `"${candName}"`
          ].join(','));
        }
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadCSVFile(`APS_Election_Detailed_Audit_Log_${new Date().toISOString().slice(0,10)}.csv`, csvContent);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(voterSearch.toLowerCase()) || 
                          s.admissionNo.toLowerCase().includes(voterSearch.toLowerCase());
    if (voterFilter === 'voted') return matchesSearch && s.hasVoted;
    if (voterFilter === 'pending') return matchesSearch && !s.hasVoted;
    if (voterFilter === 'junior') return matchesSearch && s.class <= 5;
    if (voterFilter === 'senior') return matchesSearch && s.class >= 6;
    if (voterFilter === 'teacher') return false;
    return matchesSearch;
  });

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(voterSearch.toLowerCase()) || 
                          t.teacherId.toLowerCase().includes(voterSearch.toLowerCase());
    if (voterFilter === 'voted') return matchesSearch && t.hasVoted;
    if (voterFilter === 'pending') return matchesSearch && !t.hasVoted;
    if (voterFilter === 'junior' || voterFilter === 'senior') return false;
    return matchesSearch;
  });

  const filteredAuditRecords = voteRecords.filter(v => {
    const search = auditSearch.toLowerCase();
    return v.voterName.toLowerCase().includes(search) || 
           v.voterId.toLowerCase().includes(search) || 
           v.id.toLowerCase().includes(search);
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
              ADMIN CONTROL CENTER
            </span>
            <span className="text-xs text-emerald-400 font-mono">Real-Time Data Sync Active</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 font-serif">
            Army Public School Election Command Dashboard
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV / Excel</span>
          </button>

          <button
            onClick={handleToggleVoting}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition ${
              metrics.isVotingOpen
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {metrics.isVotingOpen ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            <span>{metrics.isVotingOpen ? 'Voting: OPEN' : 'Voting: CLOSED'}</span>
          </button>

          <button
            onClick={exportSummaryCSV}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Import Status Alert Banner */}
      {importStatus.message && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
          importStatus.type === 'success' 
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
            : 'bg-red-950/80 text-red-300 border-red-500/40'
        }`}>
          <div className="flex items-center gap-2">
            {importStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
            <span>{importStatus.message}</span>
          </div>
          <button onClick={() => setImportStatus({ message: '', type: '' })} className="hover:opacity-80 text-sm font-mono">✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
          { id: 'results', label: 'Live Results & Leaderboard', icon: TrendingUp },
          { id: 'candidates', label: 'Candidate Management', icon: Award },
          { id: 'voters', label: 'Voter Registry & CSV Import', icon: Users },
          { id: 'audit', label: 'Vote Audit Log (Ballots)', icon: Vote },
          { id: 'settings', label: 'System Controls', icon: RefreshCcw },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition border ${
                isActive
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 font-extrabold'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Students</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">{metrics.totalStudents}</div>
              <div className="text-[10px] text-slate-400 mt-1">+ {metrics.totalTeachers} Teachers</div>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Total Votes</span>
                <Vote className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">{metrics.totalVotes}</div>
              <div className="text-[10px] text-emerald-300/80 mt-1">Ballots Cast</div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Votes</span>
                <Clock className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-400 font-mono">{metrics.pendingVotes}</div>
              <div className="text-[10px] text-slate-400 mt-1">Awaiting Turn</div>
            </div>

            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Turnout %</span>
                <Percent className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-300 font-mono">{metrics.votingPercentage}%</div>
              <div className="text-[10px] text-slate-400 mt-1">Overall Participation</div>
            </div>

            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Junior Council</span>
                <Award className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-300 font-mono">{metrics.juniorPercentage}%</div>
              <div className="text-[10px] text-slate-400 mt-1">{metrics.juniorVoted} / {metrics.juniorTotal} Voted</div>
            </div>

            <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Senior Council</span>
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-300 font-mono">{metrics.seniorPercentage}%</div>
              <div className="text-[10px] text-slate-400 mt-1">{metrics.seniorVoted} / {metrics.seniorTotal} Voted</div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>Top Candidates Leading Positions</span>
                </h3>
                <span className="text-xs text-amber-400 font-mono font-bold">Live Counts</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { posKey: 'head_boy', council: 'senior', title: 'Head Boy (Senior)' },
                  { posKey: 'head_girl', council: 'senior', title: 'Head Girl (Senior)' },
                  { posKey: 'head_boy', council: 'junior', title: 'Head Boy (Junior)' },
                  { posKey: 'head_girl', council: 'junior', title: 'Head Girl (Junior)' },
                ].map((item, idx) => {
                  const cands = candidates.filter(c => c.position === item.posKey && c.council === item.council);
                  const topCand = [...cands].sort((a,b) => b.votesCount - a.votesCount)[0];

                  return (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-3">
                      {topCand ? (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-amber-400 font-bold uppercase">{item.title}</div>
                            <div className="text-sm font-bold text-white truncate">{topCand.name}</div>
                            <div className="text-[10px] text-slate-400">Class {topCand.class}-{topCand.section} • {topCand.house} House</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-extrabold text-amber-400 font-mono">{topCand.votesCount}</div>
                            <div className="text-[9px] text-slate-400 uppercase font-bold">Votes</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-slate-500 py-2">No candidate recorded</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <span>Recent Votes Activity</span>
                </h3>
                {metrics.recentVotes.length > 0 && (
                  <button
                    onClick={handleResetVotes}
                    className="text-[11px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 font-semibold transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Activity</span>
                  </button>
                )}
              </div>

              {metrics.recentVotes.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  No votes cast yet. Open polls to start accepting ballots.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {metrics.recentVotes.map(vote => (
                    <div key={vote.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{vote.voterName}</div>
                        <div className="text-[10px] text-slate-400">
                          {vote.voterType.toUpperCase()} • <span className="font-mono text-amber-300">{vote.voterId}</span> ({vote.council})
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(vote.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: LIVE RESULTS */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-amber-400" />
              <span>Full Election Results Breakdown by Council & Position</span>
            </h3>

            <div className="space-y-6 mb-8">
              <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider border-b border-amber-500/20 pb-2">
                Senior Council
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SENIOR_POSITIONS.map(posKey => {
                  const posInfo = POSITION_LABELS[posKey];
                  const cands = candidates.filter(c => c.position === posKey && c.council === 'senior');
                  const totalPosVotes = cands.reduce((acc, curr) => acc + curr.votesCount, 0);

                  return (
                    <div key={posKey} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                        <span className="font-bold text-white text-sm">{posInfo.title}</span>
                        <span className="text-xs text-slate-400 font-mono">{totalPosVotes} total votes</span>
                      </div>

                      <div className="space-y-3">
                        {cands.length === 0 ? (
                          <div className="text-xs text-slate-500 py-2 italic">No candidates nominated</div>
                        ) : (
                          cands.map(cand => {
                            const pct = totalPosVotes > 0 ? Math.round((cand.votesCount / totalPosVotes) * 100) : 0;
                            return (
                              <div key={cand.id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-200">{cand.name} ({cand.house})</span>
                                  <span className="font-mono text-amber-400 font-bold">{cand.votesCount} ({pct}%)</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider border-b border-emerald-500/20 pb-2">
                Junior Council
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {JUNIOR_POSITIONS.map(posKey => {
                  const posInfo = POSITION_LABELS[posKey];
                  const cands = candidates.filter(c => c.position === posKey && c.council === 'junior');
                  const totalPosVotes = cands.reduce((acc, curr) => acc + curr.votesCount, 0);

                  return (
                    <div key={posKey} className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                        <span className="font-bold text-white text-sm">{posInfo.title}</span>
                        <span className="text-xs text-slate-400 font-mono">{totalPosVotes} total votes</span>
                      </div>

                      <div className="space-y-3">
                        {cands.length === 0 ? (
                          <div className="text-xs text-slate-500 py-2 italic">No candidates nominated</div>
                        ) : (
                          cands.map(cand => {
                            const pct = totalPosVotes > 0 ? Math.round((cand.votesCount / totalPosVotes) * 100) : 0;
                            return (
                              <div key={cand.id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-200">{cand.name} ({cand.house})</span>
                                  <span className="font-mono text-emerald-400 font-bold">{cand.votesCount} ({pct}%)</span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: CANDIDATE MANAGEMENT */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">Nominated Candidate Roster</h3>
                <p className="text-xs text-slate-400">Add candidates manually or select directly from imported Student roster</p>
              </div>
              <div className="flex items-center gap-2">
                {candidates.length > 0 && (
                  <button
                    onClick={handleClearAllCandidates}
                    className="py-2.5 px-3.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All Candidates</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAddCandidateModal(true)}
                  className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nominate Candidate</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidates.map(candidate => (
                <div key={candidate.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 relative group">
                  <button
                    onClick={() => handleDeleteCandidate(candidate.id)}
                    className="absolute top-3 right-3 text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="mb-3">
                    <div className="font-bold text-white text-sm">{candidate.name}</div>
                    <div className="text-[10px] text-amber-400 font-bold uppercase">{POSITION_LABELS[candidate.position]?.title}</div>
                    <div className="text-[10px] text-slate-400">Class {candidate.class}-{candidate.section} • {candidate.house} House</div>
                  </div>

                  <div className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 mb-2">
                    "{candidate.motto}"
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800">
                    <span className="capitalize font-semibold text-slate-400">{candidate.council} Council</span>
                    <span className="font-mono font-bold text-amber-400">{candidate.votesCount} Votes</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: VOTER REGISTRY & CSV IMPORT */}
      {activeTab === 'voters' && (
        <div className="space-y-6">
          
          {/* CSV / Excel Upload Section */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Import Students & Teachers Roster (CSV / Excel)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Upload CSV or Excel exports to auto-populate Student and Teacher credentials. Once imported, students and teachers can directly log in using their Admission No / Teacher ID.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Student CSV Import Card */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-sm text-white">Import Student List CSV</span>
                  </div>
                  <button
                    onClick={() => downloadCSVFile('APS_Students_Template.csv', getSampleStudentCSV())}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Sample Template
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Headers required: <code className="text-amber-300">admissionNo, name, dob, class, section, rollNo, house, gender</code>
                </p>

                <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-900/60 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
                  <FileText className="w-6 h-6 text-amber-400 mb-1" />
                  <span className="text-xs font-bold text-slate-200">Choose Student CSV File</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">.csv, .txt, or spreadsheet export</span>
                  <input
                    type="file"
                    accept=".csv, .tsv, .txt"
                    onChange={(e) => handleCSVUpload(e, 'students')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Teacher CSV Import Card */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-white">Import Teacher List CSV</span>
                  </div>
                  <button
                    onClick={() => downloadCSVFile('APS_Teachers_Template.csv', getSampleTeacherCSV())}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Sample Template
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Headers required: <code className="text-emerald-300">teacherId, name, pin, department, designation</code>
                </p>

                <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/60 p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
                  <FileText className="w-6 h-6 text-emerald-400 mb-1" />
                  <span className="text-xs font-bold text-slate-200">Choose Teacher CSV File</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">.csv, .tsv, or spreadsheet export</span>
                  <input
                    type="file"
                    accept=".csv, .tsv, .txt"
                    onChange={(e) => handleCSVUpload(e, 'teachers')}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

            {importStatus.message && (
              <div className={`mt-4 p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
                importStatus.type === 'success' 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                  : 'bg-red-950/80 text-red-300 border-red-500/40'
              }`}>
                <div className="flex items-center gap-2">
                  {importStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                  <span>{importStatus.message}</span>
                </div>
                <button onClick={() => setImportStatus({ message: '', type: '' })} className="hover:opacity-80 text-sm font-mono">✕</button>
              </div>
            )}

            {/* STAGED CSV PREVIEW & SUBMIT SECTION */}
            {stagedCSV && (
              <div className="mt-4 bg-slate-950 border border-amber-500/50 p-5 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Ready to Submit {stagedCSV.type === 'students' ? 'Student' : 'Teacher'} Data
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        File: <span className="text-amber-300 font-mono font-bold">{stagedCSV.fileName}</span> ({stagedCSV.rows.length} total rows parsed)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStagedCSV(null)}
                    className="text-xs text-slate-400 hover:text-red-400 underline font-semibold"
                  >
                    Clear File
                  </button>
                </div>

                {/* Preview Table of First 4 Rows */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2">#</th>
                        {stagedCSV.type === 'students' ? (
                          <>
                            <th className="p-2">Admission No</th>
                            <th className="p-2">Student Name</th>
                            <th className="p-2">Class & Sec</th>
                            <th className="p-2">Father Name</th>
                          </>
                        ) : (
                          <>
                            <th className="p-2">EMP ID</th>
                            <th className="p-2">Staff Name</th>
                            <th className="p-2">APPT</th>
                            <th className="p-2">Type</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                      {stagedCSV.rows.slice(0, 4).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60">
                          <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                          {stagedCSV.type === 'students' ? (
                            <>
                              <td className="p-2 font-mono font-bold text-amber-300">
                                {row.admissionno || row.admission_no || row.admno || '-'}
                              </td>
                              <td className="p-2 font-bold text-white">
                                {row.studentname || row.student_name || row.name || '-'}
                              </td>
                              <td className="p-2 text-slate-300">
                                Class {row.classname || row.class || '10'}-{row.sectionname || row.section || 'A'}
                              </td>
                              <td className="p-2 text-slate-400">
                                {row.fathername || row.father_name || '-'}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 font-mono font-bold text-emerald-300">
                                {row.empid || row.emp_id || row.teacherid || '-'}
                              </td>
                              <td className="p-2 font-bold text-white">
                                {row.empname || row.emp_name || row.name || '-'}
                              </td>
                              <td className="p-2 text-slate-300">
                                {row.appt || row.designation || '-'}
                              </td>
                              <td className="p-2 text-slate-400">
                                {row.emptype || row.emp_type || 'Regular'}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setStagedCSV(null)}
                    className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmCSVSubmit}
                    className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit & Import {stagedCSV.rows.length} Records to Database</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Directory Section with Dedicated Roster Tabs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            
            {/* Header & Sub-Nav Switcher */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Voter Directory & Official ERP Records</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  View complete imported ERP details for Students ({students.length}) and Teachers ({teachers.length})
                </p>
              </div>

              {/* Roster Switcher Buttons */}
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setRosterView('students')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    rosterView === 'students'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Students Roster ({filteredStudents.length})</span>
                </button>
                <button
                  onClick={() => setRosterView('teachers')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                    rosterView === 'teachers'
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Teachers & Staff Roster ({filteredTeachers.length})</span>
                </button>
              </div>
            </div>

            {/* Controls Bar: Add & Clear Buttons & Search Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full md:w-auto">
                {rosterView === 'students' ? (
                  <>
                    <button
                      onClick={() => setShowAddStudentModal(true)}
                      className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Add Single Student</span>
                    </button>
                    {students.length > 0 && (
                      <button
                        onClick={handleClearAllStudents}
                        className="py-2.5 px-3.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear All Students</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import Teachers CSV</span>
                    </button>
                    {teachers.length > 0 && (
                      <button
                        onClick={handleClearAllTeachers}
                        className="py-2.5 px-3.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Clear All Teachers</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={handleManualFirebaseSync}
                  disabled={isSyncingFirebase}
                  className="py-2.5 px-3.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition whitespace-nowrap disabled:opacity-50"
                  title="Sync all Student & Teacher CSV records to Firebase Firestore Database"
                >
                  <RefreshCcw className={`w-4 h-4 text-cyan-400 ${isSyncingFirebase ? 'animate-spin' : ''}`} />
                  <span>{isSyncingFirebase ? 'Syncing...' : 'Sync to Firebase'}</span>
                </button>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={voterSearch}
                    onChange={(e) => setVoterSearch(e.target.value)}
                    placeholder={rosterView === 'students' ? "Search Name, Adm No, Father Name..." : "Search Staff Name, EMP ID, Designation..."}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <select
                  value={voterFilter}
                  onChange={(e) => setVoterFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="all">All Voters</option>
                  <option value="voted">Voted Only</option>
                  <option value="pending">Pending Only</option>
                  {rosterView === 'students' && (
                    <>
                      <option value="junior">Junior Council</option>
                      <option value="senior">Senior Council</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* STUDENTS ROSTER TABLE WITH ALL ERP COLUMNS */}
            {rosterView === 'students' && (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <span>Student ERP Records Database ({filteredStudents.length} Records)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Scroll horizontally for all 19 columns</span>
                </div>
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Class & Sec</th>
                      <th className="p-3">House</th>
                      <th className="p-3">Admission Category</th>
                      <th className="p-3">Father Name & Contact</th>
                      <th className="p-3">Mother Name & Contact</th>
                      <th className="p-3">DOB</th>
                      <th className="p-3">Route & Blood</th>
                      <th className="p-3">Voting Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-6 text-center text-slate-500 italic text-xs">
                          No matching students found in database.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(student => (
                        <tr key={student.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-bold text-amber-300">{student.admissionNo}</td>
                          <td className="p-3">
                            <div className="font-semibold text-white">{student.name}</div>
                            <div className="text-[10px] text-slate-400">{student.gender === 'F' ? 'Female' : 'Male'}</div>
                          </td>
                          <td className="p-3 font-semibold text-slate-200">
                            Class {student.class}-{student.section} <span className="text-slate-400 font-normal">(Roll #{student.rollNo})</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-300">{student.house}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold">
                              {student.admissionCategory || 'Serving Army'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">
                            <div className="font-medium text-slate-200">{student.fatherName || 'N/A'}</div>
                            <div className="text-[10px] font-mono text-slate-400">{student.fatherMobileNo || '-'}</div>
                          </td>
                          <td className="p-3 text-slate-300">
                            <div className="font-medium text-slate-200">{student.motherName || 'N/A'}</div>
                            <div className="text-[10px] font-mono text-slate-400">{student.motherMobileNo || '-'}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-400">{student.dob}</td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            <div>Route: {student.routeNo || 'N/A'}</div>
                            <div className="text-red-400 font-bold text-[10px]">Blood: {student.bloodGroup || 'N/A'}</div>
                          </td>
                          <td className="p-3">
                            {student.hasVoted ? (
                              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full font-bold text-[10px]">
                                VOTED ({new Date(student.votedAt || '').toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full font-bold text-[10px]">
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewERPStudent(student)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Full Card</span>
                              </button>

                              <button
                                onClick={() => handleDeleteStudent(student.id, student.name, student.admissionNo)}
                                className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                title="Delete Student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TEACHERS & STAFF ROSTER TABLE WITH ALL ERP COLUMNS */}
            {rosterView === 'teachers' && (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <span>Teacher & Staff ERP Records Database ({filteredTeachers.length} Records)</span>
                  <span className="text-[10px] text-slate-500 font-mono">Scroll horizontally for all 11 columns</span>
                </div>
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">EMP ID</th>
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Appointment (APPT)</th>
                      <th className="p-3">Employment Type</th>
                      <th className="p-3">Joining Date (DOJ)</th>
                      <th className="p-3">Confirmation Date (DOC)</th>
                      <th className="p-3">Bank Account & IFSC</th>
                      <th className="p-3">Pay Scale</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3">Voting Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-6 text-center text-slate-500 italic text-xs">
                          No matching teacher records found in database.
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map(teacher => (
                        <tr key={teacher.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-bold text-emerald-300">{teacher.teacherId}</td>
                          <td className="p-3 font-bold text-white">{teacher.name}</td>
                          <td className="p-3 font-semibold text-slate-200">{teacher.appt || teacher.designation}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">
                              {teacher.empType || 'Regular'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-300">{teacher.doj || 'N/A'}</td>
                          <td className="p-3 font-mono text-slate-400">{teacher.doc || 'N/A'}</td>
                          <td className="p-3 font-mono text-slate-300 text-[11px]">
                            <div>Acct: {teacher.bankAcct || 'N/A'}</div>
                            <div className="text-amber-400 font-bold text-[10px]">IFSC: {teacher.ifscNo || 'N/A'}</div>
                          </td>
                          <td className="p-3 text-slate-300 font-medium">{teacher.pay || 'N/A'}</td>
                          <td className="p-3 text-slate-400 italic max-w-xs truncate">{teacher.remarks || '-'}</td>
                          <td className="p-3">
                            {teacher.hasVoted ? (
                              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-full font-bold text-[10px]">
                                VOTED ({new Date(teacher.votedAt || '').toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full font-bold text-[10px]">
                                PENDING
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewERPTeacher(teacher)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Full Card</span>
                              </button>

                              <button
                                onClick={() => handleDeleteTeacher(teacher.id, teacher.name, teacher.teacherId)}
                                className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                title="Delete Teacher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB 5: VOTE AUDIT LOG (WHO VOTED WHOM) */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Vote className="w-6 h-6 text-amber-400" />
                  <span>Detailed Ballots & Vote Audit Log</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Inspect exact candidate selections cast by individual students and teachers (Who voted for whom)
                </p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search Voter Name or ID..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {voteRecords.length > 0 && (
                  <button
                    onClick={handleResetVotes}
                    className="py-2 px-3.5 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All Vote Logs</span>
                  </button>
                )}

                <button
                  onClick={exportDetailedAuditCSV}
                  className="py-2 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Detailed Audit CSV</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredAuditRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic bg-slate-950 rounded-2xl border border-slate-800">
                  No ballot logs found matching your search query.
                </div>
              ) : (
                filteredAuditRecords.map(record => {
                  const isExpanded = expandedVoteId === record.id;
                  const candidateMap = new Map(candidates.map(c => [c.id, c]));

                  return (
                    <div key={record.id} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition">
                      <div 
                        onClick={() => setExpandedVoteId(isExpanded ? null : record.id)}
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            record.voterType === 'student' 
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          }`}>
                            {record.voterType === 'student' ? 'ST' : 'TR'}
                          </span>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-2">
                              <span>{record.voterName}</span>
                              <span className="font-mono text-xs text-amber-300">({record.voterId})</span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {record.voterType.toUpperCase()} • {record.council.toUpperCase()} Council • Timestamp: {new Date(record.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {Object.keys(record.selections).length} positions voted
                          </span>
                          <Eye className={`w-4 h-4 transition ${isExpanded ? 'text-amber-400 rotate-180' : 'text-slate-500'}`} />
                        </div>
                      </div>

                      {/* Expanded View: Selections Breakdown */}
                      {isExpanded && (
                        <div className="bg-slate-900/80 p-4 border-t border-slate-800/80 space-y-3">
                          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                            Selections Breakdown (Who this voter selected):
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(record.selections).map(([posKey, candidateId]) => {
                              const posTitle = POSITION_LABELS[posKey as PositionType]?.title || posKey;
                              const selectedCand = candidateMap.get(candidateId);

                              return (
                                <div key={posKey} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex items-center justify-between">
                                  <div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase">{posTitle}</div>
                                    <div className="font-semibold text-white mt-0.5">
                                      {selectedCand ? selectedCand.name : candidateId}
                                    </div>
                                  </div>
                                  {selectedCand && (
                                    <div className="text-right text-[10px] text-amber-400 font-semibold">
                                      Class {selectedCand.class}-{selectedCand.section} • {selectedCand.house}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 6: SYSTEM CONTROLS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <RefreshCcw className="w-6 h-6 text-amber-400" />
              <span>Election System Maintenance Controls</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Fresh Election Restart Card */}
              <div className="bg-gradient-to-br from-red-950/90 via-slate-900 to-slate-950 border-2 border-red-500/60 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-extrabold text-red-400 flex items-center gap-2">
                      <RotateCcw className="w-5 h-5 text-red-400" />
                      <span>Restart Fresh Election</span>
                    </h4>
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-[10px] font-bold rounded-full border border-red-500/40 uppercase">
                      Start Over
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Start election from scratch. Clears all cast ballots, resets student & teacher statuses to PENDING, resets candidate votes to 0, and OPENS voting.
                  </p>
                </div>
                <button
                  onClick={handleRestartFreshElection}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition hover:scale-[1.02]"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Election From Scratch</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-red-500/30 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-red-400 flex items-center gap-2 mb-2">
                    <Trash2 className="w-5 h-5" />
                    <span>Reset All Poll Votes</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Clears all submitted vote records and sets all student & teacher voting statuses back to PENDING.
                  </p>
                </div>
                <button
                  onClick={handleResetVotes}
                  className="w-full py-2.5 px-4 bg-red-950 hover:bg-red-900 text-red-300 border border-red-500/40 font-bold rounded-xl text-xs transition"
                >
                  Execute Poll Reset
                </button>
              </div>

              <div className="bg-slate-950 border border-amber-500/30 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-amber-400 flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5" />
                    <span>Clear Nominated Candidates</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Removes all candidates from the candidate roster for a fresh election nomination.
                  </p>
                </div>
                <button
                  onClick={handleClearAllCandidates}
                  className="w-full py-2.5 px-4 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 font-bold rounded-xl text-xs transition"
                >
                  Clear All Candidates
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-base font-bold text-slate-300 flex items-center gap-2 mb-2">
                    <RefreshCcw className="w-5 h-5" />
                    <span>Restore Sample Dataset</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Resets database to Army Public School standard sample candidates, students, and teachers.
                  </p>
                </div>
                <button
                  onClick={handleRestoreDefaults}
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Restore Demo Data
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Nominate Candidate Modal */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Nominate New Candidate</h3>
            
            {/* Quick Student Selection */}
            <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 space-y-1.5">
              <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Quick Select from Imported Students Roster
              </label>
              <select
                value={selectedStudentForCand}
                onChange={(e) => handleSelectStudentForCandidate(e.target.value)}
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
              >
                <option value="">-- Choose a Student to Auto-fill --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.admissionNo}) - Class {s.class}-{s.section} [{s.house}]
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCreateCandidate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Candidate Full Name</label>
                <input
                  type="text"
                  required
                  value={newCand.name}
                  onChange={e => setNewCand({...newCand, name: e.target.value})}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Admission No</label>
                  <input
                    type="text"
                    required
                    value={newCand.admissionNo}
                    onChange={e => setNewCand({...newCand, admissionNo: e.target.value})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Council Wing</label>
                  <select
                    value={newCand.council}
                    onChange={e => setNewCand({...newCand, council: e.target.value as any})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="junior">Junior Council</option>
                    <option value="senior">Senior Council</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Position</label>
                <select
                  value={newCand.position}
                  onChange={e => setNewCand({...newCand, position: e.target.value as any})}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  {Object.entries(POSITION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Class</label>
                  <input
                    type="number"
                    value={newCand.class}
                    onChange={e => setNewCand({...newCand, class: parseInt(e.target.value)})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">House</label>
                  <select
                    value={newCand.house}
                    onChange={e => setNewCand({...newCand, house: e.target.value as any})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="Cariappa">Cariappa</option>
                    <option value="Manekshaw">Manekshaw</option>
                    <option value="Thimayya">Thimayya</option>
                    <option value="Vaidya">Vaidya</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Manifesto Motto</label>
                <input
                  type="text"
                  value={newCand.motto}
                  onChange={e => setNewCand({...newCand, motto: e.target.value})}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20"
                >
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Add Single Student</h3>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Admission No</label>
                  <input
                    type="text"
                    required
                    value={newStudent.admissionNo}
                    onChange={e => setNewStudent({...newStudent, admissionNo: e.target.value})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Date of Birth (YYYY-MM-DD)</label>
                  <input
                    type="text"
                    required
                    value={newStudent.dob}
                    onChange={e => setNewStudent({...newStudent, dob: e.target.value})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Class (1-12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newStudent.class}
                    onChange={e => setNewStudent({...newStudent, class: parseInt(e.target.value)})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Section</label>
                  <input
                    type="text"
                    value={newStudent.section}
                    onChange={e => setNewStudent({...newStudent, section: e.target.value})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Roll No</label>
                  <input
                    type="number"
                    value={newStudent.rollNo}
                    onChange={e => setNewStudent({...newStudent, rollNo: parseInt(e.target.value)})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">House</label>
                  <select
                    value={newStudent.house}
                    onChange={e => setNewStudent({...newStudent, house: e.target.value as any})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="Cariappa">Cariappa</option>
                    <option value="Manekshaw">Manekshaw</option>
                    <option value="Thimayya">Thimayya</option>
                    <option value="Vaidya">Vaidya</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Gender</label>
                  <select
                    value={newStudent.gender}
                    onChange={e => setNewStudent({...newStudent, gender: e.target.value as any})}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="M">Male (M)</option>
                    <option value="F">Female (F)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-6 h-6 text-amber-400" />
                  <span>Import Students & Teachers Roster (CSV / Excel)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Upload CSV spreadsheets to auto-fill student & teacher credentials for login & voting.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setStagedCSV(null);
                }}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {importStatus.message && (
              <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between border ${
                importStatus.type === 'success' 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' 
                  : 'bg-red-950/80 text-red-300 border-red-500/40'
              }`}>
                <div className="flex items-center gap-2">
                  {importStatus.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-red-400" />}
                  <span>{importStatus.message}</span>
                </div>
                <button onClick={() => setImportStatus({ message: '', type: '' })} className="hover:opacity-80 text-sm font-mono">✕</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Student Import Card */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-sm text-white">Students List CSV</span>
                  </div>
                  <button
                    onClick={() => downloadCSVFile('APS_Students_Template.csv', getSampleStudentCSV())}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Sample
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Headers: <code className="text-amber-300">Admission No, Student Name, Class Name, Section Name, Father Name...</code>
                </p>

                <label className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-900/60 p-5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
                  <FileText className="w-7 h-7 text-amber-400 mb-2" />
                  <span className="text-xs font-bold text-slate-200">Upload Student CSV File</span>
                  <span className="text-[10px] text-slate-500 mt-1">Click to browse .csv / .tsv</span>
                  <input
                    type="file"
                    accept=".csv, .tsv, .txt"
                    onChange={(e) => handleCSVUpload(e, 'students')}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Teacher Import Card */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-white">Teachers List CSV</span>
                  </div>
                  <button
                    onClick={() => downloadCSVFile('APS_Teachers_Template.csv', getSampleTeacherCSV())}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" /> Sample
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Headers: <code className="text-emerald-300">EMP ID, EMP NAME, APPT, EMP TYPE, DOJ, DOC, BANK ACCT...</code>
                </p>

                <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/60 p-5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition">
                  <FileText className="w-7 h-7 text-emerald-400 mb-2" />
                  <span className="text-xs font-bold text-slate-200">Upload Teacher CSV File</span>
                  <span className="text-[10px] text-slate-500 mt-1">Click to browse .csv / .tsv</span>
                  <input
                    type="file"
                    accept=".csv, .tsv, .txt"
                    onChange={(e) => handleCSVUpload(e, 'teachers')}
                    className="hidden"
                  />
                </label>
              </div>

            </div>

            {/* STAGED CSV PREVIEW & SUBMIT SECTION */}
            {stagedCSV && (
              <div className="bg-slate-950 border border-amber-500/50 p-5 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Ready to Submit {stagedCSV.type === 'students' ? 'Student' : 'Teacher'} Data
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        File: <span className="text-amber-300 font-mono font-bold">{stagedCSV.fileName}</span> ({stagedCSV.rows.length} total rows parsed)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setStagedCSV(null)}
                    className="text-xs text-slate-400 hover:text-red-400 underline font-semibold"
                  >
                    Clear File
                  </button>
                </div>

                {/* Preview Table of First 3 Rows */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-[11px] whitespace-nowrap">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2">#</th>
                        {stagedCSV.type === 'students' ? (
                          <>
                            <th className="p-2">Admission No</th>
                            <th className="p-2">Student Name</th>
                            <th className="p-2">Class & Sec</th>
                            <th className="p-2">Father Name</th>
                          </>
                        ) : (
                          <>
                            <th className="p-2">EMP ID</th>
                            <th className="p-2">Staff Name</th>
                            <th className="p-2">APPT</th>
                            <th className="p-2">Type</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950">
                      {stagedCSV.rows.slice(0, 4).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60">
                          <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                          {stagedCSV.type === 'students' ? (
                            <>
                              <td className="p-2 font-mono font-bold text-amber-300">
                                {row.admissionno || row.admission_no || row.admno || '-'}
                              </td>
                              <td className="p-2 font-bold text-white">
                                {row.studentname || row.student_name || row.name || '-'}
                              </td>
                              <td className="p-2 text-slate-300">
                                Class {row.classname || row.class || '10'}-{row.sectionname || row.section || 'A'}
                              </td>
                              <td className="p-2 text-slate-400">
                                {row.fathername || row.father_name || '-'}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2 font-mono font-bold text-emerald-300">
                                {row.empid || row.emp_id || row.teacherid || '-'}
                              </td>
                              <td className="p-2 font-bold text-white">
                                {row.empname || row.emp_name || row.name || '-'}
                              </td>
                              <td className="p-2 text-slate-300">
                                {row.appt || row.designation || '-'}
                              </td>
                              <td className="p-2 text-slate-400">
                                {row.emptype || row.emp_type || 'Regular'}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setStagedCSV(null)}
                    className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmCSVSubmit}
                    className="py-2.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit & Import {stagedCSV.rows.length} Records to Database</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setStagedCSV(null);
                }}
                className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full ERP Student Profile Modal */}
      {viewERPStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-full uppercase">
                    Official Student ERP File
                  </span>
                  <span className="font-mono text-xs text-emerald-400">{viewERPStudent.admissionNo}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mt-1">{viewERPStudent.name}</h3>
                <p className="text-xs text-slate-400">Class {viewERPStudent.class}-{viewERPStudent.section} (Roll #{viewERPStudent.rollNo}) • {viewERPStudent.house} House</p>
              </div>
              <button 
                onClick={() => setViewERPStudent(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* ERP Sections Grid */}
            <div className="space-y-4 text-xs">
              
              {/* Section 1: Admission & School Metadata */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                  Admission & Academic Record
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Birth</span>
                    <span className="font-mono font-bold text-white">{viewERPStudent.dob}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Admission Category</span>
                    <span className="font-bold text-amber-300">{viewERPStudent.admissionCategory || 'Serving Army'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Admission</span>
                    <span className="font-mono font-semibold text-slate-200">{viewERPStudent.dateOfAdmission || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Joining</span>
                    <span className="font-mono font-semibold text-slate-200">{viewERPStudent.dateOfJoining || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Status</span>
                    <span className="font-bold text-emerald-400">{viewERPStudent.status || 'Active'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">House</span>
                    <span className="font-bold text-white">{viewERPStudent.house}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Blood Group</span>
                    <span className="font-bold text-red-400">{viewERPStudent.bloodGroup || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Route No</span>
                    <span className="font-mono font-semibold text-slate-200">{viewERPStudent.routeNo || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Father Details */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                  Father's Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Father Name</span>
                    <span className="font-bold text-white">{viewERPStudent.fatherName || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Father Mobile No</span>
                    <span className="font-mono font-semibold text-amber-300">{viewERPStudent.fatherMobileNo || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Father Occupation</span>
                    <span className="font-semibold text-slate-300">{viewERPStudent.fatherOccupation || 'N/A'}</span>
                  </div>
                  {viewERPStudent.fatherEmail && (
                    <div className="bg-slate-900 p-2.5 rounded-lg sm:col-span-3">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Father Email</span>
                      <span className="font-mono text-slate-300">{viewERPStudent.fatherEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Mother Details */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-blue-400 uppercase tracking-wider text-[11px]">
                  Mother's Information
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Mother Name</span>
                    <span className="font-bold text-white">{viewERPStudent.motherName || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Mother Mobile No</span>
                    <span className="font-mono font-semibold text-amber-300">{viewERPStudent.motherMobileNo || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Mother Occupation</span>
                    <span className="font-semibold text-slate-300">{viewERPStudent.motherOccupation || 'N/A'}</span>
                  </div>
                  {viewERPStudent.motherEmail && (
                    <div className="bg-slate-900 p-2.5 rounded-lg sm:col-span-3">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Mother Email</span>
                      <span className="font-mono text-slate-300">{viewERPStudent.motherEmail}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 4: Siblings & Residential Address */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">
                  Siblings & Residential Address
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Sibling 1</span>
                    <span className="font-semibold text-slate-300">{viewERPStudent.sibling1 || 'None'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Sibling 2</span>
                    <span className="font-semibold text-slate-300">{viewERPStudent.sibling2 || 'None'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg sm:col-span-2">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Residential Address</span>
                    <span className="font-semibold text-slate-200">{viewERPStudent.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setViewERPStudent(null)}
                className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full ERP Teacher / Staff Profile Modal */}
      {viewERPTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded-full uppercase">
                    Official Staff ERP File
                  </span>
                  <span className="font-mono text-xs text-amber-400">EMP ID: {viewERPTeacher.teacherId}</span>
                </div>
                <h3 className="text-2xl font-bold text-white mt-1">{viewERPTeacher.name}</h3>
                <p className="text-xs text-slate-400">{viewERPTeacher.appt || viewERPTeacher.designation} • {viewERPTeacher.empType || 'Regular Staff'}</p>
              </div>
              <button 
                onClick={() => setViewERPTeacher(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* ERP Staff Sections Grid */}
            <div className="space-y-4 text-xs">
              
              {/* Section 1: Employment & Appointment Meta */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                  Appointment & Service Dates
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">EMP ID</span>
                    <span className="font-mono font-bold text-emerald-300">{viewERPTeacher.teacherId}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Appointment (APPT)</span>
                    <span className="font-bold text-white">{viewERPTeacher.appt || viewERPTeacher.designation}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">EMP Type</span>
                    <span className="font-bold text-amber-300">{viewERPTeacher.empType || 'Regular'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Joining (DOJ)</span>
                    <span className="font-mono font-bold text-slate-200">{viewERPTeacher.doj || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Date of Confirmation (DOC)</span>
                    <span className="font-mono font-semibold text-slate-200">{viewERPTeacher.doc || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Login PIN / DOB</span>
                    <span className="font-mono font-semibold text-amber-400">{viewERPTeacher.pin}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg sm:col-span-2">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Department</span>
                    <span className="font-bold text-white">{viewERPTeacher.department}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Payroll & Banking Info */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                  Payroll & Bank Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Bank Account No</span>
                    <span className="font-mono font-bold text-white">{viewERPTeacher.bankAcct || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">IFSC Code</span>
                    <span className="font-mono font-bold text-emerald-300">{viewERPTeacher.ifscNo || 'N/A'}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-lg">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Pay Scale / Basic Pay</span>
                    <span className="font-semibold text-slate-200">{viewERPTeacher.pay || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Remarks */}
              {viewERPTeacher.remarks && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-purple-400 uppercase tracking-wider text-[11px]">
                    Service Remarks
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg text-slate-300 italic">
                    "{viewERPTeacher.remarks}"
                  </div>
                </div>
              )}

            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setViewERPTeacher(null)}
                className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

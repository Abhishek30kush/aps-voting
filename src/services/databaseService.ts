import type { Student, Teacher, Candidate, VoteRecord, CouncilType, SystemState, PositionType, HouseType } from '../types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, INITIAL_CANDIDATES, INITIAL_VOTE_RECORDS } from './mockData';
import { doc, setDoc, getDoc, getDocs, collection, deleteDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const MONTH_MAP: Record<string, string> = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12'
};

const NUM_TO_MONTH_SHORT: Record<string, string> = {
  '01': 'jan', '02': 'feb', '03': 'mar', '04': 'apr', '05': 'may', '06': 'jun',
  '07': 'jul', '08': 'aug', '09': 'sep', '10': 'oct', '11': 'nov', '12': 'dec'
};

function normalizeDateVariants(str: string): string[] {
  if (!str) return [];
  const raw = str.trim().toLowerCase();
  const clean = raw.replace(/[^0-9a-z]/g, '');
  const variants: string[] = [raw, clean];

  const parts = raw.split(/[-/._\s]+/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts;
    const pad = (s: string, len: number) => s.padStart(len, '0');

    let monthNum = '';
    let dayNum = '';
    let yearNum = '';

    if (MONTH_MAP[p2]) {
      monthNum = MONTH_MAP[p2];
      dayNum = pad(p1, 2);
      yearNum = p3.length === 2 ? '20' + p3 : p3;
    } else if (MONTH_MAP[p1]) {
      monthNum = MONTH_MAP[p1];
      dayNum = pad(p2, 2);
      yearNum = p3.length === 2 ? '20' + p3 : p3;
    } else if (MONTH_MAP[p3]) {
      monthNum = MONTH_MAP[p3];
      dayNum = pad(p2, 2);
      yearNum = p1.length === 2 ? '20' + p1 : p1;
    } else {
      if (p1.length === 4) {
        yearNum = p1;
        monthNum = pad(p2, 2);
        dayNum = pad(p3, 2);
      } else if (p3.length === 4 || p3.length === 2) {
        yearNum = p3.length === 2 ? '20' + p3 : p3;
        const v1 = pad(p1, 2);
        const v2 = pad(p2, 2);

        [[v1, v2], [v2, v1]].forEach(([d, m]) => {
          variants.push(`${yearNum}-${m}-${d}`);
          variants.push(`${d}-${m}-${yearNum}`);
          variants.push(`${d}/${m}/${yearNum}`);
          variants.push(`${m}/${d}/${yearNum}`);
          variants.push(`${d}${m}${yearNum}`);
          variants.push(`${yearNum}${m}${d}`);

          const monthShort = NUM_TO_MONTH_SHORT[m];
          if (monthShort) {
            variants.push(`${d}-${monthShort}-${yearNum}`);
            variants.push(`${d}/${monthShort}/${yearNum}`);
            variants.push(`${d} ${monthShort} ${yearNum}`);
            variants.push(`${d}${monthShort}${yearNum}`);
          }
        });
      }
    }

    if (yearNum && monthNum && dayNum) {
      variants.push(`${yearNum}-${monthNum}-${dayNum}`);
      variants.push(`${dayNum}-${monthNum}-${yearNum}`);
      variants.push(`${monthNum}-${dayNum}-${yearNum}`);
      variants.push(`${dayNum}/${monthNum}/${yearNum}`);
      variants.push(`${monthNum}/${dayNum}/${yearNum}`);
      variants.push(`${yearNum}/${monthNum}/${dayNum}`);
      variants.push(`${dayNum}${monthNum}${yearNum}`);
      variants.push(`${yearNum}${monthNum}${dayNum}`);

      const monthShort = NUM_TO_MONTH_SHORT[monthNum];
      if (monthShort) {
        variants.push(`${dayNum}-${monthShort}-${yearNum}`);
        variants.push(`${dayNum}/${monthShort}/${yearNum}`);
        variants.push(`${dayNum} ${monthShort} ${yearNum}`);
        variants.push(`${dayNum}${monthShort}${yearNum}`);
      }
    }
  }

  return Array.from(new Set(variants.filter(Boolean)));
}

const STORAGE_KEYS = {
  STUDENTS: 'aps_voting_students_v1',
  TEACHERS: 'aps_voting_teachers_v1',
  CANDIDATES: 'aps_voting_candidates_v1',
  VOTES: 'aps_voting_records_v1',
  SYSTEM: 'aps_voting_system_v1'
};

type DBListener = () => void;

class DatabaseService {
  private students: Student[] = [];
  private teachers: Teacher[] = [];
  private candidates: Candidate[] = [];
  private votes: VoteRecord[] = [];
  private systemState: SystemState = { isVotingOpen: true, totalVotesCast: 0 };
  private listeners: Set<DBListener> = new Set();

  public subscribe(listener: DBListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(fn => {
      try {
        fn();
      } catch (e) {
        console.error("DatabaseService listener error:", e);
      }
    });
  }

  /** Resolves when initial Firebase data load is complete */
  public ready: Promise<void>;

  constructor() {
    this.initLocalData();
    this.setupRealtimeListeners();
    this.ready = this.loadFromFirebase()
      .catch(err => console.warn("Initial Firebase load background notice:", err));
  }

  private initLocalData() {
    try {
      const storedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      const storedTeachers = localStorage.getItem(STORAGE_KEYS.TEACHERS);
      const storedCandidates = localStorage.getItem(STORAGE_KEYS.CANDIDATES);
      const storedVotes = localStorage.getItem(STORAGE_KEYS.VOTES);
      const storedSystem = localStorage.getItem(STORAGE_KEYS.SYSTEM);

      this.students = storedStudents ? JSON.parse(storedStudents) : INITIAL_STUDENTS;
      this.teachers = storedTeachers ? JSON.parse(storedTeachers) : INITIAL_TEACHERS;
      this.candidates = storedCandidates ? JSON.parse(storedCandidates) : INITIAL_CANDIDATES;
      this.votes = storedVotes ? JSON.parse(storedVotes) : INITIAL_VOTE_RECORDS;
      this.systemState = storedSystem ? JSON.parse(storedSystem) : { isVotingOpen: true, totalVotesCast: this.votes.length };

      if (!storedStudents) this.saveStudents();
      if (!storedTeachers) this.saveTeachers();
      if (!storedCandidates) this.saveCandidates();
      if (!storedVotes) this.saveVotes();
    } catch (e) {
      console.error("Failed to load local storage:", e);
      this.students = INITIAL_STUDENTS;
      this.teachers = INITIAL_TEACHERS;
      this.candidates = INITIAL_CANDIDATES;
      this.votes = INITIAL_VOTE_RECORDS;
    }
  }

  private saveStudents() {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(this.students));
    this.notifyListeners();
  }
  private saveTeachers() {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(this.teachers));
    this.notifyListeners();
  }
  private saveCandidates() {
    localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(this.candidates));
    this.notifyListeners();
  }
  private saveVotes() {
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(this.votes));
    this.systemState.totalVotesCast = this.votes.length;
    localStorage.setItem(STORAGE_KEYS.SYSTEM, JSON.stringify(this.systemState));
    this.recalculateCandidateVoteCounts();
    localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(this.candidates));
    this.notifyListeners();
  }

  /** Dynamically recalculates candidate vote tallies from the current votes log array */
  public recalculateCandidateVoteCounts(): void {
    const countsMap = new Map<string, number>();
    (this.votes || []).forEach(v => {
      if (v.selections) {
        Object.values(v.selections).forEach(candId => {
          if (candId) {
            countsMap.set(candId, (countsMap.get(candId) || 0) + 1);
          }
        });
      }
    });

    this.candidates.forEach(c => {
      c.votesCount = countsMap.get(c.id) || 0;
    });
  }

  // --- STUDENT AUTHENTICATION & LOOKUP ---
  public verifyStudent(admissionNo: string, dob?: string): { student?: Student; error?: string } {
    const rawInput = admissionNo.trim();
    if (!rawInput) {
      return { error: 'Please enter a valid Admission Number.' };
    }

    if (this.students.length === 0) {
      return { error: 'Student database is currently empty in Firebase. Please log in to Admin Dashboard and upload the Students CSV list.' };
    }

    const cleanInput = rawInput.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Match exact string OR normalized alphanumeric string
    const student = this.students.find(s => {
      const sAdm = (s.admissionNo || '').trim().toUpperCase();
      const sAdmClean = sAdm.replace(/[^A-Z0-9]/g, '');
      return sAdm === rawInput.toUpperCase() || sAdmClean === cleanInput;
    });

    if (!student) {
      return { error: `Admission Number "${rawInput}" not found in Army Public School database. Please make sure this student is uploaded via Admin CSV Import.` };
    }

    // DOB verification (second factor with flexible date format matching)
    if (dob && student.dob) {
      const inputVariants = normalizeDateVariants(dob);
      const storedVariants = normalizeDateVariants(student.dob);
      const isMatch = inputVariants.some(iv => storedVariants.includes(iv));
      if (!isMatch) {
        return { error: 'Date of Birth does not match our records. Please verify and try again.' };
      }
    }

    if (student.hasVoted) {
      return {
        student,
        error: `Voting already completed! Student ${student.name} (${student.admissionNo}) has already cast their ballot.`
      };
    }

    return { student };
  }

  // --- TEACHER AUTHENTICATION & LOOKUP ---
  public verifyTeacher(teacherId: string, pin?: string): { teacher?: Teacher; error?: string } {
    const rawInput = teacherId.trim();
    if (!rawInput) {
      return { error: 'Please enter a valid Employee ID.' };
    }

    if (this.teachers.length === 0) {
      return { error: 'Teacher database is currently empty in Firebase. Please log in to Admin Dashboard and upload the Teachers CSV list.' };
    }

    const cleanInput = rawInput.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Match exact string OR normalized alphanumeric string
    const teacher = this.teachers.find(t => {
      const tId = (t.teacherId || '').trim().toUpperCase();
      const tIdClean = tId.replace(/[^A-Z0-9]/g, '');
      return tId === rawInput.toUpperCase() || tIdClean === cleanInput;
    });

    if (!teacher) {
      return { error: `Teacher / Employee ID "${rawInput}" not found in APS Staff database. Please check your entry.` };
    }

    // PIN verification (second factor with flexible date format matching)
    if (pin && teacher.pin) {
      const inputVariants = normalizeDateVariants(pin);
      const storedVariants = normalizeDateVariants(teacher.pin);
      const isMatch = inputVariants.some(iv => storedVariants.includes(iv));
      if (!isMatch) {
        return { error: 'Security PIN does not match our records. Please verify and try again.' };
      }
    }

    if (teacher.hasVoted) {
      return {
        teacher,
        error: `Voting already completed! Teacher ${teacher.name} (${teacher.teacherId}) has already cast their ballot.`
      };
    }

    return { teacher };
  }

  // --- GET CANDIDATES BY COUNCIL ---
  public getCandidatesByCouncil(council: CouncilType): Candidate[] {
    this.recalculateCandidateVoteCounts();
    return this.candidates.filter(c => c.council === council);
  }

  public getAllCandidates(): Candidate[] {
    this.recalculateCandidateVoteCounts();
    return this.candidates;
  }

  // --- SUBMIT VOTE ---
  public async submitVote(
    voterType: 'student' | 'teacher',
    voterId: string,
    voterName: string,
    council: CouncilType,
    selections: Record<PositionType, string>,
    voterClass?: number
  ): Promise<{ success: boolean; error?: string }> {
    console.log('[VoteSubmit] Starting vote submission:', { voterType, voterId, voterName, council, selections });

    if (!this.systemState.isVotingOpen) {
      console.warn('[VoteSubmit] Voting is CLOSED.');
      return { success: false, error: 'Voting process is currently CLOSED by Admin.' };
    }

    const timestamp = new Date().toISOString();
    const cleanVoterId = voterId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (voterType === 'student') {
      // Flexible matching — match admissionNo or id
      const idx = this.students.findIndex(s => {
        const sAdm = (s.admissionNo || '').trim().toUpperCase();
        const sAdmClean = sAdm.replace(/[^A-Z0-9]/g, '');
        const sId = (s.id || '').trim().toUpperCase();
        return s.id === voterId || sAdm === voterId.trim().toUpperCase() || sAdmClean === cleanVoterId || sId === cleanVoterId;
      });

      console.log('[VoteSubmit] Student lookup index:', idx, 'for voterId:', voterId);
      if (idx !== -1) {
        if (this.students[idx].hasVoted) {
          return { success: false, error: 'You have already voted! Multiple voting is strictly prohibited.' };
        }
        this.students[idx].hasVoted = true;
        this.students[idx].votedAt = timestamp;
        this.students[idx].votedCouncil = council;
        this.saveStudents();
        // Fire-and-forget — don't block vote submission UI on Firebase sync
        this.syncSingleStudentToFirebase(this.students[idx]).catch(e => console.error('Firebase student vote sync error:', e));
      } else {
        console.warn('[VoteSubmit] Student not in local DB list, creating record for voterId:', voterId);
        const fallbackStudent: Student = {
          id: 'st-' + Date.now(),
          admissionNo: voterId,
          dob: '2010-01-01',
          name: voterName,
          class: voterClass || (council === 'junior' ? 5 : 10),
          section: 'A',
          rollNo: 1,
          house: 'Cariappa',
          gender: 'M',
          hasVoted: true,
          votedAt: timestamp,
          votedCouncil: council
        };
        this.students.push(fallbackStudent);
        this.saveStudents();
        this.syncSingleStudentToFirebase(fallbackStudent).catch(e => console.error('Firebase fallback student sync error:', e));
      }
    } else {
      const idx = this.teachers.findIndex(t => {
        const tId = (t.teacherId || '').trim().toUpperCase();
        const tIdClean = tId.replace(/[^A-Z0-9]/g, '');
        const teacherUniqueId = (t.id || '').trim().toUpperCase();
        return t.id === voterId || tId === voterId.trim().toUpperCase() || tIdClean === cleanVoterId || teacherUniqueId === cleanVoterId;
      });

      console.log('[VoteSubmit] Teacher lookup index:', idx, 'for voterId:', voterId);
      if (idx !== -1) {
        if (this.teachers[idx].hasVoted) {
          return { success: false, error: 'Teacher ID has already voted! Multiple voting is strictly prohibited.' };
        }
        this.teachers[idx].hasVoted = true;
        this.teachers[idx].votedAt = timestamp;
        this.saveTeachers();
        // Fire-and-forget — don't block vote submission UI on Firebase sync
        this.syncSingleTeacherToFirebase(this.teachers[idx]).catch(e => console.error('Firebase teacher vote sync error:', e));
      } else {
        console.warn('[VoteSubmit] Teacher not in local DB list, creating record for voterId:', voterId);
        const fallbackTeacher: Teacher = {
          id: 't-' + Date.now(),
          teacherId: voterId,
          name: voterName,
          pin: '',
          department: 'Staff',
          designation: 'Teacher',
          hasVoted: true,
          votedAt: timestamp
        };
        this.teachers.push(fallbackTeacher);
        this.saveTeachers();
        this.syncSingleTeacherToFirebase(fallbackTeacher).catch(e => console.error('Firebase fallback teacher sync error:', e));
      }
    }

    // Increment vote count for selected candidates
    Object.entries(selections).forEach(([, candidateId]) => {
      if (candidateId) {
        const cIdx = this.candidates.findIndex(c => c.id === candidateId);
        if (cIdx !== -1) {
          this.candidates[cIdx].votesCount = (this.candidates[cIdx].votesCount || 0) + 1;
        }
      }
    });
    this.saveCandidates();

    // Create Vote Record
    const voteRecord: VoteRecord = {
      id: 'v-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      voterType,
      voterId,
      voterName,
      voterClass,
      council,
      timestamp,
      selections
    };

    this.votes.unshift(voteRecord);
    this.systemState.lastVoteTime = timestamp;
    this.saveVotes();
    console.log('[VoteSubmit] Vote saved to local storage successfully.');

    // Sync vote & candidate vote tallies to Firebase asynchronously
    this.syncVoteToFirebase(voteRecord).catch(e => console.error('Firebase vote record sync error:', e));
    this.syncCandidatesToFirebase().catch(e => console.error('Firebase candidates sync error:', e));

    console.log('[VoteSubmit] Vote submitted successfully!');
    return { success: true };
  }

  // --- ADMIN ANALYTICS & DASHBOARD METRICS ---
  public getAdminMetrics() {
    this.recalculateCandidateVoteCounts();

    const totalStudents = this.students.length;
    const totalTeachers = this.teachers.length;
    const totalEligibleVoters = totalStudents + totalTeachers;

    const studentVotes = this.students.filter(s => s.hasVoted).length;
    const teacherVotes = this.teachers.filter(t => t.hasVoted).length;
    const totalVotes = this.votes.length;
    const pendingVotes = Math.max(0, totalEligibleVoters - (studentVotes + teacherVotes));

    const votingPercentage = totalEligibleVoters > 0
      ? Math.round(((studentVotes + teacherVotes) / totalEligibleVoters) * 100)
      : 0;

    const juniorStudents = this.students.filter(s => s.class && Number(s.class) <= 5);
    const juniorVotesFromRecords = this.votes.filter(v => v.council === 'junior').length;
    const juniorStudentVotedCount = juniorStudents.filter(s => s.hasVoted).length;
    const juniorVoted = Math.max(juniorStudentVotedCount, juniorVotesFromRecords);

    const juniorPercentage = juniorStudents.length > 0
      ? Math.round((juniorStudentVotedCount / juniorStudents.length) * 100)
      : (juniorVotesFromRecords > 0 ? 100 : 0);

    const seniorStudents = this.students.filter(s => !s.class || Number(s.class) >= 6);
    const seniorVotesFromRecords = this.votes.filter(v => v.council === 'senior').length;
    const seniorStudentVotedCount = seniorStudents.filter(s => s.hasVoted).length;
    const seniorVoted = Math.max(seniorStudentVotedCount, seniorVotesFromRecords);

    const seniorPercentage = seniorStudents.length > 0
      ? Math.round((seniorStudentVotedCount / seniorStudents.length) * 100)
      : (seniorVotesFromRecords > 0 ? 100 : 0);

    const lastVote = this.votes.length > 0 ? this.votes[0] : null;

    return {
      totalStudents,
      totalTeachers,
      totalEligibleVoters,
      totalVotes,
      pendingVotes,
      votingPercentage,
      juniorPercentage,
      seniorPercentage,
      juniorVoted,
      juniorTotal: juniorStudents.length,
      juniorVotesFromRecords,
      seniorVoted,
      seniorTotal: seniorStudents.length,
      seniorVotesFromRecords,
      lastVoteTime: lastVote ? lastVote.timestamp : undefined,
      recentVotes: this.votes.slice(0, 10),
      isVotingOpen: this.systemState.isVotingOpen
    };
  }

  public getStudents(): Student[] {
    return this.students;
  }

  public getTeachers(): Teacher[] {
    return this.teachers;
  }

  public getVoteRecords(): VoteRecord[] {
    return this.votes;
  }

  // --- CANDIDATE MANAGEMENT ---
  public addCandidate(candidate: Omit<Candidate, 'id' | 'votesCount'>): Candidate {
    const newCand: Candidate = {
      ...candidate,
      id: 'cand-' + Date.now(),
      votesCount: 0
    };
    this.candidates.push(newCand);
    this.saveCandidates();
    this.syncSingleCandidateToFirebase(newCand);
    return newCand;
  }

  public deleteCandidate(id: string) {
    this.candidates = this.candidates.filter(c => c.id !== id);
    this.saveCandidates();
    if (db) {
      deleteDoc(doc(db, 'candidates', id)).catch(e => console.error("Firebase delete candidate error:", e));
    }
  }

  public clearAllCandidates() {
    this.candidates = [];
    this.saveCandidates();
    if (db) {
      getDocs(collection(db, 'candidates')).then(snap => {
        const batch = writeBatch(db!);
        snap.forEach(docSnap => batch.delete(docSnap.ref));
        return batch.commit();
      }).catch(e => console.error("Firebase clear candidates error:", e));
    }
  }

  // --- FIREBASE FIRESTORE SYNC HELPERS ---
  public async syncStudentsToFirebase(studentList?: Student[]): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      return { success: false, error: 'Firebase Firestore DB object is not initialized.' };
    }
    try {
      const list = studentList || this.students;
      if (!list || list.length === 0) return { success: true };

      const BATCH_SIZE = 500;
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = list.slice(i, i + BATCH_SIZE);
        chunk.forEach(student => {
          const ref = doc(db!, 'students', student.id);
          const cleanPayload = JSON.parse(JSON.stringify(student));
          batch.set(ref, cleanPayload, { merge: true });
        });
        await batch.commit();
      }
      console.log(`Successfully synced ${list.length} students to Firebase Firestore.`);
      return { success: true };
    } catch (e: any) {
      console.error("Firebase Firestore Students Sync Error:", e);
      return { success: false, error: e?.message || e?.code || String(e) };
    }
  }

  public async syncTeachersToFirebase(teacherList?: Teacher[]): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      return { success: false, error: 'Firebase Firestore DB object is not initialized.' };
    }
    try {
      const list = teacherList || this.teachers;
      if (!list || list.length === 0) return { success: true };

      const BATCH_SIZE = 500;
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = list.slice(i, i + BATCH_SIZE);
        chunk.forEach(teacher => {
          const ref = doc(db!, 'teachers', teacher.id);
          const cleanPayload = JSON.parse(JSON.stringify(teacher));
          batch.set(ref, cleanPayload, { merge: true });
        });
        await batch.commit();
      }
      console.log(`Successfully synced ${list.length} teachers to Firebase Firestore.`);
      return { success: true };
    } catch (e: any) {
      console.error("Firebase Firestore Teachers Sync Error:", e);
      return { success: false, error: e?.message || e?.code || String(e) };
    }
  }

  public async syncSingleStudentToFirebase(student: Student): Promise<{ success: boolean; error?: string }> {
    if (!db) return { success: false, error: 'Firebase DB not initialized' };
    try {
      const ref = doc(db, 'students', student.id);
      const cleanPayload = JSON.parse(JSON.stringify(student));
      await setDoc(ref, cleanPayload, { merge: true });
      return { success: true };
    } catch (e: any) {
      console.error("Firebase sync single student error:", e);
      return { success: false, error: e?.message || String(e) };
    }
  }

  public async syncSingleTeacherToFirebase(teacher: Teacher): Promise<{ success: boolean; error?: string }> {
    if (!db) return { success: false, error: 'Firebase DB not initialized' };
    try {
      const ref = doc(db, 'teachers', teacher.id);
      const cleanPayload = JSON.parse(JSON.stringify(teacher));
      await setDoc(ref, cleanPayload, { merge: true });
      return { success: true };
    } catch (e: any) {
      console.error("Firebase sync single teacher error:", e);
      return { success: false, error: e?.message || String(e) };
    }
  }

  public async syncSingleCandidateToFirebase(candidate: Candidate): Promise<{ success: boolean; error?: string }> {
    if (!db) return { success: false, error: 'Firebase DB not initialized' };
    try {
      const ref = doc(db, 'candidates', candidate.id);
      const cleanPayload = JSON.parse(JSON.stringify(candidate));
      await setDoc(ref, cleanPayload, { merge: true });
      return { success: true };
    } catch (e: any) {
      console.error("Firebase sync single candidate error:", e);
      return { success: false, error: e?.message || String(e) };
    }
  }

  public async syncAllDataToFirebase(): Promise<{ success: boolean; error?: string; studentsSynced: boolean; teachersSynced: boolean }> {
    const studentRes = await this.syncStudentsToFirebase();
    if (!studentRes.success) {
      return { success: false, error: `Student sync failed: ${studentRes.error}`, studentsSynced: false, teachersSynced: false };
    }
    const teacherRes = await this.syncTeachersToFirebase();
    if (!teacherRes.success) {
      return { success: false, error: `Teacher sync failed: ${teacherRes.error}`, studentsSynced: true, teachersSynced: false };
    }
    return { success: true, studentsSynced: true, teachersSynced: true };
  }

  public async loadFromFirebase(): Promise<void> {
    if (!db) return;
    try {
      // Students — Firebase source of truth, fallback to local dataset if Firebase empty
      const studentsSnap = await getDocs(collection(db, 'students'));
      const fbStudents: Student[] = [];
      studentsSnap.forEach(docSnap => {
        fbStudents.push(docSnap.data() as Student);
      });
      if (fbStudents.length > 0) {
        this.students = fbStudents;
        this.saveStudents();
      } else if (this.students.length > 0) {
        // Firebase has no students yet, auto-sync local students to Firebase
        this.syncStudentsToFirebase().catch(e => console.warn("Auto-sync initial students error:", e));
      }

      // Teachers — Firebase source of truth, fallback to local dataset if Firebase empty
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      const fbTeachers: Teacher[] = [];
      teachersSnap.forEach(docSnap => {
        fbTeachers.push(docSnap.data() as Teacher);
      });
      if (fbTeachers.length > 0) {
        this.teachers = fbTeachers;
        this.saveTeachers();
      } else if (this.teachers.length > 0) {
        // Firebase has no teachers yet, auto-sync local teachers to Firebase
        this.syncTeachersToFirebase().catch(e => console.warn("Auto-sync initial teachers error:", e));
      }

      // Candidates — Firebase source of truth
      const candidatesSnap = await getDocs(collection(db, 'candidates'));
      const fbCandidates: Candidate[] = [];
      candidatesSnap.forEach(docSnap => {
        fbCandidates.push(docSnap.data() as Candidate);
      });
      this.candidates = fbCandidates;
      this.saveCandidates();

      // Votes — Firebase source of truth
      const votesSnap = await getDocs(collection(db, 'votes'));
      const fbVotes: VoteRecord[] = [];
      votesSnap.forEach(docSnap => {
        fbVotes.push(docSnap.data() as VoteRecord);
      });
      fbVotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.votes = fbVotes;
      this.saveVotes();

      // System Config — Firebase source of truth
      const configSnap = await getDoc(doc(db, 'system', 'config'));
      if (configSnap.exists()) {
        this.systemState = configSnap.data() as SystemState;
        localStorage.setItem(STORAGE_KEYS.SYSTEM, JSON.stringify(this.systemState));
      }

      console.log(`Firebase sync complete: ${this.students.length} students, ${this.teachers.length} teachers, ${this.candidates.length} candidates, ${this.votes.length} votes loaded.`);
    } catch (e) {
      console.warn("Could not load initial data from Firebase Firestore:", e);
    }
  }

  private setupRealtimeListeners() {
    if (!db) return;

    try {
      // 1. Real-time Candidates listener
      onSnapshot(collection(db, 'candidates'), (snapshot) => {
        const fbCandidates: Candidate[] = [];
        snapshot.forEach(docSnap => {
          fbCandidates.push(docSnap.data() as Candidate);
        });
        this.candidates = fbCandidates;
        this.recalculateCandidateVoteCounts();
        this.saveCandidates();
        this.notifyListeners();
      }, err => console.warn("Firestore candidates snapshot error:", err));

      // 2. Real-time Votes listener
      onSnapshot(collection(db, 'votes'), (snapshot) => {
        const fbVotes: VoteRecord[] = [];
        snapshot.forEach(docSnap => {
          fbVotes.push(docSnap.data() as VoteRecord);
        });
        fbVotes.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.votes = fbVotes;
        this.recalculateCandidateVoteCounts();
        this.saveVotes();
        this.notifyListeners();
      }, err => console.warn("Firestore votes snapshot error:", err));

      // 3. Real-time Students listener
      onSnapshot(collection(db, 'students'), (snapshot) => {
        const fbStudents: Student[] = [];
        snapshot.forEach(docSnap => {
          fbStudents.push(docSnap.data() as Student);
        });
        this.students = fbStudents;
        this.saveStudents();
        this.notifyListeners();
      }, err => console.warn("Firestore students snapshot error:", err));

      // 4. Real-time Teachers listener
      onSnapshot(collection(db, 'teachers'), (snapshot) => {
        const fbTeachers: Teacher[] = [];
        snapshot.forEach(docSnap => {
          fbTeachers.push(docSnap.data() as Teacher);
        });
        this.teachers = fbTeachers;
        this.saveTeachers();
        this.notifyListeners();
      }, err => console.warn("Firestore teachers snapshot error:", err));

      // 5. Real-time System Config listener
      onSnapshot(doc(db, 'system', 'config'), (docSnap) => {
        if (docSnap.exists()) {
          this.systemState = docSnap.data() as SystemState;
          localStorage.setItem(STORAGE_KEYS.SYSTEM, JSON.stringify(this.systemState));
          this.notifyListeners();
        }
      }, err => console.warn("Firestore system config snapshot error:", err));
    } catch (e) {
      console.warn("Firestore realtime listeners setup error:", e);
    }
  }

  // --- STUDENT & TEACHER MANAGEMENT ---
  public addStudent(student: Omit<Student, 'id' | 'hasVoted'>): Student {
    const newStudent: Student = {
      ...student,
      id: 'st-' + Date.now(),
      hasVoted: false
    };
    this.students.push(newStudent);
    this.saveStudents();
    this.syncSingleStudentToFirebase(newStudent);
    return newStudent;
  }

  public addTeacher(teacher: Omit<Teacher, 'id' | 'hasVoted'>): Teacher {
    const newTeacher: Teacher = {
      ...teacher,
      id: 't-' + Date.now(),
      hasVoted: false
    };
    this.teachers.push(newTeacher);
    this.saveTeachers();
    this.syncSingleTeacherToFirebase(newTeacher);
    return newTeacher;
  }

  public deleteStudent(id: string) {
    this.students = this.students.filter(s => s.id !== id);
    this.saveStudents();
    if (db) {
      deleteDoc(doc(db, 'students', id)).catch(e => console.error("Firebase delete student error:", e));
    }
  }

  public deleteTeacher(id: string) {
    this.teachers = this.teachers.filter(t => t.id !== id);
    this.saveTeachers();
    if (db) {
      deleteDoc(doc(db, 'teachers', id)).catch(e => console.error("Firebase delete teacher error:", e));
    }
  }

  public clearAllStudents() {
    this.students = [];
    this.saveStudents();
    this.notifyListeners();
    if (db) {
      getDocs(collection(db, 'students')).then(snap => {
        if (!snap.empty) {
          const docsArr = snap.docs;
          const BATCH_SIZE = 450;
          for (let i = 0; i < docsArr.length; i += BATCH_SIZE) {
            const batch = writeBatch(db!);
            const chunk = docsArr.slice(i, i + BATCH_SIZE);
            chunk.forEach(docSnap => batch.delete(docSnap.ref));
            batch.commit().catch(e => console.error("Firebase clear students batch error:", e));
          }
        }
      }).catch(e => console.error("Firebase clear students error:", e));
    }
  }

  public clearAllTeachers() {
    this.teachers = [];
    this.saveTeachers();
    this.notifyListeners();
    if (db) {
      getDocs(collection(db, 'teachers')).then(snap => {
        if (!snap.empty) {
          const docsArr = snap.docs;
          const BATCH_SIZE = 450;
          for (let i = 0; i < docsArr.length; i += BATCH_SIZE) {
            const batch = writeBatch(db!);
            const chunk = docsArr.slice(i, i + BATCH_SIZE);
            chunk.forEach(docSnap => batch.delete(docSnap.ref));
            batch.commit().catch(e => console.error("Firebase clear teachers batch error:", e));
          }
        }
      }).catch(e => console.error("Firebase clear teachers error:", e));
    }
  }

  // --- BULK IMPORT STUDENTS ---
  public async bulkImportStudents(rawRows: Record<string, string>[]): Promise<{ added: number; updated: number; syncedToFirebase: boolean; firebaseError?: string }> {
    let added = 0;
    let updated = 0;
    const affectedStudents: Student[] = [];

    const validHouses: HouseType[] = ['Cariappa', 'Manekshaw', 'Thimayya', 'Vaidya'];

    const parseClassNumber = (rawClass: any): number => {
      if (rawClass === undefined || rawClass === null || rawClass === '') return 10;
      const str = String(rawClass).trim().toUpperCase();
      const romanMap: Record<string, number> = {
        'I': 1, '1ST': 1, '1': 1, 'CLASS 1': 1, 'CLASS-1': 1, 'CLASS I': 1,
        'II': 2, '2ND': 2, '2': 2, 'CLASS 2': 2, 'CLASS-2': 2, 'CLASS II': 2,
        'III': 3, '3RD': 3, '3': 3, 'CLASS 3': 3, 'CLASS-3': 3, 'CLASS III': 3,
        'IV': 4, '4TH': 4, '4': 4, 'CLASS 4': 4, 'CLASS-4': 4, 'CLASS IV': 4,
        'V': 5, '5TH': 5, '5': 5, 'CLASS 5': 5, 'CLASS-5': 5, 'CLASS V': 5,
        'VI': 6, '6TH': 6, '6': 6, 'CLASS 6': 6, 'CLASS-6': 6, 'CLASS VI': 6,
        'VII': 7, '7TH': 7, '7': 7, 'CLASS 7': 7, 'CLASS-7': 7, 'CLASS VII': 7,
        'VIII': 8, '8TH': 8, '8': 8, 'CLASS 8': 8, 'CLASS-8': 8, 'CLASS VIII': 8,
        'IX': 9, '9TH': 9, '9': 9, 'CLASS 9': 9, 'CLASS-9': 9, 'CLASS IX': 9,
        'X': 10, '10TH': 10, '10': 10, 'CLASS 10': 10, 'CLASS-10': 10, 'CLASS X': 10,
        'XI': 11, '11TH': 11, '11': 11, 'CLASS 11': 11, 'CLASS-11': 11, 'CLASS XI': 11,
        'XII': 12, '12TH': 12, '12': 12, 'CLASS 12': 12, 'CLASS-12': 12, 'CLASS XII': 12,
        'UKG': 1, 'LKG': 1, 'NURSERY': 1, 'PRIMARY': 1
      };
      if (romanMap[str] !== undefined) return romanMap[str];
      const numMatch = str.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (!isNaN(num)) return Math.min(12, Math.max(1, num));
      }
      return 10;
    };

    rawRows.forEach((row, idx) => {
      const admissionNo = (row.admissionno || row.admission_no || row.admno || row.id || row.admission_number || row.admissionnumber || '').trim().toUpperCase();
      const name = (row.name || row.studentname || row.student_name || row.full_name || '').trim();

      if (!admissionNo || !name) return; // Skip invalid row

      const rawHouse = (row.house || 'Cariappa').trim();
      const houseMatched = validHouses.find(h => h.toLowerCase() === rawHouse.toLowerCase()) || 'Cariappa';

      const rawGender = (row.gender || 'M').trim().toUpperCase();
      const gender: 'M' | 'F' = rawGender.startsWith('F') || rawGender === 'GIRL' || rawGender === 'FEMALE' ? 'F' : 'M';

      const rawClassVal = row.classname || row.class_name || row.class || row.std || row.grade || row.standard;
      const studentClass = parseClassNumber(rawClassVal);

      const parsedRoll = parseInt(row.rollno || row.roll || row.roll_no || '1', 10);
      const rollNo = isNaN(parsedRoll) ? 1 : parsedRoll;

      // Flexible DOB matching for CSV headers like "Date of Birth", "DOB", "D.O.B", "Date_of_Birth", "DOB(DD-MM-YYYY)", etc.
      const rawDobKey = Object.keys(row).find(k =>
        k.includes('dob') || k.includes('birth') || k.includes('dateof') || k.includes('bday')
      );
      const dobRaw = (rawDobKey ? row[rawDobKey] : '') || row.dateofbirth || row.date_of_birth || row.dob || row.birthdate || '';
      const dob = dobRaw.trim();
      const section = (row.sectionname || row.section_name || row.section || row.sec || 'A').trim().toUpperCase();

      // Extended Official ERP fields from image format
      const admissionCategory = (row.admissioncategory || row.admission_category || row.category || 'Serving Army').trim();
      const fatherName = (row.fathername || row.father_name || row.father || '').trim();
      const fatherMobileNo = (row.fathermobileno || row.father_mobile_no || row.fathermobile || row.father_mobile || '').trim();
      const fatherEmail = (row.fatheremail || row.father_email || '').trim();
      const fatherOccupation = (row.fatheroccupation || row.father_occupation || '').trim();

      const motherName = (row.mothername || row.mother_name || row.mother || '').trim();
      const motherMobileNo = (row.mothermobileno || row.mother_mobile_no || row.mothermobile || row.mother_mobile || '').trim();
      const motherEmail = (row.motheremail || row.mother_email || '').trim();
      const motherOccupation = (row.motheroccupation || row.mother_occupation || '').trim();

      const sibling1 = (row.sibling1 || row.sibling_1 || '').trim();
      const sibling2 = (row.sibling2 || row.sibling_2 || '').trim();
      const routeNo = (row.routeno || row.route_no || row.route || '').trim();
      const bloodGroup = (row.bloodgroup || row.blood_group || row.blood || '').trim();
      const dateOfAdmission = (row.dateofadmission || row.date_of_admission || '').trim();
      const dateOfLeaving = (row.dateofleaving || row.date_of_leaving || row.dateofjoining || row.date_of_joining || '').trim();
      const status = (row.status || 'Active').trim();
      const address = (row.address || '').trim();

      const existingIndex = this.students.findIndex(s => s.admissionNo.toUpperCase() === admissionNo);

      const studentPayload: Student = {
        id: existingIndex !== -1 ? this.students[existingIndex].id : 'st-' + Date.now() + '-' + idx,
        admissionNo,
        name,
        dob,
        class: studentClass,
        section,
        rollNo,
        house: houseMatched,
        gender,
        hasVoted: existingIndex !== -1 ? this.students[existingIndex].hasVoted : false,
        votedAt: existingIndex !== -1 ? this.students[existingIndex].votedAt : undefined,
        votedCouncil: existingIndex !== -1 ? this.students[existingIndex].votedCouncil : undefined,

        // ERP details
        admissionCategory,
        fatherName,
        fatherMobileNo,
        fatherEmail,
        fatherOccupation,
        motherName,
        motherMobileNo,
        motherEmail,
        motherOccupation,
        sibling1,
        sibling2,
        routeNo,
        bloodGroup,
        dateOfAdmission,
        dateOfLeaving,
        dateOfJoining: dateOfLeaving,
        status,
        address
      };

      if (existingIndex !== -1) {
        this.students[existingIndex] = studentPayload;
        updated++;
      } else {
        this.students.push(studentPayload);
        added++;
      }
      affectedStudents.push(studentPayload);
    });

    this.saveStudents();
    const syncRes = await this.syncStudentsToFirebase(affectedStudents);
    return { added, updated, syncedToFirebase: syncRes.success, firebaseError: syncRes.error };
  }

  // --- BULK IMPORT TEACHERS ---
  public async bulkImportTeachers(rawRows: Record<string, string>[]): Promise<{ added: number; updated: number; syncedToFirebase: boolean; firebaseError?: string }> {
    let added = 0;
    let updated = 0;
    const affectedTeachers: Teacher[] = [];

    rawRows.forEach((row, idx) => {
      const teacherId = (row.empid || row.emp_id || row.teacherid || row.teacher_id || row.id || row.code || row.sno || row.srno || '').trim().toUpperCase();
      const name = (row.empnam || row.empname || row.emp_nam || row.emp_name || row.name || row.teachername || row.teacher_name || row.full_name || row.employeename || '').trim();

      if (!teacherId || !name) return; // Skip invalid row

      const sNo = (row.sno || row.s_no || row.srno || row.slno || '').trim();
      const doj = (row.doj || row.dateofjoining || row.date_of_joining || '').trim();
      const doc = (row.doc || row.dateofconfirmation || row.date_of_confirmation || '').trim();
      const appt = (row.appt || row.appointment || row.designation || row.post || 'Teacher').trim();
      const empType = (row.emptype || row.emp_type || row.employeetype || row.type || 'Regular').trim();
      const bankAcct = (row.bankacc || row.bankacct || row.bank_acc || row.bank_acct || row.bankaccount || row.bankaccountno || '').trim();
      const ifscNo = (row.ifscno || row.ifsc_no || row.ifsc || '').trim();
      const pay = (row.pay || row.payscale || row.basicpay || '').trim();
      const remarks = (row.remarks || row.remark || '').trim();
      const pin = (row.pin || row.pindob || row.dob || row.password || doj || teacherId || '1980-01-01').trim();

      const department = (row.department || row.dept || empType || 'General Staff').trim();
      const designation = appt || 'Teacher';

      const existingIndex = this.teachers.findIndex(t => t.teacherId.toUpperCase() === teacherId);

      const teacherPayload: Teacher = {
        id: existingIndex !== -1 ? this.teachers[existingIndex].id : 't-' + Date.now() + '-' + idx,
        teacherId,
        name,
        pin,
        department,
        designation,
        hasVoted: existingIndex !== -1 ? this.teachers[existingIndex].hasVoted : false,
        votedAt: existingIndex !== -1 ? this.teachers[existingIndex].votedAt : undefined,

        // Teacher ERP Details
        sNo,
        doj,
        doc,
        appt,
        empType,
        bankAcct,
        ifscNo,
        pay,
        remarks
      };

      if (existingIndex !== -1) {
        this.teachers[existingIndex] = teacherPayload;
        updated++;
      } else {
        this.teachers.push(teacherPayload);
        added++;
      }
      affectedTeachers.push(teacherPayload);
    });

    this.saveTeachers();
    const syncRes = await this.syncTeachersToFirebase(affectedTeachers);
    return { added, updated, syncedToFirebase: syncRes.success, firebaseError: syncRes.error };
  }


  // --- FIREBASE SYNC: VOTES & CANDIDATES ---
  public async syncVoteToFirebase(voteRecord: VoteRecord): Promise<{ success: boolean; error?: string }> {
    if (!db) return { success: false, error: 'Firebase DB not initialized' };
    try {
      const ref = doc(db, 'votes', voteRecord.id);
      const cleanPayload = JSON.parse(JSON.stringify(voteRecord));
      await setDoc(ref, cleanPayload);
      return { success: true };
    } catch (e: any) {
      console.error('Firebase vote sync error:', e);
      return { success: false, error: e?.message || String(e) };
    }
  }

  public async syncCandidatesToFirebase(): Promise<{ success: boolean; error?: string }> {
    if (!db) return { success: false, error: 'Firebase DB not initialized' };
    try {
      const BATCH_SIZE = 500;
      for (let i = 0; i < this.candidates.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = this.candidates.slice(i, i + BATCH_SIZE);
        chunk.forEach(candidate => {
          const ref = doc(db!, 'candidates', candidate.id);
          const cleanPayload = JSON.parse(JSON.stringify(candidate));
          batch.set(ref, cleanPayload, { merge: true });
        });
        await batch.commit();
      }
      return { success: true };
    } catch (e: any) {
      console.error('Firebase candidates sync error:', e);
      return { success: false, error: e?.message || String(e) };
    }
  }

  // --- SYSTEM CONTROLS ---
  public toggleVotingStatus(isOpen?: boolean) {
    this.systemState.isVotingOpen = isOpen !== undefined ? isOpen : !this.systemState.isVotingOpen;
    localStorage.setItem(STORAGE_KEYS.SYSTEM, JSON.stringify(this.systemState));
    this.notifyListeners();
    if (db) {
      setDoc(doc(db, 'system', 'config'), JSON.parse(JSON.stringify(this.systemState)), { merge: true })
        .catch(e => console.error("Firebase sync system config error:", e));
    }
  }

  public async resetAllVotes(): Promise<{ success: boolean; error?: string }> {
    console.log('[ResetAllVotes] Resetting all votes locally and on Firebase...');
    this.votes = [];
    this.students = this.students.map(s => ({
      ...s,
      hasVoted: false,
      votedAt: '',
      votedCouncil: undefined
    }));
    this.teachers = this.teachers.map(t => ({
      ...t,
      hasVoted: false,
      votedAt: ''
    }));
    this.recalculateCandidateVoteCounts();

    this.systemState.totalVotesCast = 0;
    this.systemState.lastVoteTime = undefined;

    this.saveStudents();
    this.saveTeachers();
    this.saveCandidates();
    this.saveVotes();

    if (db) {
      try {
        // 1. Delete all docs in Firestore 'votes' collection synchronously
        const votesSnap = await getDocs(collection(db, 'votes'));
        console.log(`[ResetAllVotes] Deleting ${votesSnap.size} vote documents from Firestore...`);
        if (!votesSnap.empty) {
          const docsArr = votesSnap.docs;
          const BATCH_SIZE = 450;
          for (let i = 0; i < docsArr.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = docsArr.slice(i, i + BATCH_SIZE);
            chunk.forEach(docSnap => batch.delete(docSnap.ref));
            await batch.commit();
          }
        }
        console.log('[ResetAllVotes] Firestore vote documents deleted successfully.');

        // 2. Sync reset students, teachers, candidates, and system config to Firestore
        await this.syncStudentsToFirebase();
        await this.syncTeachersToFirebase();
        await this.syncCandidatesToFirebase();
        await setDoc(doc(db, 'system', 'config'), JSON.parse(JSON.stringify(this.systemState)), { merge: true });

        console.log('[ResetAllVotes] Firebase full reset completed successfully.');
      } catch (e: any) {
        console.error('[ResetAllVotes] Firebase reset error:', e);
      }
    }
    return { success: true };
  }

  public async restartFreshElection(): Promise<{ success: boolean; error?: string }> {
    await this.resetAllVotes();
    this.systemState.isVotingOpen = true;
    this.systemState.totalVotesCast = 0;
    this.systemState.lastVoteTime = undefined;
    localStorage.setItem(STORAGE_KEYS.SYSTEM, JSON.stringify(this.systemState));
    if (db) {
      await setDoc(doc(db, 'system', 'config'), JSON.parse(JSON.stringify(this.systemState)), { merge: true })
        .catch(e => console.error("Firebase restart config error:", e));
    }
    return { success: true };
  }

  public async restoreDefaultDataset(): Promise<{ success: boolean }> {
    this.students = INITIAL_STUDENTS;
    this.teachers = INITIAL_TEACHERS;
    this.candidates = INITIAL_CANDIDATES;
    this.votes = INITIAL_VOTE_RECORDS;
    this.systemState = { isVotingOpen: true, totalVotesCast: INITIAL_VOTE_RECORDS.length };

    this.saveStudents();
    this.saveTeachers();
    this.saveCandidates();
    this.saveVotes();

    if (db) {
      try {
        const votesSnap = await getDocs(collection(db, 'votes'));
        if (!votesSnap.empty) {
          const batch = writeBatch(db);
          votesSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));
          await batch.commit();
        }
      } catch (e) {
        console.error("Firebase clear votes error in restore default:", e);
      }

      await this.syncStudentsToFirebase().catch(e => console.error("Sync students default error:", e));
      await this.syncTeachersToFirebase().catch(e => console.error("Sync teachers default error:", e));
      await this.syncCandidatesToFirebase().catch(e => console.error("Sync candidates default error:", e));

      for (const vote of INITIAL_VOTE_RECORDS) {
        await this.syncVoteToFirebase(vote);
      }
    }
    return { success: true };
  }
}

export const dbService = new DatabaseService();


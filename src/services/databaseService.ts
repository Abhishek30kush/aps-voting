import type { Student, Teacher, Candidate, VoteRecord, CouncilType, SystemState, PositionType, HouseType } from '../types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, INITIAL_CANDIDATES, INITIAL_VOTE_RECORDS } from './mockData';
import { doc, setDoc, getDocs, collection, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

const STORAGE_KEYS = {
  STUDENTS: 'aps_voting_students_v1',
  TEACHERS: 'aps_voting_teachers_v1',
  CANDIDATES: 'aps_voting_candidates_v1',
  VOTES: 'aps_voting_records_v1',
  SYSTEM: 'aps_voting_system_v1'
};

class DatabaseService {
  private students: Student[] = [];
  private teachers: Teacher[] = [];
  private candidates: Candidate[] = [];
  private votes: VoteRecord[] = [];
  private systemState: SystemState = { isVotingOpen: true, totalVotesCast: 0 };

  constructor() {
    this.initLocalData();
    this.loadFromFirebase().catch(err => console.warn("Initial Firebase load background notice:", err));
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
  }
  private saveTeachers() {
    localStorage.setItem(STORAGE_KEYS.TEACHERS, JSON.stringify(this.teachers));
  }
  private saveCandidates() {
    localStorage.setItem(STORAGE_KEYS.CANDIDATES, JSON.stringify(this.candidates));
  }
  private saveVotes() {
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(this.votes));
    this.systemState.totalVotesCast = this.votes.length;
    localStorage.setItem(STORAGE_KEYS.SYSTEM, JSON.stringify(this.systemState));
  }

  // --- STUDENT AUTHENTICATION & LOOKUP ---
  public verifyStudent(admissionNo: string): { student?: Student; error?: string } {
    const rawInput = admissionNo.trim();
    if (!rawInput) {
      return { error: 'Please enter a valid Admission Number.' };
    }

    const cleanInput = rawInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Match exact string OR normalized alphanumeric string
    const student = this.students.find(s => {
      const sAdm = (s.admissionNo || '').trim().toUpperCase();
      const sAdmClean = sAdm.replace(/[^A-Z0-9]/g, '');
      return sAdm === rawInput.toUpperCase() || sAdmClean === cleanInput;
    });

    if (!student) {
      return { error: `Admission Number "${rawInput}" not found in Army Public School database. Please check your entry.` };
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
  public verifyTeacher(teacherId: string): { teacher?: Teacher; error?: string } {
    const rawInput = teacherId.trim();
    if (!rawInput) {
      return { error: 'Please enter a valid Employee ID.' };
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
    return this.candidates.filter(c => c.council === council);
  }

  public getAllCandidates(): Candidate[] {
    return this.candidates;
  }

  // --- SUBMIT VOTE ---
  public submitVote(
    voterType: 'student' | 'teacher',
    voterId: string,
    voterName: string,
    council: CouncilType,
    selections: Record<PositionType, string>,
    voterClass?: number
  ): { success: boolean; error?: string } {
    if (!this.systemState.isVotingOpen) {
      return { success: false, error: 'Voting process is currently CLOSED by Admin.' };
    }

    const timestamp = new Date().toISOString();

    if (voterType === 'student') {
      const idx = this.students.findIndex(s => s.admissionNo.toUpperCase() === voterId.toUpperCase());
      if (idx !== -1) {
        if (this.students[idx].hasVoted) {
          return { success: false, error: 'You have already voted!' };
        }
        this.students[idx].hasVoted = true;
        this.students[idx].votedAt = timestamp;
        this.students[idx].votedCouncil = council;
        this.saveStudents();
      }
    } else {
      const idx = this.teachers.findIndex(t => t.teacherId.toUpperCase() === voterId.toUpperCase());
      if (idx !== -1) {
        if (this.teachers[idx].hasVoted) {
          return { success: false, error: 'Teacher ID has already voted!' };
        }
        this.teachers[idx].hasVoted = true;
        this.teachers[idx].votedAt = timestamp;
        this.saveTeachers();
      }
    }

    Object.entries(selections).forEach(([, candidateId]) => {
      if (candidateId) {
        const cIdx = this.candidates.findIndex(c => c.id === candidateId);
        if (cIdx !== -1) {
          this.candidates[cIdx].votesCount += 1;
        }
      }
    });
    this.saveCandidates();

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

    return { success: true };
  }

  // --- ADMIN ANALYTICS & DASHBOARD METRICS ---
  public getAdminMetrics() {
    const totalStudents = this.students.length;
    const totalTeachers = this.teachers.length;
    const totalEligibleVoters = totalStudents + totalTeachers;

    const studentVotes = this.students.filter(s => s.hasVoted).length;
    const teacherVotes = this.teachers.filter(t => t.hasVoted).length;
    const totalVotes = this.votes.length;
    const pendingVotes = totalEligibleVoters - (studentVotes + teacherVotes);

    const votingPercentage = totalEligibleVoters > 0 
      ? Math.round(((studentVotes + teacherVotes) / totalEligibleVoters) * 100) 
      : 0;

    const juniorStudents = this.students.filter(s => s.class <= 5);
    const juniorVoted = juniorStudents.filter(s => s.hasVoted).length;
    const juniorPercentage = juniorStudents.length > 0 
      ? Math.round((juniorVoted / juniorStudents.length) * 100) 
      : 0;

    const seniorStudents = this.students.filter(s => s.class >= 6);
    const seniorVoted = seniorStudents.filter(s => s.hasVoted).length;
    const seniorPercentage = seniorStudents.length > 0 
      ? Math.round((seniorVoted / seniorStudents.length) * 100) 
      : 0;

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
      seniorVoted,
      seniorTotal: seniorStudents.length,
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
    return newCand;
  }

  public deleteCandidate(id: string) {
    this.candidates = this.candidates.filter(c => c.id !== id);
    this.saveCandidates();
  }

  public clearAllCandidates() {
    this.candidates = [];
    this.saveCandidates();
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
      const studentsSnap = await getDocs(collection(db, 'students'));
      if (!studentsSnap.empty) {
        const fbStudents: Student[] = [];
        studentsSnap.forEach(docSnap => {
          fbStudents.push(docSnap.data() as Student);
        });
        if (fbStudents.length > 0) {
          const studentMap = new Map<string, Student>();
          this.students.forEach(s => studentMap.set(s.id, s));
          fbStudents.forEach(s => studentMap.set(s.id, s));
          this.students = Array.from(studentMap.values());
          this.saveStudents();
        }
      }

      const teachersSnap = await getDocs(collection(db, 'teachers'));
      if (!teachersSnap.empty) {
        const fbTeachers: Teacher[] = [];
        teachersSnap.forEach(docSnap => {
          fbTeachers.push(docSnap.data() as Teacher);
        });
        if (fbTeachers.length > 0) {
          const teacherMap = new Map<string, Teacher>();
          this.teachers.forEach(t => teacherMap.set(t.id, t));
          fbTeachers.forEach(t => teacherMap.set(t.id, t));
          this.teachers = Array.from(teacherMap.values());
          this.saveTeachers();
        }
      }
    } catch (e) {
      console.warn("Could not load initial data from Firebase Firestore:", e);
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
  }

  public clearAllTeachers() {
    this.teachers = [];
    this.saveTeachers();
  }

  // --- BULK IMPORT STUDENTS ---
  public async bulkImportStudents(rawRows: Record<string, string>[]): Promise<{ added: number; updated: number; syncedToFirebase: boolean; firebaseError?: string }> {
    let added = 0;
    let updated = 0;
    const affectedStudents: Student[] = [];

    const validHouses: HouseType[] = ['Cariappa', 'Manekshaw', 'Thimayya', 'Vaidya'];

    rawRows.forEach((row, idx) => {
      const admissionNo = (row.admissionno || row.admission_no || row.admno || row.id || row.admission_number || row.admissionnumber || '').trim().toUpperCase();
      const name = (row.name || row.studentname || row.student_name || row.full_name || '').trim();

      if (!admissionNo || !name) return; // Skip invalid row

      const rawHouse = (row.house || 'Cariappa').trim();
      const houseMatched = validHouses.find(h => h.toLowerCase() === rawHouse.toLowerCase()) || 'Cariappa';

      const rawGender = (row.gender || 'M').trim().toUpperCase();
      const gender: 'M' | 'F' = rawGender.startsWith('F') || rawGender === 'GIRL' || rawGender === 'FEMALE' ? 'F' : 'M';

      const parsedClass = parseInt(row.classname || row.class_name || row.class || row.std || row.grade || '10', 10);
      const studentClass = isNaN(parsedClass) ? 10 : Math.min(12, Math.max(1, parsedClass));

      const parsedRoll = parseInt(row.rollno || row.roll || row.roll_no || '1', 10);
      const rollNo = isNaN(parsedRoll) ? 1 : parsedRoll;

      const dob = (row.dateofbirth || row.date_of_birth || row.dob || row.birthdate || '2010-01-01').trim();
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
      const dateOfJoining = (row.dateofjoining || row.date_of_joining || '').trim();
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
        dateOfJoining,
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


  // --- SYSTEM CONTROLS ---
  public toggleVotingStatus(isOpen?: boolean) {
    this.systemState.isVotingOpen = isOpen !== undefined ? isOpen : !this.systemState.isVotingOpen;
    localStorage.setItem(STORAGE_KEYS.SYSTEM, JSON.stringify(this.systemState));
  }

  public resetAllVotes() {
    this.votes = [];
    this.students = this.students.map(s => ({ ...s, hasVoted: false, votedAt: undefined, votedCouncil: undefined }));
    this.teachers = this.teachers.map(t => ({ ...t, hasVoted: false, votedAt: undefined }));
    this.candidates = this.candidates.map(c => ({ ...c, votesCount: 0 }));
    this.systemState.lastVoteTime = undefined;
    
    this.saveStudents();
    this.saveTeachers();
    this.saveCandidates();
    this.saveVotes();

    this.syncStudentsToFirebase().catch(e => console.error("Sync students reset error:", e));
    this.syncTeachersToFirebase().catch(e => console.error("Sync teachers reset error:", e));
  }

  public restoreDefaultDataset() {
    this.students = INITIAL_STUDENTS;
    this.teachers = INITIAL_TEACHERS;
    this.candidates = INITIAL_CANDIDATES;
    this.votes = INITIAL_VOTE_RECORDS;
    this.systemState = { isVotingOpen: true, totalVotesCast: 0 };
    
    this.saveStudents();
    this.saveTeachers();
    this.saveCandidates();
    this.saveVotes();

    this.syncStudentsToFirebase().catch(e => console.error("Sync students default error:", e));
    this.syncTeachersToFirebase().catch(e => console.error("Sync teachers default error:", e));
  }
}

export const dbService = new DatabaseService();


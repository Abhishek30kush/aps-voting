import type { Student, Teacher, Candidate, VoteRecord, CouncilType, SystemState, PositionType, HouseType } from '../types';
import { INITIAL_STUDENTS, INITIAL_TEACHERS, INITIAL_CANDIDATES, INITIAL_VOTE_RECORDS } from './mockData';

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
  public verifyStudent(admissionNo: string, dob: string): { student?: Student; error?: string } {
    const cleanAdm = admissionNo.trim().toUpperCase();
    const student = this.students.find(s => s.admissionNo.toUpperCase() === cleanAdm);

    if (!student) {
      return { error: 'Admission Number not found in Army Public School database. Please check your entry.' };
    }

    if (student.dob !== dob.trim()) {
      return { error: 'Date of Birth does not match our records for this Admission Number.' };
    }

    if (student.hasVoted) {
      return { 
        student, 
        error: `Voting already completed! You cast your ballot on ${new Date(student.votedAt || '').toLocaleString() || 'record'}.` 
      };
    }

    return { student };
  }

  // --- TEACHER AUTHENTICATION & LOOKUP ---
  public verifyTeacher(teacherId: string, pin: string): { teacher?: Teacher; error?: string } {
    const cleanId = teacherId.trim().toUpperCase();
    const teacher = this.teachers.find(t => t.teacherId.toUpperCase() === cleanId);

    if (!teacher) {
      return { error: 'Teacher Code not found. Please contact APS Admin.' };
    }

    if (teacher.pin !== pin.trim()) {
      return { error: 'Security PIN / DOB is incorrect.' };
    }

    if (teacher.hasVoted) {
      return { 
        teacher, 
        error: `Teacher ID ${teacher.teacherId} has already submitted votes on ${new Date(teacher.votedAt || '').toLocaleString()}.` 
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

  // --- STUDENT & TEACHER MANAGEMENT ---
  public addStudent(student: Omit<Student, 'id' | 'hasVoted'>): Student {
    const newStudent: Student = {
      ...student,
      id: 'st-' + Date.now(),
      hasVoted: false
    };
    this.students.push(newStudent);
    this.saveStudents();
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
    return newTeacher;
  }

  public deleteStudent(id: string) {
    this.students = this.students.filter(s => s.id !== id);
    this.saveStudents();
  }

  public deleteTeacher(id: string) {
    this.teachers = this.teachers.filter(t => t.id !== id);
    this.saveTeachers();
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
  public bulkImportStudents(rawRows: Record<string, string>[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

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
    });

    this.saveStudents();
    return { added, updated };
  }

  // --- BULK IMPORT TEACHERS ---
  public bulkImportTeachers(rawRows: Record<string, string>[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

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
    });

    this.saveTeachers();
    return { added, updated };
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
  }
}

export const dbService = new DatabaseService();

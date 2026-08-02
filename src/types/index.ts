export type CouncilType = 'junior' | 'senior';

export type HouseType = 'Cariappa' | 'Manekshaw' | 'Thimayya' | 'Vaidya';

export type PositionType = 
  | 'head_boy'
  | 'head_girl'
  | 'vice_head_boy'
  | 'vice_head_girl'
  | 'sports_captain_boy'
  | 'sports_captain_girl'
  | 'vice_sports_captain_boy'
  | 'vice_sports_captain_girl'
  | 'discipline_incharge_boy'
  | 'discipline_incharge_girl';

export interface PositionMetadata {
  id: PositionType;
  title: string;
  category: CouncilType;
  genderReq: 'M' | 'F' | 'ANY';
  description: string;
}

export interface Student {
  id: string;
  admissionNo: string;
  dob: string; // YYYY-MM-DD
  name: string;
  class: number; // 1 to 12
  section: string; // 'A', 'B', etc.
  rollNo: number;
  house: HouseType;
  gender: 'M' | 'F';
  hasVoted: boolean;
  votedAt?: string;
  votedCouncil?: CouncilType;

  // Official APS ERP Extended Fields
  admissionCategory?: string; // Serving Army, Ex-Servicemen, Officers, Civilian, etc.
  fatherName?: string;
  fatherMobileNo?: string;
  fatherEmail?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherMobileNo?: string;
  motherEmail?: string;
  motherOccupation?: string;
  sibling1?: string;
  sibling2?: string;
  routeNo?: string;
  bloodGroup?: string;
  dateOfAdmission?: string;
  dateOfJoining?: string;
  status?: string; // Active / Inactive
  address?: string;
}

export interface Teacher {
  id: string;
  teacherId: string; // EMP ID
  name: string;
  pin: string; // YYYY-MM-DD or PIN for login
  department: string;
  designation: string;
  hasVoted: boolean;
  votedAt?: string;

  // Official APS Staff / Teacher ERP Extended Fields
  doj?: string; // Date of Joining
  doc?: string; // Date of Confirmation / Contract
  appt?: string; // Appointment / Designation (e.g. PGT, TGT, Sports Officer, Vice Principal)
  empType?: string; // Employee Type (Regular, Adhoc, Contractual)
  bankAcct?: string; // Bank Account Number
  ifscNo?: string; // IFSC Code
  pay?: string; // Pay Scale / Basic Pay
  remarks?: string; // Remarks
}

export interface Candidate {
  id: string;
  name: string;
  admissionNo: string;
  class: number;
  section: string;
  house: HouseType;
  position: PositionType;
  council: CouncilType; // 'junior' (1-5) or 'senior' (6-12)
  gender: 'M' | 'F';
  photoUrl: string;
  motto: string;
  achievements: string[];
  votesCount: number;
}

export interface VoteRecord {
  id: string;
  voterType: 'student' | 'teacher';
  voterId: string; // Admission No or Teacher ID
  voterName: string;
  voterClass?: number;
  council: CouncilType;
  timestamp: string;
  selections: Record<PositionType, string>; // position -> candidateId
}

export interface SystemState {
  isVotingOpen: boolean;
  lastVoteTime?: string;
  totalVotesCast: number;
}

export const POSITION_LABELS: Record<PositionType, { title: string; council: CouncilType; gender: 'M' | 'F' }> = {
  head_boy: { title: 'Head Boy', council: 'senior', gender: 'M' },
  head_girl: { title: 'Head Girl', council: 'senior', gender: 'F' },
  vice_head_boy: { title: 'Vice Head Boy', council: 'senior', gender: 'M' },
  vice_head_girl: { title: 'Vice Head Girl', council: 'senior', gender: 'F' },
  sports_captain_boy: { title: 'Sports Captain (Boy)', council: 'senior', gender: 'M' },
  sports_captain_girl: { title: 'Sports Captain (Girl)', council: 'senior', gender: 'F' },
  vice_sports_captain_boy: { title: 'Vice Sports Captain (Boy)', council: 'senior', gender: 'M' },
  vice_sports_captain_girl: { title: 'Vice Sports Captain (Girl)', council: 'senior', gender: 'F' },
  discipline_incharge_boy: { title: 'Discipline Incharge (Boy)', council: 'senior', gender: 'M' },
  discipline_incharge_girl: { title: 'Discipline Incharge (Girl)', council: 'senior', gender: 'F' },
};

export const JUNIOR_POSITIONS: PositionType[] = [
  'head_boy',
  'head_girl',
  'sports_captain_boy',
  'sports_captain_girl',
  'vice_sports_captain_boy',
  'vice_sports_captain_girl',
  'discipline_incharge_boy',
  'discipline_incharge_girl',
];

export const SENIOR_POSITIONS: PositionType[] = [
  'head_boy',
  'head_girl',
  'vice_head_boy',
  'vice_head_girl',
  'sports_captain_boy',
  'sports_captain_girl',
  'vice_sports_captain_boy',
  'vice_sports_captain_girl',
  'discipline_incharge_boy',
  'discipline_incharge_girl',
];

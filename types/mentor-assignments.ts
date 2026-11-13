export interface AssignmentPersonRow {
  id: string;
  role: string;
  academyId: string | null;
  fullName: string;
  email: string | null;
}

export interface AssignedStudent {
  id: string;
  fullName: string;
  email: string | null;
  assignedAt: string;
}

export interface StudentOption {
  id: string;
  fullName: string;
  email: string | null;
}

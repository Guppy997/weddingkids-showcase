/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProjectStatus = 'Anfrage' | 'Gebucht' | 'Geplant' | 'Abgesagt';

export type Availability = 'Ja' | 'Nein' | 'Vielleicht' | 'Ausstehend';

export interface Staff {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  department: string;
  avatarColor?: string;
  avatarImage?: string | null;
}

export interface WeddingStaffAssignment {
  staffId: string;
  status: Availability;
  comment?: string;
}

export interface Wedding {
  id: string;
  coupleNames: string;
  initials: string;
  date: string; // YYYY-MM-DD (Start-Datum)
  endDate?: string | null; // YYYY-MM-DD, nur bei mehrtägigen Betreuungen
  betreuungszeit?: string;
  location: string;
  status: ProjectStatus;
  previousStatus?: ProjectStatus;
  childrenCount: number;
  staffNeeded?: number;
  notes: string;
  assignments: WeddingStaffAssignment[];
  assignedStaffIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface BoardNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export type PollChoice = 'Ja' | 'Nein' | 'Vielleicht';

export interface PollVote {
  userId: string;
  userName: string;
  vote: PollChoice;
}

export interface Poll {
  id: string;
  question: string;
  createdBy: string;
  createdAt: string;
  votes: PollVote[];
  myVote: PollChoice | null;
}

export interface AdminEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (Start-Datum)
  endDate?: string | null; // YYYY-MM-DD, optional für mehrtägige Termine
  time?: string; // Legacy: freie Textzeit (wird nicht mehr aktiv geschrieben)
  startTime?: string | null; // HH:MM
  endTime?: string | null;   // HH:MM
  description?: string;
  color?: string | null; // Hex (#RRGGBB), z. B. #BFD9E6 — null = Standard
  public: boolean; // visible to all staff when true, otherwise admin-only
  createdAt: string;
  createdBy: string;
}

export interface UserProfile extends Staff {
  role: 'Admin' | 'Staff';
}

export interface TodoItem {
  id: string;
  weddingId: string;
  text: string;
  done: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  weddingId: string;
  weddingName?: string; // only present in global log
  eventType: 'status_change' | 'staff_assigned' | 'staff_removed' | 'todo_created' | 'todo_completed';
  description: string;
  actorName: string;
  createdAt: string;
}

export interface DashboardStats {
  totalActive: number;
  weddingsThisMonth: number;
  weddingsWithoutStaff: number;
  pendingAccessRequests: number;
}

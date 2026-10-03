import type { ProjectStatus } from '../../types';

/** Teammitglied, wie es /api/staff bzw. /api/staff/pending liefert. */
export interface StaffMember {
  id: string;
  name: string;
  username?: string;
  department: string;
  role?: string;
  avatarColor?: string;
  /** Vom Server markiert: Inhaber:innen-Accounts können nicht gelöscht werden. */
  isProtected?: boolean;
}

/** Die drei aufklappbaren Bereiche im Hochzeiten-Tab (Akkordeon). */
export type WeddingSection = 'active' | 'cancelled' | 'completed';

// Formular-Zustand „Hochzeit anlegen/bearbeiten“ (Zahlen als Strings, weil Eingabefelder)
export const emptyWeddingForm = {
  coupleNames: '', betreuungszeit: '', startTime: '', endTime: '', date: '', location: '',
  status: 'Anfrage' as ProjectStatus, childrenCount: '', staffNeeded: '', notes: '',
  assignedStaffIds: [] as string[],
};
export type WeddingFormState = typeof emptyWeddingForm;

import { Wedding, BoardNote, AdminEvent, TodoItem, ActivityLogEntry, DashboardStats, Poll, PollChoice } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: 'no-store', // iOS cached GET-Requests sonst → immer frisch vom Server
    headers: { ...authHeaders(token), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    // Token abgelaufen / ungültig → globalen Logout-Event feuern (AuthContext lauscht)
    if (res.status === 401) {
      // Token mitgeben: ein 401 für einen inzwischen ersetzten Token (z. B. kurz
      // nach einer Passwortänderung) darf das Gerät nicht abmelden.
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: { token } }));
    }
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function apiLogin(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error ?? 'Login failed');
  }
  return res.json() as Promise<{ token: string; user: { id: string; name: string; role: 'Admin' | 'Staff'; department: string; avatarColor: string; avatarImage: string | null } }>;
}

export async function apiVerifyToken(token: string) {
  // token: frischer 30-Tage-Token (ältere Server liefern keinen)
  return request<{ valid: boolean; token?: string; user: any }>('/api/auth/verify', token, { method: 'POST' });
}

/** Einmal-Ticket für den Live-Stream (EventSource kann keinen Auth-Header senden). */
export async function apiStreamTicket(token: string) {
  return request<{ ticket: string }>('/api/stream/ticket', token, { method: 'POST' });
}

export async function apiRegisterUser(token: string, data: { username: string; password: string; name: string; department: string; role?: string }) {
  return request('/api/auth/register', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiRequestAccess(data: { username: string; password: string; name: string; department?: string }) {
  const res = await fetch(`${API_URL}/api/auth/request-access`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Anfrage fehlgeschlagen' }));
    throw new Error(err.error ?? 'Anfrage fehlgeschlagen');
  }
  return res.json();
}

export async function apiChangePassword(token: string, currentPassword: string, newPassword: string) {
  // Nach der Änderung gilt der alte Token nicht mehr — der neue kommt in der Antwort
  return request<{ message: string; token?: string }>('/api/auth/change-password', token, { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
}

export async function apiUpdateProfile(token: string, updates: { name?: string; avatarColor?: string; avatarImage?: string | null }) {
  return request<{ token: string; user: { id: string; name: string; role: 'Admin' | 'Staff'; department: string; avatarColor: string; avatarImage: string | null } }>(
    '/api/auth/profile', token, { method: 'PATCH', body: JSON.stringify(updates) }
  );
}

export async function apiExportData(token: string): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/auth/export-data`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Export fehlgeschlagen');
  return res.blob();
}

export async function apiDeleteAccount(token: string, password: string) {
  return request('/api/auth/delete-account', token, {
    method: 'DELETE', body: JSON.stringify({ password }),
  });
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export async function apiGetStaff(token: string) {
  return request<{ id: string; name: string; role: string; department: string; status: string }[]>('/api/staff', token);
}

export async function apiGetPendingStaff(token: string) {
  return request<{ id: string; name: string; username: string; department: string; created_at: string }[]>('/api/staff/pending', token);
}

export async function apiApproveStaff(token: string, id: string) {
  return request(`/api/staff/${id}/approve`, token, { method: 'POST' });
}

export async function apiDeleteStaff(token: string, id: string) {
  return request(`/api/staff/${id}`, token, { method: 'DELETE' });
}

export async function apiResetStaffPassword(token: string, id: string, newPassword: string) {
  return request(`/api/staff/${id}/reset-password`, token, {
    method: 'POST',
    body: JSON.stringify({ newPassword }),
  });
}

// ─── Weddings ────────────────────────────────────────────────────────────────

export async function apiGetWeddings(token: string): Promise<Wedding[]> {
  return request<Wedding[]>('/api/weddings', token);
}

export async function apiCreateWedding(token: string, data: Omit<Wedding, 'id' | 'assignments' | 'assignedStaffIds'>): Promise<Wedding> {
  return request<Wedding>('/api/weddings', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateWedding(token: string, id: string, updates: Partial<Wedding>): Promise<Wedding> {
  return request<Wedding>(`/api/weddings/${id}`, token, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function apiDeleteWedding(token: string, id: string) {
  return request(`/api/weddings/${id}`, token, { method: 'DELETE' });
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function apiGetNotes(token: string): Promise<BoardNote[]> {
  return request<BoardNote[]>('/api/notes', token);
}

export async function apiCreateNote(token: string, text: string): Promise<BoardNote> {
  return request<BoardNote>('/api/notes', token, { method: 'POST', body: JSON.stringify({ text }) });
}

export async function apiDeleteNote(token: string, id: string) {
  return request(`/api/notes/${id}`, token, { method: 'DELETE' });
}

// ─── Polls (News-Abstimmungen) ───────────────────────────────────────────────

export async function apiGetPolls(token: string): Promise<Poll[]> {
  return request<Poll[]>('/api/polls', token);
}

export async function apiCreatePoll(token: string, question: string): Promise<Poll> {
  return request<Poll>('/api/polls', token, { method: 'POST', body: JSON.stringify({ question }) });
}

export async function apiDeletePoll(token: string, id: string) {
  return request(`/api/polls/${id}`, token, { method: 'DELETE' });
}

export async function apiVotePoll(token: string, id: string, vote: PollChoice | null): Promise<Poll> {
  return request<Poll>(`/api/polls/${id}/vote`, token, { method: 'POST', body: JSON.stringify({ vote }) });
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function apiGetEvents(token: string): Promise<AdminEvent[]> {
  return request<AdminEvent[]>('/api/events', token);
}

export async function apiCreateEvent(token: string, data: Omit<AdminEvent, 'id' | 'createdAt' | 'createdBy'>): Promise<AdminEvent> {
  return request<AdminEvent>('/api/events', token, { method: 'POST', body: JSON.stringify(data) });
}

export async function apiUpdateEvent(token: string, id: string, updates: Partial<AdminEvent>): Promise<AdminEvent> {
  return request<AdminEvent>(`/api/events/${id}`, token, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function apiDeleteEvent(token: string, id: string) {
  return request(`/api/events/${id}`, token, { method: 'DELETE' });
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function apiGetDashboard(token: string): Promise<DashboardStats> {
  return request<DashboardStats>('/api/admin/dashboard', token);
}

// ─── Todos ────────────────────────────────────────────────────────────────────

export async function apiGetTodos(token: string, weddingId: string): Promise<TodoItem[]> {
  return request<TodoItem[]>(`/api/weddings/${weddingId}/todos`, token);
}

export async function apiCreateTodo(token: string, weddingId: string, text: string): Promise<TodoItem> {
  return request<TodoItem>(`/api/weddings/${weddingId}/todos`, token, { method: 'POST', body: JSON.stringify({ text }) });
}

export async function apiUpdateTodo(token: string, todoId: string, updates: { done?: boolean; text?: string }): Promise<TodoItem> {
  return request<TodoItem>(`/api/todos/${todoId}`, token, { method: 'PATCH', body: JSON.stringify(updates) });
}

export async function apiDeleteTodo(token: string, todoId: string): Promise<void> {
  return request(`/api/todos/${todoId}`, token, { method: 'DELETE' });
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export async function apiGetActivity(token: string, weddingId: string): Promise<ActivityLogEntry[]> {
  return request<ActivityLogEntry[]>(`/api/weddings/${weddingId}/activity`, token);
}

export async function apiGetGlobalActivity(token: string): Promise<ActivityLogEntry[]> {
  return request<ActivityLogEntry[]>('/api/admin/activity', token);
}

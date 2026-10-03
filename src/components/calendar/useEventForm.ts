import { useState } from 'react';
import type { AdminEvent } from '../../types';

/** Felder des Termin-Formulars. editingEventId gesetzt = bestehenden Termin bearbeiten. */
export interface EventFormState {
  editingEventId: string | null;
  title: string;
  date: string;
  endDate: string;
  multiDay: boolean;
  startTime: string;
  endTime: string;
  withTime: boolean;
  color: string;
  isPublic: boolean;
  description: string;
}

const EMPTY_EVENT_FORM: EventFormState = {
  editingEventId: null,
  title: '',
  date: '',
  endDate: '',
  multiDay: false,
  startTime: '',
  endTime: '',
  withTime: false,
  color: '#BFD9E6', // Primary-Pastell
  isPublic: true,
  description: '',
};

/** Zustand des Termin-Formulars: Felder ändern, leeren oder aus einem Termin laden. */
export function useEventForm() {
  const [form, setForm] = useState<EventFormState>(EMPTY_EVENT_FORM);

  const update = (patch: Partial<EventFormState>) => setForm(f => ({ ...f, ...patch }));
  const reset = () => setForm(EMPTY_EVENT_FORM);
  const loadEvent = (ev: AdminEvent) => setForm({
    editingEventId: ev.id,
    title: ev.title,
    date: ev.date,
    endDate: ev.endDate ?? '',
    multiDay: !!(ev.endDate && ev.endDate !== ev.date),
    startTime: ev.startTime ?? '',
    endTime: ev.endTime ?? '',
    withTime: !!(ev.startTime || ev.endTime),
    color: ev.color || '#BFD9E6',
    isPublic: ev.public,
    description: ev.description ?? '',
  });

  return { form, update, reset, loadEvent };
}

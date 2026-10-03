// Gemeinsame Tailwind-Klassen für Formulare und Buttons im Admin-Bereich.

export const inputClass = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none text-gray-900 bg-white text-base";
export const labelClass = "block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2";

// ── Einheitliche Button-Klassen: pastellig, ohne harten Rand,
// weicher Übergang nur über Schatten + Tap-Feedback
const btnBase = "h-10 rounded-xl text-sm font-bold shadow-sm hover:brightness-95 active:scale-[0.98] transition";
export const btnSuccess   = `${btnBase} bg-status-green-bg text-status-green-text`;
export const btnDanger    = `${btnBase} bg-status-red-bg text-status-red-text`;
export const btnSecondary = `${btnBase} bg-[#EBF4FB] text-[#3A5A70]`;
export const btnNeutral   = `${btnBase} bg-gray-100 text-gray-700`;

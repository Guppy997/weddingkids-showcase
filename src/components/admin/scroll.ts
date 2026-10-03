/**
 * Scrollt die ausgeklappte Hochzeits-Karte so, dass ihre Oberkante (Name)
 * direkt UNTER dem Seiten-Header sitzt — also von oben anfangend komplett
 * sichtbar, statt oben hinter dem fixen Header abgeschnitten zu werden.
 *
 * Robust gegen die Frage „welcher Bereich scrollt": Wir richten an der
 * Unterkante des <header> aus (sticky top-0) und scrollen den tatsächlich
 * scrollbaren Vorfahren — oder das Fenster, falls die ganze Seite scrollt.
 */
export function scrollCardBelowHeader(cardId: string, gap = 10) {
  const card = document.getElementById(cardId);
  if (!card) return;

  const header = document.querySelector('header');
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0;

  // Nächstgelegenen wirklich scrollbaren Element-Vorfahren suchen
  let scroller: HTMLElement | null = card.parentElement;
  while (scroller) {
    const oy = getComputedStyle(scroller).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && scroller.scrollHeight > scroller.clientHeight) break;
    scroller = scroller.parentElement;
  }

  const delta = card.getBoundingClientRect().top - headerBottom - gap;
  if (scroller) {
    scroller.scrollBy({ top: delta, behavior: 'smooth' });
  } else {
    window.scrollBy({ top: delta, behavior: 'smooth' });
  }
}

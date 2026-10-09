/**
 * Conversion tracking. Sends GA4 events when gtag is loaded (set ANALYTICS.GA4_ID),
 * otherwise does nothing. No personal data or typed text is ever sent.
 *
 * Contact intent (clicks, not confirmed leads):
 *   phone_click, whatsapp_click, email_click, quote_click (a link to the quote form)
 * Forms (forms.ts):
 *   form_start      first interaction with a quote or support form
 *   generate_lead   quote or enquiry received by the server (the confirmed lead; mark it as a key event in GA4)
 *   support_submit  support request received by the server
 * Catalogue:
 *   catalogue_filter  a filter or builder choice changed inside [data-track-catalogue]; sends the
 *                     control's name and chosen option (e.g. brand / Dell), never free text
 */
declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

export function track(event: string, params: Record<string, unknown> = {}) {
  window.gtag?.('event', event, { page_path: location.pathname, ...params });
}

document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest?.('a');
  if (!a) return;
  const href = a.getAttribute('href') ?? '';
  const where = a.dataset.trackLocation ?? a.closest('[data-track-zone]')?.getAttribute('data-track-zone') ?? 'page';
  if (href.startsWith('tel:')) track('phone_click', { location: where });
  else if (href.includes('wa.me/')) track('whatsapp_click', { location: where });
  else if (href.startsWith('mailto:')) track('email_click', { location: where });
  else if (href.startsWith('/request-a-quote/')) track('quote_click', { location: where });
});

document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement | null;
  const zone = el?.closest?.('[data-track-catalogue]');
  if (!el || !zone || !el.name) return;
  if (el instanceof HTMLInputElement && !['checkbox', 'radio'].includes(el.type)) return; // option controls only
  const value = el instanceof HTMLInputElement && el.type === 'checkbox' && !el.checked ? '' : el.value;
  track('catalogue_filter', { catalogue: zone.getAttribute('data-track-catalogue'), control: el.name, value: value.slice(0, 40) });
});

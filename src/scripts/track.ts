/**
 * Conversion tracking. Sends GA4 events when gtag is loaded (set ANALYTICS.GA4_ID),
 * otherwise does nothing. Events: phone_click, whatsapp_click, email_click,
 * plus form events fired from forms.ts.
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
});

/**
 * SMS login codes through MSG91 (https://msg91.com), the usual choice in India.
 * Needs a DLT-approved OTP template. Set MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID.
 * Without them, codes are printed to the server log (demo mode only).
 */
export const smsConfigured = () => !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID);

export async function sendOtpSms(phone10: string, code: string): Promise<void> {
  if (!smsConfigured()) {
    console.info(`[sms:demo] to=+91${phone10} code=${code}`);
    return;
  }
  const url = new URL('https://control.msg91.com/api/v5/otp');
  url.searchParams.set('template_id', process.env.MSG91_OTP_TEMPLATE_ID!);
  url.searchParams.set('mobile', `91${phone10}`);
  url.searchParams.set('otp', code);
  url.searchParams.set('otp_expiry', '10');
  const res = await fetch(url, {
    method: 'POST',
    headers: { authkey: process.env.MSG91_AUTH_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
  if (!res.ok || body.type === 'error') throw new Error(`SMS failed: ${body.message ?? res.status}`);
}

/**
 * Transactional SMS (order updates) through MSG91 Flow. Each message type needs its own
 * DLT-approved template; put its MSG91 template ID in the template's "subject" field in
 * /admin/notifications. Variables are sent by name (e.g. order_number) to match the template.
 */
export const smsFlowConfigured = () => !!process.env.MSG91_AUTH_KEY;

export async function sendFlowSms(phone10: string, templateId: string, vars: Record<string, string>): Promise<void> {
  if (!smsFlowConfigured()) throw new Error('SMS is not configured');
  const res = await fetch('https://control.msg91.com/api/v5/flow', {
    method: 'POST',
    headers: { authkey: process.env.MSG91_AUTH_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_id: templateId, short_url: '0', recipients: [{ mobiles: `91${phone10}`, ...vars }] }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { type?: string; message?: string };
  if (!res.ok || body.type === 'error') throw new Error(`SMS failed: ${body.message ?? res.status}`);
}

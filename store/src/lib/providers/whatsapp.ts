/**
 * WhatsApp Business messages through Meta's Cloud API.
 * Set WHATSAPP_TOKEN (a system-user access token) and WHATSAPP_PHONE_NUMBER_ID.
 * Business-initiated messages must use a template approved in WhatsApp Manager; pass its name.
 * The template's body variables are filled, in order, from `params`.
 */
export const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

export async function sendWhatsappTemplate(phone10: string, templateName: string, params: string[], language = 'en'): Promise<void> {
  if (!whatsappConfigured()) throw new Error('WhatsApp is not configured');
  const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: `91${phone10}`,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: params.length ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: text.slice(0, 1000) })) }] : [],
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`WhatsApp failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

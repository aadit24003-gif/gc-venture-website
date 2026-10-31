import { desc } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { notificationTemplates, notifications } from '@/lib/db/schema';
import { TEMPLATES, type Channel, type TemplateKey } from '@/lib/templates';
import { emailConfigured } from '@/lib/providers/email';
import { smsFlowConfigured } from '@/lib/providers/sms';
import { whatsappConfigured } from '@/lib/providers/whatsapp';
import { formatDate } from '@/lib/format';
import { ActionForm, RunButton } from '@/components/admin/ActionForm';
import { PageHead, Panel, Table, td } from '../ui';
import { saveTemplate, sendTest } from './actions';

export const metadata = { title: 'Notifications' };
const CH: Record<Channel, string> = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' };

export default async function Notifications() {
  await requireStaff('notifications.manage');
  const d = await db();
  const [rows, log] = await Promise.all([d.select().from(notificationTemplates), d.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(80)]);
  const status = [['Email (Resend)', emailConfigured()], ['SMS (MSG91)', smsFlowConfigured()], ['WhatsApp (Meta)', whatsappConfigured()]] as const;
  return (
    <div>
      <PageHead title="Notifications" intro="The messages customers receive. Placeholders like {{order_number}} are filled in when sent. SMS needs a DLT-approved template ID per message; WhatsApp needs an approved template name." />
      <div className="mb-6 flex flex-wrap gap-2">{status.map(([l, on]) => <span key={l} className={`pill ${on ? 'pill-ok' : 'pill-wait'}`}>{l}: {on ? 'connected' : 'not connected'}</span>)}</div>
      <div className="space-y-3">
        {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => {
          const t = TEMPLATES[key] as { name: string; vars: string[] } & Partial<Record<Channel, { subject?: string; body: string }>>;
          const chans = (['email', 'sms', 'whatsapp'] as Channel[]).filter((c) => t[c]);
          return (
            <details key={key} className="rounded-[16px] border border-line bg-white p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2"><b>{t.name}</b><span className="flex gap-1.5">{chans.map((c) => { const row = rows.find((r) => r.key === key && r.channel === c); const on = row ? row.enabled : c === 'email'; return <span key={c} className={`pill ${on ? 'pill-ok' : 'pill-done'}`}>{CH[c]} {on ? 'on' : 'off'}</span>; })}</span></summary>
              <p className="mt-2 text-[12.5px] text-mute">Placeholders: {t.vars.map((x) => `{{${x}}}`).join(' ')}</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-3">
                {chans.map((c) => {
                  const row = rows.find((r) => r.key === key && r.channel === c);
                  const def = t[c]!;
                  return (
                    <div key={c} className="rounded-xl bg-canvas p-3">
                      <p className="mb-2 font-semibold">{CH[c]}</p>
                      <ActionForm action={saveTemplate.bind(null, key, c)}>
                        <label htmlFor={`${key}-${c}-s`} className="label">{c === 'email' ? 'Subject' : c === 'sms' ? 'MSG91 DLT template ID' : 'Approved template name'}</label>
                        <input id={`${key}-${c}-s`} name="subject" className="field text-[13px]" defaultValue={row?.subject ?? def.subject ?? ''} />
                        <label htmlFor={`${key}-${c}-b`} className="label mt-2">Message</label>
                        <textarea id={`${key}-${c}-b`} name="body" className="field mono !min-h-[140px] text-[12.5px]" defaultValue={row?.body ?? def.body} />
                        <label className="mt-2 flex items-center gap-2 text-[13.5px]"><input type="checkbox" name="enabled" className="check" defaultChecked={row ? row.enabled : c === 'email'} /> Send this</label>
                      </ActionForm>
                    </div>
                  );
                })}
              </div>
              {chans.includes('email') && <div className="mt-3"><RunButton action={sendTest.bind(null, key)} label="Email me a test" /></div>}
            </details>
          );
        })}
      </div>
      <Panel title="Recent messages" className="mt-8">
        <Table head={['When', 'Channel', 'Template', 'To', 'Status', 'Detail']} empty={log.length ? false : 'Nothing sent yet.'}>
          {log.map((n) => (
            <tr key={n.id}>
              <td className={`${td} mono whitespace-nowrap text-[12px] text-mute`}>{formatDate(n.createdAt, true)}</td>
              <td className={td}>{CH[n.channel as Channel] ?? n.channel}</td>
              <td className={`${td} mono text-[12px]`}>{n.template}</td>
              <td className={td}>{n.recipient}</td>
              <td className={td}><span className={`pill ${n.status === 'sent' ? 'pill-ok' : n.status === 'failed' ? 'pill-bad' : 'pill-done'}`}>{n.status}</span></td>
              <td className={`${td} max-w-[300px] truncate text-[12px] text-mute`} title={n.error ?? n.subject ?? ''}>{n.error ?? n.subject ?? n.ref}</td>
            </tr>
          ))}
        </Table>
      </Panel>
    </div>
  );
}

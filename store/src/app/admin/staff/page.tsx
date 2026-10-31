import { ne, sql } from 'drizzle-orm';
import { requireStaff, isBootstrapAdmin } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { users, ROLES } from '@/lib/db/schema';
import { ROLE_HELP, ROLE_LABEL } from '@/lib/rbac';
import { formatDate } from '@/lib/format';
import { ActionForm } from '@/components/admin/ActionForm';
import { PageHead, Panel, Table, td } from '../ui';
import { addStaff, setRole } from './actions';

export const metadata = { title: 'Staff and roles' };

export default async function Staff() {
  const v = await requireStaff('staff.manage');
  const d = await db();
  const all = await d.select().from(users).where(ne(users.role, 'customer')).orderBy(users.createdAt);
  const boot = (await d.select().from(users).where(sql`true`)).filter((u) => isBootstrapAdmin(u) && u.role === 'customer');
  const list = [...all, ...boot];
  return (
    <div>
      <PageHead title="Staff and roles" intro="Staff sign in like customers (one-time code or password) and see only what their role allows. People listed in ADMIN_EMAILS or ADMIN_PHONES are always super admins." />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Table head={['Person', 'Role', 'Last sign-in', 'Change role']}>
          {list.map((u) => (
            <tr key={u.id}>
              <td className={td}><b>{u.name ?? '—'}</b><br /><span className="text-mute">{u.email ?? u.phone}</span>{u.id === v.user.id && <span className="pill pill-done ml-2 !h-5">you</span>}</td>
              <td className={td}>{isBootstrapAdmin(u) ? <span className="pill pill-ink">Super admin (env)</span> : ROLE_LABEL[u.role]}</td>
              <td className={`${td} text-mute`}>{u.lastLoginAt ? formatDate(u.lastLoginAt, true) : 'Never'}</td>
              <td className={td}>
                <ActionForm action={setRole.bind(null, u.id)} submit="Save" className="flex items-end gap-2 [&>div]:mt-0">
                  <select name="role" defaultValue={u.role} className="field !min-h-9 !w-auto text-[13.5px]" aria-label={`Role for ${u.name ?? u.email ?? u.phone}`}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
                </ActionForm>
              </td>
            </tr>
          ))}
        </Table>
        <div className="space-y-6">
          <Panel title="Add a staff member">
            <ActionForm action={addStaff} submit="Add" reset>
              <label htmlFor="sf-n" className="label">Name</label><input id="sf-n" name="name" className="field" />
              <label htmlFor="sf-c" className="label mt-3">Email or mobile</label><input id="sf-c" name="contact" className="field" required />
              <label htmlFor="sf-r" className="label mt-3">Role</label>
              <select id="sf-r" name="role" className="field" defaultValue="support">{ROLES.filter((r) => r !== 'customer').map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
            </ActionForm>
          </Panel>
          <Panel title="What each role can do">
            <dl className="space-y-3 text-[13.5px]">{Object.entries(ROLE_HELP).map(([r, h]) => <div key={r}><dt className="font-semibold">{ROLE_LABEL[r as keyof typeof ROLE_LABEL]}</dt><dd className="text-mute">{h}</dd></div>)}</dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}

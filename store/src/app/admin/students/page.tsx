import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { studentVerifications, users } from '@/lib/db/schema';
import { formatDate, formatPhone } from '@/lib/format';
import { isAcademicEmail, purgeStudentFiles } from '@/lib/students';
import { STUDENT } from '@/lib/config';
import StudentDecision from './StudentDecision';

export default async function AdminStudents() {
  await purgeStudentFiles();
  const d = await db();
  const [pending, recent] = await Promise.all([
    d.select().from(studentVerifications).where(eq(studentVerifications.status, 'pending')).orderBy(studentVerifications.createdAt),
    d.select().from(studentVerifications).where(inArray(studentVerifications.status, ['approved', 'rejected'])).orderBy(desc(studentVerifications.reviewedAt)).limit(20),
  ]);
  const ids = [...new Set([...pending, ...recent].map((r) => r.userId))];
  const people = ids.length ? await d.select().from(users).where(inArray(users.id, ids)) : [];
  const who = (id: string) => people.find((p) => p.id === id);

  return (
    <div>
      <h1 className="text-[38px]">Student IDs</h1>
      <p className="mt-2 max-w-[70ch] text-mute">Approve when the name, college and a current validity date are readable and match the details. Photos are deleted {STUDENT.idRetentionDays} days after a decision.</p>

      <h2 className="mt-8 text-[24px]">Waiting for a decision ({pending.length})</h2>
      {pending.length === 0 ? <p className="mt-3 rounded-[22px] bg-white p-6 text-mute">Nothing to check. New requests appear here.</p> : (
        <ul className="mt-4 space-y-4">
          {pending.map((r) => {
            const u = who(r.userId);
            return (
              <li key={r.id} className="sheet grid gap-6 p-6 lg:grid-cols-[1fr_1.2fr]">
                <div>
                  <p className="text-[20px] font-semibold text-spruce display">{r.fullName}</p>
                  <dl className="mt-3 space-y-1.5 text-[14.5px]">
                    <div><dt className="inline text-mute">College: </dt><dd className="inline">{r.college}</dd></div>
                    {r.course && <div><dt className="inline text-mute">Course: </dt><dd className="inline">{r.course}</dd></div>}
                    {r.gradYear && <div><dt className="inline text-mute">Finishes: </dt><dd className="inline">{r.gradYear}</dd></div>}
                    <div><dt className="inline text-mute">Method: </dt><dd className="inline">{r.method === 'email' ? 'College email (code confirmed)' : 'ID photo'}</dd></div>
                    {r.collegeEmail && <div><dt className="inline text-mute">College email: </dt><dd className="inline">{r.collegeEmail}{!isAcademicEmail(r.collegeEmail) && <span className="ml-2 rounded bg-tag-soft px-1.5 py-0.5 text-[12px]">domain not on the auto list</span>}</dd></div>}
                    <div><dt className="inline text-mute">Account: </dt><dd className="inline">{u?.phone ? formatPhone(u.phone) : u?.email}</dd></div>
                    <div><dt className="inline text-mute">Sent: </dt><dd className="inline">{formatDate(r.createdAt, true)}</dd></div>
                  </dl>
                  <StudentDecision id={r.id} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {r.idFrontKey ? (
                    <>
                      <a href={`/api/admin/student-file?id=${r.id}&side=front`} target="_blank" rel="noopener" className="block overflow-hidden rounded-2xl bg-bench">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/admin/student-file?id=${r.id}&side=front`} alt={`Front of ${r.fullName}'s student ID`} className="h-full max-h-[260px] w-full object-contain" />
                      </a>
                      {r.idBackKey ? (
                        <a href={`/api/admin/student-file?id=${r.id}&side=back`} target="_blank" rel="noopener" className="block overflow-hidden rounded-2xl bg-bench">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/admin/student-file?id=${r.id}&side=back`} alt={`Back of ${r.fullName}'s student ID`} className="h-full max-h-[260px] w-full object-contain" />
                        </a>
                      ) : <p className="flex items-center justify-center rounded-2xl bg-bench p-6 text-[14px] text-mute">No back photo</p>}
                    </>
                  ) : <p className="flex items-center rounded-2xl bg-bench p-6 text-[14.5px] text-mute sm:col-span-2">No photo: the student confirmed a college email on a domain that isn’t approved automatically. Check that the domain belongs to the college named.</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-10 text-[24px]">Recent decisions</h2>
      <div className="sheet mt-4 overflow-x-auto p-2" tabIndex={0} role="region" aria-label="Recent decisions, scrollable">
        {recent.length === 0 ? <p className="p-5 text-mute">None yet.</p> : (
          <table className="w-full min-w-[640px] text-[14.5px]">
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-line first:border-0">
                  <td className="px-4 py-3"><b>{r.fullName}</b><br /><span className="text-[13px] text-mute">{r.college}</span></td>
                  <td className="px-4 py-3">{r.method === 'email' ? 'Email' : 'ID photo'}</td>
                  <td className="px-4 py-3">{r.status === 'approved' ? <span className="text-pass">Approved{r.approvedUntil ? ` until ${formatDate(r.approvedUntil)}` : ''}</span> : <span className="text-alert">Rejected: {r.rejectReason}</span>}</td>
                  <td className="px-4 py-3 text-right text-mute">{formatDate(r.reviewedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

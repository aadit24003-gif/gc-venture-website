import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';
import MarkHandled from './MarkHandled';

export default async function AdminMessages() {
  const d = await db();
  const rows = await d.select().from(messages).orderBy(desc(messages.createdAt)).limit(100);
  return (
    <div>
      <h1 className="text-[38px]">Messages</h1>
      <p className="mt-2 text-mute">From the contact form. Each one is also emailed to the support inbox.</p>
      {rows.length === 0 ? <p className="mt-6 rounded-[22px] bg-white p-6 text-mute">No messages yet.</p> : (
        <ul className="mt-6 space-y-3">
          {rows.map((m) => (
            <li key={m.id} className={`rounded-[22px] bg-white p-5 ${m.handled ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p><b className="text-spruce">{m.name}</b>, {m.contact} <span className="ml-2 rounded-md bg-bench px-2 py-0.5 text-[13px]">{m.topic}</span></p>
                <span className="text-[13px] text-mute">{formatDate(m.createdAt, true)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{m.body}</p>
              {!m.handled && <MarkHandled id={m.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { BRAND } from './config';
import { formatDate } from './format';
import { notify } from './notify';
import { approvedUntilFromNow } from './students';

/** Tells a student their discount is active (template: student_approved). */
export async function notifyApproved(to: string, name: string, until: Date = approvedUntilFromNow()) {
  await notify('student_approved', { email: to }, { name, valid_until: formatDate(until), shop_url: `${BRAND.url}/category/student` }, 'student');
}

import { layout, sendEmail } from './providers/email';
import { STUDENT } from './config';

export async function notifyApproved(to: string, name: string) {
  await sendEmail({
    to,
    subject: `You’re verified: ${STUDENT.percent}% off for students`,
    text: `Hi ${name}, your student status is verified. ${STUDENT.percent}% off applies automatically at checkout for the next ${STUDENT.validityMonths} months.`,
    html: layout('You’re verified', `<p style="font-size:15px;line-height:1.6">Hi ${name}, your student status is verified. ${STUDENT.percent}% off now applies automatically at checkout, for the next ${STUDENT.validityMonths} months.</p>`),
  });
}

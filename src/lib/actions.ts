
'use server';

import { sendTransactionalEmail as sendEmail, sendTestEmail as sendTest } from '@/services/email';

export async function sendTransactionalEmail(args: { subject: string, text: string, html: string }) {
  await sendEmail(args);
}

export async function sendTestEmail() {
  await sendTest();
}

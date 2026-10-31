/**
 * Default message templates. Staff can edit them in /admin/notifications; the edited copy is
 * stored in notification_templates and wins over these defaults.
 *
 * Email bodies use light Markdown: blank lines separate paragraphs, **bold**, and a line that is
 * only a link, [Label](url), becomes a button. Placeholders: {{name}}, {{order_number}}, …
 * For SMS, "subject" holds the DLT template ID registered with MSG91 (SMS is skipped without one).
 * For WhatsApp, "subject" holds the approved WhatsApp template name (sent as a template message).
 */
export type Channel = 'email' | 'sms' | 'whatsapp';
export type TemplateDef = { name: string; vars: string[]; email?: { subject: string; body: string }; sms?: { body: string }; whatsapp?: { body: string } };

export const TEMPLATES = {
  order_confirmed: {
    name: 'Order confirmed',
    vars: ['name', 'order_number', 'items', 'total', 'payment', 'order_url'],
    email: {
      subject: 'Order {{order_number}} confirmed',
      body: `Hi {{name}}, thanks for your order. We give every laptop a final check before it leaves and send you the tracking link when it ships.

{{items}}

**Total {{total}}** ({{payment}})

[Track your order]({{order_url}})`,
    },
    sms: { body: 'Order {{order_number}} confirmed. Total {{total}}. Track: {{order_url}} - {{brand}}' },
    whatsapp: { body: 'Hi {{name}}, your order {{order_number}} is confirmed. Total {{total}}. Track it here: {{order_url}}' },
  },
  order_shipped: {
    name: 'Order shipped',
    vars: ['name', 'order_number', 'courier', 'awb', 'tracking_url', 'order_url'],
    email: {
      subject: 'Order {{order_number}} has shipped',
      body: `Hi {{name}}, your laptop left our workshop with **{{courier}}**. Tracking number: **{{awb}}**.

[Follow the parcel]({{tracking_url}})`,
    },
    sms: { body: 'Order {{order_number}} shipped via {{courier}}, AWB {{awb}}. Track: {{order_url}} - {{brand}}' },
    whatsapp: { body: 'Your order {{order_number}} has shipped with {{courier}} (AWB {{awb}}). Track: {{tracking_url}}' },
  },
  order_out_for_delivery: {
    name: 'Out for delivery',
    vars: ['name', 'order_number', 'order_url'],
    sms: { body: 'Order {{order_number}} is out for delivery today. Keep your phone handy for the delivery code. - {{brand}}' },
    whatsapp: { body: 'Your order {{order_number}} is out for delivery today. The courier may ask for a one-time code.' },
  },
  order_delivered: {
    name: 'Order delivered',
    vars: ['name', 'order_number', 'return_days', 'warranty_months', 'order_url', 'review_url'],
    email: {
      subject: 'Order {{order_number}} was delivered',
      body: `Hi {{name}}, your order was delivered. Your {{warranty_months}}-month warranty starts today, and you have {{return_days}} days to return it if something isn't right.

Once you've used it for a few days, a short review helps other buyers.

[Write a review]({{review_url}})`,
    },
    whatsapp: { body: 'Order {{order_number}} delivered. Your warranty starts today. Need help? Reply here.' },
  },
  order_cancelled: {
    name: 'Order cancelled',
    vars: ['name', 'order_number', 'reason', 'refund_note', 'order_url'],
    email: {
      subject: 'Order {{order_number}} was cancelled',
      body: `Hi {{name}}, order {{order_number}} was cancelled: {{reason}}.

{{refund_note}}

[View the order]({{order_url}})`,
    },
  },
  payment_failed: {
    name: 'Payment failed',
    vars: ['name', 'order_number', 'order_url'],
    email: {
      subject: 'Payment for order {{order_number}} didn’t go through',
      body: `Hi {{name}}, the payment for order {{order_number}} failed, so nothing was charged. Your laptop is held for 30 minutes from when you placed the order.

[Try paying again]({{order_url}})`,
    },
  },
  refund_processed: {
    name: 'Refund sent',
    vars: ['name', 'order_number', 'amount', 'order_url'],
    email: {
      subject: 'Refund of {{amount}} for order {{order_number}}',
      body: `Hi {{name}}, we've refunded **{{amount}}** for order {{order_number}}. Banks usually take 5 to 7 working days to show it.

[View the order]({{order_url}})`,
    },
    sms: { body: 'Refund of {{amount}} for order {{order_number}} sent. It reaches your account in 5-7 working days. - {{brand}}' },
  },
  service_update: {
    name: 'Return / warranty request update',
    vars: ['name', 'request_number', 'kind', 'status', 'note', 'request_url'],
    email: {
      subject: '{{kind}} {{request_number}}: {{status}}',
      body: `Hi {{name}}, your {{kind}} request {{request_number}} is now **{{status}}**.

{{note}}

[See the details]({{request_url}})`,
    },
  },
  ticket_reply: {
    name: 'Support reply',
    vars: ['name', 'ticket_number', 'subject', 'message', 'ticket_url'],
    email: {
      subject: 'Re: {{subject}} [{{ticket_number}}]',
      body: `Hi {{name}},

{{message}}

[Reply or view the conversation]({{ticket_url}})`,
    },
  },
  ticket_received: {
    name: 'Support request received',
    vars: ['name', 'ticket_number', 'subject', 'ticket_url'],
    email: {
      subject: 'We got your message [{{ticket_number}}]',
      body: `Hi {{name}}, thanks for writing. We reply within one working day, usually much sooner. Your reference is **{{ticket_number}}**.`,
    },
  },
  verify_email: {
    name: 'Confirm email address',
    vars: ['name', 'link'],
    email: {
      subject: 'Confirm your email for {{brand}}',
      body: `Hi {{name}}, confirm this is your email address so we can send receipts and let you reset your password. The link works for 24 hours.

[Confirm email]({{link}})

If you didn't create an account, ignore this email.`,
    },
  },
  password_reset: {
    name: 'Reset password',
    vars: ['name', 'link'],
    email: {
      subject: 'Reset your {{brand}} password',
      body: `Hi {{name}}, use this link to choose a new password. It works once, for 30 minutes.

[Choose a new password]({{link}})

If you didn't ask for this, ignore this email; your password stays the same.`,
    },
  },
  student_received: {
    name: 'Student ID received',
    vars: ['name'],
    email: { subject: 'We received your student ID', body: `Thanks, {{name}}. We check IDs within one working day and email you as soon as it's done.` },
  },
  student_approved: {
    name: 'Student verified',
    vars: ['name', 'valid_until', 'shop_url'],
    email: {
      subject: 'You’re verified: 10% off for students',
      body: `Hi {{name}}, your student status is confirmed until {{valid_until}}. The discount is applied automatically at checkout when you're signed in.

[Shop student picks]({{shop_url}})`,
    },
  },
  student_rejected: {
    name: 'Student ID not accepted',
    vars: ['name', 'reason', 'retry_url'],
    email: {
      subject: 'We couldn’t verify your student ID',
      body: `Hi {{name}}, we couldn't verify the ID you sent: {{reason}}.

You can try again with a clearer photo or your college email.

[Try again]({{retry_url}})`,
    },
  },
  staff_new_order: {
    name: 'New order (to the store)',
    vars: ['order_number', 'items', 'total', 'payment', 'ship_to', 'admin_url'],
    email: {
      subject: 'New order {{order_number}}: {{total}}',
      body: `{{items}}

Ship to {{ship_to}}. Total **{{total}}**, {{payment}}.

[Open in admin]({{admin_url}})`,
    },
  },
  newsletter_welcome: {
    name: 'Newsletter welcome',
    vars: ['unsubscribe_url'],
    email: {
      subject: 'You’re on the list',
      body: `Thanks for subscribing. We write when good units arrive and when we publish buying guides; no more than twice a month.

[Unsubscribe]({{unsubscribe_url}})`,
    },
  },
} satisfies Record<string, TemplateDef>;

export type TemplateKey = keyof typeof TEMPLATES;

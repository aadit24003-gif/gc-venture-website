/**
 * Staff roles and what each may do. Customers have no staff permissions.
 * Super admins can do everything; the bootstrap admins in ADMIN_EMAILS / ADMIN_PHONES are super admins.
 */
import type { Role } from './db/schema';

const P = {
  'dashboard.view': ['inventory_manager', 'order_manager', 'support'],
  'analytics.view': ['inventory_manager', 'order_manager'],
  'catalogue.manage': ['inventory_manager'],
  'inventory.manage': ['inventory_manager'],
  /** See purchase costs and margins. */
  'inventory.cost': ['inventory_manager'],
  'orders.view': ['order_manager', 'support'],
  'orders.manage': ['order_manager'],
  'refunds.manage': ['order_manager'],
  'customers.view': ['order_manager', 'support'],
  'coupons.manage': ['order_manager'],
  'service.manage': ['order_manager', 'support'],
  'reviews.moderate': ['support'],
  'tickets.manage': ['support', 'order_manager'],
  'students.review': ['support'],
  'content.manage': [],
  'notifications.manage': [],
  'newsletter.view': [],
  'staff.manage': [],
  'settings.manage': [],
  'audit.view': [],
} satisfies Record<string, Exclude<Role, 'customer' | 'super_admin'>[]>;

export type Permission = keyof typeof P;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role || role === 'customer') return false;
  if (role === 'super_admin') return true;
  return (P[permission] as readonly string[]).includes(role);
}

export const isStaffRole = (role: Role | null | undefined) => !!role && role !== 'customer';

export const ROLE_LABEL: Record<Role, string> = {
  customer: 'Customer',
  super_admin: 'Super admin',
  inventory_manager: 'Inventory manager',
  order_manager: 'Order manager',
  support: 'Support',
};

export const ROLE_HELP: Record<Exclude<Role, 'customer'>, string> = {
  super_admin: 'Everything, including staff, settings, content and the audit log.',
  inventory_manager: 'Laptops, brands, categories, inventory units, inspections, purchase costs.',
  order_manager: 'Orders, shipping, refunds, returns, coupons, customers, tickets.',
  support: 'Tickets, returns and warranty claims, reviews, student checks; can view orders and customers.',
};

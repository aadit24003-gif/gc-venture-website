import { requireStaff } from '@/lib/auth/session';
import { getSettings } from '@/lib/settings';
import { STATES } from '@/lib/india';
import { ActionForm } from '@/components/admin/ActionForm';
import { PageHead, Panel } from '../ui';
import { saveBusiness, saveShipping, saveTax } from './actions';

export const metadata = { title: 'Settings' };
const r = (p: number) => String(p / 100);

function F({ name, label, value, hint, mono, type = 'text', span }: { name: string; label: string; value: string | number | null; hint?: string; mono?: boolean; type?: string; span?: boolean }) {
  return <div className={span ? 'sm:col-span-2' : ''}><label htmlFor={`st-${name}`} className="label">{label}</label><input id={`st-${name}`} name={name} type={type} className={`field ${mono ? 'mono' : ''}`} defaultValue={value ?? ''} />{hint && <p className="hint">{hint}</p>}</div>;
}

export default async function Settings() {
  await requireStaff('settings.manage');
  const s = await getSettings();
  const b = s.business, sh = s.shipping, t = s.tax;
  return (
    <div className="max-w-[980px]">
      <PageHead title="Settings" intro="Changes apply across the store, invoices and policy pages within 30 seconds. Promises such as warranty length and return days live in the code (src/lib/config.ts) because they’re part of the terms." />
      <Panel title="Business details" className="mb-6">
        <ActionForm action={saveBusiness}>
          <div className="grid gap-4 sm:grid-cols-2">
            <F name="legalName" label="Registered business name [CONFIRM]" value={b.legalName} />
            <F name="gstin" label="GSTIN [CONFIRM]" value={b.gstin} mono hint="Printed on tax invoices." />
            <F name="cin" label="CIN (optional)" value={b.cin} mono />
            <F name="email" label="Support email" value={b.email} type="email" />
            <F name="phone" label="Support phone" value={b.phone} />
            <F name="whatsapp" label="WhatsApp number (with 91)" value={b.whatsapp} mono />
            <F name="hours" label="Support hours" value={b.hours} />
            <F name="grievanceName" label="Grievance officer name [CONFIRM]" value={b.grievanceName} hint="Required by the Consumer Protection (E-Commerce) Rules." />
            <F name="grievanceEmail" label="Grievance officer email" value={b.grievanceEmail} type="email" />
            <F name="registeredAddress" label="Registered address" value={b.registeredAddress} span />
            <F name="returnAddress" label="Return address (on labels)" value={b.returnAddress} span />
          </div>
        </ActionForm>
      </Panel>
      <Panel title="Shipping and pay on delivery" className="mb-6">
        <ActionForm action={saveShipping}>
          <div className="grid gap-4 sm:grid-cols-3">
            <F name="flatFee" label="Delivery fee ₹ (0 = free)" value={r(sh.flatFee)} mono />
            <F name="freeAbove" label="Free above ₹ (0 = never)" value={r(sh.freeAbove)} mono />
            <F name="pickupPincode" label="Pickup PIN code" value={sh.pickupPincode} mono />
            <F name="dispatchMin" label="Dispatch, min working days" value={sh.dispatchMin} mono />
            <F name="dispatchMax" label="Dispatch, max working days" value={sh.dispatchMax} mono />
            <div><label htmlFor="st-provider" className="label">Labels and tracking</label><select id="st-provider" name="provider" className="field" defaultValue={sh.provider}><option value="manual">Manual (enter courier and AWB)</option><option value="shiprocket">Shiprocket (needs API keys)</option></select></div>
            <label className="flex items-center gap-2 text-[14px] sm:col-span-3"><input type="checkbox" name="codEnabled" className="check" defaultChecked={sh.codEnabled} /> Offer pay on delivery</label>
            <F name="codFee" label="Pay-on-delivery fee ₹" value={r(sh.codFee)} mono />
            <F name="codMax" label="Pay on delivery up to ₹" value={r(sh.codMax)} mono />
            <label className="flex items-center gap-2 text-[14px] sm:col-span-2"><input type="checkbox" name="bookingEnabled" className="check" defaultChecked={sh.bookingEnabled} /> Offer “book now, pay the rest on delivery” (video call before dispatch)</label>
            <F name="bookingAmount" label="Booking amount ₹" value={r(sh.bookingAmount)} mono />
            <F name="blockedPinPrefixes" label="PIN codes you don’t deliver to" value={sh.blockedPinPrefixes.join(', ')} mono hint="Prefixes, comma-separated, e.g. 744, 682555" />
          </div>
        </ActionForm>
      </Panel>
      <Panel title="GST">
        <ActionForm action={saveTax}>
          <div className="grid gap-4 sm:grid-cols-4">
            <F name="gstRate" label="GST rate %" value={t.gstRate} mono />
            <div><label htmlFor="st-scheme" className="label">Scheme [CONFIRM]</label><select id="st-scheme" name="scheme" className="field" defaultValue={t.scheme}><option value="regular">Regular (on sale price)</option><option value="margin">Margin scheme (second-hand)</option></select></div>
            <div><label htmlFor="st-state" className="label">Your state</label><select id="st-state" name="sellerState" className="field" defaultValue={t.sellerState}>{STATES.map((x) => <option key={x}>{x}</option>)}</select></div>
            <F name="hsn" label="HSN code" value={t.hsn} mono />
          </div>
          <p className="hint mt-2">Prices always include GST. Same-state buyers see CGST + SGST, others IGST. Ask your accountant which scheme applies to refurbished laptops.</p>
        </ActionForm>
      </Panel>
    </div>
  );
}

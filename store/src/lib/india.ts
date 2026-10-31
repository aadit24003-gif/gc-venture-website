export const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;

/** India Post names some states differently; map them to the list above. */
export function matchState(name: string): string | null {
  const n = name.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, ' ').trim();
  if (n.includes('delhi')) return 'Delhi';
  if (n.includes('jammu')) return 'Jammu and Kashmir';
  if (n.includes('dadra') || n.includes('daman')) return 'Dadra and Nagar Haveli and Daman and Diu';
  if (n.includes('pondicherry')) return 'Puducherry';
  if (n.includes('orissa')) return 'Odisha';
  return STATES.find((s) => s.toLowerCase() === n) ?? null;
}

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const isGstin = (v: string) => GSTIN.test(v.trim().toUpperCase());

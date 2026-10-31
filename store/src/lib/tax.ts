/**
 * GST on tax-inclusive prices. Intra-state sales split into CGST + SGST; inter-state is IGST.
 * [CONFIRM] Refurbished goods may use the margin scheme (GST on the margin only). With
 * scheme 'margin' the invoice shows that GST is included without a breakdown.
 */
export type TaxSettings = { gstRate: number; scheme: 'regular' | 'margin'; sellerState: string; hsn: string };

export type TaxBreakdown = {
  scheme: 'regular' | 'margin';
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
  interState: boolean;
};

export function gstFromInclusive(amount: number, t: TaxSettings, buyerState: string | null | undefined): TaxBreakdown {
  const interState = !!buyerState && buyerState.trim().toLowerCase() !== t.sellerState.trim().toLowerCase();
  if (t.scheme === 'margin' || !t.gstRate) {
    return { scheme: t.scheme, rate: t.gstRate, taxable: amount, cgst: 0, sgst: 0, igst: 0, tax: 0, interState };
  }
  const taxable = Math.round((amount * 100) / (100 + t.gstRate));
  const tax = amount - taxable;
  if (interState) return { scheme: 'regular', rate: t.gstRate, taxable, cgst: 0, sgst: 0, igst: tax, tax, interState };
  const cgst = Math.floor(tax / 2);
  return { scheme: 'regular', rate: t.gstRate, taxable, cgst, sgst: tax - cgst, igst: 0, tax, interState };
}

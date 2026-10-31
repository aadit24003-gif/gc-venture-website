'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}><Printer size={16} /> Print or save as PDF</button>;
}

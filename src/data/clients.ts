/**
 * Client names shown in "Trusted by" sections.
 * - `show: false` hides a name until permission/relationship is confirmed.
 * - Add `logo: '/clients/<file>.svg'` (monochrome works best) to replace
 *   the typeset name with the real logo. Files go in /public/clients/.
 */
export interface Client {
  name: string;
  sector: 'Banking and insurance' | 'Customer experience and staffing' | 'Technology and telecom' | 'Media, hospitality and industry';
  logo?: string;
  show: boolean;
}

export const CLIENTS: Client[] = [
  { name: 'ICICI Lombard', sector: 'Banking and insurance', show: true },
  { name: 'HDB Financial Services', sector: 'Banking and insurance', show: true },
  { name: 'Bajaj Finserv', sector: 'Banking and insurance', show: true },
  { name: 'Xceedance', sector: 'Banking and insurance', show: true },
  { name: 'Genpact', sector: 'Customer experience and staffing', show: true },
  { name: 'Transcom', sector: 'Customer experience and staffing', show: true },
  { name: 'Majorel', sector: 'Customer experience and staffing', show: true },
  { name: 'Maxicus', sector: 'Customer experience and staffing', show: true },
  { name: 'TeamLease', sector: 'Customer experience and staffing', show: true },
  { name: 'OLX People', sector: 'Customer experience and staffing', show: true },
  { name: 'Wipro', sector: 'Technology and telecom', show: true },
  { name: 'Nokia Networks', sector: 'Technology and telecom', show: true },
  { name: 'IndiaCast', sector: 'Media, hospitality and industry', show: true },
  { name: 'Trident Hotels', sector: 'Media, hospitality and industry', show: true },
  { name: 'Hero Group', sector: 'Media, hospitality and industry', show: true },
  { name: 'IFB', sector: 'Media, hospitality and industry', show: true },
  { name: 'BESCOM', sector: 'Media, hospitality and industry', show: true },
  // Referenced on the previous site; publish only once confirmed.
  { name: 'Ericsson', sector: 'Technology and telecom', show: false },
  { name: 'Samsung', sector: 'Technology and telecom', show: false },
  { name: 'Tower', sector: 'Technology and telecom', show: false },
  { name: 'Xceed', sector: 'Technology and telecom', show: false },
];

export const visibleClients = CLIENTS.filter((c) => c.show);
export const clientsBySector = () => {
  const map = new Map<Client['sector'], Client[]>();
  for (const c of visibleClients) map.set(c.sector, [...(map.get(c.sector) ?? []), c]);
  return [...map.entries()];
};

/**
 * Testimonials: publish only with written approval.
 * The previous site named Balaji Viswanathan, Charandeep Dora and Manoj Chandran;
 * add their quotes here (with role and company) once reuse is approved.
 */
export interface Testimonial { quote: string; name: string; role: string; company: string }
export const TESTIMONIALS: Testimonial[] = [];

/** Case studies: structure ready, intentionally empty until real ones are written. */
export interface CaseStudy {
  slug: string; client: string; industry: string; requirement: string; scale: string;
  solution: string; equipment: string[]; deployment: string; result: string;
}
export const CASE_STUDIES: CaseStudy[] = [];

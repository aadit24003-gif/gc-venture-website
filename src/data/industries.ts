/** Industries served (from the company profile). `kit` describes typical setups, not past deployments. */
export interface Industry {
  id: string;
  name: string;
  icon: string;
  need: string;
  kit: string[];
}

export const INDUSTRIES: Industry[] = [
  { id: 'bpo', name: 'BPO and KPO', icon: 'headset', need: 'Identical seats for a new process, ready before the client go-live date.', kit: ['Desktops with monitors', 'Business laptops', 'Mini PCs'] },
  { id: 'it', name: 'IT and software', icon: 'code-xml', need: 'Machines for project teams and contractors, returned when the engagement ends.', kit: ['Core i7 laptops', 'MacBook Pro', 'Test servers'] },
  { id: 'bfsi', name: 'Banking and financial services', icon: 'landmark', need: 'Clean, wipeable devices that IT can lock down to policy for audits and peaks.', kit: ['Business laptops', 'Desktops', 'MacBooks'] },
  { id: 'healthcare', name: 'Healthcare', icon: 'stethoscope', need: 'Front-desk and back-office equipment for new wings, camps and drives.', kit: ['Desktops', 'Monitors', 'Laptops'] },
  { id: 'staffing', name: 'Manpower and outsourcing', icon: 'users', need: 'Devices that follow headcount up and down as contracts change.', kit: ['Laptops', 'Mobile phones', 'Desktops'] },
  { id: 'telecom', name: 'Telecom', icon: 'radio-tower', need: 'Kit for field teams, network rollouts and temporary site offices.', kit: ['Laptops', 'Mobile phones', 'Routers'] },
  { id: 'education', name: 'Education and training', icon: 'graduation-cap', need: 'Labs and exam halls for a batch or a term, set up identically per seat.', kit: ['Desktops', 'Laptops', 'Monitors and networking'] },
  { id: 'ecommerce', name: 'E-commerce and retail', icon: 'shopping-cart', need: 'Extra capacity for sale seasons, new warehouses and dark stores.', kit: ['Laptops', 'Desktops', 'Networking'] },
  { id: 'manufacturing', name: 'Manufacturing', icon: 'factory', need: 'Plant-office desktops and supervisor laptops during expansions.', kit: ['Desktops', 'Laptops', 'Monitors'] },
  { id: 'logistics', name: 'Logistics and supply chain', icon: 'truck', need: 'Equipment for new hubs that needs to be live in days, not weeks.', kit: ['Laptops', 'Routers', 'Mobile phones'] },
  { id: 'hospitality', name: 'Hospitality', icon: 'concierge-bell', need: 'Event and banquet tech, plus cover while owned hardware is replaced.', kit: ['Laptops', 'Monitors', 'Wi-Fi'] },
  { id: 'government', name: 'Government and public sector', icon: 'building', need: 'Fixed-term programmes, project offices and election or census work.', kit: ['Desktops', 'Laptops', 'Servers'] },
];

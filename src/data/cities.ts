/**
 * Cities we serve. `office: true` only where a physical office exists
 * (see OFFICES in src/config/site.ts). Everything else is worded as
 * "serving businesses in …", never "our … office".
 *
 * Each page gets unique copy: intro, business areas, industries and FAQs.
 * `page: false` shows the city on the map without its own landing page.
 */
import type { FAQ } from './categories';

export interface City {
  id: string;
  name: string;
  /** search-friendly name used in URL + titles */
  seoName: string;
  state: string;
  region: 'North' | 'West' | 'South' | 'East';
  office: boolean;
  page: boolean;
  lat: number;
  lng: number;
  areas: string[];
  industries: string[];
  intro: string;
  note: string;
  faqs: FAQ[];
}

export const CITIES: City[] = [
  {
    id: 'gurgaon', name: 'Gurgaon', seoName: 'gurgaon', state: 'Haryana', region: 'North', office: true, page: true,
    lat: 28.4595, lng: 77.0266,
    areas: ['Cyber City', 'Udyog Vihar', 'Golf Course Road', 'Sohna Road', 'Sector 49', 'Manesar'],
    industries: ['BPO and KPO', 'IT and software', 'Consulting', 'Startups'],
    intro: 'Setting up a team in Gurgaon shouldn’t mean locking lakhs into hardware. Our office is in Sector 49 on Sohna Road, so laptops, desktops and network kit for Cyber City, Udyog Vihar and Golf Course Road come from down the road, not from another state.',
    note: 'Support for Gurgaon customers runs from our Sector 49 office.',
    faqs: [
      { q: 'Do you have an office in Gurgaon?', a: 'Yes. Our office is at Spaze iTech Park, Sector 49, Sohna Road. You are welcome to visit and see the equipment before you rent.' },
      { q: 'Can you equip a new floor in Cyber City or Udyog Vihar?', a: 'Yes. Share the seat count, move-in date and software list. We plan delivery and setup with your facilities team so desks are ready on day one.' },
      { q: 'Do you deliver to Manesar and the rest of NCR?', a: 'Yes. We deliver across Gurgaon, Manesar, Delhi, Noida and Ghaziabad.' },
    ],
  },
  {
    id: 'delhi', name: 'Delhi', seoName: 'delhi', state: 'Delhi', region: 'North', office: false, page: true,
    lat: 28.6139, lng: 77.209,
    areas: ['Nehru Place', 'Connaught Place', 'Okhla', 'Saket', 'Karol Bagh', 'Dwarka'],
    industries: ['Government and public sector', 'Media', 'Education and training', 'Events'],
    intro: 'Delhi customers rent from us for everything from a ministry project office to a three-day conference at Pragati Maidan. We serve Nehru Place, Connaught Place, Okhla, Saket and Dwarka from our Gurgaon base, a short drive across NCR.',
    note: 'Serving Delhi from our Gurgaon office.',
    faqs: [
      { q: 'Do you rent laptops for events and conferences in Delhi?', a: 'Yes. Registration laptops, displays, Wi-Fi and phones for the event days, delivered before setup and collected after.' },
      { q: 'Can government and PSU projects rent from you?', a: 'Yes. We work with project offices on fixed-term rentals and can match your documentation and billing requirements.' },
      { q: 'Where is support handled for Delhi?', a: 'From our Gurgaon office, which covers all of Delhi NCR.' },
    ],
  },
  {
    id: 'noida', name: 'Noida', seoName: 'noida', state: 'Uttar Pradesh', region: 'North', office: false, page: true,
    lat: 28.5355, lng: 77.391,
    areas: ['Sector 62', 'Sector 63', 'Sector 16', 'Sector 125', 'Noida Expressway', 'Greater Noida'],
    industries: ['IT services', 'BPO', 'Media and broadcasting', 'Electronics manufacturing'],
    intro: 'Noida’s IT parks along Sector 62, 63 and the Expressway run large, shift-based teams that grow and shrink with contracts. Renting lets those floors scale without a procurement cycle each time a new process goes live.',
    note: 'Serving Noida and Greater Noida from our NCR operations.',
    faqs: [
      { q: 'Can you set up desktops for a new BPO process in Noida?', a: 'Yes. We rent complete seats (CPU, monitor, keyboard, mouse) imaged identically, plus switches to connect the floor.' },
      { q: 'Do you deliver to Greater Noida?', a: 'Yes, along with Noida and the rest of NCR.' },
    ],
  },
  {
    id: 'ghaziabad', name: 'Ghaziabad', seoName: 'ghaziabad', state: 'Uttar Pradesh', region: 'North', office: false, page: true,
    lat: 28.6692, lng: 77.4538,
    areas: ['Indirapuram', 'Vaishali', 'Kaushambi', 'Raj Nagar Extension', 'Sahibabad'],
    industries: ['Manufacturing', 'Logistics', 'Education', 'Retail'],
    intro: 'Ghaziabad’s industrial belt in Sahibabad and its fast-growing offices in Indirapuram and Kaushambi need practical, durable equipment: desktops for plant offices, laptops for supervisors, and networking for new warehouses.',
    note: 'Serving Ghaziabad from our NCR operations.',
    faqs: [
      { q: 'Do you rent equipment for factories and warehouses?', a: 'Yes. Desktops for plant offices, laptops for supervisors, and routers and switches for warehouse networks.' },
      { q: 'Which areas of Ghaziabad do you cover?', a: 'Indirapuram, Vaishali, Kaushambi, Raj Nagar Extension, Sahibabad and nearby areas.' },
    ],
  },
  {
    id: 'bangalore', name: 'Bangalore', seoName: 'bangalore', state: 'Karnataka', region: 'South', office: true, page: true,
    lat: 12.9716, lng: 77.5946,
    areas: ['HSR Layout', 'Koramangala', 'Whitefield', 'Electronic City', 'Outer Ring Road', 'Bellandur'],
    industries: ['Startups', 'IT and software', 'Global capability centres', 'Product engineering'],
    intro: 'Bangalore teams hire fast and reorganise often. Our HSR Layout office supplies laptops and MacBooks to startups in Koramangala, engineering centres on the Outer Ring Road and delivery teams in Whitefield and Electronic City.',
    note: 'Support for Bangalore customers runs from our HSR Layout office.',
    faqs: [
      { q: 'Do you have an office in Bangalore?', a: 'Yes, in HSR Layout. Support and deliveries for the city run from there.' },
      { q: 'Can startups rent MacBooks in Bangalore?', a: 'Yes. MacBook Air and Pro on Apple silicon, delivered with a clean macOS install for your MDM.' },
      { q: 'Can we add laptops month by month as we hire?', a: 'Yes. Add devices whenever you need them and return them when headcount changes. There is no lock-in.' },
    ],
  },
  {
    id: 'mumbai', name: 'Mumbai', seoName: 'mumbai', state: 'Maharashtra', region: 'West', office: false, page: true,
    lat: 19.076, lng: 72.8777,
    areas: ['BKC', 'Andheri (SEEPZ)', 'Powai', 'Lower Parel', 'Navi Mumbai', 'Thane'],
    industries: ['Banking and financial services', 'Media and entertainment', 'Consulting', 'Events'],
    intro: 'Mumbai’s banks, media houses and consultancies rent when the work has a clear end date: an audit season in BKC, a production in Andheri, a client project in Lower Parel. We deliver across the city and Navi Mumbai.',
    note: 'Serving businesses in Mumbai, Navi Mumbai and Thane.',
    faqs: [
      { q: 'Do you rent laptops to banks and financial firms in Mumbai?', a: 'Yes. We deliver clean, wiped machines that your IT team can image and secure to your policy, and wipe them again on return.' },
      { q: 'Can production houses rent high-performance machines?', a: 'Yes. Ask for MacBook Pro or high-performance Windows laptops and we confirm current configurations.' },
    ],
  },
  {
    id: 'pune', name: 'Pune', seoName: 'pune', state: 'Maharashtra', region: 'West', office: false, page: true,
    lat: 18.5204, lng: 73.8567,
    areas: ['Hinjewadi', 'Kharadi', 'Magarpatta', 'Baner', 'Viman Nagar'],
    industries: ['IT services', 'Automotive engineering', 'Education', 'Startups'],
    intro: 'Pune’s IT parks in Hinjewadi, Kharadi and Magarpatta staff projects in waves. Renting matches hardware to those waves: equip a 60-person team for a nine-month contract, then hand the machines back.',
    note: 'Serving businesses across Pune.',
    faqs: [
      { q: 'Can you equip a project team in Hinjewadi?', a: 'Yes. Tell us the headcount, start date and software and we deliver configured laptops to your office.' },
      { q: 'Do you rent to colleges and training institutes in Pune?', a: 'Yes. Desktops or laptops for labs, exams and training batches.' },
    ],
  },
  {
    id: 'hyderabad', name: 'Hyderabad', seoName: 'hyderabad', state: 'Telangana', region: 'South', office: false, page: true,
    lat: 17.385, lng: 78.4867,
    areas: ['HITEC City', 'Gachibowli', 'Madhapur', 'Financial District', 'Kondapur'],
    industries: ['Global capability centres', 'Pharma and life sciences', 'IT services', 'BPO'],
    intro: 'HITEC City, Gachibowli and the Financial District host some of India’s largest delivery centres. Renting gives those teams a way to staff up for a new client or migration without waiting on global procurement.',
    note: 'Serving businesses across Hyderabad.',
    faqs: [
      { q: 'Can you supply laptops for a new delivery centre in Hyderabad?', a: 'Yes. We handle large orders and stagger delivery to match your onboarding plan.' },
      { q: 'Do you provide desktops for BPO floors in Hyderabad?', a: 'Yes, as complete seats with monitors, plus networking for the floor.' },
    ],
  },
  {
    id: 'chennai', name: 'Chennai', seoName: 'chennai', state: 'Tamil Nadu', region: 'South', office: false, page: true,
    lat: 13.0827, lng: 80.2707,
    areas: ['OMR', 'Guindy', 'Sholinganallur', 'Tidel Park', 'Ambattur'],
    industries: ['IT services', 'Automotive', 'Manufacturing', 'BPO'],
    intro: 'Chennai combines the IT corridor along OMR with a deep manufacturing base around Ambattur and beyond. We rent laptops for the first and desktops and networking for the plant offices of the second.',
    note: 'Serving businesses across Chennai.',
    faqs: [
      { q: 'Do you serve companies along OMR?', a: 'Yes, including Sholinganallur, Tidel Park and the wider IT corridor.' },
      { q: 'Can manufacturers rent equipment for plant offices?', a: 'Yes. Desktops, monitors and networking for plant and warehouse offices.' },
    ],
  },
  {
    id: 'kolkata', name: 'Kolkata', seoName: 'kolkata', state: 'West Bengal', region: 'East', office: false, page: true,
    lat: 22.5726, lng: 88.3639,
    areas: ['Salt Lake Sector V', 'New Town', 'Rajarhat', 'Park Street'],
    industries: ['IT services', 'BPO', 'Education', 'Government'],
    intro: 'Salt Lake Sector V and New Town anchor Kolkata’s IT and BPO industry. We rent laptops and desktops to teams there, and equipment for the city’s training institutes and public-sector projects.',
    note: 'Serving businesses in Kolkata. Delivery and support are arranged through our pan-India operations.',
    faqs: [
      { q: 'Do you have an office in Kolkata?', a: 'No. We serve Kolkata through our pan-India operations, with delivery and support arranged for your site.' },
      { q: 'Which areas do you deliver to?', a: 'Salt Lake Sector V, New Town, Rajarhat and central Kolkata.' },
    ],
  },
  {
    id: 'jaipur', name: 'Jaipur', seoName: 'jaipur', state: 'Rajasthan', region: 'North', office: false, page: true,
    lat: 26.9124, lng: 75.7873,
    areas: ['Sitapura', 'Malviya Nagar', 'Mansarovar', 'Vaishali Nagar', 'Mahindra World City'],
    industries: ['BPO', 'Education and training', 'Hospitality', 'Government'],
    intro: 'Jaipur’s BPOs in Sitapura and Mahindra World City, its training institutes and its hotels all need equipment for defined periods. We rent laptops and desktops for each, plus displays and networking for events in the city.',
    note: 'Serving businesses across Jaipur.',
    faqs: [
      { q: 'Do you rent equipment for hotels and events in Jaipur?', a: 'Yes. Laptops, displays, Wi-Fi and phones for weddings, conferences and corporate offsites.' },
      { q: 'Can training institutes rent desktops?', a: 'Yes, as complete seats for labs and exam centres.' },
    ],
  },
  {
    id: 'lucknow', name: 'Lucknow', seoName: 'lucknow', state: 'Uttar Pradesh', region: 'North', office: false, page: true,
    lat: 26.8467, lng: 80.9462,
    areas: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Vibhuti Khand'],
    industries: ['Government and public sector', 'Education', 'Healthcare', 'Banking'],
    intro: 'Lucknow’s demand comes from government projects, universities, hospitals and bank back offices. Many are fixed-term programmes, which suit rental better than purchase.',
    note: 'Serving businesses in Lucknow. Delivery and support are arranged through our pan-India operations.',
    faqs: [
      { q: 'Do you have an office in Lucknow?', a: 'No. We serve Lucknow through our pan-India operations.' },
      { q: 'Can government programmes rent equipment for a fixed term?', a: 'Yes. Rental periods can match the programme timeline.' },
    ],
  },
  {
    id: 'chandigarh', name: 'Chandigarh', seoName: 'chandigarh', state: 'Chandigarh', region: 'North', office: false, page: true,
    lat: 30.7333, lng: 76.7794,
    areas: ['IT Park', 'Mohali', 'Panchkula', 'Industrial Area Phase I & II'],
    industries: ['IT services', 'BPO', 'Education', 'Healthcare'],
    intro: 'We serve the whole Tricity: Chandigarh’s IT Park, Mohali’s growing tech and BPO companies, and Panchkula. Teams there rent to add seats quickly without tying up capital.',
    note: 'Serving Chandigarh, Mohali and Panchkula.',
    faqs: [
      { q: 'Do you cover Mohali and Panchkula?', a: 'Yes, all of the Tricity.' },
      { q: 'Can you supply laptops for a BPO expansion in Mohali?', a: 'Yes. Tell us the seat count and timeline.' },
    ],
  },
  {
    id: 'kochi', name: 'Kochi', seoName: 'kerala', state: 'Kerala', region: 'South', office: false, page: true,
    lat: 9.9312, lng: 76.2673,
    areas: ['Infopark Kochi', 'Kakkanad', 'Technopark Trivandrum', 'SmartCity Kochi'],
    industries: ['IT services', 'Healthcare', 'Tourism and hospitality', 'Education'],
    intro: 'Kerala’s IT parks, Infopark in Kochi and Technopark in Thiruvananthapuram, house services firms that scale with client contracts. We rent laptops and desktops to teams in both, and to hospitals and institutions across the state.',
    note: 'Serving businesses in Kochi and Thiruvananthapuram.',
    faqs: [
      { q: 'Do you serve Technopark in Thiruvananthapuram?', a: 'Yes, as well as Infopark and SmartCity in Kochi.' },
      { q: 'Do you have an office in Kerala?', a: 'No. We serve Kerala through our pan-India operations, with delivery and support arranged for your site.' },
    ],
  },
  // Service areas shown on the map without dedicated pages yet.
  { id: 'surat', name: 'Surat', seoName: 'surat', state: 'Gujarat', region: 'West', office: false, page: false, lat: 21.1702, lng: 72.8311, areas: [], industries: [], intro: '', note: '', faqs: [] },
  { id: 'patna', name: 'Patna', seoName: 'patna', state: 'Bihar', region: 'East', office: false, page: false, lat: 25.5941, lng: 85.1376, areas: [], industries: [], intro: '', note: '', faqs: [] },
];

export const cityPath = (c: City) => `/laptop-on-rent-in-${c.seoName}/`;
export const pageCities = CITIES.filter((c) => c.page);
export const cityById = (id: string) => CITIES.find((c) => c.id === id);

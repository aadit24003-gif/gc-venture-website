/**
 * Equipment categories. Each one powers a service page (/<slug>/),
 * a catalogue filter, nav entries and the hero chip pile.
 * To add a service: add an entry here. No component changes needed.
 */

export type Hue = 'ink' | 'red' | 'green' | 'blue' | 'amber' | 'paper';

export interface FAQ { q: string; a: string }

export interface Category {
  id: string;
  /** URL slug of the service page */
  slug: string;
  name: string;            // "Laptop rental"
  noun: string;            // "laptops"
  icon: string;            // lucide icon name
  hue: Hue;
  group: 'computing' | 'apple' | 'infrastructure' | 'mobility';
  /** true = devices of this type exist in the catalogue data */
  hasCatalogue: boolean;
  navBlurb: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  /** What the customer actually gets, in plain terms */
  included: string[];
  /** Configuration tiers. Descriptive ranges, not stock claims. */
  tiers?: { name: string; spec: string; fit: string }[];
  useCases: { title: string; text: string }[];
  faqs: FAQ[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'laptops',
    slug: 'laptop-rental',
    name: 'Laptop rental',
    noun: 'laptops',
    icon: 'laptop',
    hue: 'ink',
    group: 'computing',
    hasCatalogue: true,
    navBlurb: 'ThinkPad, Latitude, EliteBook. Core i5 to Core Ultra.',
    seoTitle: 'Laptop on Rent for Business | Laptop Rental India',
    seoDescription:
      'Rent business laptops from Lenovo, Dell and HP for teams of 10 to 1,000+. Configured before delivery, supported until return. Get a quote.',
    h1: 'Laptop rental for teams of ten to a thousand',
    intro:
      'Business laptops from the Lenovo ThinkPad, Dell Latitude and HP EliteBook ranges, from 6th Gen Intel Core i5 to the latest Core Ultra, with the processor, memory and storage chosen on each model. Every machine is checked, imaged with the software you specify and labelled before it leaves us, so your people log in on day one.',
    included: [
      'Charger and asset tag with every unit',
      'Windows, Office and your company software pre-installed',
      'Replacement if a device fails',
      'Pickup at the end of the rental',
    ],
    tiers: [
      { name: 'Business essentials', spec: 'Core i5 (6th–8th Gen), 8 GB RAM, 256 GB SSD', fit: 'Email, CRM, browser-based work, BPO seats' },
      { name: 'Productivity', spec: 'Core i5 (10th–13th Gen), 8–16 GB RAM, 256–512 GB NVMe SSD', fit: 'Heavy spreadsheets, multitasking, analysts' },
      { name: 'Premium', spec: 'Core Ultra 5 or 7, 16 GB RAM, 512 GB NVMe SSD', fit: 'Managers, client-facing teams, travel' },
      { name: 'High performance', spec: 'Core Ultra 7 or 9, 32 GB RAM, 1 TB NVMe SSD', fit: 'Developers, data work, design tools' },
    ],
    useCases: [
      { title: 'New office or branch', text: 'Equip a full floor before the lease starts, without a capital purchase order.' },
      { title: 'Project teams', text: 'Rent for the length of the contract and return the machines when the project closes.' },
      { title: 'Hiring drives', text: 'Add 30 seats this month, 80 next month, and scale back after the peak.' },
      { title: 'Training batches', text: 'Identical, pre-imaged machines per trainee, collected after the batch.' },
    ],
    faqs: [
      { q: 'Which laptop brands can I rent?', a: 'Mostly Lenovo ThinkPad, Dell Latitude and HP EliteBook business ranges, plus Apple MacBooks. Tell us the specification you need and we will confirm what is available for your dates.' },
      { q: 'Can you install our software before delivery?', a: 'Yes. Share your software list or a reference image and we set every machine up the same way before dispatch.' },
      { q: 'What happens if a laptop stops working?', a: 'Report it through support and we replace the device. Your team keeps working on a spare while we handle the faulty unit.' },
      { q: 'Is there a minimum quantity?', a: 'Laptop rentals start at 10 units. From there we handle orders of 50, 100 or several hundred, and larger orders get tailored pricing.' },
    ],
  },
  {
    id: 'macbooks',
    slug: 'macbook-rental',
    name: 'MacBook rental',
    noun: 'MacBooks',
    icon: 'laptop-minimal',
    hue: 'paper',
    group: 'apple',
    hasCatalogue: true,
    navBlurb: 'MacBook Air and Pro from 2019 to M5, plus iMac.',
    seoTitle: 'MacBook on Rent | MacBook Air & Pro Rental',
    seoDescription:
      'Rent MacBook Air and MacBook Pro from 2019 to M5, M5 Pro and M5 Max, plus iMac, for design, development and leadership teams. Get a quote.',
    h1: 'MacBook rental for design, engineering and leadership teams',
    intro:
      'MacBook Air and MacBook Pro in every generation from the 2019 Intel models to M5, plus iMac for fixed desks. Useful when a project needs macOS for a few months, a design team grows quickly, or new joiners expect a Mac on day one.',
    included: [
      'Charger with every unit',
      'Clean macOS install, ready for your MDM enrolment',
      'Replacement if a device fails',
      'Data wipe on return',
    ],
    tiers: [
      { name: 'MacBook Air', spec: 'Intel 2019–2020 or M1 to M5, 8–32 GB, 13 or 15 inch', fit: 'Product, marketing, leadership' },
      { name: 'MacBook Pro', spec: 'M1 to M5, including Pro and Max chips, up to 128 GB', fit: 'Developers, video, design' },
      { name: 'iMac', spec: 'All-in-one desktop', fit: 'Studios, reception, fixed design desks' },
    ],
    useCases: [
      { title: 'iOS and macOS development', text: 'Give contractors a build machine for the length of the engagement.' },
      { title: 'Design sprints', text: 'Add Macs for an agency team working on-site for a few weeks.' },
      { title: 'Leadership offsites', text: 'Short-term Macs for presentations, events and visiting executives.' },
    ],
    faqs: [
      { q: 'Which Apple chips do you offer?', a: 'Every MacBook Air and MacBook Pro generation from the 2019 Intel models to M5, including Pro and Max chips. Exact chip, memory and storage depend on what is in stock for your dates; we confirm it in the quote.' },
      { q: 'Can the Macs be enrolled in our MDM?', a: 'Yes. We deliver a clean macOS install so your IT team can enrol devices in Jamf, Intune or any other MDM.' },
      { q: 'Do you rent iMacs?', a: 'Yes, for fixed desks and studios. Ask for current configurations.' },
    ],
  },
  {
    id: 'desktops',
    slug: 'desktop-rental',
    name: 'Desktop rental',
    noun: 'desktops',
    icon: 'monitor-smartphone',
    hue: 'blue',
    group: 'computing',
    hasCatalogue: true,
    navBlurb: 'OptiPlex, ThinkCentre and mini PCs, with monitors.',
    seoTitle: 'Desktop on Rent | Computer Rental for Offices',
    seoDescription:
      'Rent desktops and mini PCs from Dell OptiPlex, Lenovo ThinkCentre and HP with monitors, keyboards and mice. Ideal for BPO floors and training labs.',
    h1: 'Desktop rental for floors, labs and fixed seats',
    intro:
      'Dell OptiPlex, Lenovo ThinkCentre and HP desktops, including compact mini PCs that mount behind a monitor. Rented as complete seats: CPU, monitor, keyboard and mouse, imaged identically so every workstation behaves the same.',
    included: [
      'CPU with monitor, keyboard and mouse as a complete seat',
      'Identical software image across every seat',
      'Replacement if a unit fails',
      'Pickup and data wipe at the end of the rental',
    ],
    useCases: [
      { title: 'BPO and KPO floors', text: 'Stand up 50 or 500 identical seats for a new process or client.' },
      { title: 'Exam and training labs', text: 'Short-term labs for assessments, recruitment tests and classroom batches.' },
      { title: 'Back offices', text: 'Fixed workstations for accounts, operations and reception.' },
    ],
    faqs: [
      { q: 'Do desktops come with monitors?', a: 'Yes, we rent complete seats. You can also rent CPUs or monitors on their own.' },
      { q: 'Can you set up a whole floor?', a: 'Yes. Tell us the seat count, layout and software and we plan delivery and installation with your facilities team.' },
    ],
  },
  {
    id: 'monitors',
    slug: 'monitor-rental',
    name: 'Monitor rental',
    noun: 'monitors',
    icon: 'monitor',
    hue: 'paper',
    group: 'computing',
    hasCatalogue: true,
    navBlurb: '21.5" to 24" FHD displays from HP, Dell, Lenovo.',
    seoTitle: 'Monitor on Rent | 22" & 24" Monitor Rental',
    seoDescription:
      'Rent 21.5", 22" and 24" full-HD monitors from HP, Dell and Lenovo for desks, dual-screen setups and events. Get a quote.',
    h1: 'Monitor rental for desks, dual screens and events',
    intro:
      'Full-HD monitors from HP, Dell and Lenovo in 21.5 to 24 inch sizes. Add a second screen for analysts, complete a desktop seat, or line up displays for a training room or event.',
    included: ['Power and display cables', 'Replacement if a unit fails', 'Pickup at the end of the rental'],
    useCases: [
      { title: 'Dual-screen setups', text: 'A second display for finance, trading and support teams.' },
      { title: 'Events and exhibitions', text: 'Displays for registration desks, demos and stalls.' },
    ],
    faqs: [
      { q: 'Which sizes are available?', a: 'Mostly 21.5", 22" and 24" full-HD panels. Ask for larger sizes and we will check.' },
    ],
  },
  {
    id: 'servers',
    slug: 'server-rental',
    name: 'Server rental',
    noun: 'servers',
    icon: 'server',
    hue: 'green',
    group: 'infrastructure',
    hasCatalogue: false,
    navBlurb: 'Rack and tower servers for projects and migrations.',
    seoTitle: 'Server on Rent | Rack & Tower Server Rental',
    seoDescription:
      'Rent rack and tower servers for migrations, test environments, events and temporary sites. Configured to your requirement. Get a quote.',
    h1: 'Server rental for migrations, test labs and temporary sites',
    intro:
      'Rack and tower servers rented for as long as the work needs them. Common reasons: a data-centre migration that needs swing capacity, a test environment for a project, or compute for a temporary site.',
    included: ['Configuration to your CPU, memory and storage requirement', 'Delivery and installation support', 'Replacement if hardware fails', 'Secure data wipe on return'],
    useCases: [
      { title: 'Migration swing capacity', text: 'Run workloads on rented hardware while production moves.' },
      { title: 'Test and staging', text: 'A staging environment for the length of a project.' },
      { title: 'Temporary sites', text: 'On-premise compute for events, camps and short-term offices.' },
    ],
    faqs: [
      { q: 'Can you configure the server to our specification?', a: 'Share the CPU, memory, storage and RAID requirement and we confirm a matching configuration in the quote.' },
    ],
  },
  {
    id: 'routers',
    slug: 'router-rental',
    name: 'Router rental',
    noun: 'routers',
    icon: 'router',
    hue: 'green',
    group: 'infrastructure',
    hasCatalogue: false,
    navBlurb: 'Routers and Wi-Fi for sites, events and branches.',
    seoTitle: 'Router on Rent | Wi-Fi & Router Rental',
    seoDescription:
      'Rent business routers and Wi-Fi equipment for temporary sites, events and new branches. Delivered and supported. Get a quote.',
    h1: 'Router and Wi-Fi rental for sites, branches and events',
    intro:
      'Business routers and wireless equipment for the period you need them. Pair them with rented laptops and desktops to set up a complete temporary site.',
    included: ['Configuration support', 'Replacement if a unit fails', 'Pickup at the end of the rental'],
    useCases: [
      { title: 'New branches', text: 'Connectivity while permanent infrastructure is procured.' },
      { title: 'Conferences', text: 'Wi-Fi coverage for delegates and exhibitors.' },
    ],
    faqs: [{ q: 'Do you provide the internet connection?', a: 'We rent the equipment. The internet line comes from your ISP; we help connect it.' }],
  },
  {
    id: 'phones',
    slug: 'mobile-phone-rental',
    name: 'Mobile phone rental',
    noun: 'mobile phones',
    icon: 'smartphone',
    hue: 'amber',
    group: 'mobility',
    hasCatalogue: false,
    navBlurb: 'Android and iPhone handsets for field and test teams.',
    seoTitle: 'Mobile Phone on Rent | Smartphone Rental',
    seoDescription:
      'Rent Android phones and iPhones for field teams, app testing and events. Monthly rental with replacement support. Get a quote.',
    h1: 'Mobile phone rental for field teams and app testing',
    intro:
      'Android handsets and iPhones for teams that need a company phone for a fixed period: field sales, survey teams, event staff, or QA teams testing apps across devices.',
    included: ['Charger with every handset', 'Factory reset before delivery and after return', 'Replacement if a handset fails'],
    useCases: [
      { title: 'Field teams', text: 'Company phones for surveys, audits and seasonal sales.' },
      { title: 'App testing', text: 'A spread of handsets for QA across screen sizes and OS versions.' },
    ],
    faqs: [{ q: 'Do the phones come with SIM cards?', a: 'No. We rent the handsets; you add your own SIMs or eSIM plans.' }],
  },
  {
    id: 'other',
    slug: 'it-equipment-rental',
    name: 'Other IT hardware',
    noun: 'IT equipment',
    icon: 'package',
    hue: 'paper',
    group: 'infrastructure',
    hasCatalogue: false,
    navBlurb: 'Anything else your setup needs. Ask us.',
    seoTitle: 'IT Equipment on Rent | IT Infrastructure Rental',
    seoDescription:
      'Rent complete IT setups: laptops, desktops, servers, networking and phones from one supplier, delivered and supported across India.',
    h1: 'IT equipment rental for complete setups',
    intro:
      'Most customers rent more than one kind of device. Tell us the whole setup, from seats to servers to network, and we quote it as one order with one point of contact.',
    included: ['One quote and one invoice for the full setup', 'Delivery planned around your go-live date', 'Single support contact for every device'],
    useCases: [
      { title: 'New office in a box', text: 'Laptops, desktops, monitors and Wi-Fi for a new site.' },
      { title: 'Events', text: 'Registration laptops, displays, Wi-Fi and phones for the event days.' },
      { title: 'Emergency replacement', text: 'Cover for hardware lost to theft, damage or delayed procurement.' },
    ],
    faqs: [{ q: 'Can you rent something not listed here?', a: 'Often, yes. Describe what you need and we will tell you quickly whether we can supply it.' }],
  },
];

export const categoryById = (id: string) => CATEGORIES.find((c) => c.id === id);
export const categoryBySlug = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

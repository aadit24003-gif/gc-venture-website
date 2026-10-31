import { GRADE_ORDER } from '@/lib/config';
import type { Form } from './ProductEditor';

/** Starting values for a new laptop model. */
export const BLANK: Form = {
  id: null, brand: 'Dell', family: 'Latitude', model: '', year: new Date().getFullYear() - 3, cpu: '', cpuShort: '', cpuTier: 'i5', cpuGen: 11,
  gpu: 'Intel Iris Xe', screenIn: 14, screenRes: 'Full HD 1920×1080', touch: false, weightKg: 1.4, ramGb: 8, maxRamGb: 32, ssdGb: 256,
  ports: 'USB-C, 2× USB-A, HDMI', description: '', highlights: ['', '', ''], uses: ['study', 'office'], style: 'latitude', colour: 'graphite', notch: false,
  newPrice: null, grades: GRADE_ORDER.map((g) => ({ grade: g, price: 0, active: true })),
  categories: [], tags: '', specs: '', seoTitle: null, seoDescription: null, featured: false, active: true,
};

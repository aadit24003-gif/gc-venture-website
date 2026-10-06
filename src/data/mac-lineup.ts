/**
 * MacBook Air and MacBook Pro generations from 2019, with the memory and storage
 * Apple offered for each chip. Used by the configuration picker on the two Mac pages.
 *
 * Sources: Apple tech specs pages as summarised by Apple Support, EveryMac and
 * AppleInsider (checked October 2026). Storage is listed up to 4 TB; larger
 * build-to-order sizes are quoted on request.
 */
import type { Config } from './products';

const TB = 1024;

export const MACBOOK_AIR: Config[] = [
  { group: 'Intel 2019', chip: 'Intel Core i5 (8th Gen)', year: '2019', screens: ['13.3"'], ram: [8, 16], storage: [128, 256, 512, TB] },
  { group: 'Intel 2020', chip: 'Intel Core i3 / i5 / i7 (10th Gen)', year: '2020', screens: ['13.3"'], ram: [8, 16], storage: [256, 512, TB, 2 * TB] },
  { group: 'M1', chip: 'Apple M1', year: '2020', screens: ['13.3"'], ram: [8, 16], storage: [256, 512, TB, 2 * TB] },
  { group: 'M2', chip: 'Apple M2', year: '2022–2023', screens: ['13.6"', '15.3"'], ram: [8, 16, 24], storage: [256, 512, TB, 2 * TB] },
  { group: 'M3', chip: 'Apple M3', year: '2024', screens: ['13.6"', '15.3"'], ram: [8, 16, 24], storage: [256, 512, TB, 2 * TB] },
  { group: 'M4', chip: 'Apple M4', year: '2025', screens: ['13.6"', '15.3"'], ram: [16, 24, 32], storage: [256, 512, TB, 2 * TB] },
  { group: 'M5', chip: 'Apple M5', year: '2026', screens: ['13.6"', '15.3"'], ram: [16, 24, 32], storage: [512, TB, 2 * TB, 4 * TB] },
];

export const MACBOOK_PRO: Config[] = [
  { group: 'Intel 2019', chip: 'Intel Core i5 / i7 (8th Gen)', year: '2019', screens: ['13.3"'], ram: [8, 16], storage: [128, 256, 512, TB, 2 * TB] },
  { group: 'Intel 2019', chip: 'Intel Core i7 / i9 (9th Gen)', year: '2019', screens: ['15.4"'], ram: [16, 32], storage: [256, 512, TB, 2 * TB, 4 * TB] },
  { group: 'Intel 2019', chip: 'Intel Core i7 / i9 (9th Gen), 16-inch', year: '2019', screens: ['16"'], ram: [16, 32, 64], storage: [512, TB, 2 * TB, 4 * TB] },
  { group: 'Intel 2020', chip: 'Intel Core i5 (8th Gen), two ports', year: '2020', screens: ['13.3"'], ram: [8, 16], storage: [256, 512, TB, 2 * TB] },
  { group: 'Intel 2020', chip: 'Intel Core i5 / i7 (10th Gen), four ports', year: '2020', screens: ['13.3"'], ram: [16, 32], storage: [512, TB, 2 * TB, 4 * TB] },
  { group: 'M1', chip: 'Apple M1', year: '2020', screens: ['13.3"'], ram: [8, 16], storage: [256, 512, TB, 2 * TB] },
  { group: 'M1', chip: 'Apple M1 Pro', year: '2021', screens: ['14.2"', '16.2"'], ram: [16, 32], storage: [512, TB, 2 * TB, 4 * TB] },
  { group: 'M1', chip: 'Apple M1 Max', year: '2021', screens: ['14.2"', '16.2"'], ram: [32, 64], storage: [512, TB, 2 * TB, 4 * TB] },
  { group: 'M2', chip: 'Apple M2', year: '2022', screens: ['13.3"'], ram: [8, 16, 24], storage: [256, 512, TB, 2 * TB] },
  { group: 'M2', chip: 'Apple M2 Pro', year: '2023', screens: ['14.2"', '16.2"'], ram: [16, 32], storage: [512, TB, 2 * TB, 4 * TB] },
  { group: 'M2', chip: 'Apple M2 Max', year: '2023', screens: ['14.2"', '16.2"'], ram: [32, 64, 96], storage: [TB, 2 * TB, 4 * TB] },
  { group: 'M3', chip: 'Apple M3', year: '2023', screens: ['14.2"'], ram: [8, 16, 24], storage: [512, TB, 2 * TB] },
  { group: 'M3', chip: 'Apple M3 Pro', year: '2023', screens: ['14.2"', '16.2"'], ram: [18, 36], storage: [512, TB, 2 * TB, 4 * TB] },
  { group: 'M3', chip: 'Apple M3 Max', year: '2023', screens: ['14.2"', '16.2"'], ram: [36, 48, 64, 96, 128], storage: [TB, 2 * TB, 4 * TB] },
  { group: 'M4', chip: 'Apple M4', year: '2024', screens: ['14.2"'], ram: [16, 24, 32], storage: [512, TB, 2 * TB] },
  { group: 'M4', chip: 'Apple M4 Pro', year: '2024', screens: ['14.2"', '16.2"'], ram: [24, 48], storage: [512, TB, 2 * TB, 4 * TB] },
  { group: 'M4', chip: 'Apple M4 Max', year: '2024', screens: ['14.2"', '16.2"'], ram: [36, 48, 64, 128], storage: [TB, 2 * TB, 4 * TB] },
  { group: 'M5', chip: 'Apple M5', year: '2025', screens: ['14.2"'], ram: [16, 24, 32], storage: [512, TB, 2 * TB, 4 * TB] },
  { group: 'M5', chip: 'Apple M5 Pro', year: '2026', screens: ['14.2"', '16.2"'], ram: [24, 48, 64], storage: [TB, 2 * TB, 4 * TB] },
  { group: 'M5', chip: 'Apple M5 Max', year: '2026', screens: ['14.2"', '16.2"'], ram: [36, 48, 64, 128], storage: [2 * TB, 4 * TB] },
];

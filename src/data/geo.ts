/**
 * Projects lat/lng onto /public/maps/india.svg (viewBox 0 0 612 696).
 * Mercator fit against known regions; error is about 1–2 map units.
 */
export const MAP_VIEWBOX = { w: 612, h: 696 };

const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

export function project(lat: number, lng: number) {
  return { x: 21.0527 * lng - 1437.59, y: -1200.2976 * merc(lat) + 836.58 };
}

/** Percent position for absolutely positioned pins over the map image. */
export function projectPct(lat: number, lng: number) {
  const { x, y } = project(lat, lng);
  return { left: (x / MAP_VIEWBOX.w) * 100, top: (y / MAP_VIEWBOX.h) * 100 };
}

// Approximate area centres (WGS84) used only to order options nearest-first.
// Distances are straight-line between centres, not drive time or commute.
const AREA_CENTRES: Record<string, [number, number]> = {
  "al-reem-island": [24.499, 54.404],
  "al-maryah-island": [24.5005, 54.3895],
  "al-khalidiyah": [24.4745, 54.346],
  "al-nahyan": [24.462, 54.388],
  "saadiyat-island": [24.542, 54.433],
  "yas-island": [24.488, 54.607],
  "al-raha-beach": [24.45, 54.595],
  "masdar-city": [24.427, 54.616],
  "khalifa-city": [24.42, 54.578],
  "mohamed-bin-zayed-city": [24.348, 54.547],
};

export function areaDistanceKm(fromAreaId: string | null | undefined, toAreaId: string | null | undefined): number | null {
  if (!fromAreaId || !toAreaId) return null;
  if (fromAreaId === toAreaId) return 0;
  const a = AREA_CENTRES[fromAreaId];
  const b = AREA_CENTRES[toAreaId];
  if (!a || !b) return null;
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Never filters anything out: same-area items first, then nearest, unknown locations last. Stable within ties. */
export function sortByProximity<T>(items: T[], fromAreaId: string | null, areaOf: (item: T) => string | null | undefined): { item: T; km: number | null }[] {
  const ranked = items.map((item, index) => ({ item, index, km: fromAreaId ? areaDistanceKm(fromAreaId, areaOf(item)) : null }));
  if (!fromAreaId) return ranked.map(({ item, km }) => ({ item, km }));
  return ranked
    .sort((x, y) => (x.km ?? Infinity) - (y.km ?? Infinity) || x.index - y.index)
    .map(({ item, km }) => ({ item, km }));
}

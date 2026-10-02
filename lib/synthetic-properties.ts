import calibration from "../data/property-calibration.json" with { type: "json" };

export type SyntheticRental = {
  id: string;
  title: string;
  area: string;
  annualRentAed: number;
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number;
  synthetic: true;
  source: "synthetic";
  sourceUrl: null;
  calibrationAsOf: string;
};

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

export function getSyntheticRentals(): SyntheticRental[] {
  return calibration.bands.flatMap((band, bandIndex) =>
    [0.3, 0.7].map((position, variant) => ({
      id: `synthetic-${bandIndex + 1}-${variant + 1}`,
      title: `Illustrative ${band.bedrooms === 0 ? "studio" : `${band.bedrooms}-bedroom home`} in ${band.area}`,
      area: band.area,
      annualRentAed: roundTo(band.minRentAed + (band.maxRentAed - band.minRentAed) * position, 500),
      bedrooms: band.bedrooms,
      bathrooms: band.bedrooms === 0 ? 1 : band.bedrooms,
      sizeSqft: roundTo(band.minSqft + (band.maxSqft - band.minSqft) * position, 25),
      synthetic: true as const,
      source: "synthetic" as const,
      sourceUrl: null,
      calibrationAsOf: calibration.asOf,
    })),
  );
}

export function getPropertyCalibration() {
  return {
    asOf: calibration.asOf,
    currency: calibration.currency,
    period: calibration.period,
    method: calibration.method,
    sources: calibration.sources,
    bands: calibration.bands,
  };
}

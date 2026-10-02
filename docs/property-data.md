# Abu Dhabi property data — hackathon prototype

## What is real and what is illustrative

`/api/properties?mode=both` keeps a manually observed dated snapshot and synthetic examples in separate arrays. A contactable snapshot record has an opened portal listing URL, `source`, `checkedAt`, and observed price/period provenance; it is an asking price, not a completed lease or guaranteed availability. Search-only or unavailable observations are retained as non-contactable market evidence with `listingUrl: null`. A synthetic record has `synthetic: true`, an illustrative title, and no contact URL. Never put synthetic or search-only homes into an agent-contact flow.

The default API does not scrape portals. The old Dubizzle and Property Finder pullers remain diagnostic-only under `mode=live-diagnostic`; they do not log in, solve challenges, use proxies, or extract agent contact details. Each source attempt is reported, including failures. Both [Dubizzle's terms](https://www.dubizzle.com/legalhub/terms/) and [Property Finder's terms](https://www.propertyfinder.com/ae/terms-and-conditions/) prohibit automated scraping and property database building; hackathon duration does not change those terms.

## Synthetic calibration

The repeatable bands in [`data/property-calibration.json`](../data/property-calibration.json) are based on [Bayut's H1 2026 Abu Dhabi rental report](https://www.bayut.com/mybayut/abu-dhabi-rental-market-report-h1-2026/), [dubizzle's H1 2026 report](https://www.dubizzle.com/blog/property/abu-dhabi-h1-rental-property-report-2026/), and [public Abu Dhabi asking-price pages](https://abudhabi.dubizzle.com/en/property-for-rent/residential/) checked on 2 October 2026. The Bayut report gives, for example, annual apartment asking-rent averages of AED 39,000 for a Khalifa City studio, AED 70,000 for an Al Reem Island studio, AED 94,000 for an Al Reem Island one-bedroom, and AED 176,000 for a Yas Island two-bedroom. The synthetic bands intentionally span a range around market observations; the square-foot bands are illustrative and less well-validated. The generated examples are useful for testing ranking and affordability, not evidence of available homes or statistical rent forecasts.

[ADREC's rental index](https://adrec.gov.ae/en/property_and_index/interactive-map) is an official aggregate guide, and ADREC explicitly notes that an individual unit's rent can differ. It should be used as a separate benchmark when available, not conflated with portal asking rents. [ADREC's H1 2026 release](https://adrec.gov.ae/en/news/press-29---adrec-releases-the-abu-dhabi-real-estate-market-report-for-h1-2026) provides registered-market context.

## How to inspect

Start the app with `npm run dev`, then open `http://localhost:3000/api/properties?mode=both&limit=12`. `mode=snapshot` returns only observed records; `mode=synthetic` stays offline and returns only examples; `mode=live-diagnostic` runs the bounded source diagnostics. Use `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/pull-dubizzle.mjs --limit=3` or the equivalent `scripts/pull-propertyfinder.mjs` to diagnose each source directly. A source block is an expected possible result.

Before presenting a home as recommended, filter on current asking rent, check the original link and date, and have the user confirm listing availability and actual fees with the agent. No scraped listing or synthetic record is proof of a Tawtheeq-ready tenancy.

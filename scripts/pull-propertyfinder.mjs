import {
  parsePropertyFinderRentalsFromHtml,
  pullPropertyFinderRentals,
} from "../lib/properties/propertyfinder.ts";

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 12;

if (args.has("--self-test")) {
  const payload = {
    props: {
      pageProps: {
        searchResult: {
          listings: [
            {
              listing_type: "property",
              property: {
                id: "pf-fixture-1",
                title: "Bright 1BR Near The Canal",
                price: { value: 85000, currency: "AED", period: "yearly" },
                location: { full_name: "Sun Tower, Shams Abu Dhabi, Al Reem Island, Abu Dhabi" },
                location_tree: [{ name: "Abu Dhabi" }, { name: "Al Reem Island" }],
                bedrooms: "1",
                bathrooms: "2",
                size: { value: 792, unit: "sqft" },
                share_url:
                  "https://www.propertyfinder.ae/en/plp/rent/apartment-for-rent-abu-dhabi-al-reem-island-150016385.html",
                listed_date: "2026-10-02T08:00:00Z",
              },
            },
            {
              listing_type: "property",
              property: {
                id: "pf-fixture-2",
                title: "Furnished Studio In Khalifa City",
                price: { value: 3600, currency: "AED", period: "monthly" },
                location: { full_name: "Khalifa City, Abu Dhabi" },
                location_tree: [{ name: "Abu Dhabi" }, { name: "Khalifa City" }],
                bedrooms: "studio",
                bathrooms: "1",
                size: { value: 550, unit: "sqft" },
                share_url:
                  "https://www.propertyfinder.ae/en/plp/rent/apartment-for-rent-abu-dhabi-khalifa-city-150000001.html",
              },
            },
            {
              listing_type: "property",
              property: {
                id: "unsafe-fixture",
                title: "External link must be ignored",
                price: { value: 42000, currency: "AED", period: "yearly" },
                share_url: "https://example.com/en/plp/rent/not-a-portal-listing.html",
              },
            },
          ],
        },
      },
    },
  };
  const fixture = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script>`;
  const listings = parsePropertyFinderRentalsFromHtml(fixture, {
    sourceUrl: "https://www.propertyfinder.ae/en/rent/abu-dhabi/properties-for-rent.html",
    fetchedAt: "2026-10-02T00:00:00.000Z",
    limit,
  });

  if (listings.length !== 2) {
    console.error(`SELF TEST FAILED: expected 2 listings, got ${listings.length}`);
    process.exit(1);
  }

  if (listings[0].area !== "Al Reem Island" || listings[0].annualRentAed !== 85000) {
    console.error("SELF TEST FAILED: yearly listing was not normalized correctly");
    process.exit(1);
  }

  if (listings[1].bedrooms !== 0 || listings[1].annualRentAed !== 43200) {
    console.error("SELF TEST FAILED: monthly studio listing was not normalized correctly");
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, listings }, null, 2));
  process.exit(0);
}

const result = await pullPropertyFinderRentals({ limit });

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

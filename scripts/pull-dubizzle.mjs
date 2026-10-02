import { parseDubizzleRentalsFromHtml, pullDubizzleRentals } from "../lib/properties/dubizzle.ts";

const args = new Set(process.argv.slice(2));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : 12;

if (args.has("--self-test")) {
  const fixture = `
    Popular Areas Al Reem Island(1645) Khalifa City(735)
    <a href="/en/ad/property-for-rent/residential/apartment-flat/2026/10/02/sample-1/">
      Verified AED 95,000 Yearly Apartment 1 Bed 2 Baths 815 sqft
      Sea View Apartment In Gate Tower Al Reem Island, Abu Dhabi Call WhatsApp PREMIUM
    </a>
    <a href="/en/ad/property-for-rent/residential/villa-house/2026/10/02/sample-2/">
      AED 3,500 Monthly Villa 2 Beds 2 Baths 1,600 sqft
      Furnished Monthly Stay Near Park Khalifa City, Abu Dhabi Email Call WhatsApp
    </a>
  `;
  const listings = parseDubizzleRentalsFromHtml(fixture, {
    sourceUrl: "https://abudhabi.dubizzle.com/en/property-for-rent/residential/",
    fetchedAt: "2026-10-02T00:00:00.000Z",
    limit,
  });

  if (listings.length !== 2) {
    console.error(`SELF TEST FAILED: expected 2 listings, got ${listings.length}`);
    process.exit(1);
  }

  if (listings[0].area !== "Al Reem Island" || listings[0].annualRentAed !== 95000) {
    console.error("SELF TEST FAILED: first listing was not normalized correctly");
    process.exit(1);
  }

  if (listings[1].area !== "Khalifa City" || listings[1].annualRentAed !== 42000) {
    console.error("SELF TEST FAILED: monthly listing was not annualized correctly");
    process.exit(1);
  }

  console.log(JSON.stringify({ ok: true, listings }, null, 2));
  process.exit(0);
}

const result = await pullDubizzleRentals({ limit });

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exitCode = 1;
}

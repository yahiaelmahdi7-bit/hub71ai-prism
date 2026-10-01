// Generates the HTML sources, then prints PDFs / the photo with headless Chrome.
// Run from repo root: node sample-docs/src/build.mjs
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { wrap, fmt } from "./common.mjs";
import { statementHtml } from "./statement.mjs";
import { invoicesHtml, invoicePhotoHtml } from "./invoices.mjs";

const src = dirname(fileURLToPath(import.meta.url));
const out = join(src, "..");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const licence = wrap("Freelance permit - summary", `
<div class="bar"></div><p class="muted" style="margin:0">Sample Emirate Licensing Office (fictional) · Abu Dhabi</p>
<h1>Freelance permit - summary</h1><p class="muted">Summary of a self-employment permit. Not a legal document.</p>
<h2>Permit holder</h2>
<dl class="kv"><dt>Holder</dt><dd>Sara Haddad</dd><dt>Activity</dt><dd>Graphic &amp; brand design</dd>
<dt>Emirate</dt><dd>Abu Dhabi</dd><dt>Permit type</dt><dd>Freelance (self-employed individual)</dd>
<dt>Permit no.</dt><dd>FL-AD-0000000 (sample)</dd><dt>Issued</dt><dd>2025-08-03</dd><dt>Expires</dt><dd>2027-08-02</dd><dt>Status</dt><dd>Active</dd></dl>
<h2>Conditions</h2><p>The holder may offer the activity above to clients in the UAE as an individual. Contracts must be signed in the holder's own name.</p>`);

const contract = wrap("Services agreement", `
<div class="bar"></div><h1>Services Agreement</h1><p class="muted">Brand design retainer · Reference DS-RET-2026-03</p>
<h2>Parties</h2>
<p><b>Client:</b> Dune Studio LLC, Abu Dhabi, United Arab Emirates ("the Client").<br><b>Provider:</b> Sara Haddad, freelance brand designer, Abu Dhabi, holder of freelance permit issued 2025-08-03 ("the Provider").</p>
<h2>1. Services</h2><p>The Provider will deliver ongoing graphic and brand design services to the Client, including social and campaign artwork, presentation design and brand-guideline maintenance, up to an agreed monthly scope of approximately 12 working days.</p>
<h2>2. Term</h2><p>This agreement starts on <b>2026-03-01</b> and runs until <b>2027-02-28</b>, unless ended earlier under clause 6. It may be renewed in writing.</p>
<h2>3. Fees</h2><p>The Client will pay the Provider a fixed retainer of <b>AED 12,000 per month</b>. The Provider invoices on the first working day of each month; the Client pays by bank transfer within 7 days. Fees exclude any tax that may apply.</p>
<h2>4. Ownership</h2><p>On full payment, rights in the final delivered artwork pass to the Client. The Provider keeps the right to show the work in a portfolio.</p>
<h2>5. Confidentiality</h2><p>Each party will keep the other's non-public information confidential during the term and for two years after.</p>
<h2>6. Termination</h2><p>Either party may end this agreement with 30 days' written notice. Fees for work done up to the end date remain payable.</p>
<h2>7. Law</h2><p>This agreement is governed by the laws applicable in the Emirate of Abu Dhabi and the federal laws of the UAE.</p>
<h2>Signatures</h2>
<table><tr><td style="height:48pt;width:50%">For Dune Studio LLC<br><i style="font-family:cursive;font-size:15pt;color:#33478a">A. Rahman</i><br><span class="muted">Managing Director · 2026-02-24</span></td>
<td>Provider<br><i style="font-family:cursive;font-size:15pt;color:#33478a">Sara Haddad</i><br><span class="muted">Sara Haddad · 2026-02-24</span></td></tr></table>`);

const idSummary = wrap("Residence details - summary", `
<div class="bar"></div><p class="muted" style="margin:0">Sample Residency Services (fictional)</p>
<h1>Residence details - summary</h1><p class="muted">Summary for demonstration. Not an official identity document.</p>
<h2>Resident</h2>
<dl class="kv"><dt>Name</dt><dd>Sara Haddad</dd><dt>Nationality</dt><dd>Lebanese</dd>
<dt>Visa type</dt><dd>Freelance / self-sponsored residence</dd><dt>Visa expiry</dt><dd>2027-08-02</dd>
<dt>Emirates ID no.</dt><dd class="mono">784-XXXX-XXXXXXX-X (masked)</dd><dt>Emirate</dt><dd>Abu Dhabi</dd></dl>`);

const files = {
  "licence": licence, "statement-2026-04-to-09": statementHtml(), "invoices": invoicesHtml(),
  "retainer-contract": contract, "id-summary": idSummary,
};
for (const [name, html] of Object.entries(files)) {
  const f = join(src, `${name}.html`);
  writeFileSync(f, html);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${join(out, name + ".pdf")}`, `file://${f}`], { stdio: "ignore" });
}
const photo = join(src, "invoice-photo.html");
writeFileSync(photo, invoicePhotoHtml());
execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1500,2000", `--screenshot=${join(src, "invoice-photo.png")}`, `file://${photo}`], { stdio: "ignore" });
execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", join(src, "invoice-photo.png"), "--out", join(out, "invoice-photo.jpg")], { stdio: "ignore" });
console.log("built");

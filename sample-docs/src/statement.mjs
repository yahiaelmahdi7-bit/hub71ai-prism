import { wrap, fmt } from "./common.mjs";

// [day, description, amount] - positive = credit, negative = debit. Monthly client credit totals are fixed by the persona oracle.
const months = [
  { m: "04", tx: [
    [1, "CHEQUE CLEARED - rent (quarterly) #000412", -21000], [2, "Supermarket - weekly shop", -412.35], [3, "TRANSFER IN - Dune Studio LLC - retainer Apr", 12000],
    [5, "LOAN INSTALMENT - car finance", -1850], [7, "Fuel station", -180], [9, "TRANSFER IN - Saffron & Salt Restaurants - INV-2026-014", 7500],
    [11, "Utilities - electricity & water", -640.2], [14, "Cafe and lunch", -96.5], [16, "Supermarket - weekly shop", -388.9],
    [18, "TRANSFER IN - Maple Learning Centre - INV-2026-015", 5000], [20, "Mobile plan", -230], [22, "Design software subscription", -310],
    [24, "Restaurant", -285], [26, "CARD PAYMENT - credit card statement", -5200], [28, "Fuel station", -175], [29, "Supermarket - weekly shop", -401.1] ] },
  { m: "05", tx: [
    [2, "TRANSFER IN - Dune Studio LLC - retainer May", 12000], [3, "Supermarket - weekly shop", -455.8], [5, "LOAN INSTALMENT - car finance", -1850],
    [8, "TRANSFER IN - Corniche Events FZ-LLC - INV-2026-018", 14000], [9, "Fuel station", -190], [12, "Utilities - electricity & water", -710.45],
    [13, "TRANSFER IN - Saffron & Salt Restaurants - INV-2026-017", 9200], [15, "Coworking day passes", -360], [17, "Supermarket - weekly shop", -420.3],
    [19, "Restaurant", -340], [21, "TRANSFER IN - Maple Learning Centre - INV-2026-019", 6000], [23, "Mobile plan", -230], [25, "CARD PAYMENT - credit card statement", -6400],
    [27, "Fuel station", -170], [29, "Supermarket - weekly shop", -399.6], [30, "Pharmacy", -88] ] },
  { m: "06", tx: [
    [2, "TRANSFER IN - Dune Studio LLC - retainer Jun", 12000], [3, "Supermarket - weekly shop", -398.2], [5, "LOAN INSTALMENT - car finance", -1850],
    [7, "Fuel station", -165], [10, "Utilities - electricity & water", -905.7], [12, "Cafe and lunch", -110], [14, "TRANSFER IN - Maple Learning Centre - INV-2026-021", 6750],
    [16, "Supermarket - weekly shop", -377.4], [18, "Design software subscription", -310], [20, "Mobile plan", -230], [22, "Restaurant", -210],
    [25, "CARD PAYMENT - credit card statement", -4300], [27, "Fuel station", -160], [29, "Supermarket - weekly shop", -366.5] ] },
  { m: "07", tx: [
    [1, "CHEQUE CLEARED - rent (quarterly) #000413", -21000], [2, "TRANSFER IN - Dune Studio LLC - retainer Jul", 12000], [4, "Supermarket - weekly shop", -430.6],
    [5, "LOAN INSTALMENT - car finance", -1850], [8, "TRANSFER IN - Corniche Events FZ-LLC - INV-2026-024", 15400], [10, "Fuel station", -185],
    [12, "Utilities - electricity & water", -980.15], [15, "TRANSFER IN - Saffron & Salt Restaurants - INV-2026-025", 6500], [17, "Supermarket - weekly shop", -445.2],
    [19, "Restaurant", -295], [21, "Mobile plan", -230], [23, "Coworking day passes", -240], [26, "CARD PAYMENT - credit card statement", -5900],
    [28, "Fuel station", -180], [30, "Supermarket - weekly shop", -410.4] ] },
  { m: "08", tx: [
    [2, "TRANSFER IN - Dune Studio LLC - retainer Aug", 12000], [3, "Supermarket - weekly shop", -428.9], [5, "LOAN INSTALMENT - car finance", -1850],
    [7, "TRANSFER IN - Maple Learning Centre - INV-2026-027", 9000], [9, "Fuel station", -192], [11, "Utilities - electricity & water", -955.3],
    [14, "TRANSFER IN - Saffron & Salt Restaurants - INV-2026-028", 8400], [16, "Cafe and lunch", -125], [18, "Supermarket - weekly shop", -441.7],
    [20, "Design software subscription", -310], [22, "Mobile plan", -230], [24, "Restaurant", -360], [26, "CARD PAYMENT - credit card statement", -6100],
    [28, "Fuel station", -178], [30, "Supermarket - weekly shop", -405.8] ] },
  { m: "09", tx: [
    [1, "TRANSFER IN - Dune Studio LLC - retainer Sep", 12000], [3, "Supermarket - weekly shop", -450.1], [5, "LOAN INSTALMENT - car finance", -1850],
    [8, "TRANSFER IN - Corniche Events FZ-LLC - INV-2026-032", 17100], [10, "Fuel station", -188], [12, "Utilities - electricity & water", -870.6],
    [14, "TRANSFER IN - Saffron & Salt Restaurants - INV-2026-031", 9000], [16, "Supermarket - weekly shop", -433.25], [18, "Restaurant", -320],
    [20, "Mobile plan", -230], [22, "Coworking day passes", -300], [25, "CARD PAYMENT - credit card statement", -6600], [27, "Fuel station", -182], [29, "Supermarket - weekly shop", -412.9] ] },
];

export const OPENING = 52000;
export function build() {
  let bal = OPENING;
  const rows = [];
  const sums = [];
  for (const { m, tx } of months) {
    let credits = 0, debits = 0;
    for (const [d, desc, amt] of tx) {
      bal = Math.round((bal + amt) * 100) / 100;
      if (amt > 0) credits += amt; else debits += -amt;
      rows.push({ date: `2026-${m}-${String(d).padStart(2, "0")}`, desc, amt, bal });
    }
    sums.push({ m, credits, debits });
  }
  return { rows, sums, closing: bal };
}

export function statementHtml() {
  const { rows, sums, closing } = build();
  const th = (x) => `<th${x}`;
  return wrap("Sample Bank statement", `
<div class="bar"></div>
<table style="margin-bottom:10pt"><tr><td style="border:0;padding:0"><b style="font-size:13pt">Sample Bank</b><br><span class="muted">Personal current account statement (fictional bank)</span></td>
<td class="right" style="border:0;padding:0"><b>Statement period</b><br>2026-04-01 to 2026-09-30</td></tr></table>
<dl class="kv"><dt>Account holder</dt><dd>Sara Haddad</dd><dt>Address</dt><dd>Al Reem Island, Abu Dhabi, UAE</dd><dt>Account</dt><dd>Current account, AED · no. XXXX 4821</dd>
<dt>Opening balance</dt><dd class="mono">AED 52,000.00 (2026-04-01)</dd><dt>Closing balance</dt><dd class="mono">AED ${fmt(closing)} (2026-09-30)</dd></dl>
<h2>Monthly summary</h2>
<table><tr><th>Month</th><th class="right">Money in (AED)</th><th class="right">Money out (AED)</th></tr>
${sums.map((s) => `<tr><td>2026-${s.m}</td><td class="right mono">${fmt(s.credits)}</td><td class="right mono">${fmt(s.debits)}</td></tr>`).join("")}</table>
<h2>Transactions</h2>
<table><thead><tr><th style="width:27mm">Date</th><th>Description</th><th class="right" style="width:26mm">Debit</th><th class="right" style="width:26mm">Credit</th><th class="right" style="width:28mm">Balance</th></tr></thead><tbody>
<tr><td>2026-04-01</td><td class="muted">Opening balance</td><td></td><td></td><td class="right mono">${fmt(52000)}</td></tr>
${rows.map((r) => `<tr><td class="mono" style="white-space:nowrap">${r.date}</td><td>${r.desc}</td><td class="right mono">${r.amt < 0 ? fmt(-r.amt) : ""}</td><td class="right mono">${r.amt > 0 ? fmt(r.amt) : ""}</td><td class="right mono">${fmt(r.bal)}</td></tr>`).join("")}
</tbody></table><p class="muted" style="font-size:8.5pt;margin-top:12pt">End of statement. Sample Bank is a fictional bank created for demonstration.</p>`);
}

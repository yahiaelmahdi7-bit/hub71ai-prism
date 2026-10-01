import { wrap, fmt, WATERMARK } from "./common.mjs";

const invoices = [
  { no: "INV-2026-031", date: "2026-09-02", due: "2026-09-16", paid: "2026-09-14", client: "Saffron & Salt Restaurants", addr: "Al Maryah Island, Abu Dhabi",
    lines: [["Seasonal menu design (6 pages)", 6000], ["Social media artwork pack, September", 3000]] },
  { no: "INV-2026-032", date: "2026-08-28", due: "2026-09-11", paid: "2026-09-08", client: "Corniche Events FZ-LLC", addr: "Corniche Road, Abu Dhabi",
    lines: [["Event identity and signage artwork", 11600], ["Printed programme layout", 5500]] },
  { no: "INV-2026-027", date: "2026-08-03", due: "2026-08-17", paid: "2026-08-07", client: "Maple Learning Centre", addr: "Khalidiyah, Abu Dhabi",
    lines: [["Prospectus redesign (12 pages)", 7200], ["Parent-handbook cover", 1800]] },
];

const one = (i) => {
  const total = i.lines.reduce((s, l) => s + l[1], 0);
  return `<div style="min-height:240mm;page-break-after:always;position:relative">
<div class="bar"></div>
<table style="margin-bottom:14pt"><tr><td style="border:0;padding:0"><h1 style="font-size:24pt">INVOICE</h1><span class="muted">${i.no}</span></td>
<td class="right" style="border:0;padding:0"><b>Sara Haddad</b><br>Freelance brand designer<br>Al Reem Island, Abu Dhabi<br><span class="muted">Freelance permit issued 2025-08-03</span></td></tr></table>
<dl class="kv"><dt>Billed to</dt><dd>${i.client}<br><span style="font-weight:400">${i.addr}</span></dd><dt>Issue date</dt><dd>${i.date}</dd><dt>Due date</dt><dd>${i.due}</dd></dl>
<h2>Services</h2>
<table><tr><th>Description</th><th class="right">Amount (AED)</th></tr>${i.lines.map((l) => `<tr><td>${l[0]}</td><td class="right mono">${fmt(l[1])}</td></tr>`).join("")}
<tr><td class="right"><b>Total due</b></td><td class="right mono"><b>AED ${fmt(total)}</b></td></tr></table>
<p class="muted" style="margin-top:14pt">Not registered for VAT. Payment by bank transfer to Sara Haddad, Sample Bank, account XXXX 4821.</p>
<p style="margin-top:16pt"><b>Paid:</b> ${i.paid}. Thank you.</p></div>`;
};
export const invoicesHtml = () => wrap("Invoices - Sara Haddad", invoices.map(one).join(""));

// Phone-photo look: desk background, slight rotation, soft shadow, uneven light, grain.
export const invoicePhotoHtml = () => {
  const i = invoices[0];
  const total = i.lines.reduce((s, l) => s + l[1], 0);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1500px;height:2000px;overflow:hidden;font-family:"Helvetica Neue",Arial,sans-serif;color:#222}
body{background:radial-gradient(ellipse at 30% 20%,#b99c7a 0%,#8f7556 60%,#6e5740 100%)}
.paper{position:absolute;left:190px;top:210px;width:1050px;height:1150px;background:linear-gradient(172deg,#fdfcf8 0%,#f4f1e8 70%,#e9e5d8 100%);
 transform:rotate(-2.6deg) perspective(1800px) rotateX(2deg) rotateY(-1.5deg);box-shadow:18px 30px 50px rgba(0,0,0,.45),2px 2px 6px rgba(0,0,0,.3);padding:90px 80px}
.shade{position:absolute;inset:0;background:linear-gradient(100deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.16) 100%);pointer-events:none}
.grain{position:absolute;inset:0;opacity:.18;mix-blend-mode:multiply}
h1{font-size:64px;margin:0 0 6px;letter-spacing:-1px} .m{color:#666;font-size:26px} td{padding:14px 6px;font-size:28px;border-bottom:2px solid #d8d4c8}
.wm{position:absolute;left:30px;right:30px;top:560px;text-align:center;transform:rotate(-30deg);font-size:50px;font-weight:800;color:rgba(190,30,30,.16);border:5px solid rgba(190,30,30,.16);padding:10px}
</style></head><body><div class="paper">
<div style="height:14px;background:#0b4f45;margin-bottom:34px"></div>
<h1>INVOICE</h1><div class="m">${i.no} · ${i.date}</div>
<p style="font-size:28px;line-height:1.5"><b>Sara Haddad</b>, freelance brand designer<br>Al Reem Island, Abu Dhabi<br><br>Billed to: <b>${i.client}</b><br>${i.addr}<br>Due: ${i.due}</p>
<table style="width:100%;border-collapse:collapse;margin-top:40px"><tr><td><b>Description</b></td><td style="text-align:right"><b>AED</b></td></tr>
${i.lines.map((l) => `<tr><td>${l[0]}</td><td style="text-align:right">${fmt(l[1])}</td></tr>`).join("")}
<tr><td style="text-align:right"><b>Total due</b></td><td style="text-align:right"><b>${fmt(total)}</b></td></tr></table>
<p class="m" style="margin-top:40px">Not registered for VAT. Bank transfer to Sample Bank, account XXXX 4821.</p>
<div class="wm">${WATERMARK}</div><div class="shade"></div>
<svg class="grain" width="100%" height="100%"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
</div></body></html>`;
};

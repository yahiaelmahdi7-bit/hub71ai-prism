export const WATERMARK = "SAMPLE - FICTIONAL DOCUMENT FOR DEMO";
export const fmt = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const css = `
@page { size: A4; margin: 16mm 16mm 18mm; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1c2321; font-size: 10.5pt; line-height: 1.45; margin: 0; padding-bottom: 8mm; }
.wm { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 9; }
.wm span { transform: rotate(-32deg); font-size: 21pt; font-weight: 800; letter-spacing: .04em; color: rgba(190, 30, 30, .13); border: 3px solid rgba(190,30,30,.13); padding: 6pt 16pt; white-space: nowrap; }
.foot { position: fixed; bottom: 0; left: 0; right: 0; font-size: 7.5pt; color: #8a2a2a; text-align: center; letter-spacing: .06em; }
h1 { font-size: 20pt; margin: 0 0 2pt; letter-spacing: -.01em; }
h2 { font-size: 11pt; margin: 18pt 0 6pt; text-transform: uppercase; letter-spacing: .08em; color: #0b4f45; }
.muted { color: #5d6865; } .right { text-align: right; } .mono { font-variant-numeric: tabular-nums; }
.bar { height: 5pt; background: #0b4f45; margin-bottom: 14pt; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; color: #5d6865; border-bottom: 1.5px solid #1c2321; padding: 4pt 4pt; }
td { padding: 3.6pt 4pt; border-bottom: .5pt solid #d9dedc; vertical-align: top; }
tr { page-break-inside: avoid; }
.kv { display: grid; grid-template-columns: 42mm 1fr; gap: 5pt 10pt; }
.kv dt { color: #5d6865; } .kv dd { margin: 0; font-weight: 600; }
`;
export const wrap = (title, body) =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>
<div class="wm"><span>${WATERMARK}</span></div><div class="foot">${WATERMARK}</div>${body}</body></html>`;

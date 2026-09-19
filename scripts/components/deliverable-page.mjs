// The flat style's deliverable: the page the reader wanted, either a README-like "document"
// or a "table" summary with a total, on the same stacked-sheet depth every sheet in
// figurehead draws, with its own label and optional backing line underneath. Moved out of
// scripts/figurehead.mjs verbatim (it was `page()` plus the two text lines its one call site
// always added after it): same coordinates, same rounding, same branching between the two
// kinds.
import { esc } from "./esc.mjs";
import { flowCurve } from "./curves.mjs";
import { okBadge } from "./badges.mjs";
import { stackedSheet } from "./sheets.mjs";

export function deliverablePage({ kind, x, y, heading, label, backing }) {
  const out = [];
  out.push(
    ...stackedSheet({
      x,
      y,
      w: 212,
      h: 274,
      rx: 10,
      back2: { dx: 28, dy: 28, cls: "sheet back2" },
      back1: { dx: 14, dy: 14, cls: "sheet back1" },
      frontClass: "sheet front",
    })
  );
  if (kind === "table") {
    out.push(`<text class="title" x="${x + 22}" y="${y + 42}" font-size="20">${esc(heading)}</text>`);
    [96, 72, 110, 84, 100].forEach((w, i) => {
      const ry = y + 66 + i * 30;
      out.push(`<rect class="bar" x="${x + 22}" y="${ry}" width="${w}" height="8" rx="4"/><rect class="bar" x="${x + 150}" y="${ry}" width="${i % 2 ? 32 : 40}" height="8" rx="4"/>`);
    });
    out.push(`<path class="rule" d="M${x + 22},${y + 214} h168"/>`);
    out.push(`<rect class="pill" x="${x + 22}" y="${y + 230}" width="64" height="10" rx="5"/><rect class="pill" x="${x + 142}" y="${y + 230}" width="48" height="10" rx="5"/>`);
  } else {
    out.push(`<text class="title" x="${x + 106}" y="${y + 40}" font-size="20" text-anchor="middle">${esc(heading)}</text>`);
    out.push(`<rect class="bar" x="${x + 56}" y="${y + 56}" width="100" height="8" rx="4"/>`);
    for (const dx of [34, 84, 134]) out.push(`<rect class="pill" x="${x + dx}" y="${y + 78}" width="38" height="10" rx="5"/>`);
    out.push(`<rect class="card" x="${x + 22}" y="${y + 104}" width="168" height="62" rx="8"/>`);
    out.push(flowCurve({ x1: x + 40, y1: y + 135, c1x: x + 70, c1y: y + 135, c2x: x + 90, c2y: y + 118, x2: x + 110, y2: y + 118, marker: true }));
    out.push(flowCurve({ x1: x + 40, y1: y + 135, c1x: x + 70, c1y: y + 135, c2x: x + 90, c2y: y + 152, x2: x + 110, y2: y + 152, marker: true }));
    out.push(`<circle class="dot" cx="${x + 38}" cy="${y + 135}" r="4"/>`);
    [120, 96, 132, 84].forEach((w, i) => out.push(`<rect class="bar" x="${x + 22}" y="${y + 186 + i * 20}" width="${w}" height="8" rx="4"/>`));
    out.push(okBadge(x + 150, y + 232, 1.2));
  }
  out.push(`<text class="title" x="${x + 120}" y="${y + 326}" font-size="16" text-anchor="middle">${esc(label)}</text>`);
  if (backing) out.push(`<text class="muted" x="${x + 120}" y="${y + 346}" font-size="14" text-anchor="middle">${esc(backing)}</text>`);
  return out;
}

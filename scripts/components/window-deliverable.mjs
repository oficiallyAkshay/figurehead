// The window style's deliverable: a stacked summary sheet with rows and a total, the
// deliverable's own label ("one PDF") and backing line underneath it. Its line-item rows are
// decorative and fixed, since the spec carries no line-item list. Moved out of
// scripts/figurehead.mjs verbatim: same coordinates, same rounding.
import { esc } from "./esc.mjs";
import { stackedSheet } from "./sheets.mjs";

export function windowDeliverablePacket({ x, heading, label, backing }) {
  const out = [];
  out.push(
    ...stackedSheet({
      x,
      y: 144,
      w: 150,
      h: 176,
      rx: 3,
      back2: { dx: 12, dy: 12, cls: "sheet-back" },
      back1: { dx: 6, dy: 6, cls: "sheet-back" },
      frontClass: "sheet",
      filter: "soft",
    }).map((line) => `  ${line}`)
  );
  out.push(`  <text class="sans ink" x="${x + 14}" y="168" font-size="13" font-weight="700">${esc(heading)}</text>`);
  out.push(`  <path class="inks" d="M${x + 14},176 h122" stroke-width="1" opacity="0.35"/>`);
  [66, 54, 74, 48, 62, 58].forEach((w, i) => {
    const ry = 188 + 16 * i;
    out.push(`  <rect class="bar" x="${x + 14}" y="${ry}" width="${w}" height="5" rx="2.5"/><rect class="bar2" x="${x + 108}" y="${ry}" width="28" height="5" rx="2.5"/>`);
  });
  out.push(`  <path class="inks" d="M${x + 14},288 h122" stroke-width="1.2"/>`);
  out.push(`  <rect class="total" x="${x + 14}" y="296" width="44" height="6" rx="3"/><rect class="total" x="${x + 100}" y="296" width="36" height="6" rx="3"/>`);
  out.push(`  <text class="sans ink" x="${x + 81}" y="360" font-size="15" font-weight="700" text-anchor="middle">${esc(label)}</text>`);
  if (backing) out.push(`  <text class="sans muted" x="${x + 81}" y="377" font-size="11" font-weight="500" text-anchor="middle">${esc(backing)}</text>`);
  return out;
}

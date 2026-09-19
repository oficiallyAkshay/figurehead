// Card / tile components: a rect plus a glyph plus a title (and, for the chart style, a
// grommet and an optional italic subtitle). The flat style's handled-row card and the chart
// style's handled card are different enough in shape (rotation, theme colour, grommet) that
// they stay as two functions rather than one over-generalized template; each is a literal
// move of its call site out of scripts/figurehead.mjs.
import { esc } from "./esc.mjs";
import { glyph, themedGlyph } from "./glyphs.mjs";
import { grommet } from "./curves.mjs";

// The flat style's handled-row card: an icon and a label in a small rounded rect, "more"
// getting the dashed variant and muted text.
export function flatCard({ x, y, icon, label, more }) {
  return [
    `  <g transform="translate(${x},${y})"><rect class="card${more ? " more" : ""}" x="0" y="0" width="210" height="40" rx="10"/>`,
    `    ${glyph(icon, 14, 10, 20)}`,
    `    <text class="${more ? "muted" : "title"}" x="48" y="26" font-size="17">${esc(label)}</text></g>`,
  ];
}

// The chart style's handled card: a themed, hand-tilted rect tied through a brass grommet,
// with a themed glyph, a bold title and an optional italic subtitle.
export function chartHandledCard({ cx, cy, w, h, tilt, theme, icon, label, sub }) {
  const top = cy - h / 2;
  const out = [];
  out.push(`  <g transform="rotate(${tilt} ${cx + w / 2} ${cy})">`);
  out.push(`    <rect class="c-${theme}" x="${cx}" y="${top}" width="${w}" height="${h}" rx="6" filter="url(#roughds)"/>`);
  out.push(`    ${grommet(cx + 16, cy)}`);
  out.push(`    ${themedGlyph(icon, cx + 36, top + 20, 20, `g i-${theme}`)}`);
  out.push(`    <text class="serif ink" x="${cx + 72}" y="${cy - 3}" font-size="19" font-weight="700">${esc(label)}</text>`);
  if (sub) out.push(`    <text class="serif muted" x="${cx + 72}" y="${cy + 18}" font-size="13.5" font-style="italic">${esc(sub)}</text>`);
  out.push("  </g>");
  return out;
}

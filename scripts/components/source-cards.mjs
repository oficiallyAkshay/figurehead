// The style-specific "source" card: the flat style's plain rounded rect with an icon and a
// centered label, and the chart style's browser-chrome card with its own address bar, three
// domain dots, two loading bars, a green "go" button and a grommet tying it to the hub's
// rope. Different enough in shape (and, for chart, tilt) that they stay two functions, each a
// literal move of its call site out of scripts/figurehead.mjs.
import { esc } from "./esc.mjs";
import { glyph, rawGlyph } from "./glyphs.mjs";
import { grommet } from "./curves.mjs";

// The flat style's source card: a plain card, icon centered near the top, label centered
// below it. `y` is the card's own top; x, width and height never vary.
export function flatSourceCard({ y, icon, label }) {
  return [
    `  <g><rect class="card" x="24" y="${y}" width="190" height="118" rx="14"/>`,
    `    ${glyph(icon, 97, y + 20, 44)}`,
    `    <text class="title" x="119" y="${y + 96}" font-size="19" text-anchor="middle">${esc(label)}</text></g>`,
  ];
}

// The chart style's source card: a hand-tilted browser-chrome window with its own address
// bar, three domain dots, two loading bars and a green "go" button, tied to the hub through a
// brass grommet. Fixed position and tilt; only the icon, the label and the optional italic
// note come from the spec.
export function chartSourceCard({ icon, label, note }) {
  const out = [];
  out.push('  <g transform="rotate(-2 160 255)">');
  out.push('    <rect class="paper" x="40" y="178" width="240" height="154" rx="6" filter="url(#roughds)"/>');
  out.push('    <rect class="chrome" x="54" y="192" width="192" height="19" rx="4"/>');
  out.push('    <circle class="dot" cx="64" cy="201.5" r="2.3"/><circle class="dot" cx="72" cy="201.5" r="2.3"/><circle class="dot" cx="80" cy="201.5" r="2.3"/>');
  out.push('    <rect class="bar" x="58" y="226" width="140" height="8" rx="4"/>');
  out.push('    <rect class="bar" x="58" y="241" width="96" height="7" rx="3.5"/>');
  out.push('    <rect x="58" y="262" width="160" height="32" rx="16" fill="#1f7a45"/>');
  out.push(`    ${rawGlyph(icon, 69, 270, 14.88, 'stroke="#f7f0de" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"')}`);
  out.push(`    <text class="sans" x="90" y="283" font-size="12.5" font-weight="600" fill="#f7f0de">${esc(label)}</text>`);
  if (note) out.push(`    <text class="serif muted" x="58" y="318" font-size="12" font-style="italic">${esc(note)}</text>`);
  out.push(`    ${grommet(266, 255)}`);
  out.push("  </g>");
  return out;
}

// The before-after style's two fixed pages (the long page that fades out, the short page every
// part sits in), the dashed fold rule across the long page, and the marks-and-leads that tie
// each named problem or part back to its place on one of them. Moved out of
// scripts/figurehead.mjs verbatim: same coordinates, same rounding, same helper functions the
// long page's bars and code blocks are built from. Anchor lookup and the "unknown place"
// refusal stay in scripts/figurehead.mjs, the same way assertFits stays there for other
// styles' cards: these components only ever draw the points they are handed.
import { esc } from "./esc.mjs";

const bars = (x, y, widths, cls = "bar", h = 8, step = 14) => widths.map((w, i) => `<rect class="${cls}" x="${x}" y="${y + i * step}" width="${w}" height="${h}" rx="${h / 2}"/>`).join("");
const codeBlock = (x, y) => `<rect class="code" x="${x}" y="${y}" width="220" height="58" rx="6"/>${bars(x + 12, y + 12, [120, 168, 96], "codeline", 6, 14)}`;

// The page the reader has: a long page that fades out under a mask, because nobody reaches the
// end of it.
export function beforePage({ bx, by }) {
  const out = [];
  out.push('  <mask id="long"><rect x="0" y="0" width="1200" height="430" fill="url(#fade)"/></mask>');
  out.push('  <g mask="url(#long)">');
  out.push(`    <rect class="sheet front" x="${bx}" y="${by}" width="260" height="410" rx="10"/>`);
  out.push(`    <rect class="pill" x="${bx + 20}" y="${by + 24}" width="120" height="12" rx="6"/>`);
  out.push(`    ${bars(bx + 20, by + 50, [220, 200, 180])}`);
  out.push(`    ${codeBlock(bx + 20, by + 104)}`);
  out.push(`    ${bars(bx + 20, by + 178, [210, 220, 150])}`);
  out.push(`    <rect class="pill" x="${bx + 20}" y="${by + 226}" width="44" height="10" rx="5"/><rect class="pill" x="${bx + 72}" y="${by + 226}" width="44" height="10" rx="5"/><rect class="stale" x="${bx + 124}" y="${by + 224}" width="52" height="14" rx="7"/>`);
  out.push(`    ${bars(bx + 20, by + 254, [200])}<rect class="dead" x="${bx + 20}" y="${by + 268}" width="96" height="8" rx="4"/>${bars(bx + 124, by + 268, [90])}`);
  out.push(`    ${codeBlock(bx + 20, by + 292)}`);
  out.push(`    ${bars(bx + 20, by + 366, [220, 190, 205])}`);
  out.push("  </g>");
  return out;
}

// The dashed fold rule across the long page, at whichever y the caller resolved (the "fold"
// anchor, when it is one of the before page's named problem places).
export function foldLine({ bx, y }) {
  return `  <path class="fold" d="M${bx - 10},${y} h280"/>`;
}

// One red mark, its leader and its label, for each named problem on the before page. `points`
// is the resolved `[{ y, label }]` list; the caller has already turned each `at` name into a y
// and refused an unknown one by name.
export function problemMarks({ bx, points }) {
  const out = [];
  for (const { y, label } of points) {
    out.push(`  <circle class="mark" cx="${bx - 10}" cy="${y}" r="4"/><path class="lead" d="M${bx - 10},${y} h-12"/>`);
    out.push(`  <text class="wrong" x="${bx - 28}" y="${y + 5}" font-size="15" text-anchor="end">${esc(label)}</text>`);
  }
  return out;
}

// The page the reader wanted: a short page, every part in its place.
export function afterPage({ ax, ay }) {
  const out = [];
  out.push(`  <rect class="sheet front" x="${ax}" y="${ay}" width="260" height="300" rx="10"/>`);
  out.push(`  <circle class="dot" cx="${ax + 92}" cy="${ay + 30}" r="7"/><rect class="pill" x="${ax + 106}" y="${ay + 24}" width="76" height="12" rx="6"/>`);
  out.push(`  <rect class="pill" x="${ax + 40}" y="${ay + 52}" width="180" height="9" rx="4.5"/>`);
  out.push(`  <rect class="card" x="${ax + 24}" y="${ay + 76}" width="212" height="70" rx="8"/>`);
  out.push(`  <rect class="bar" x="${ax + 60}" y="${ay + 90}" width="30" height="42" rx="4"/><path class="flow" d="M${ax + 100},${ay + 111} h56" marker-end="url(#arrow)"/><rect class="pill" x="${ax + 168}" y="${ay + 96}" width="30" height="30" rx="4"/>`);
  out.push(`  ${[0, 1, 2, 3].map((i) => `<rect class="pill" x="${ax + 34 + i * 50}" y="${ay + 162}" width="42" height="10" rx="5"/>`).join("")}`);
  out.push(`  ${[150, 170, 132, 160].map((w, i) => `<circle class="dot" cx="${ax + 40}" cy="${ay + 196 + i * 22}" r="4"/><rect class="bar" x="${ax + 54}" y="${ay + 192 + i * 22}" width="${w}" height="8" rx="4"/>`).join("")}`);
  return out;
}

// One green "good" mark, its leader and its label, for each named part on the after page.
export function partMarks({ ax, points }) {
  const out = [];
  for (const { y, label } of points) {
    out.push(`  <circle class="good" cx="${ax + 270}" cy="${y}" r="4"/><path class="goodlead" d="M${ax + 270},${y} h12"/>`);
    out.push(`  <text class="title" x="${ax + 288}" y="${y + 5}" font-size="15">${esc(label)}</text>`);
  }
  return out;
}

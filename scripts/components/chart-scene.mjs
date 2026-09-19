// The chart style's own fixed backdrop and the pieces of it that track the canvas's growth:
// the compass rose (its rhumb lines, ring and star rose, and its "N" label), the night sky
// (moon and stars, shown only in dark mode), the gulls, the scattered depth soundings, the
// three layered sea bands and their ink crests, the sailboat riding them, and the one
// handwritten aside line with its curly leader. None of it is data-driven beyond `delta` (0 at
// the pierless four-item canvas height) and, for the aside, the spec's own text: `delta` is
// how far the soundings, the sea and the sailboat shift down to follow the canvas's growth;
// the compass, the night sky and the gulls stay exactly where they always were. Moved out of
// scripts/figurehead.mjs verbatim: same coordinates, same rounding, same order.
import { esc } from "./esc.mjs";

// The rhumb lines radiating from the compass rose's own center, translated once to that
// center. Fixed: the same sixteen spokes at the same length, regardless of spec or canvas
// height.
export function rhumbLines() {
  return '  <g transform="translate(764,58)"><path class="rhumb" d="M0,0 L0,-900 M0,0 L344,-831 M0,0 L636,-636 M0,0 L831,-344 M0,0 L900,0 M0,0 L831,344 M0,0 L636,636 M0,0 L344,831 M0,0 L0,900 M0,0 L-344,831 M0,0 L-636,636 M0,0 L-831,344 M0,0 L-900,0 M0,0 L-831,-344 M0,0 L-636,-636 M0,0 L-344,-831"/></g>';
}

// The soundings scattered across the water, each an [x, y, label] where y is measured at the
// pierless four-item height; `delta` shifts them down with everything else that grows with the
// canvas.
const SOUNDINGS = [
  [176, 118, "7"],
  [300, 148, "12"],
  [84, 380, "9"],
  [330, 372, "11"],
  [760, 420, "8"],
  [410, 96, "14"],
  [150, 490, "4"],
  [430, 494, "6"],
  [690, 488, "5"],
];

export function soundingLabels({ delta }) {
  return `  <g class="sound serif" font-size="11">${SOUNDINGS.map(([x, y, t]) => `<text x="${x}" y="${y + delta}">${t}</text>`).join("")}</g>`;
}

// The night sky: a moon and a handful of stars, both hidden by CSS outside dark mode. Fixed,
// never shifting with the canvas height.
export function nightSky() {
  return [
    '  <g class="moon"><path d="M128,100 a14,14 0 1 0 6,24 a11,11 0 1 1 -6,-24 z"/></g>',
    '  <g class="stars"><circle cx="610" cy="30" r="1.3"/><circle cx="560" cy="78" r="1.1"/><circle cx="96" cy="100" r="1.2"/><circle cx="40" cy="150" r="1"/><circle cx="330" cy="110" r="1"/><circle cx="800" cy="130" r="1.2"/><path d="M640,64 l1.6,-5 1.6,5 5,1.6 -5,1.6 -1.6,5 -1.6,-5 -5,-1.6 z"/></g>',
  ];
}

// The compass rose: two concentric rings, an eight-point star rose, and the "N" label above
// it. Fixed, at the same translated center the rhumb lines share.
export function compassRose() {
  return [
    '  <g transform="translate(764,58)" filter="url(#rough)"><circle class="ring" r="28"/><circle class="ring" r="31" stroke-dasharray="1.5 3"/><polygon class="star-open" points="0,-34 2.7,-6.5 14.1,-14.1 6.5,-2.7 34,0 6.5,2.7 14.1,14.1 2.7,6.5 0,34 -2.7,6.5 -14.1,14.1 -6.5,2.7 -34,0 -6.5,-2.7 -14.1,-14.1 -2.7,-6.5"/><path class="star-fill" d="M0,0 L0,-34 L-2.7,-6.5 Z M0,0 L34,0 L6.5,-2.7 Z M0,0 L0,34 L2.7,6.5 Z M0,0 L-34,0 L-6.5,2.7 Z"/><circle class="star-fill" r="2"/></g>',
    '  <text class="serif ink" x="764" y="17" font-size="11" font-weight="700" text-anchor="middle">N</text>',
  ];
}

// The gulls riding above the water. Fixed, never shifting with the canvas height.
export function gulls() {
  return '  <g class="gull" filter="url(#rough)"><path d="M30,44 q7,-8 14,0 q7,-8 14,0"/><path d="M76,64 q5,-6 10,0 q5,-6 10,0"/></g>';
}

// A wave band's baseline (and its one Q control point) run the full canvas width, ending in a
// shared flat floor (`bottom`) that always sits well past the visible edge. `delta` is 0 at the
// pierless four-item height.
function wavePath(cls, baseline, control, bottom) {
  const tPoints = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900]
    .map((x) => `T ${x},${baseline}`)
    .join(" ");
  return `    <path class="${cls}" d="M-50,${baseline} Q -25.0,${control} 0,${baseline} ${tPoints} L 880,${bottom} L -50,${bottom} Z"/>`;
}

// The ink crests riding each wave, each an [x, y] plus its own little arc, y measured at the
// pierless height.
const CRESTS = [
  [20, 452, 8, -5, 16],
  [238, 456, 8, -5, 16],
  [318, 470, 7, -4, 14],
  [512, 453, 8, -5, 16],
  [602, 468, 7, -4, 14],
  [742, 455, 8, -5, 16],
  [372, 488, 6, -4, 12],
  [650, 490, 6, -4, 12],
  [92, 486, 6, -4, 12],
];

// The three layered wave bands and their ink crests, both shifting down by `delta` with the
// rest of the sea.
export function seaBands({ delta }) {
  const bottom = 520 + delta;
  const out = [];
  out.push('  <g filter="url(#rough)">');
  out.push(wavePath("w1", 446 + delta, 439 + delta, bottom));
  out.push(wavePath("w2", 462 + delta, 456 + delta, bottom));
  out.push(wavePath("w3", 480 + delta, 475 + delta, bottom));
  out.push(`    <path class="crest" d="${CRESTS.map(([x, y, qx, qy, qx2]) => `M${x},${y + delta} q${qx},${qy} ${qx2},0`).join(" ")}"/>`);
  out.push("  </g>");
  return out;
}

// The sailboat riding the sea, shifting down by `delta` with the water beneath it.
export function sailboat({ delta }) {
  const out = [];
  out.push(`  <g transform="translate(112,${446 + delta}) rotate(-3)" filter="url(#rough)">`);
  out.push('    <path class="hull" d="M-40,-8 L40,-8 Q32,8 0,10 Q-32,8 -40,-8 Z"/>');
  out.push('    <path class="line" d="M-30,-2 Q0,4 30,-2"/>');
  out.push('    <path class="line" d="M0,-8 V-66" stroke-width="2"/>');
  out.push('    <path class="sail" d="M4,-62 Q 28,-36 32,-12 L4,-12 Z"/>');
  out.push('    <path class="sail" d="M-4,-58 L-28,-12 L-4,-12 Z"/>');
  out.push('    <path class="line" d="M0,-66 L-42,-9"/>');
  out.push('    <rect x="-15" y="-50" width="7" height="6" fill="#b3342b"/>');
  out.push('    <path d="M-26,-37 l7,0 -3.5,6 z" fill="#d9a632"/>');
  out.push('    <rect x="-37" y="-24" width="7" height="6" fill="#2b4a7e"/>');
  out.push('    <path d="M0,-66 l12,3 -12,3 z" fill="#b3342b"/>');
  out.push("  </g>");
  return out;
}

// The one handwritten aside line, split on its sentence breaks, with a curly leader pointing at
// the hub. Fixed position; only the text (and whether it wraps to a second line) comes from the
// spec.
export function asideLine({ aside }) {
  const sentences = aside.trim().split(/(?<=[.!?])\s+/);
  const line1 = sentences[0];
  const line2 = sentences.slice(1).join(" ");
  const out = [];
  out.push(`  <text class="hand muted" x="176" y="402" font-size="17" transform="rotate(-3 176 402)">${esc(line1)}</text>`);
  if (line2) out.push(`  <text class="hand muted" x="192" y="424" font-size="17" transform="rotate(-3 192 424)">${esc(line2)}</text>`);
  out.push('  <path class="line" d="M342,404 C 372,394 380,362 372,334" filter="url(#rough)"/>');
  out.push('  <path class="line" d="M365,342 L372,332 L379,341"/>');
  return out;
}

// The window style's faint feed curves: one per inbox row, running from that row's own right
// edge to the calendar range's left edge (fixed, since that edge never moves). Drawn under the
// calendar panel as the style's own fan-in. Moved out of scripts/figurehead.mjs verbatim: same
// coordinates, same rounding.
export function feedCurves({ tops, inboxRight, targetX, targetY }) {
  const out = [];
  out.push('  <g class="feed">');
  for (const top of tops) {
    const startY = top + 19;
    out.push(`    <path d="M${inboxRight},${startY} C ${inboxRight + 52},${startY} ${inboxRight + 64},${targetY} ${targetX},${targetY}"/>`);
  }
  out.push("  </g>");
  return out;
}

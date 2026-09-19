// The window style's fixed month grid: weekday letters, a 7x5 cell grid (the first and last
// row's outer cells omitted, matching a real month's leading/trailing blanks), a highlighted
// range and its dots. None of it is data-driven beyond where the panel itself sits; the
// returned lines carry the same two- and four-space indentation the original inline code
// pushed, so a caller can push them straight onto its own output array unprefixed.
export function calendarGrid({ x, top }) {
  const out = [];
  const weekdayXs = [0, 1, 2, 3, 4, 5, 6].map((i) => x + 29 + 32 * i);
  out.push(
    `  <g class="sans faint" font-size="9" font-weight="600" text-anchor="middle">${["S", "M", "T", "W", "T", "F", "S"].map((d, i) => `<text x="${weekdayXs[i]}" y="141">${d}</text>`).join("")}</g>`
  );
  const calColX = [0, 1, 2, 3, 4, 5, 6].map((i) => x + 14 + 32 * i);
  const calRowY = [0, 1, 2, 3, 4].map((i) => top + 58 + 32 * i);
  const cell = (cx, cy) => `<rect x="${cx}" y="${cy}" width="30" height="28" rx="3"/>`;
  out.push('  <g class="cell">');
  out.push(`    ${calColX.map((cx) => cell(cx, calRowY[0])).join("")}`);
  out.push(`    ${cell(calColX[0], calRowY[1])}${cell(calColX[6], calRowY[1])}`);
  for (const ry of [calRowY[2], calRowY[3], calRowY[4]]) out.push(`    ${calColX.map((cx) => cell(cx, ry)).join("")}`);
  out.push("  </g>");
  out.push(`  <rect class="range" x="${calColX[1]}" y="${calRowY[1]}" width="158" height="28" rx="4"/>`);
  out.push(`  <g class="accent">${[1, 2, 3, 4, 5].map((i) => `<circle cx="${calColX[i] + 15}" cy="200" r="2"/>`).join("")}</g>`);
  return out;
}

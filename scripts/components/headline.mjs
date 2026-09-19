// The editorial headline and the subhead under it. Both the chart and the window style split
// the headline on the hub's own label and colour that word with a <tspan> — the same
// algorithm under two different accent classes ("brass" for chart, "accent" for window), now
// one shared brandedText; the actual <text> placement (position, face, size, italics) stays
// two functions, since chart and window disagree on every one of those.
import { esc } from "./esc.mjs";

export function brandedText(text, brandWord, cls) {
  const idx = brandWord ? text.indexOf(brandWord) : -1;
  if (idx === -1) return esc(text);
  const before = text.slice(0, idx);
  const after = text.slice(idx + brandWord.length);
  return `${esc(before)}<tspan class="${cls}">${esc(brandWord)}</tspan>${esc(after)}`;
}

export function chartHeadlineBlock({ headline, subhead, brandWord }) {
  const out = [];
  if (headline) out.push(`  <text class="serif ink" x="400" y="42" font-size="27" font-weight="700" text-anchor="middle">${brandedText(headline, brandWord, "brass")}</text>`);
  if (subhead) out.push(`  <text class="serif muted" x="400" y="68" font-size="16" font-style="italic" text-anchor="middle">${esc(subhead)}</text>`);
  return out;
}

export function windowHeadlineBlock({ headline, subhead, brandWord }) {
  const out = [];
  if (headline) out.push(`  <text class="sans ink" x="450" y="40" font-size="25" font-weight="700" text-anchor="middle">${brandedText(headline, brandWord, "accent")}</text>`);
  if (subhead) out.push(`  <text class="sans muted" x="450" y="62" font-size="14" font-weight="500" text-anchor="middle">${esc(subhead)}</text>`);
  return out;
}

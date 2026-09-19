// The window style's app-surface panel: a soft-shadowed rounded rect with a header row (a
// small fixed glyph fragment plus a bold label, and an optional muted caption at the panel's
// own right edge). The inbox and calendar panels differ in size, header icon and label
// x-offset, all explicit props; the caption's x is always the panel's own right edge minus 18.
import { esc } from "./esc.mjs";

export function panelWithChrome({ x, y, w, h, iconGlyph, labelX, label, gives }) {
  const out = [];
  out.push(`<rect class="panel" x="${x}" y="${y}" width="${w}" height="${h}" rx="10" filter="url(#soft)"/>`);
  out.push(`<g class="g" transform="translate(${x + 18},106) scale(0.85)">${iconGlyph}</g>`);
  out.push(`<text class="sans ink" x="${labelX}" y="120" font-size="15" font-weight="700">${esc(label)}</text>`);
  if (gives) out.push(`<text class="sans muted" x="${x + w - 18}" y="120" font-size="11" font-weight="500" text-anchor="end">${esc(gives)}</text>`);
  return out;
}

// Icon placement. Three ways the three style functions drop a looked-up icon onto the
// canvas, moved out of scripts/figurehead.mjs verbatim (same scaling, same rounding).
import { ICONS } from "../icons.mjs";

function iconEntry(name) {
  const icon = ICONS[name];
  if (!icon) throw new Error(`Unknown icon "${name}". Known: ${Object.keys(ICONS).join(", ")}.`);
  return icon;
}

// The flat style's icon: always the ".glyph" class, slate stroke, no fill.
export function glyph(name, x, y, size, extra = "") {
  const [box, path] = iconEntry(name);
  const scale = +(size / box).toFixed(3);
  return `<g class="glyph" transform="translate(${x},${y})${scale === 1 ? "" : ` scale(${scale})`}"${extra}>${path}</g>`;
}

// The chart style's icon, coloured by whichever class the caller passes (a theme's ".i-navy"
// and friends, or ".anchor" for the hub) instead of the flat style's fixed ".glyph".
export function themedGlyph(name, x, y, size, cls) {
  const [box, path] = iconEntry(name);
  const scale = +(size / box).toFixed(3);
  return `<g class="${cls}" transform="translate(${x},${y})${scale === 1 ? "" : ` scale(${scale})`}">${path}</g>`;
}

// The chart style's source button icon: a literal cream stroke on a green button, not a
// theme colour.
export function rawGlyph(name, x, y, size, attrs) {
  const [box, path] = iconEntry(name);
  const scale = +(size / box).toFixed(3);
  return `<g transform="translate(${x},${y})${scale === 1 ? "" : ` scale(${scale})`}" ${attrs}>${path}</g>`;
}

// The hub disc with its mark: the product's own spot on the canvas. The chart style's hub
// (a filled disc inside a coiled rope ring, holding a themed glyph) and the window style's
// handoff hub (a plain accent disc holding a fixed chevron, at the end of the arrow from the
// calendar panel) are different enough in what they're made of that they stay two functions,
// each a literal move of its call site out of scripts/figurehead.mjs.
import { esc } from "./esc.mjs";
import { themedGlyph } from "./glyphs.mjs";

export function chartHub({ cx, cy, r, ring, icon, label }) {
  const out = [];
  out.push(`  <g filter="url(#rough)"><circle cx="${cx}" cy="${cy}" r="${ring}" class="rope" stroke-width="3.5"/><circle cx="${cx}" cy="${cy}" r="${ring}" class="twist" stroke-width="3.5"/></g>`);
  out.push(`  <circle class="hub" cx="${cx}" cy="${cy}" r="${r}" filter="url(#roughds)"/>`);
  out.push(`  ${themedGlyph(icon, cx - 15.6, cy - 13.8, 31.2, "anchor")}`);
  if (label) out.push(`  <text class="serif brass" x="${cx}" y="${cy + 66}" font-size="17" font-weight="700" text-anchor="middle">${esc(label)}</text>`);
  return out;
}

export function windowHandoffHub({ calRight, arrowY, label }) {
  const out = [];
  out.push(`  <path class="hand" d="M${calRight},${arrowY} H${calRight + 62}" marker-end="url(#head)"/>`);
  out.push(`  <circle class="accent" cx="${calRight + 30}" cy="${arrowY}" r="12"/>`);
  out.push(`  <path class="mark" d="M${calRight + 23},${arrowY + 5} L${calRight + 30},${arrowY - 7} L${calRight + 37},${arrowY + 5} L${calRight + 30},${arrowY + 1} Z"/>`);
  if (label) out.push(`  <text class="sans accent" x="${calRight + 30}" y="${arrowY + 30}" font-size="11" font-weight="700" text-anchor="middle">${esc(label)}</text>`);
  return out;
}

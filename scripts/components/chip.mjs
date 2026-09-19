// A small rounded-rect mini surface: an icon and a bold label, no shadow. Per
// components-plan.md's component vocabulary this is for the "two-chairs" scene's mini
// surfaces, which no current style draws yet — none of the three style functions call this
// today. It is added now, alongside the primitives that are wired in, so the vocabulary the
// plan describes has a home; test/render.test.mjs's component-module test covers it like every
// other module here.
import { esc } from "./esc.mjs";
import { glyph } from "./glyphs.mjs";

export function chip({ x, y, w = 120, h = 28, icon, label }) {
  return `<g transform="translate(${x},${y})"><rect class="card" x="0" y="0" width="${w}" height="${h}" rx="${h / 2}"/>${glyph(icon, 8, (h - 16) / 2, 16)}<text class="title" x="30" y="${h / 2 + 5}" font-size="13" font-weight="600">${esc(label)}</text></g>`;
}

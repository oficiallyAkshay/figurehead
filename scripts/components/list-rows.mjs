// The window style's inbox row: an icon, a bold label, and either a single muted bar ("and
// more") or a subject bar, a preview bar and an amount bar at the row's right edge. Row height
// and divider lines are the caller's layout, not this component's; this only ever draws one
// row at the top y it's given.
import { esc } from "./esc.mjs";
import { themedGlyph } from "./glyphs.mjs";

export function listRow({ x, top, icon, label, more, w1, w2, rightX }) {
  const out = [];
  const iconCls = more ? "g-muted" : "g";
  out.push(themedGlyph(icon, x + 18, top + 9, 18, iconCls));
  const textCls = more ? "sans faint" : "sans ink";
  out.push(`<text class="${textCls}" x="${x + 50}" y="${top + 23}" font-size="14" font-weight="600">${esc(label)}</text>`);
  if (more) {
    out.push(`<rect class="bar" x="${x + 110}" y="${top + 15}" width="70" height="6" rx="3"/>`);
  } else {
    out.push(
      `<rect class="bar" x="${x + 110}" y="${top + 15}" width="${w1}" height="6" rx="3"/><rect class="bar2" x="${x + 110}" y="${top + 26}" width="${w2}" height="5" rx="2.5"/><rect class="bar2" x="${rightX - 48}" y="${top + 18}" width="30" height="6" rx="3"/>`
    );
  }
  return out;
}

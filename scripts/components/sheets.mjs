// The stacked-paper depth every "sheet" in figurehead draws: two back rects, offset by
// dx/dy and classed by the caller, then one front rect at the true position. Used by the flat
// style's deliverable page (references/contract.md's "page") and the window style's
// deliverable packet; the two differ in size, corner radius, class names, offsets and whether
// the front rect carries a drop-shadow filter, all of which are explicit props here.
export function stackedSheet({ x, y, w, h, rx, back2, back1, frontClass, filter }) {
  const out = [];
  out.push(`<rect class="${back2.cls}" x="${x + back2.dx}" y="${y + back2.dy}" width="${w}" height="${h}" rx="${rx}"/>`);
  out.push(`<rect class="${back1.cls}" x="${x + back1.dx}" y="${y + back1.dy}" width="${w}" height="${h}" rx="${rx}"/>`);
  out.push(`<rect class="${frontClass}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"${filter ? ` filter="url(#${filter})"` : ""}/>`);
  return out;
}

// The small "ok" badge: a filled ring with a check mark, used wherever the flat style backs a
// claim (the flat deliverable page, and the before-after "after" page). The two call sites
// differ only in whether the mark is scaled up.
export function okBadge(x, y, scale) {
  return `<g class="glyph ok" transform="translate(${x},${y})${scale ? ` scale(${scale})` : ""}"><circle cx="10" cy="10" r="8"/><path d="M6.5,10 l2.5,2.5 4.5,-5"/></g>`;
}

// The fan link: a single cubic from one point to another, and the chart style's double-stroke
// "rope" variant of the same curve, both taking their control points as explicit props (the
// midpoint rule some callers use — forcing the control x strictly between the two endpoints,
// per curves/no-hook — is arithmetic the caller does before handing the point in; the
// component itself only ever places the four points it's given). Also the brass grommet the
// chart style ties rope ends through.

// A single ".flow"-classed cubic, optionally arrow-headed. Used for every flat-style flow line.
export function flowCurve({ x1, y1, c1x, c1y, c2x, c2y, x2, y2, cls = "flow", marker = false }) {
  const m = marker ? ' marker-end="url(#arrow)"' : "";
  return `<path class="${cls}" d="M${x1},${y1} C ${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}"${m}/>`;
}

// The chart style's rope: the same cubic drawn twice, once as the solid ".rope" stroke and
// once as the dashed ".twist" overlay, sharing one "d" string.
export function ropeLink({ x1, y1, c1x, c1y, c2x, c2y, x2, y2 }) {
  const d = `M${x1},${y1} C ${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
  return `<path class="rope" d="${d}"/><path class="twist" d="${d}"/>`;
}

// The small ring a rope end is tied through: fixed radius, cream fill, brass stroke.
export function grommet(cx, cy) {
  return `<circle class="grommet" cx="${cx}" cy="${cy}" r="6.5"/>`;
}

/** Every label a spec puts on the picture, whatever the layout. The check compares these with the SVG's own text. */
export function labels(spec) {
  const out = [];
  const keys = ["title", "label", "gives", "heading", "backing", "with", "sub", "note", "headline", "subhead", "aside"];
  const walk = (v, key) => {
    if (typeof v === "string") return void (keys.includes(key) && v.trim() && out.push(v.trim()));
    if (Array.isArray(v)) return v.forEach((x) => walk(x, key));
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(spec, "");
  return out;
}

// The SVG head every style opens with: the root <svg>, its <title>, and the <defs> wrapper
// around the style's own filters/markers/gradients and its <style> block. All three style
// functions (head, chartHead, windowHead in scripts/figurehead.mjs) built this same shape by
// hand; this is that shape as one function, taking the per-style width, height, title and the
// two arrays of lines (defs markup, then CSS lines) each style already had.
import { esc } from "./esc.mjs";

export function svgHead({ width, height, title, defs = [], css = [] }) {
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="hero-title">`);
  out.push(`  <title id="hero-title">${esc(title)}</title>`);
  out.push("  <defs>");
  out.push(...defs);
  out.push("    <style>");
  out.push(...css);
  out.push("    </style>");
  out.push("  </defs>");
  return out;
}

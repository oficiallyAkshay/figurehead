#!/usr/bin/env node
// Draws a hero SVG from its spec. A hero takes the shape of the product's own verb, so there is more than one layout:
//   "fan"          many scattered things gathered into one: sources, what gets handled fanning out, the one deliverable
//   "before-after" one thing made better: the page the reader has, the page they wanted, the differences called out
// Each kind can be drawn in one of two styles:
//   "flat"  readmerlin's current look: slate and one amber accent, outline icons, no fills.
//   "chart" the pierless look: a hand-inked nautical chart, described in references/contract.md.
// Usage: node scripts/figurehead.mjs render <spec.hero.json> [--out <file.svg>]
//        node scripts/figurehead.mjs check <spec.hero.json> <file.svg> [--repo <dir>]
//        node scripts/figurehead.mjs goldens
// No dependencies. test/render.test.mjs rebuilds every committed hero and fails when one has drifted from its spec.
//
// History: seeded 2026-09-19 from readmerlin's scripts/hero-svg.mjs (branch claude/readmerlin-next, commit
// 20f136c), which understood "fan" and "before-after" in the flat style only. This file kept that renderer
// byte-for-byte and added the chart style, the icon table's move to scripts/icons.mjs, spec validation and the
// check/goldens subcommands.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { ICONS } from "./icons.mjs";

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Iowan Old Style", Palatino, "Palatino Linotype", "Times New Roman", serif';
const HAND = '"Bradley Hand", "Segoe Print", "Chalkboard SE", cursive';
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function iconEntry(name) {
  const icon = ICONS[name];
  if (!icon) throw new Error(`Unknown icon "${name}". Known: ${Object.keys(ICONS).join(", ")}.`);
  return icon;
}

// The flat style's icon: always the ".glyph" class, slate stroke, no fill.
function glyph(name, x, y, size, extra = "") {
  const [box, path] = iconEntry(name);
  const scale = +(size / box).toFixed(3);
  return `<g class="glyph" transform="translate(${x},${y})${scale === 1 ? "" : ` scale(${scale})`}"${extra}>${path}</g>`;
}

// The chart style's icon, coloured by whichever class the caller passes (a theme's ".i-navy" and friends, or
// ".anchor" for the hub) instead of the flat style's fixed ".glyph".
function themedGlyph(name, x, y, size, cls) {
  const [box, path] = iconEntry(name);
  const scale = +(size / box).toFixed(3);
  return `<g class="${cls}" transform="translate(${x},${y})${scale === 1 ? "" : ` scale(${scale})`}">${path}</g>`;
}

// The chart style's source button icon: a literal cream stroke on a green button, not a theme colour.
function rawGlyph(name, x, y, size, attrs) {
  const [box, path] = iconEntry(name);
  const scale = +(size / box).toFixed(3);
  return `<g transform="translate(${x},${y})${scale === 1 ? "" : ` scale(${scale})`}" ${attrs}>${path}</g>`;
}

// ---------------------------------------------------------------------------
// Spec validation. Unknown fields are an error naming the field; anything the
// brief's wording rules say about labels (length, register, distinctness) is
// a check (scripts/check.mjs), not a render error.
// ---------------------------------------------------------------------------
const TOP_COMMON = ["kind", "style", "title", "headline", "subhead", "scene"];
const TOP_FAN = ["source", "sources", "hub", "handled", "more", "deliverable", "aside"];
const TOP_BEFORE_AFTER = ["before", "by", "after"];
const THEMES = ["navy", "sea", "ochre", "plum"];
const FIELDS = {
  source: ["label", "icon", "note"],
  sourceItem: ["label", "icon", "gives"],
  hub: ["label", "icon"],
  handledItem: ["label", "sub", "icon", "theme"],
  deliverable: ["label", "kind", "backing", "heading"],
  before: ["label", "problems"],
  problem: ["label", "at"],
  by: ["label", "icon", "with"],
  after: ["label", "parts", "backing"],
  part: ["label", "at"],
};

function checkKeys(obj, allowed, where) {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) throw new Error(`Unknown field "${key}" in ${where}. Known: ${allowed.join(", ")}.`);
  }
}

function validateSpec(spec) {
  const isBeforeAfter = spec.kind === "before-after";
  checkKeys(spec, [...TOP_COMMON, ...(isBeforeAfter ? TOP_BEFORE_AFTER : TOP_FAN)], "the spec");

  if (isBeforeAfter) {
    if (spec.before) {
      checkKeys(spec.before, FIELDS.before, "before");
      for (const p of spec.before.problems ?? []) checkKeys(p, FIELDS.problem, "a before problem");
    }
    if (spec.by) checkKeys(spec.by, FIELDS.by, "by");
    if (spec.after) {
      checkKeys(spec.after, FIELDS.after, "after");
      for (const p of spec.after.parts ?? []) checkKeys(p, FIELDS.part, "an after part");
    }
    return;
  }

  if (spec.source) checkKeys(spec.source, FIELDS.source, "source");
  for (const s of spec.sources ?? []) checkKeys(s, FIELDS.sourceItem, "a source");
  if (spec.hub) checkKeys(spec.hub, FIELDS.hub, "hub");
  for (const h of spec.handled ?? []) {
    checkKeys(h, FIELDS.handledItem, "a handled item");
    if (h.theme && !THEMES.includes(h.theme)) throw new Error(`Unknown theme "${h.theme}" on "${h.label}". Known: ${THEMES.join(", ")}.`);
  }
  if (spec.deliverable) checkKeys(spec.deliverable, FIELDS.deliverable, "deliverable");
}

// A render-time guard against a label that cannot fit the box the spec vocabulary promises it. This is a coarse
// character count (the numbers the brief measured for the chart style's cards), not the precise, browser-measured
// check in scripts/check.mjs; it exists so a spec author sees the failure immediately, named, instead of a
// silently clipped card.
function assertFits(text, max, where) {
  if (String(text).length > max) throw new Error(`Label "${text}" does not fit its ${where} (max ${max} characters).`);
}

// ---------------------------------------------------------------------------
// The flat style. This is readmerlin's current look and its output for the
// readmerlin and tidy-inbox goldens must not change by a byte.
// ---------------------------------------------------------------------------

// The page the reader wanted. "document" is a README-like page, "table" is a summary with a total.
function page(kind, x, y, heading) {
  const out = [];
  out.push(`<rect class="sheet back2" x="${x + 28}" y="${y + 28}" width="212" height="274" rx="10"/>`);
  out.push(`<rect class="sheet back1" x="${x + 14}" y="${y + 14}" width="212" height="274" rx="10"/>`);
  out.push(`<rect class="sheet front" x="${x}" y="${y}" width="212" height="274" rx="10"/>`);
  if (kind === "table") {
    out.push(`<text class="title" x="${x + 22}" y="${y + 42}" font-size="20">${esc(heading)}</text>`);
    [96, 72, 110, 84, 100].forEach((w, i) => {
      const ry = y + 66 + i * 30;
      out.push(`<rect class="bar" x="${x + 22}" y="${ry}" width="${w}" height="8" rx="4"/><rect class="bar" x="${x + 150}" y="${ry}" width="${i % 2 ? 32 : 40}" height="8" rx="4"/>`);
    });
    out.push(`<path class="rule" d="M${x + 22},${y + 214} h168"/>`);
    out.push(`<rect class="pill" x="${x + 22}" y="${y + 230}" width="64" height="10" rx="5"/><rect class="pill" x="${x + 142}" y="${y + 230}" width="48" height="10" rx="5"/>`);
    return out;
  }
  out.push(`<text class="title" x="${x + 106}" y="${y + 40}" font-size="20" text-anchor="middle">${esc(heading)}</text>`);
  out.push(`<rect class="bar" x="${x + 56}" y="${y + 56}" width="100" height="8" rx="4"/>`);
  for (const dx of [34, 84, 134]) out.push(`<rect class="pill" x="${x + dx}" y="${y + 78}" width="38" height="10" rx="5"/>`);
  out.push(`<rect class="card" x="${x + 22}" y="${y + 104}" width="168" height="62" rx="8"/>`);
  out.push(`<path class="flow" d="M${x + 40},${y + 135} C ${x + 70},${y + 135} ${x + 90},${y + 118} ${x + 110},${y + 118}" marker-end="url(#arrow)"/>`);
  out.push(`<path class="flow" d="M${x + 40},${y + 135} C ${x + 70},${y + 135} ${x + 90},${y + 152} ${x + 110},${y + 152}" marker-end="url(#arrow)"/>`);
  out.push(`<circle class="dot" cx="${x + 38}" cy="${y + 135}" r="4"/>`);
  [120, 96, 132, 84].forEach((w, i) => out.push(`<rect class="bar" x="${x + 22}" y="${y + 186 + i * 20}" width="${w}" height="8" rx="4"/>`));
  out.push(`<g class="glyph ok" transform="translate(${x + 150},${y + 232}) scale(1.2)"><circle cx="10" cy="10" r="8"/><path d="M6.5,10 l2.5,2.5 4.5,-5"/></g>`);
  return out;
}

function head(o, spec, height) {
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 ${height}" width="1200" height="${height}" role="img" aria-labelledby="hero-title">`);
  o.push(`  <title id="hero-title">${esc(spec.title)}</title>`);
  o.push("  <defs>");
  o.push('    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#d97706"/></marker>');
  o.push('    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.72" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>');
  o.push("    <style>");
  o.push("      .card { fill: #f8fafc; stroke: #94a3b8; stroke-width: 2; }");
  o.push("      .more { stroke-dasharray: 4 4; }");
  o.push("      .glyph { fill: none; stroke: #475569; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }");
  o.push("      .ok { stroke: #16a34a; }");
  o.push(`      .title { font-family: ${FONT}; fill: #0f172a; font-weight: 600; }`);
  o.push(`      .muted { font-family: ${FONT}; fill: #64748b; font-weight: 500; }`);
  o.push(`      .wrong { font-family: ${FONT}; fill: #b91c1c; font-weight: 600; }`);
  o.push("      .flow { fill: none; stroke: #d97706; stroke-width: 2; }");
  o.push("      .dot { fill: #d97706; }");
  o.push("      .bar { fill: #cbd5e1; }");
  o.push("      .pill { fill: #334155; }");
  o.push("      .code { fill: #1e293b; } .codeline { fill: #64748b; }");
  o.push("      .stale { fill: none; stroke: #dc2626; stroke-width: 2; stroke-dasharray: 3 3; } .dead { fill: #93c5fd; }");
  o.push("      .mark { fill: #dc2626; } .lead { stroke: #dc2626; stroke-width: 2; } .good { fill: #16a34a; } .goodlead { stroke: #16a34a; stroke-width: 2; }");
  o.push("      .fold { stroke: #dc2626; stroke-width: 2; stroke-dasharray: 6 5; }");
  o.push("      .rule { stroke: #94a3b8; stroke-width: 2; }");
  o.push("      .sheet { stroke: #94a3b8; stroke-width: 2; }");
  o.push("      .front { fill: #ffffff; stroke: #64748b; } .back1 { fill: #f4f7fa; } .back2 { fill: #eef2f7; }");
  o.push("      @media (prefers-color-scheme: dark) {");
  o.push("        .card { fill: #1e293b; stroke: #64748b; } .glyph { stroke: #cbd5e1; } .ok { stroke: #4ade80; }");
  o.push("        .title { fill: #f1f5f9; } .muted { fill: #94a3b8; } .wrong { fill: #fca5a5; } .bar { fill: #475569; } .pill { fill: #cbd5e1; } .rule { stroke: #64748b; }");
  o.push("        .code { fill: #020617; } .codeline { fill: #475569; } .dead { fill: #3b82f6; } .stale, .lead, .fold { stroke: #f87171; } .mark { fill: #f87171; } .good { fill: #4ade80; } .goodlead { stroke: #4ade80; }");
  o.push("        .sheet { stroke: #64748b; } .front { fill: #0f172a; stroke: #94a3b8; } .back1 { fill: #172033; } .back2 { fill: #1e293b; }");
  o.push("      }");
  o.push("    </style>");
  o.push("  </defs>");
}

// One thing made better. Left: the page the reader has, long, its faults marked in their words. Right: the short page they wanted, its parts named.
function renderBeforeAfter(spec) {
  const o = [];
  const H = 490;
  head(o, spec, H);
  const bars = (x, y, widths, cls = "bar", h = 8, step = 14) => widths.map((w, i) => `<rect class="${cls}" x="${x}" y="${y + i * step}" width="${w}" height="${h}" rx="${h / 2}"/>`).join("");
  const codeBlock = (x, y) => `<rect class="code" x="${x}" y="${y}" width="220" height="58" rx="6"/>${bars(x + 12, y + 12, [120, 168, 96], "codeline", 6, 14)}`;

  // Before: a long page that fades out, because nobody reaches the end of it.
  const bx = 216;
  const by = 20;
  o.push('  <mask id="long"><rect x="0" y="0" width="1200" height="430" fill="url(#fade)"/></mask>');
  o.push('  <g mask="url(#long)">');
  o.push(`    <rect class="sheet front" x="${bx}" y="${by}" width="260" height="410" rx="10"/>`);
  o.push(`    <rect class="pill" x="${bx + 20}" y="${by + 24}" width="120" height="12" rx="6"/>`);
  o.push(`    ${bars(bx + 20, by + 50, [220, 200, 180])}`);
  o.push(`    ${codeBlock(bx + 20, by + 104)}`);
  o.push(`    ${bars(bx + 20, by + 178, [210, 220, 150])}`);
  o.push(`    <rect class="pill" x="${bx + 20}" y="${by + 226}" width="44" height="10" rx="5"/><rect class="pill" x="${bx + 72}" y="${by + 226}" width="44" height="10" rx="5"/><rect class="stale" x="${bx + 124}" y="${by + 224}" width="52" height="14" rx="7"/>`);
  o.push(`    ${bars(bx + 20, by + 254, [200])}<rect class="dead" x="${bx + 20}" y="${by + 268}" width="96" height="8" rx="4"/>${bars(bx + 124, by + 268, [90])}`);
  o.push(`    ${codeBlock(bx + 20, by + 292)}`);
  o.push(`    ${bars(bx + 20, by + 366, [220, 190, 205])}`);
  o.push("  </g>");
  const anchors = { fold: by + 96, code: by + 133, badge: by + 231, link: by + 272 };
  o.push(`  <path class="fold" d="M${bx - 10},${anchors.fold} h280"/>`);
  for (const p of spec.before.problems) {
    const y = anchors[p.at];
    if (y === undefined) throw new Error(`Unknown place "${p.at}" on the before page. Known: ${Object.keys(anchors).join(", ")}.`);
    o.push(`  <circle class="mark" cx="${bx - 10}" cy="${y}" r="4"/><path class="lead" d="M${bx - 10},${y} h-12"/>`);
    o.push(`  <text class="wrong" x="${bx - 28}" y="${y + 5}" font-size="15" text-anchor="end">${esc(p.label)}</text>`);
  }
  o.push(`  <text class="title" x="${bx + 130}" y="462" font-size="17" text-anchor="middle">${esc(spec.before.label)}</text>`);

  // The one step in between. The mechanism is a single arrow.
  o.push(`  ${glyph(spec.by.icon, 571, 176, 34)}`);
  o.push('  <path class="flow" d="M496,240 L 680,240" marker-end="url(#arrow)"/>');
  o.push(`  <text class="title" x="588" y="270" font-size="16" text-anchor="middle">${esc(spec.by.label)}</text>`);
  if (spec.by.with) o.push(`  <text class="muted" x="588" y="290" font-size="14" text-anchor="middle">${esc(spec.by.with)}</text>`);

  // After: a short page, every part in its place.
  const ax = 700;
  const ay = 60;
  o.push(`  <rect class="sheet front" x="${ax}" y="${ay}" width="260" height="300" rx="10"/>`);
  o.push(`  <circle class="dot" cx="${ax + 92}" cy="${ay + 30}" r="7"/><rect class="pill" x="${ax + 106}" y="${ay + 24}" width="76" height="12" rx="6"/>`);
  o.push(`  <rect class="pill" x="${ax + 40}" y="${ay + 52}" width="180" height="9" rx="4.5"/>`);
  o.push(`  <rect class="card" x="${ax + 24}" y="${ay + 76}" width="212" height="70" rx="8"/>`);
  o.push(`  <rect class="bar" x="${ax + 60}" y="${ay + 90}" width="30" height="42" rx="4"/><path class="flow" d="M${ax + 100},${ay + 111} h56" marker-end="url(#arrow)"/><rect class="pill" x="${ax + 168}" y="${ay + 96}" width="30" height="30" rx="4"/>`);
  o.push(`  ${[0, 1, 2, 3].map((i) => `<rect class="pill" x="${ax + 34 + i * 50}" y="${ay + 162}" width="42" height="10" rx="5"/>`).join("")}`);
  o.push(`  ${[150, 170, 132, 160].map((w, i) => `<circle class="dot" cx="${ax + 40}" cy="${ay + 196 + i * 22}" r="4"/><rect class="bar" x="${ax + 54}" y="${ay + 192 + i * 22}" width="${w}" height="8" rx="4"/>`).join("")}`);
  const parts = { tagline: ay + 56, picture: ay + 111, badges: ay + 167, features: ay + 229 };
  for (const p of spec.after.parts) {
    const y = parts[p.at];
    if (y === undefined) throw new Error(`Unknown part "${p.at}" on the after page. Known: ${Object.keys(parts).join(", ")}.`);
    o.push(`  <circle class="good" cx="${ax + 270}" cy="${y}" r="4"/><path class="goodlead" d="M${ax + 270},${y} h12"/>`);
    o.push(`  <text class="title" x="${ax + 288}" y="${y + 5}" font-size="15">${esc(p.label)}</text>`);
  }
  if (spec.after.backing) {
    o.push(`  <g class="glyph ok" transform="translate(${ax + 38},${ay + 322})"><circle cx="10" cy="10" r="8"/><path d="M6.5,10 l2.5,2.5 4.5,-5"/></g>`);
    o.push(`  <text class="muted" x="${ax + 66}" y="${ay + 337}" font-size="15">${esc(spec.after.backing)}</text>`);
  }
  o.push(`  <text class="title" x="${ax + 130}" y="462" font-size="17" text-anchor="middle">${esc(spec.after.label)}</text>`);
  o.push("</svg>");
  return o.join("\n") + "\n";
}

// Many scattered things gathered into one, drawn flat: sources on the left, what gets handled fanning out in the
// middle, the one deliverable on the right.
function renderFanFlat(spec) {
  const rows = [...spec.handled.map((h) => ({ ...h, more: false })), ...(spec.more ? [{ label: "and more", icon: "more", more: true }] : [])];
  const n = rows.length;
  const height = 22 + 54 * n + 16;
  const mid = Math.round(height / 2);
  const sources = spec.sources ?? (spec.source ? [spec.source] : []);
  const k = sources.length;
  const gap = k <= 2 ? 200 : 140;
  const o = [];
  head(o, spec, height);

  sources.forEach((s, j) => {
    const cy = Math.round(mid + (j - (k - 1) / 2) * gap);
    const y = cy - 59;
    o.push(`  <g><rect class="card" x="24" y="${y}" width="190" height="118" rx="14"/>`);
    o.push(`    ${glyph(s.icon, 97, y + 20, 44)}`);
    o.push(`    <text class="title" x="119" y="${y + 96}" font-size="19" text-anchor="middle">${esc(s.label)}</text></g>`);
    const lean = Math.sign(cy - mid);
    o.push(`  <path class="flow" d="M220,${cy} C 272,${cy} 300,${mid + lean * 45} 336,${mid + lean * 15}" marker-end="url(#arrow)"/>`);
    if (s.gives) o.push(`  <text class="muted" x="278" y="${lean > 0 ? cy + 33 : cy - 17}" font-size="15" text-anchor="middle">${esc(s.gives)}</text>`);
  });
  o.push(`  <circle class="dot" cx="352" cy="${mid}" r="6"/>`);

  rows.forEach((r, i) => {
    const x = 443 + 14 * Math.min(i, n - 1 - i, 3);
    const y = 22 + 54 * i;
    o.push(`  <path class="flow" d="M358,${mid} C 412,${mid} 422,${y + 20} ${x - 6},${y + 20}" marker-end="url(#arrow)"/>`);
    o.push(`  <g transform="translate(${x},${y})"><rect class="card${r.more ? " more" : ""}" x="0" y="0" width="210" height="40" rx="10"/>`);
    o.push(`    ${glyph(r.icon, 14, 10, 20)}`);
    o.push(`    <text class="${r.more ? "muted" : "title"}" x="48" y="26" font-size="17">${esc(r.label)}</text></g>`);
  });
  rows.forEach((_, i) => {
    const x = 443 + 14 * Math.min(i, n - 1 - i, 3) + 210;
    const y = 22 + 54 * i + 20;
    o.push(`  <path class="flow" d="M${x},${y} C ${x + 60},${y} 780,${mid} 844,${mid}"/>`);
  });
  o.push(`  <circle class="dot" cx="850" cy="${mid}" r="6"/>`);
  o.push(`  <path class="flow" d="M856,${mid} L 888,${mid}" marker-end="url(#arrow)"/>`);

  const d = spec.deliverable;
  const top = mid - 158;
  for (const line of page(d.kind === "table" ? "table" : "document", 900, top, d.heading ?? d.label)) o.push(`  ${line}`);
  o.push(`  <text class="title" x="1020" y="${top + 326}" font-size="16" text-anchor="middle">${esc(d.label)}</text>`);
  if (d.backing) o.push(`  <text class="muted" x="1020" y="${top + 346}" font-size="14" text-anchor="middle">${esc(d.backing)}</text>`);
  o.push("</svg>");
  return o.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// The chart style: a hand-inked nautical chart, reproducing examples/pierless/reference.svg. Everything about the
// scene (the parchment, the rhumb lines, the compass rose, the gulls, the waves, the sailboat, the grain and the
// vignette) is the style's own fixed world, per references/contract.md; only the headline, the source card, the
// hub and the handled cards are drawn from the spec. Canvas is fixed at 820x500, the pierless hero's own size.
// ---------------------------------------------------------------------------
const CHART_W = 820;
const CHART_H = 500;
const HUB = { cx: 370, cy: 255, r: 34, ring: 45 };
// Nine hand-set wobble angles, the first four exactly what pierless's accepted pass used. Fixed, not random: the
// same spec must always draw the same bytes.
const CARD_TILT = [-1.2, 0.9, -0.6, 1.4, -1.5, 1.1, -0.8, 1.3, -1.0];

function chartHeadline(headline, brandWord) {
  const idx = brandWord ? headline.indexOf(brandWord) : -1;
  if (idx === -1) return esc(headline);
  const before = headline.slice(0, idx);
  const after = headline.slice(idx + brandWord.length);
  return `${esc(before)}<tspan class="brass">${esc(brandWord)}</tspan>${esc(after)}`;
}

function chartHead(o, spec) {
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_W} ${CHART_H}" width="${CHART_W}" height="${CHART_H}" role="img" aria-labelledby="hero-title">`);
  o.push(`  <title id="hero-title">${esc(spec.title)}</title>`);
  o.push("  <defs>");
  o.push('    <filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>');
  o.push('    <filter id="roughds" x="-20%" y="-30%" width="140%" height="170%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/><feDropShadow in="d" dx="1" dy="3" stdDeviation="2.5" flood-color="#2a1d0c" flood-opacity="0.2"/></filter>');
  o.push('    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>');
  o.push('    <radialGradient id="vignette" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#3b2a12" stop-opacity="0.16"/></radialGradient>');
  o.push("    <style>");
  o.push(`      .serif { font-family: ${SERIF}; }`);
  o.push(`      .sans { font-family: ${FONT}; }`);
  o.push(`      .hand { font-family: ${HAND}; }`);
  o.push("      .bg { fill: #f3ead3; } .grain { opacity: 0.09; }");
  o.push("      .rhumb { fill: none; stroke: #1f2d45; stroke-width: 0.8; opacity: 0.1; }");
  o.push("      .ink { fill: #1f2d45; } .inks { stroke: #1f2d45; } .muted { fill: #6b5d48; } .sound { fill: #6b5d48; opacity: 0.45; font-style: italic; }");
  o.push("      .brass { fill: #a8741f; } .brass-s { stroke: #b8862f; }");
  o.push("      .star-fill { fill: #1f2d45; } .star-open { fill: #f7f0de; stroke: #1f2d45; stroke-width: 1.2; }");
  o.push("      .ring { fill: none; stroke: #1f2d45; stroke-width: 1.2; }");
  o.push("      .paper { fill: #fbf5e6; stroke: #3b3326; stroke-width: 1.8; } .chrome { fill: #efe5cf; stroke: #9c8b6e; stroke-width: 1.2; } .dot { fill: #9c8b6e; } .bar { fill: #e0d4ba; }");
  o.push('      .rope { fill: none; stroke: #a67c45; stroke-width: 4.5; stroke-linecap: round; }');
  o.push('      .twist { fill: none; stroke: #6e4e27; stroke-width: 4.5; stroke-dasharray: 1.6 4.4; }');
  o.push("      .grommet { fill: #f3ead3; stroke: #b8862f; stroke-width: 3; }");
  o.push("      .hub { fill: #1f3a66; stroke: #b8862f; stroke-width: 3.5; }");
  o.push("      .anchor { fill: none; stroke: #f7f0de; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }");
  o.push("      .gull { fill: none; stroke: #3b3326; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }");
  o.push("      .stars, .moon { display: none; }");
  o.push("      .w1 { fill: #d3dfdc; } .w2 { fill: #a9c3c4; } .w3 { fill: #7ea3ab; }");
  o.push("      .crest { fill: none; stroke: #1f2d45; stroke-width: 1.2; stroke-linecap: round; opacity: 0.45; }");
  o.push("      .hull { fill: #9a6a3a; stroke: #2b2118; stroke-width: 1.6; stroke-linejoin: round; } .sail { fill: #f9f2df; stroke: #2b2118; stroke-width: 1.6; stroke-linejoin: round; } .line { fill: none; stroke: #2b2118; stroke-width: 1.3; }");
  o.push("      .c-navy { fill: #fbf5e6; stroke: #2b4a7e; stroke-width: 2; } .c-sea { fill: #fbf5e6; stroke: #2f7d6d; stroke-width: 2; } .c-ochre { fill: #fbf5e6; stroke: #b7791f; stroke-width: 2; } .c-plum { fill: #fbf5e6; stroke: #7a3b69; stroke-width: 2; }");
  o.push("      .g { fill: none; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }");
  o.push("      .i-navy { stroke: #2b4a7e; } .i-sea { stroke: #2f7d6d; } .i-ochre { stroke: #b7791f; } .i-plum { stroke: #7a3b69; }");
  o.push("      .vig { fill: url(#vignette); }");
  o.push("      @media (prefers-color-scheme: dark) {");
  o.push("        .bg { fill: #122036; } .grain { opacity: 0.07; }");
  o.push("        .rhumb { stroke: #c9d3e3; opacity: 0.1; }");
  o.push("        .ink { fill: #ece3cc; } .inks { stroke: #ece3cc; } .muted { fill: #a6b3c8; } .sound { fill: #a6b3c8; }");
  o.push("        .brass { fill: #e0b562; } .brass-s { stroke: #d8a94f; }");
  o.push("        .star-fill { fill: #ece3cc; } .star-open { fill: #122036; stroke: #ece3cc; } .ring { stroke: #ece3cc; }");
  o.push("        .paper { fill: #1a2a44; stroke: #7f8fa8; } .chrome { fill: #22344f; stroke: #6d7c95; } .dot { fill: #6d7c95; } .bar { fill: #30425f; }");
  o.push("        .rope { stroke: #cfa66a; } .twist { stroke: #8a6a3c; } .grommet { fill: #122036; stroke: #d8a94f; }");
  o.push("        .hub { fill: #28508f; stroke: #d8a94f; }");
  o.push("        .gull { stroke: #c9d3e3; }");
  o.push("        .stars { display: inline; fill: #ece3cc; } .moon { display: inline; fill: #ece3cc; }");
  o.push("        .w1 { fill: #1b3252; } .w2 { fill: #1f3d63; } .w3 { fill: #254a78; } .crest { stroke: #c9d3e3; opacity: 0.35; }");
  o.push("        .hull { fill: #8a5d33; stroke: #ece3cc; } .sail { fill: #ece3cc; stroke: #0e1a2c; } .line { stroke: #ece3cc; }");
  o.push("        .c-navy { fill: #1a2a44; stroke: #8fb4ff; } .c-sea { fill: #1a2a44; stroke: #6fd1b9; } .c-ochre { fill: #1a2a44; stroke: #f0c064; } .c-plum { fill: #1a2a44; stroke: #d69ad0; }");
  o.push("        .i-navy { stroke: #8fb4ff; } .i-sea { stroke: #6fd1b9; } .i-ochre { stroke: #f0c064; } .i-plum { stroke: #d69ad0; }");
  o.push("        .vig { opacity: 0.6; }");
  o.push("      }");
  o.push("    </style>");
  o.push("  </defs>");
}

// The style's own fixed world: parchment, rhumb lines, soundings, moon and stars, compass rose, gulls. Identical
// for every spec drawn in the chart style, per references/contract.md.
function chartScene(o) {
  o.push(`  <rect class="bg" x="0" y="0" width="${CHART_W}" height="${CHART_H}"/>`);
  o.push('  <g transform="translate(764,58)"><path class="rhumb" d="M0,0 L0,-900 M0,0 L344,-831 M0,0 L636,-636 M0,0 L831,-344 M0,0 L900,0 M0,0 L831,344 M0,0 L636,636 M0,0 L344,831 M0,0 L0,900 M0,0 L-344,831 M0,0 L-636,636 M0,0 L-831,344 M0,0 L-900,0 M0,0 L-831,-344 M0,0 L-636,-636 M0,0 L-344,-831"/></g>');
  o.push('  <g class="sound serif" font-size="11"><text x="176" y="118">7</text><text x="300" y="148">12</text><text x="84" y="380">9</text><text x="330" y="372">11</text><text x="760" y="420">8</text><text x="410" y="96">14</text><text x="150" y="490">4</text><text x="430" y="494">6</text><text x="690" y="488">5</text></g>');
  o.push('  <g class="moon"><path d="M128,100 a14,14 0 1 0 6,24 a11,11 0 1 1 -6,-24 z"/></g>');
  o.push('  <g class="stars"><circle cx="610" cy="30" r="1.3"/><circle cx="560" cy="78" r="1.1"/><circle cx="96" cy="100" r="1.2"/><circle cx="40" cy="150" r="1"/><circle cx="330" cy="110" r="1"/><circle cx="800" cy="130" r="1.2"/><path d="M640,64 l1.6,-5 1.6,5 5,1.6 -5,1.6 -1.6,5 -1.6,-5 -5,-1.6 z"/></g>');
  o.push('  <g transform="translate(764,58)" filter="url(#rough)"><circle class="ring" r="28"/><circle class="ring" r="31" stroke-dasharray="1.5 3"/><polygon class="star-open" points="0,-34 2.7,-6.5 14.1,-14.1 6.5,-2.7 34,0 6.5,2.7 14.1,14.1 2.7,6.5 0,34 -2.7,6.5 -14.1,14.1 -6.5,2.7 -34,0 -6.5,-2.7 -14.1,-14.1 -2.7,-6.5"/><path class="star-fill" d="M0,0 L0,-34 L-2.7,-6.5 Z M0,0 L34,0 L6.5,-2.7 Z M0,0 L0,34 L2.7,6.5 Z M0,0 L-34,0 L-6.5,2.7 Z"/><circle class="star-fill" r="2"/></g>');
  o.push('  <text class="serif ink" x="764" y="17" font-size="11" font-weight="700" text-anchor="middle">N</text>');
  o.push('  <g class="gull" filter="url(#rough)"><path d="M30,44 q7,-8 14,0 q7,-8 14,0"/><path d="M76,64 q5,-6 10,0 q5,-6 10,0"/></g>');
}

function chartWavesAndBoat(o) {
  o.push('  <g filter="url(#rough)">');
  o.push('    <path class="w1" d="M-50,446 Q -25.0,439 0,446 T 50,446 T 100,446 T 150,446 T 200,446 T 250,446 T 300,446 T 350,446 T 400,446 T 450,446 T 500,446 T 550,446 T 600,446 T 650,446 T 700,446 T 750,446 T 800,446 T 850,446 T 900,446 L 880,520 L -50,520 Z"/>');
  o.push('    <path class="w2" d="M-50,462 Q -25.0,456 0,462 T 50,462 T 100,462 T 150,462 T 200,462 T 250,462 T 300,462 T 350,462 T 400,462 T 450,462 T 500,462 T 550,462 T 600,462 T 650,462 T 700,462 T 750,462 T 800,462 T 850,462 T 900,462 L 880,520 L -50,520 Z"/>');
  o.push('    <path class="w3" d="M-50,480 Q -25.0,475 0,480 T 50,480 T 100,480 T 150,480 T 200,480 T 250,480 T 300,480 T 350,480 T 400,480 T 450,480 T 500,480 T 550,480 T 600,480 T 650,480 T 700,480 T 750,480 T 800,480 T 850,480 T 900,480 L 880,520 L -50,520 Z"/>');
  o.push('    <path class="crest" d="M20,452 q8,-5 16,0 M238,456 q8,-5 16,0 M318,470 q7,-4 14,0 M512,453 q8,-5 16,0 M602,468 q7,-4 14,0 M742,455 q8,-5 16,0 M372,488 q6,-4 12,0 M650,490 q6,-4 12,0 M92,486 q6,-4 12,0"/>');
  o.push("  </g>");
  o.push('  <g transform="translate(112,446) rotate(-3)" filter="url(#rough)">');
  o.push('    <path class="hull" d="M-40,-8 L40,-8 Q32,8 0,10 Q-32,8 -40,-8 Z"/>');
  o.push('    <path class="line" d="M-30,-2 Q0,4 30,-2"/>');
  o.push('    <path class="line" d="M0,-8 V-66" stroke-width="2"/>');
  o.push('    <path class="sail" d="M4,-62 Q 28,-36 32,-12 L4,-12 Z"/>');
  o.push('    <path class="sail" d="M-4,-58 L-28,-12 L-4,-12 Z"/>');
  o.push('    <path class="line" d="M0,-66 L-42,-9"/>');
  o.push('    <rect x="-15" y="-50" width="7" height="6" fill="#b3342b"/>');
  o.push('    <path d="M-26,-37 l7,0 -3.5,6 z" fill="#d9a632"/>');
  o.push('    <rect x="-37" y="-24" width="7" height="6" fill="#2b4a7e"/>');
  o.push('    <path d="M0,-66 l12,3 -12,3 z" fill="#b3342b"/>');
  o.push("  </g>");
}

function renderFanChart(spec) {
  const o = [];
  chartHead(o, spec);
  chartScene(o);

  const hub = spec.hub ?? { label: "", icon: "target" };
  if (spec.headline) {
    o.push(`  <text class="serif ink" x="400" y="42" font-size="27" font-weight="700" text-anchor="middle">${chartHeadline(spec.headline, hub.label)}</text>`);
  }
  if (spec.subhead) {
    o.push(`  <text class="serif muted" x="400" y="68" font-size="16" font-style="italic" text-anchor="middle">${esc(spec.subhead)}</text>`);
  }

  // The source: the one thing the reader does, drawn as a browser chrome with a green button.
  const source = spec.source ?? (spec.sources ?? [])[0];
  if (source) {
    o.push('  <g transform="rotate(-2 160 255)">');
    o.push('    <rect class="paper" x="40" y="178" width="240" height="154" rx="6" filter="url(#roughds)"/>');
    o.push('    <rect class="chrome" x="54" y="192" width="192" height="19" rx="4"/>');
    o.push('    <circle class="dot" cx="64" cy="201.5" r="2.3"/><circle class="dot" cx="72" cy="201.5" r="2.3"/><circle class="dot" cx="80" cy="201.5" r="2.3"/>');
    o.push('    <rect class="bar" x="58" y="226" width="140" height="8" rx="4"/>');
    o.push('    <rect class="bar" x="58" y="241" width="96" height="7" rx="3.5"/>');
    o.push('    <rect x="58" y="262" width="160" height="32" rx="16" fill="#1f7a45"/>');
    o.push(`    ${rawGlyph(source.icon, 69, 270, 14.88, 'stroke="#f7f0de" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"')}`);
    o.push(`    <text class="sans" x="90" y="283" font-size="12.5" font-weight="600" fill="#f7f0de">${esc(source.label)}</text>`);
    if (source.note) o.push(`    <text class="serif muted" x="58" y="318" font-size="12" font-style="italic">${esc(source.note)}</text>`);
    o.push('    <circle class="grommet" cx="266" cy="255" r="6.5"/>');
    o.push("  </g>");
    o.push('  <g filter="url(#rough)"><path class="rope" d="M272,255 C 295,248 314,262 334,255"/><path class="twist" d="M272,255 C 295,248 314,262 334,255"/></g>');
  }

  // The hub: the product's own mark, inside a coiled rope ring.
  o.push(`  <g filter="url(#rough)"><circle cx="${HUB.cx}" cy="${HUB.cy}" r="${HUB.ring}" class="rope" stroke-width="3.5"/><circle cx="${HUB.cx}" cy="${HUB.cy}" r="${HUB.ring}" class="twist" stroke-width="3.5"/></g>`);
  o.push(`  <circle class="hub" cx="${HUB.cx}" cy="${HUB.cy}" r="${HUB.r}" filter="url(#roughds)"/>`);
  o.push(`  ${themedGlyph(hub.icon, HUB.cx - 15.6, HUB.cy - 13.8, 31.2, "anchor")}`);
  if (hub.label) o.push(`  <text class="serif brass" x="${HUB.cx}" y="${HUB.cy + 66}" font-size="17" font-weight="700" text-anchor="middle">${esc(hub.label)}</text>`);

  // The aside: the one handwritten line, split on its sentence breaks, with a curly line pointing at the hub.
  if (spec.aside) {
    const sentences = spec.aside.trim().split(/(?<=[.!?])\s+/);
    const line1 = sentences[0];
    const line2 = sentences.slice(1).join(" ");
    o.push(`  <text class="hand muted" x="176" y="402" font-size="17" transform="rotate(-3 176 402)">${esc(line1)}</text>`);
    if (line2) o.push(`  <text class="hand muted" x="192" y="424" font-size="17" transform="rotate(-3 192 424)">${esc(line2)}</text>`);
    o.push('  <path class="line" d="M342,404 C 372,394 380,362 372,334" filter="url(#rough)"/>');
    o.push('  <path class="line" d="M365,342 L372,332 L379,341"/>');
  }

  // The handled cards: what gets done, fanned out from the hub on rope, tied through brass grommets. Three or
  // four cards sit at one x, evenly spaced; more than four borrow the flat style's fan geometry (a card's x
  // staggers with its distance from the ends) so the rope curves keep clear of the hook the brief warns against.
  const handled = spec.handled ?? [];
  const n = handled.length;
  const baseX = 440;
  const cardW = 290;
  const cardH = 66;
  const gapY = n <= 4 ? 85 : Math.max(56, Math.round(335 / Math.max(1, n - 1)));
  const positions = handled.map((h, i) => {
    const cy = Math.round(HUB.cy + (i - (n - 1) / 2) * gapY);
    const xOffset = n <= 4 ? 0 : 14 * Math.min(i, n - 1 - i, 3);
    return { cx: baseX + xOffset, cy };
  });

  const hubEdgeX = HUB.cx + HUB.r;
  o.push('  <g filter="url(#rough)">');
  for (const p of positions) {
    const midX = Math.round(hubEdgeX + (p.cx - hubEdgeX) / 2);
    o.push(`    <path class="rope" d="M${hubEdgeX},${HUB.cy} C ${midX},${HUB.cy} ${midX},${p.cy} ${p.cx + 10},${p.cy}"/><path class="twist" d="M${hubEdgeX},${HUB.cy} C ${midX},${HUB.cy} ${midX},${p.cy} ${p.cx + 10},${p.cy}"/>`);
  }
  o.push("  </g>");

  handled.forEach((h, i) => {
    const theme = h.theme ?? THEMES[i % THEMES.length];
    const p = positions[i];
    const top = p.cy - cardH / 2;
    const tilt = CARD_TILT[i % CARD_TILT.length];
    assertFits(h.label, 24, "card");
    if (h.sub) assertFits(h.sub, 32, "card");
    o.push(`  <g transform="rotate(${tilt} ${p.cx + cardW / 2} ${p.cy})">`);
    o.push(`    <rect class="c-${theme}" x="${p.cx}" y="${top}" width="${cardW}" height="${cardH}" rx="6" filter="url(#roughds)"/>`);
    o.push(`    <circle class="grommet" cx="${p.cx + 16}" cy="${p.cy}" r="6.5"/>`);
    o.push(`    ${themedGlyph(h.icon, p.cx + 36, top + 20, 20, `g i-${theme}`)}`);
    o.push(`    <text class="serif ink" x="${p.cx + 72}" y="${p.cy - 3}" font-size="19" font-weight="700">${esc(h.label)}</text>`);
    if (h.sub) o.push(`    <text class="serif muted" x="${p.cx + 72}" y="${p.cy + 18}" font-size="13.5" font-style="italic">${esc(h.sub)}</text>`);
    o.push("  </g>");
  });

  if (spec.more) {
    const i = n;
    const cy = Math.round(HUB.cy + (i - n / 2) * gapY);
    o.push(`  <g><rect class="c-${THEMES[i % THEMES.length]}" x="${baseX}" y="${cy - cardH / 2}" width="${cardW}" height="${cardH}" rx="6" stroke-dasharray="4 4"/><text class="serif muted" x="${baseX + 36}" y="${cy + 6}" font-size="17" font-style="italic">and more</text></g>`);
  }

  chartWavesAndBoat(o);
  o.push(`  <rect class="vig" x="0" y="0" width="${CHART_W}" height="${CHART_H}"/>`);
  o.push(`  <rect class="grain" x="0" y="0" width="${CHART_W}" height="${CHART_H}" filter="url(#grain)"/>`);
  o.push("</svg>");
  return o.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------
export function render(spec) {
  validateSpec(spec);
  if (spec.kind === "before-after") return renderBeforeAfter(spec);
  if (spec.style === "chart") return renderFanChart(spec);
  return renderFanFlat(spec);
}

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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function usage() {
  console.error("usage: figurehead.mjs render <spec.hero.json> [--out <file.svg>]");
  console.error("       figurehead.mjs check <spec.hero.json> <file.svg> [--repo <dir>]");
  console.error("       figurehead.mjs goldens");
}

function flagValue(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

function positionalArgs(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      i++; // skip its value
      continue;
    }
    out.push(a);
  }
  return out;
}

async function runCli(argv) {
  const [cmd, ...rest] = argv;

  if (cmd === "render") {
    const [file] = positionalArgs(rest);
    if (!file) {
      usage();
      process.exitCode = 2;
      return;
    }
    const spec = JSON.parse(readFileSync(file, "utf8"));
    const svg = render(spec);
    const out = flagValue(rest, "--out");
    if (out) writeFileSync(out, svg);
    else process.stdout.write(svg);
    return;
  }

  if (cmd === "check") {
    const [specFile, svgFile] = positionalArgs(rest);
    const repo = flagValue(rest, "--repo");
    if (!specFile || !svgFile) {
      usage();
      process.exitCode = 2;
      return;
    }
    let check;
    try {
      ({ check } = await import(new URL("./check.mjs", import.meta.url)));
    } catch {
      console.error("the checks are not installed yet (scripts/check.mjs does not exist)");
      process.exitCode = 2;
      return;
    }
    const spec = JSON.parse(readFileSync(specFile, "utf8"));
    const svg = readFileSync(svgFile, "utf8");
    const results = await check(spec, svg, { repo });
    let failed = false;
    for (const r of results) {
      console.log([r.id, r.level, r.message, r.repair].join("\t"));
      if (r.level === "fail") failed = true;
    }
    process.exitCode = failed ? 1 : 0;
    return;
  }

  if (cmd === "goldens") {
    const here = dirname(fileURLToPath(import.meta.url));
    const examplesDir = resolve(here, "..", "examples");
    for (const name of readdirSync(examplesDir)) {
      const dir = join(examplesDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const specPath = join(dir, `${name}.hero.json`);
      try {
        const spec = JSON.parse(readFileSync(specPath, "utf8"));
        writeFileSync(join(dir, `${name}.svg`), render(spec));
        console.log(`rendered examples/${name}/${name}.svg`);
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
    }
    return;
  }

  usage();
  process.exitCode = 2;
}

// Not a top-level `await runCli(...)`: that would make this module's own evaluation
// asynchronous, and the "check" subcommand dynamically imports scripts/check.mjs, which
// statically imports this file back (for `labels`). A top-level await here turns that
// into a cycle an async module can never finish linking, and the process is killed with
// "Detected unsettled top-level await" (exit code 13) instead of ever reaching runCli's
// own exit code. Running the promise without awaiting it at the top level keeps this
// module's evaluation synchronous, so the cycle resolves normally.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli(process.argv.slice(2)).catch((err) => {
    console.error(err?.stack ?? String(err));
    process.exitCode = 1;
  });
}

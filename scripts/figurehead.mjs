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
import { esc } from "./components/esc.mjs";
import { glyph } from "./components/glyphs.mjs";
import { svgHead } from "./components/svg-shell.mjs";
import { okBadge } from "./components/badges.mjs";
import { flowCurve, ropeLink } from "./components/curves.mjs";
import { flatCard, chartHandledCard, chartMoreCard } from "./components/cards.mjs";
import { chartHub, windowHandoffHub } from "./components/hub-disc.mjs";
import { chartHeadlineBlock, windowHeadlineBlock } from "./components/headline.mjs";
import { panelWithChrome } from "./components/panel.mjs";
import { listRow } from "./components/list-rows.mjs";
import { calendarGrid } from "./components/calendar.mjs";
import { flatSourceCard, chartSourceCard } from "./components/source-cards.mjs";
import { deliverablePage } from "./components/deliverable-page.mjs";
import { windowDeliverablePacket } from "./components/window-deliverable.mjs";
import { feedCurves } from "./components/feed-curves.mjs";
import { rhumbLines, soundingLabels, nightSky, compassRose, gulls, seaBands, sailboat, asideLine } from "./components/chart-scene.mjs";
import { beforePage, foldLine, problemMarks, afterPage, partMarks } from "./components/before-after.mjs";

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Iowan Old Style", Palatino, "Palatino Linotype", "Times New Roman", serif';
const HAND = '"Bradley Hand", "Segoe Print", "Chalkboard SE", cursive';

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

function head(o, spec, height) {
  o.push(
    ...svgHead({
      width: 1200,
      height,
      title: spec.title,
      defs: [
        '    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#d97706"/></marker>',
        '    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.72" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>',
      ],
      css: [
        "      .card { fill: #f8fafc; stroke: #94a3b8; stroke-width: 2; }",
        "      .more { stroke-dasharray: 4 4; }",
        "      .glyph { fill: none; stroke: #475569; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }",
        "      .ok { stroke: #16a34a; }",
        `      .title { font-family: ${FONT}; fill: #0f172a; font-weight: 600; }`,
        `      .muted { font-family: ${FONT}; fill: #64748b; font-weight: 500; }`,
        `      .wrong { font-family: ${FONT}; fill: #b91c1c; font-weight: 600; }`,
        "      .flow { fill: none; stroke: #d97706; stroke-width: 2; }",
        "      .dot { fill: #d97706; }",
        "      .bar { fill: #cbd5e1; }",
        "      .pill { fill: #334155; }",
        "      .code { fill: #1e293b; } .codeline { fill: #64748b; }",
        "      .stale { fill: none; stroke: #dc2626; stroke-width: 2; stroke-dasharray: 3 3; } .dead { fill: #93c5fd; }",
        "      .mark { fill: #dc2626; } .lead { stroke: #dc2626; stroke-width: 2; } .good { fill: #16a34a; } .goodlead { stroke: #16a34a; stroke-width: 2; }",
        "      .fold { stroke: #dc2626; stroke-width: 2; stroke-dasharray: 6 5; }",
        "      .rule { stroke: #94a3b8; stroke-width: 2; }",
        "      .sheet { stroke: #94a3b8; stroke-width: 2; }",
        "      .front { fill: #ffffff; stroke: #64748b; } .back1 { fill: #f4f7fa; } .back2 { fill: #eef2f7; }",
        "      @media (prefers-color-scheme: dark) {",
        "        .card { fill: #1e293b; stroke: #64748b; } .glyph { stroke: #cbd5e1; } .ok { stroke: #4ade80; }",
        "        .title { fill: #f1f5f9; } .muted { fill: #94a3b8; } .wrong { fill: #fca5a5; } .bar { fill: #475569; } .pill { fill: #cbd5e1; } .rule { stroke: #64748b; }",
        "        .code { fill: #020617; } .codeline { fill: #475569; } .dead { fill: #3b82f6; } .stale, .lead, .fold { stroke: #f87171; } .mark { fill: #f87171; } .good { fill: #4ade80; } .goodlead { stroke: #4ade80; }",
        "        .sheet { stroke: #64748b; } .front { fill: #0f172a; stroke: #94a3b8; } .back1 { fill: #172033; } .back2 { fill: #1e293b; }",
        "      }",
      ],
    })
  );
}

// Two problems (or two parts) tied to the same place would draw their marks and leaders on top of each other;
// refused by name instead of silently overlapping.
function assertDistinctAt(items, where) {
  const seen = new Set();
  for (const item of items ?? []) {
    if (seen.has(item.at)) throw new Error(`Two ${where} share the place "${item.at}".`);
    seen.add(item.at);
  }
}

// One thing made better. Left: the page the reader has, long, its faults marked in their words. Right: the short page they wanted, its parts named.
function renderBeforeAfter(spec) {
  assertDistinctAt(spec.before?.problems, "problems");
  assertDistinctAt(spec.after?.parts, "parts");
  const o = [];
  const H = 490;
  head(o, spec, H);

  // Before: a long page that fades out, because nobody reaches the end of it.
  const bx = 216;
  const by = 20;
  for (const line of beforePage({ bx, by })) o.push(line);
  const anchors = { fold: by + 96, code: by + 133, badge: by + 231, link: by + 272 };
  o.push(foldLine({ bx, y: anchors.fold }));
  const beforePoints = spec.before.problems.map((p) => {
    const y = anchors[p.at];
    if (y === undefined) throw new Error(`Unknown place "${p.at}" on the before page. Known: ${Object.keys(anchors).join(", ")}.`);
    return { y, label: p.label };
  });
  for (const line of problemMarks({ bx, points: beforePoints })) o.push(line);
  o.push(`  <text class="title" x="${bx + 130}" y="462" font-size="17" text-anchor="middle">${esc(spec.before.label)}</text>`);

  // The one step in between. The mechanism is a single arrow.
  o.push(`  ${glyph(spec.by.icon, 571, 176, 34)}`);
  o.push('  <path class="flow" d="M496,240 L 680,240" marker-end="url(#arrow)"/>');
  o.push(`  <text class="title" x="588" y="270" font-size="16" text-anchor="middle">${esc(spec.by.label)}</text>`);
  if (spec.by.with) o.push(`  <text class="muted" x="588" y="290" font-size="14" text-anchor="middle">${esc(spec.by.with)}</text>`);

  // After: a short page, every part in its place.
  const ax = 700;
  const ay = 60;
  for (const line of afterPage({ ax, ay })) o.push(line);
  const parts = { tagline: ay + 56, picture: ay + 111, badges: ay + 167, features: ay + 229 };
  const afterPoints = spec.after.parts.map((p) => {
    const y = parts[p.at];
    if (y === undefined) throw new Error(`Unknown part "${p.at}" on the after page. Known: ${Object.keys(parts).join(", ")}.`);
    return { y, label: p.label };
  });
  for (const line of partMarks({ ax, points: afterPoints })) o.push(line);
  if (spec.after.backing) {
    o.push(`  ${okBadge(ax + 38, ay + 322)}`);
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
    for (const line of flatSourceCard({ y, icon: s.icon, label: s.label })) o.push(line);
    const lean = Math.sign(cy - mid);
    o.push(`  ${flowCurve({ x1: 220, y1: cy, c1x: 272, c1y: cy, c2x: 300, c2y: mid + lean * 45, x2: 336, y2: mid + lean * 15, marker: true })}`);
    if (s.gives) o.push(`  <text class="muted" x="278" y="${lean > 0 ? cy + 33 : cy - 17}" font-size="15" text-anchor="middle">${esc(s.gives)}</text>`);
  });
  o.push(`  <circle class="dot" cx="352" cy="${mid}" r="6"/>`);

  rows.forEach((r, i) => {
    const x = 443 + 14 * Math.min(i, n - 1 - i, 3);
    const y = 22 + 54 * i;
    o.push(`  ${flowCurve({ x1: 358, y1: mid, c1x: 412, c1y: mid, c2x: 422, c2y: y + 20, x2: x - 6, y2: y + 20, marker: true })}`);
    for (const line of flatCard({ x, y, icon: r.icon, label: r.label, more: r.more })) o.push(line);
  });
  rows.forEach((_, i) => {
    const x = 443 + 14 * Math.min(i, n - 1 - i, 3) + 210;
    const y = 22 + 54 * i + 20;
    o.push(`  ${flowCurve({ x1: x, y1: y, c1x: x + 60, c1y: y, c2x: 780, c2y: mid, x2: 844, y2: mid })}`);
  });
  o.push(`  <circle class="dot" cx="850" cy="${mid}" r="6"/>`);
  o.push(`  <path class="flow" d="M856,${mid} L 888,${mid}" marker-end="url(#arrow)"/>`);

  const d = spec.deliverable;
  const top = mid - 158;
  for (const line of deliverablePage({ kind: d.kind === "table" ? "table" : "document", x: 900, y: top, heading: d.heading ?? d.label, label: d.label, backing: d.backing })) o.push(`  ${line}`);
  o.push("</svg>");
  return o.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// The chart style: a hand-inked nautical chart, reproducing examples/pierless/reference.svg. Everything about the
// scene (the parchment, the rhumb lines, the compass rose, the gulls, the waves, the sailboat, the grain and the
// vignette) is the style's own fixed world, per references/contract.md; only the headline, the source card, the
// hub and the handled cards are drawn from the spec. The canvas is fixed at 820 wide, the pierless hero's own
// width, but its height grows with the handled-item count (the "more" card counts as one more item): the card
// height (66) and the four-item pierless gap (85) never change, the topmost card always starts the same distance
// below the header, and the wave line always keeps the same fixed margin below the bottom card. The sea, its
// foam, the sailboat, the depth soundings and the vignette all shift down with the extra height; the compass,
// gulls and headline stay exactly where they always were. At the pierless four-item count this still reproduces
// the fixed 820x500 canvas byte for byte (see renderFanChart).
// ---------------------------------------------------------------------------
const CHART_W = 820;
const HUB_BASE = { cx: 370, r: 34, ring: 45 };
// Nine hand-set wobble angles, the first four exactly what pierless's accepted pass used. Fixed, not random: the
// same spec must always draw the same bytes.
const CARD_TILT = [-1.2, 0.9, -0.6, 1.4, -1.5, 1.1, -0.8, 1.3, -1.0];

function chartHead(o, spec, height) {
  o.push(
    ...svgHead({
      width: CHART_W,
      height,
      title: spec.title,
      defs: [
        '    <filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/></filter>',
        '    <filter id="roughds" x="-20%" y="-30%" width="140%" height="170%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/><feDropShadow in="d" dx="1" dy="3" stdDeviation="2.5" flood-color="#2a1d0c" flood-opacity="0.2"/></filter>',
        '    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>',
        '    <radialGradient id="vignette" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#3b2a12" stop-opacity="0.16"/></radialGradient>',
      ],
      css: [
        `      .serif { font-family: ${SERIF}; }`,
        `      .sans { font-family: ${FONT}; }`,
        `      .hand { font-family: ${HAND}; }`,
        "      .bg { fill: #f3ead3; } .grain { opacity: 0.09; }",
        "      .rhumb { fill: none; stroke: #1f2d45; stroke-width: 0.8; opacity: 0.1; }",
        "      .ink { fill: #1f2d45; } .inks { stroke: #1f2d45; } .muted { fill: #6b5d48; } .sound { fill: #6b5d48; opacity: 0.45; font-style: italic; }",
        "      .brass { fill: #a8741f; } .brass-s { stroke: #b8862f; }",
        "      .star-fill { fill: #1f2d45; } .star-open { fill: #f7f0de; stroke: #1f2d45; stroke-width: 1.2; }",
        "      .ring { fill: none; stroke: #1f2d45; stroke-width: 1.2; }",
        "      .paper { fill: #fbf5e6; stroke: #3b3326; stroke-width: 1.8; } .chrome { fill: #efe5cf; stroke: #9c8b6e; stroke-width: 1.2; } .dot { fill: #9c8b6e; } .bar { fill: #e0d4ba; }",
        '      .rope { fill: none; stroke: #a67c45; stroke-width: 4.5; stroke-linecap: round; }',
        '      .twist { fill: none; stroke: #6e4e27; stroke-width: 4.5; stroke-dasharray: 1.6 4.4; }',
        "      .grommet { fill: #f3ead3; stroke: #b8862f; stroke-width: 3; }",
        "      .hub { fill: #1f3a66; stroke: #b8862f; stroke-width: 3.5; }",
        "      .anchor { fill: none; stroke: #f7f0de; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }",
        "      .gull { fill: none; stroke: #3b3326; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }",
        "      .stars, .moon { display: none; }",
        "      .w1 { fill: #d3dfdc; } .w2 { fill: #a9c3c4; } .w3 { fill: #7ea3ab; }",
        "      .crest { fill: none; stroke: #1f2d45; stroke-width: 1.2; stroke-linecap: round; opacity: 0.45; }",
        "      .hull { fill: #9a6a3a; stroke: #2b2118; stroke-width: 1.6; stroke-linejoin: round; } .sail { fill: #f9f2df; stroke: #2b2118; stroke-width: 1.6; stroke-linejoin: round; } .line { fill: none; stroke: #2b2118; stroke-width: 1.3; }",
        "      .c-navy { fill: #fbf5e6; stroke: #2b4a7e; stroke-width: 2; } .c-sea { fill: #fbf5e6; stroke: #2f7d6d; stroke-width: 2; } .c-ochre { fill: #fbf5e6; stroke: #b7791f; stroke-width: 2; } .c-plum { fill: #fbf5e6; stroke: #7a3b69; stroke-width: 2; }",
        "      .g { fill: none; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; }",
        "      .i-navy { stroke: #2b4a7e; } .i-sea { stroke: #2f7d6d; } .i-ochre { stroke: #b7791f; } .i-plum { stroke: #7a3b69; }",
        "      .vig { fill: url(#vignette); }",
        "      @media (prefers-color-scheme: dark) {",
        "        .bg { fill: #122036; } .grain { opacity: 0.07; }",
        "        .rhumb { stroke: #c9d3e3; opacity: 0.1; }",
        "        .ink { fill: #ece3cc; } .inks { stroke: #ece3cc; } .muted { fill: #a6b3c8; } .sound { fill: #a6b3c8; }",
        "        .brass { fill: #e0b562; } .brass-s { stroke: #d8a94f; }",
        "        .star-fill { fill: #ece3cc; } .star-open { fill: #122036; stroke: #ece3cc; } .ring { stroke: #ece3cc; }",
        "        .paper { fill: #1a2a44; stroke: #7f8fa8; } .chrome { fill: #22344f; stroke: #6d7c95; } .dot { fill: #6d7c95; } .bar { fill: #30425f; }",
        "        .rope { stroke: #cfa66a; } .twist { stroke: #8a6a3c; } .grommet { fill: #122036; stroke: #d8a94f; }",
        "        .hub { fill: #28508f; stroke: #d8a94f; }",
        "        .gull { stroke: #c9d3e3; }",
        "        .stars { display: inline; fill: #ece3cc; } .moon { display: inline; fill: #ece3cc; }",
        "        .w1 { fill: #1b3252; } .w2 { fill: #1f3d63; } .w3 { fill: #254a78; } .crest { stroke: #c9d3e3; opacity: 0.35; }",
        "        .hull { fill: #8a5d33; stroke: #ece3cc; } .sail { fill: #ece3cc; stroke: #0e1a2c; } .line { stroke: #ece3cc; }",
        "        .c-navy { fill: #1a2a44; stroke: #8fb4ff; } .c-sea { fill: #1a2a44; stroke: #6fd1b9; } .c-ochre { fill: #1a2a44; stroke: #f0c064; } .c-plum { fill: #1a2a44; stroke: #d69ad0; }",
        "        .i-navy { stroke: #8fb4ff; } .i-sea { stroke: #6fd1b9; } .i-ochre { stroke: #f0c064; } .i-plum { stroke: #d69ad0; }",
        "        .vig { opacity: 0.6; }",
        "      }",
      ],
    })
  );
}

// The style's own fixed world: parchment, rhumb lines, soundings, moon and stars, compass rose, gulls. Identical
// for every spec drawn in the chart style at a given height, per references/contract.md. `height` sizes the
// parchment itself; `delta` (0 at the pierless four-item count) shifts the soundings down with the sea.
function chartScene(o, height, delta) {
  o.push(`  <rect class="bg" x="0" y="0" width="${CHART_W}" height="${height}"/>`);
  o.push(rhumbLines());
  o.push(soundingLabels({ delta }));
  for (const line of nightSky()) o.push(line);
  for (const line of compassRose()) o.push(line);
  o.push(gulls());
}

function chartWavesAndBoat(o, delta) {
  for (const line of seaBands({ delta })) o.push(line);
  for (const line of sailboat({ delta })) o.push(line);
}

// The chart headline's coarse per-character room, the same kind of rule assertFits uses for card labels: an
// estimate of Georgia bold's width at 27px (about 10.5px/char), with the canvas's 40px margin on each side.
function assertHeadlineFits(headline) {
  const CHARS_PER_PX = 10.5;
  const MARGIN = 40;
  const maxChars = Math.floor((CHART_W - 2 * MARGIN) / CHARS_PER_PX);
  assertFits(headline, maxChars, "headline");
}

// The chart style draws exactly one source (in the browser-chrome card) and one hub (the coiled-rope ring); it
// has no separate deliverable card at all. A spec written for the flat style's shape — several `sources`, a
// `deliverable`, no `hub` — would otherwise render with those pieces silently missing instead of refusing by name.
function assertChartShape(spec) {
  if (spec.sources) throw new Error('Field "sources" is not drawn by the chart style; chart draws one source. Use "source" instead, or set style to "flat".');
  if (spec.deliverable) throw new Error('Field "deliverable" is not drawn by the chart style; that field is flat-style only. Set style to "flat", or drop "deliverable".');
  if (!spec.hub) throw new Error('The chart style needs a "hub" to draw; none was given.');
}

function renderFanChart(spec) {
  assertChartShape(spec);
  const o = [];

  // The layout: how tall the canvas needs to be, and where the hub sits, both driven by the handled-item count
  // (the "more" card, when present, counts as one more item). The card height (66) and the four-item pierless
  // gap (85) are always the same; the topmost card always starts TOP_ANCHOR below the header, exactly where
  // pierless's own top card sits, and the wave line always keeps MARGIN_ABOVE_WAVE below the bottom card, exactly
  // pierless's own gap. `delta` (0 at the pierless four-item count) is how far the sea, its foam, the sailboat,
  // the soundings and the vignette all shift down to follow. At four items this reproduces the fixed 820x500
  // canvas byte for byte: same 255 hub, same 446 wave line, same 500 height.
  const handled = spec.handled ?? [];
  const n = handled.length;
  const gapY = 85;
  const cardH = 66;
  const TOP_ANCHOR = 94.5;
  const MARGIN_ABOVE_WAVE = 30.5;
  const BOTTOM_SPAN = 54;
  const handledOffsets = handled.map((_, i) => (i - (n - 1) / 2) * gapY);
  const moreOffset = spec.more ? (n - n / 2) * gapY : null;
  const allOffsets = moreOffset === null ? handledOffsets : [...handledOffsets, moreOffset];
  if (allOffsets.length === 0) allOffsets.push(0);
  const minOffset = Math.min(...allOffsets);
  const maxOffset = Math.max(...allOffsets);
  const hubCy = TOP_ANCHOR - minOffset + cardH / 2;
  const cardsBottom = hubCy + maxOffset + cardH / 2;
  const waveLineY = cardsBottom + MARGIN_ABOVE_WAVE;
  const height = Math.round(waveLineY + BOTTOM_SPAN);
  const delta = height - 500; // 500: the pierless four-item canvas's own fixed height.
  const HUB = { ...HUB_BASE, cy: hubCy };

  chartHead(o, spec, height);
  chartScene(o, height, delta);

  const hub = spec.hub; // assertChartShape has already required this.
  if (spec.headline) assertHeadlineFits(spec.headline);
  for (const line of chartHeadlineBlock({ headline: spec.headline, subhead: spec.subhead, brandWord: hub.label })) o.push(line);

  // The source: the one thing the reader does, drawn as a browser chrome with a green button.
  const source = spec.source ?? (spec.sources ?? [])[0];
  if (source) {
    for (const line of chartSourceCard({ icon: source.icon, label: source.label, note: source.note })) o.push(line);
    // The source card itself never moves; only the end tied to the hub follows it when the hub does.
    o.push(`  <g filter="url(#rough)">${ropeLink({ x1: 272, y1: 255, c1x: 295, c1y: 248, c2x: 314, c2y: hubCy + 7, x2: 334, y2: hubCy })}</g>`);
  }

  // The hub: the product's own mark, inside a coiled rope ring.
  for (const line of chartHub({ cx: HUB.cx, cy: HUB.cy, r: HUB.r, ring: HUB.ring, icon: hub.icon, label: hub.label })) o.push(line);

  // The aside: the one handwritten line, split on its sentence breaks, with a curly line pointing at the hub.
  if (spec.aside) {
    for (const line of asideLine({ aside: spec.aside })) o.push(line);
  }

  // The handled cards: what gets done, fanned out from the hub on rope, tied through brass grommets. Three or
  // four cards sit at one x, evenly spaced; more than four borrow the flat style's fan geometry (a card's x
  // staggers with its distance from the ends) so the rope curves keep clear of the hook the brief warns against.
  const baseX = 440;
  const cardW = 290;
  const positions = handled.map((h, i) => {
    const cy = Math.round(HUB.cy + (i - (n - 1) / 2) * gapY);
    const xOffset = n <= 4 ? 0 : 14 * Math.min(i, n - 1 - i, 3);
    return { cx: baseX + xOffset, cy };
  });

  const hubEdgeX = HUB.cx + HUB.r;
  o.push('  <g filter="url(#rough)">');
  for (const p of positions) {
    const midX = Math.round(hubEdgeX + (p.cx - hubEdgeX) / 2);
    o.push(`    ${ropeLink({ x1: hubEdgeX, y1: HUB.cy, c1x: midX, c1y: HUB.cy, c2x: midX, c2y: p.cy, x2: p.cx + 10, y2: p.cy })}`);
  }
  o.push("  </g>");

  handled.forEach((h, i) => {
    const theme = h.theme ?? THEMES[i % THEMES.length];
    const p = positions[i];
    const tilt = CARD_TILT[i % CARD_TILT.length];
    assertFits(h.label, 24, "card");
    if (h.sub) assertFits(h.sub, 32, "card");
    for (const line of chartHandledCard({ cx: p.cx, cy: p.cy, w: cardW, h: cardH, tilt, theme, icon: h.icon, label: h.label, sub: h.sub })) o.push(line);
  });

  if (spec.more) {
    const i = n;
    const cy = Math.round(HUB.cy + (i - n / 2) * gapY);
    o.push(`  ${chartMoreCard({ x: baseX, cy, w: cardW, h: cardH, theme: THEMES[i % THEMES.length] })}`);
  }

  chartWavesAndBoat(o, delta);
  o.push(`  <rect class="vig" x="0" y="0" width="${CHART_W}" height="${height}"/>`);
  o.push(`  <rect class="grain" x="0" y="0" width="${CHART_W}" height="${height}" filter="url(#grain)"/>`);
  o.push("</svg>");
  return o.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// The window style: an automation between two app surfaces, reproducing
// examples/receipts/reference.svg. The inbox panel (left) lists every handled
// item as a row; the calendar panel (right) is the style's own fixed month
// grid with a highlighted range. Faint feed curves run from each inbox row to
// the range's left edge; one accent arrow hands off from the calendar panel
// to the hub disc; the deliverable lands as a stacked summary sheet. Only the
// two panels' headers (from `sources`), the inbox rows (from `handled` and
// `more`), the hub label and the deliverable's heading/label/backing are
// drawn from the spec. Everything else — the calendar's grid, its
// highlighted range and dots, the hub's chevron mark, the handoff arrow and
// the deliverable sheet's own decorative rows — is the style's fixed world,
// at reference.svg's own fixed positions, regardless of item count. Only the
// inbox panel's height (and so the canvas height, when inbox is the taller
// panel) grows with the handled-item count (the "more" row counts as one
// more item); both panels always start at the same y, so a shorter panel
// just leaves whitespace below it. At seven rows (six handled, one "more")
// this reproduces reference.svg's own 900x480 canvas and 318-tall inbox
// panel, per references/contract.md.
// ---------------------------------------------------------------------------
const WINDOW_W = 900;
const WINDOW_PANEL_TOP = 90;
const WINDOW_ROW_H = 38;
const WINDOW_HEADER_SPACE = 42; // panel top to the first row divider
const WINDOW_FOOTER_PAD = 10; // last row divider to the inbox panel's own bottom edge
const WINDOW_INBOX_X = 40;
const WINDOW_INBOX_W = 280;
const WINDOW_CAL_X = 386;
const WINDOW_CAL_W = 250;
const WINDOW_CAL_H = 236; // the calendar panel's fixed height, never data-driven
const WINDOW_BOTTOM_MARGIN = 72; // the taller panel's bottom edge to the canvas edge
const WINDOW_ARROW_Y = 196; // the calendar panel's fixed handoff row: hub, arrow and feed-curve target

// Nine hand-set [subject-bar, preview-bar] widths, cycled by row index the same way
// CARD_TILT cycles for the chart style's cards: fixed, not random, so rows read as real
// receipts of varying length rather than a repeating pattern. The first six are
// reference.svg's own six handled-item rows (Rides through Wi-Fi).
const WINDOW_BAR_WIDTHS = [
  [92, 60],
  [80, 66],
  [98, 54],
  [86, 70],
  [74, 58],
  [90, 48],
  [88, 62],
  [76, 54],
  [94, 68],
];

function windowHead(o, spec, height) {
  o.push(
    ...svgHead({
      width: WINDOW_W,
      height,
      title: spec.title,
      defs: [
        '    <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1,1 L9,5 L1,9" class="accent-s" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></marker>',
        '    <filter id="soft" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.10"/></filter>',
      ],
      css: [
        `      .sans { font-family: ${FONT}; }`,
        "      .bg { fill: #f4f6f9; }",
        '      .panel { fill: #ffffff; stroke: #d5dbe3; stroke-width: 1; }',
        '      .ink { fill: #111827; } .inks { stroke: #111827; }',
        "      .muted { fill: #6b7280; }",
        "      .faint { fill: #9ca3af; }",
        '      .accent { fill: #2563eb; } .accent-s { stroke: #2563eb; }',
        '      .range { fill: #dbeafe; stroke: #2563eb; stroke-width: 1.5; }',
        '      .cell { fill: none; stroke: #e5e7eb; stroke-width: 1; }',
        '      .bar { fill: #e5e7eb; } .bar2 { fill: #d1d5db; }',
        "      .rowline { stroke: #eef0f3; stroke-width: 1; }",
        "      .g { fill: none; stroke: #111827; stroke-width: 1.7; stroke-linejoin: round; stroke-linecap: round; }",
        "      .g-muted { fill: none; stroke: #9ca3af; stroke-width: 1.7; stroke-linejoin: round; stroke-linecap: round; }",
        '      .feed { fill: none; stroke: #2563eb; stroke-width: 1.2; opacity: 0.45; }',
        '      .hand { fill: none; stroke: #2563eb; stroke-width: 2.4; stroke-linecap: round; }',
        '      .sheet { fill: #ffffff; stroke: #111827; stroke-width: 1.3; }',
        '      .sheet-back { fill: #eef0f3; stroke: #9ca3af; stroke-width: 1; }',
        "      .total { fill: #111827; }",
        "      .mark { fill: #ffffff; }",
        "      @media (prefers-color-scheme: dark) {",
        "        .bg { fill: #0f141b; } .panel { fill: #161c26; stroke: #2a3341; }",
        "        .ink { fill: #e5e7eb; } .inks { stroke: #e5e7eb; } .muted { fill: #9ca3af; } .faint { fill: #6b7280; }",
        '        .accent { fill: #60a5fa; } .accent-s { stroke: #60a5fa; } .range { fill: #1e3a5f; stroke: #60a5fa; }',
        "        .cell { stroke: #2a3341; } .bar { fill: #2a3341; } .bar2 { fill: #374151; } .rowline { stroke: #232b37; }",
        "        .g { stroke: #e5e7eb; } .g-muted { stroke: #6b7280; } .feed, .hand { stroke: #60a5fa; }",
        '        .sheet { fill: #161c26; stroke: #9ca3af; } .sheet-back { fill: #1f2733; stroke: #4b5563; } .total { fill: #e5e7eb; } .mark { fill: #0f141b; }',
        "      }",
      ],
    })
  );
}

// The window style draws exactly two sources (the inbox panel, then the calendar panel), a
// hub disc and a stacked deliverable sheet; it has no single "source" or handwritten "aside",
// and its rows are not themed. A spec written for another style's shape would otherwise render
// with pieces silently missing (or a theme silently ignored) instead of refusing by name.
function assertWindowShape(spec) {
  if (spec.source) throw new Error('Field "source" is not drawn by the window style; window draws two "sources" (an inbox panel, then a calendar panel). Use "sources" instead, or set style to "flat" or "chart".');
  if (spec.aside) throw new Error('Field "aside" is not drawn by the window style; that field is chart-style only. Set style to "chart", or drop "aside".');
  if (!spec.sources) throw new Error('The window style needs "sources" (an inbox panel, then a calendar panel) to draw; none was given.');
  if (spec.sources.length !== 2) throw new Error(`The window style needs exactly two "sources" (an inbox panel, then a calendar panel); got ${spec.sources.length}.`);
  if (!spec.hub) throw new Error('The window style needs a "hub" to draw; none was given.');
  if (!spec.deliverable) throw new Error('The window style needs a "deliverable" to draw; none was given.');
  for (const h of spec.handled ?? []) {
    if (h.theme) throw new Error(`Field "theme" on "${h.label}" is not drawn by the window style; window's rows are not themed. Drop "theme", or set style to "chart".`);
  }
}

function renderFanWindow(spec) {
  assertWindowShape(spec);
  const o = [];

  const rows = [...(spec.handled ?? []).map((h) => ({ ...h, more: false })), ...(spec.more ? [{ label: "and more", icon: "more", more: true }] : [])];
  const n = rows.length;

  const inboxH = WINDOW_HEADER_SPACE + WINDOW_ROW_H * n + WINDOW_FOOTER_PAD;
  const panelBottom = WINDOW_PANEL_TOP + Math.max(inboxH, WINDOW_CAL_H);
  const height = panelBottom + WINDOW_BOTTOM_MARGIN;

  windowHead(o, spec, height);
  o.push(`  <rect class="bg" x="0" y="0" width="${WINDOW_W}" height="${height}"/>`);

  const hub = spec.hub;
  for (const line of windowHeadlineBlock({ headline: spec.headline, subhead: spec.subhead, brandWord: hub.label })) o.push(line);

  const [inboxSource, calSource] = spec.sources;
  const inboxRight = WINDOW_INBOX_X + WINDOW_INBOX_W;

  // The inbox panel: every handled item, and the "and more" item, as a row (icon, bold
  // label, subject bar, preview bar, amount bar); "and more" is a muted row with only a
  // subject bar. Its height follows the row count; the header icon is the style's own
  // fixed envelope, not looked up from any icon field.
  for (const line of panelWithChrome({
    x: WINDOW_INBOX_X,
    y: WINDOW_PANEL_TOP,
    w: WINDOW_INBOX_W,
    h: inboxH,
    iconGlyph: '<rect x="0" y="3" width="20" height="14" rx="2"/><path d="M0,6 L10,13 L20,6"/>',
    labelX: WINDOW_INBOX_X + 44,
    label: inboxSource.label,
    gives: inboxSource.gives,
  }))
    o.push(`  ${line}`);

  const dividers = [];
  for (let i = 0; i <= n; i++) dividers.push(WINDOW_PANEL_TOP + WINDOW_HEADER_SPACE + WINDOW_ROW_H * i);
  o.push(`  <path class="rowline" d="${dividers.map((y) => `M${WINDOW_INBOX_X},${y} H${inboxRight}`).join(" ")}"/>`);

  rows.forEach((r, i) => {
    const top = dividers[i];
    const [w1, w2] = WINDOW_BAR_WIDTHS[i % WINDOW_BAR_WIDTHS.length];
    for (const line of listRow({ x: WINDOW_INBOX_X, top, icon: r.icon, label: r.label, more: r.more, w1, w2, rightX: inboxRight })) o.push(`  ${line}`);
  });

  // Faint feed curves from each inbox row to the calendar range's left edge (fixed, since
  // that edge never moves): the style's own fan-in, drawn under the calendar panel.
  for (const line of feedCurves({ tops: dividers.slice(0, n), inboxRight, targetX: WINDOW_CAL_X + 46, targetY: WINDOW_ARROW_Y })) o.push(line);

  // The calendar panel: fixed height and a fixed five-row month grid, weekday letters, a
  // highlighted range of days with dots. None of this is data-driven beyond the header.
  for (const line of panelWithChrome({
    x: WINDOW_CAL_X,
    y: WINDOW_PANEL_TOP,
    w: WINDOW_CAL_W,
    h: WINDOW_CAL_H,
    iconGlyph: '<rect x="1" y="3" width="18" height="16" rx="2"/><path d="M1,8 h18 M6,1 v4 M14,1 v4"/>',
    labelX: WINDOW_CAL_X + 42,
    label: calSource.label,
    gives: calSource.gives,
  }))
    o.push(`  ${line}`);
  for (const line of calendarGrid({ x: WINDOW_CAL_X, top: WINDOW_PANEL_TOP })) o.push(line);

  // The one accent handoff arrow from the calendar panel's right edge to the packet, the hub
  // disc with its chevron mark, and the hub's label. Fixed, since the calendar panel never
  // moves regardless of the inbox panel's height.
  const calRight = WINDOW_CAL_X + WINDOW_CAL_W;
  for (const line of windowHandoffHub({ calRight, arrowY: WINDOW_ARROW_Y, label: hub.label })) o.push(line);

  // The deliverable: a summary sheet with rows and a total, two sheets stacked behind it,
  // the deliverable's own label ("one PDF") and backing line. Its own line-item rows are
  // decorative and fixed, since the spec carries no line-item list.
  const d = spec.deliverable;
  const sheetX = calRight + 68;
  for (const line of windowDeliverablePacket({ x: sheetX, heading: d.heading ?? d.label, label: d.label, backing: d.backing })) o.push(line);

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
  if (spec.style === "window") return renderFanWindow(spec);
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

// The default way the "check" subcommand reaches scripts/check.mjs, and the
// default examples/ directory the "goldens" subcommand rebuilds. Both are
// swappable through runCli's second argument: a test can point "check" at an
// import that always rejects (to exercise the "not installed yet" branch
// below without deleting the real scripts/check.mjs) and can point
// "goldens" at a temp directory built for the test (to exercise its
// not-a-directory, missing-spec and non-ENOENT-error branches without ever
// writing to the repo's own examples/). Real CLI use never passes either
// override, so it always gets these two.
function importCheckModule() {
  return import(new URL("./check.mjs", import.meta.url));
}

function defaultExamplesDir() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "examples");
}

// Exported so a test can call this directly (in the current process, not a
// spawned child) and exercise every branch deterministically; see the
// module-load guard at the bottom of this file for why it is not called
// with a top-level await.
export async function runCli(argv, { importCheck = importCheckModule, examplesDir = defaultExamplesDir() } = {}) {
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
      ({ check } = await importCheck());
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

// Extracted so a test can call it directly with both an Error (the real
// shape a rejection from runCli carries) and a non-Error value (the `??`
// fallback's own reason for existing) without needing runCli itself to
// reject. Exported for exactly that.
export function reportFatal(err) {
  console.error(err?.stack ?? String(err));
  process.exitCode = 1;
}

// Not a top-level `await runCli(...)`: that would make this module's own evaluation
// asynchronous, and the "check" subcommand dynamically imports scripts/check.mjs, which
// statically imports this file back (for `labels`). A top-level await here turns that
// into a cycle an async module can never finish linking, and the process is killed with
// "Detected unsettled top-level await" (exit code 13) instead of ever reaching runCli's
// own exit code. Running the promise without awaiting it at the top level keeps this
// module's evaluation synchronous, so the cycle resolves normally.
//
// This condition is only ever true when the file is the process's own entry point (a real
// `node scripts/figurehead.mjs ...` invocation), which by definition means it was launched
// as a fresh process rather than imported by the test suite. test/render.test.mjs's
// end-to-end subprocess test exercises this exact line for real; that child process's own
// coverage instrumentation is intentionally excluded from this run's measurement so the
// reported number does not depend on whether a spawned child's coverage file finishes
// flushing before this process reads its own.
//
// A disable/enable block, not "ignore next N": the condition below embeds its own branch
// (`process.argv[1] ?? ""`), and "ignore next N" only excludes statement/line ranges, not that
// branch's own coverage counters, so a literal, deterministic 100% needs the block form here.
/* node:coverage disable */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli(process.argv.slice(2)).catch(reportFatal);
}
/* node:coverage enable */

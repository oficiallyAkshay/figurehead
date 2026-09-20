#!/usr/bin/env node
// Checks a rendered hero SVG against the spec it was drawn from. See
// references/contract.md, "The checks", for the id/level/message/repair
// contract and what each of the nine ids fails on.
//
// Measurement method for scripts/widths.json (restated here per the
// contract, which asks for it "at the top of scripts/check.mjs"; the
// authoritative copy lives in widths.json's own "method" field):
//   canvas measureText per printable ASCII character, Chromium on macOS,
//   2026-09-19; advances in px at the named size; sum a label, add ten
//   percent, and compare with the room its card gives it.
//
// Zero dependencies, Node 20+, ESM.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { labels } from "./figurehead.mjs";

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** Build a finding-maker bound to one check id: mkF("spec/shape")("fail", msg, repair). */
const mkF = (id) => (level, message, repair) => ({ id, level, message, repair });

const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);

const collapseWs = (s) => String(s).replace(/\s+/g, " ").trim();

const unescapeXml = (s) =>
  String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

// Strips markup tags from already-XML-unescaped text (callers must unescapeXml first: an
// entity-encoded fake tag like "&lt;script&gt;" contains no literal "<"/">" at strip time, so a
// strip-then-unescape order would let it survive stripping and only turn into a real tag
// afterward -- CodeQL's js/incomplete-multi-character-sanitization). Loops until a pass removes
// nothing, rather than a single pass, as defense-in-depth against any future tag-shaped
// construction a single pass alone would miss.
function stripTags(s) {
  let prev;
  let out = String(s);
  do {
    prev = out;
    out = prev.replace(/<[^>]*>/g, "");
  } while (out !== prev);
  return out;
}

// widthsUrl is injectable so a test can point this at a broken or missing
// file without touching the repo's own scripts/widths.json; real callers
// never pass it, so they always get the file this module ships beside.
function loadWidths(widthsUrl = new URL("./widths.json", import.meta.url)) {
  return JSON.parse(readFileSync(fileURLToPath(widthsUrl), "utf8"));
}

/** Sum a label's advance in one measured face; unknown characters get the face's average advance. Returns null if the face isn't measured. */
function measureLabel(faces, faceKey, text) {
  const face = faces?.[faceKey];
  if (!face) return null;
  const advances = face.advance;
  const values = Object.values(advances);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  let total = 0;
  for (const ch of String(text)) total += advances[ch] ?? avg;
  return total;
}

// ---------------------------------------------------------------------------
// spec/shape — required fields per kind, unknown fields, counts, enums
// ---------------------------------------------------------------------------

const KIND_VALUES = ["fan", "before-after"];
const STYLE_VALUES = ["flat", "chart", "window"];
const THEME_VALUES = ["navy", "sea", "ochre", "plum"];
const DELIVERABLE_KIND_VALUES = ["document", "table"];

// Top-level fields every spec may carry, plus the fields specific to each kind.
// "heading" on deliverable is a documented field (the seed renderer reads
// `d.heading ?? d.label`; examples/tidy-inbox's committed spec uses it).
const TOP_COMMON = ["kind", "style", "title", "headline", "subhead", "scene"];
const FAN_FIELDS = ["source", "sources", "hub", "handled", "more", "deliverable", "aside"];
const BEFORE_AFTER_FIELDS = ["before", "by", "after"];

function checkSpecShape(spec) {
  const F = mkF("spec/shape");
  const findings = [];
  const fail = (message, repair) => findings.push(F("fail", message, repair));
  const warn = (message, repair) => findings.push(F("warn", message, repair));

  if (!isPlainObject(spec)) {
    fail("The spec is not a JSON object.", "Write the spec as a single JSON object.");
    return findings;
  }

  // "kind" defaults to "fan" when absent (the contract and the seed renderer
  // agree on this default), so a missing "kind" is not itself a fail; an
  // invalid, present "kind" still is.
  if (spec.kind !== undefined && !KIND_VALUES.includes(spec.kind)) {
    fail(`"kind" is "${spec.kind}", not one of ${KIND_VALUES.join(", ")}.`, `Set "kind" to one of ${KIND_VALUES.join(", ")}.`);
  }

  if (typeof spec.title !== "string" || !spec.title.trim()) {
    fail('The spec has no non-empty "title" string.', 'Add a "title" string; it becomes the SVG title and alt text.');
  }

  if (spec.style !== undefined && !STYLE_VALUES.includes(spec.style)) {
    fail(`"style" is "${spec.style}", not one of ${STYLE_VALUES.join(", ")}.`, `Set "style" to one of ${STYLE_VALUES.join(", ")}, or remove it to default to "flat".`);
  }

  // The owner's rule: a style is chosen for every hero. "flat" exists only so
  // readmerlin's two goldens do not move, so an absent "style" (which
  // defaults to flat) is worth flagging, but only as a warn — it does not
  // block the hero from being valid.
  if (spec.style === undefined) {
    warn(
      "No style chosen; the renderer will draw flat, which exists only for readmerlin's goldens.",
      'Set "style": "chart", or the style whose world fits this product.'
    );
  }

  for (const key of ["headline", "subhead", "aside"]) {
    if (spec[key] !== undefined && typeof spec[key] !== "string") {
      fail(`"${key}" is present but is not a string.`, `Make "${key}" a string, or remove it.`);
    }
  }

  // When kind itself is missing or invalid, fall back to fan's field set: fan is the
  // default shape the renderer draws when kind is absent.
  const kindFields = spec.kind === "before-after" ? BEFORE_AFTER_FIELDS : FAN_FIELDS;
  const allowedTop = new Set([...TOP_COMMON, ...kindFields]);
  for (const key of Object.keys(spec)) {
    if (!allowedTop.has(key)) {
      fail(`"${key}" is not a known field for a "${spec.kind ?? "fan"}" spec.`, `Remove "${key}", or fix "kind" if this field belongs to the other shape.`);
    }
  }

  const checkItem = (obj, where, allowed, required) => {
    if (!isPlainObject(obj)) {
      fail(`${where} is not an object.`, `Make ${where} an object with ${allowed.join(", ")}.`);
      return;
    }
    for (const key of Object.keys(obj)) {
      if (!allowed.includes(key)) fail(`${where} has an unknown field "${key}".`, `Remove "${key}" from ${where}.`);
    }
    for (const req of required) {
      const v = obj[req];
      if (v === undefined || (typeof v === "string" && !v.trim())) {
        fail(`${where} is missing "${req}".`, `Add a "${req}" to ${where}.`);
      }
    }
  };

  // Two before.problems items, or two after.parts items, that share the same
  // "at" would draw one on top of the other (both are positioned by "at" on
  // the before/after sheet), so it's a fail naming the shared value.
  const checkSharedAt = (items, where) => {
    // Invariant: both call sites below only reach checkSharedAt from inside the "else" of an
    // "!Array.isArray(...) || !....length" check on the very same value, so items is always a
    // real, non-empty array by the time it gets here. Kept as defense-in-depth against a future
    // call site that forgets that guard.
    /* node:coverage disable */
    if (!Array.isArray(items)) return;
    /* node:coverage enable */
    const byAt = new Map();
    items.forEach((item, i) => {
      if (!isPlainObject(item) || item.at === undefined) return;
      if (!byAt.has(item.at)) byAt.set(item.at, []);
      byAt.get(item.at).push(item.label ?? `${where}[${i}]`);
    });
    for (const [at, itemLabels] of byAt) {
      if (itemLabels.length > 1) {
        fail(`Two "${where}" items share the same "at" value "${at}": ${itemLabels.join(", ")}.`, `Give each "${where}" item its own "at".`);
      }
    }
  };

  if (spec.kind === "before-after") {
    if (spec.before === undefined) {
      fail('A before-after spec needs "before".', 'Add a "before" object with "label" and "problems".');
    } else {
      checkItem(spec.before, '"before"', ["label", "problems"], ["label", "problems"]);
      if (isPlainObject(spec.before) && spec.before.problems !== undefined) {
        if (!Array.isArray(spec.before.problems) || !spec.before.problems.length) {
          fail('"before.problems" must be a non-empty array.', 'Give "before.problems" at least one item.');
        } else {
          spec.before.problems.forEach((p, i) => checkItem(p, `"before.problems[${i}]"`, ["label", "at"], ["label", "at"]));
          checkSharedAt(spec.before.problems, "before.problems");
        }
      }
    }
    if (spec.by === undefined) {
      fail('A before-after spec needs "by".', 'Add a "by" object with "label" and "icon".');
    } else {
      checkItem(spec.by, '"by"', ["label", "icon", "with"], ["label", "icon"]);
    }
    if (spec.after === undefined) {
      fail('A before-after spec needs "after".', 'Add an "after" object with "label" and "parts".');
    } else {
      checkItem(spec.after, '"after"', ["label", "parts", "backing"], ["label", "parts"]);
      if (isPlainObject(spec.after) && spec.after.parts !== undefined) {
        if (!Array.isArray(spec.after.parts) || !spec.after.parts.length) {
          fail('"after.parts" must be a non-empty array.', 'Give "after.parts" at least one item.');
        } else {
          spec.after.parts.forEach((p, i) => checkItem(p, `"after.parts[${i}]"`, ["label", "at"], ["label", "at"]));
          checkSharedAt(spec.after.parts, "after.parts");
        }
      }
    }
  } else {
    // fan, or an invalid/missing kind — validated as fan so a broken kind still gets useful findings.
    if (spec.source === undefined && spec.sources === undefined) {
      fail('A fan spec needs "source" (the one thing the reader does) or "sources".', 'Add a "source" object or a "sources" array.');
    }
    if (spec.source !== undefined) checkItem(spec.source, '"source"', ["label", "icon", "note"], ["label", "icon"]);
    if (spec.sources !== undefined) {
      if (!Array.isArray(spec.sources) || spec.sources.length < 1 || spec.sources.length > 3) {
        fail('"sources" must be an array of one to three items.', 'Give "sources" between one and three items.');
      } else {
        spec.sources.forEach((s, i) => checkItem(s, `"sources[${i}]"`, ["label", "icon", "gives"], ["label", "icon"]));
      }
    }

    if (spec.handled === undefined) {
      fail('A fan spec needs "handled".', 'Add a "handled" array of three to nine items.');
    } else if (!Array.isArray(spec.handled)) {
      fail('"handled" must be an array of three to nine items.', 'Give "handled" between three and nine items.');
    } else {
      if (spec.handled.length < 3 || spec.handled.length > 9) {
        fail('"handled" must be an array of three to nine items.', 'Give "handled" between three and nine items.');
      }
      // Item shape is still worth checking even when the count itself is out of range.
      spec.handled.forEach((h, i) => {
        checkItem(h, `"handled[${i}]"`, ["label", "sub", "icon", "theme"], ["label", "icon"]);
        if (isPlainObject(h) && h.theme !== undefined && !THEME_VALUES.includes(h.theme)) {
          fail(`"handled[${i}].theme" is "${h.theme}", not one of ${THEME_VALUES.join(", ")}.`, `Set the theme to one of ${THEME_VALUES.join(", ")}, or remove it to cycle a default.`);
        }
      });
    }

    if (spec.hub !== undefined) checkItem(spec.hub, '"hub"', ["label", "icon"], ["label", "icon"]);
    if (spec.more !== undefined && typeof spec.more !== "boolean") {
      fail('"more" must be a boolean.', 'Set "more" to true or false, or remove it.');
    }
    if (spec.deliverable !== undefined) {
      checkItem(spec.deliverable, '"deliverable"', ["label", "kind", "backing", "heading"], ["label", "kind"]);
      if (isPlainObject(spec.deliverable) && spec.deliverable.kind !== undefined && !DELIVERABLE_KIND_VALUES.includes(spec.deliverable.kind)) {
        fail(`"deliverable.kind" is "${spec.deliverable.kind}", not one of ${DELIVERABLE_KIND_VALUES.join(", ")}.`, `Set "deliverable.kind" to one of ${DELIVERABLE_KIND_VALUES.join(", ")}.`);
      }
    }

    // Chart draws exactly one source button and a hub; it has no layout for
    // more than one source or for the flat style's document/table
    // deliverable, and no layout at all without a hub. Flat is unaffected.
    if (spec.style === "chart") {
      const CHART_NOTE = 'chart draws one source and a hub; use "source" and "hub", or style flat';
      if (spec.sources !== undefined) {
        fail(`"sources" is not allowed when "style" is "chart": ${CHART_NOTE}.`, 'Replace "sources" with a single "source" object, or remove "style" to keep flat.');
      }
      if (spec.deliverable !== undefined) {
        fail(`"deliverable" is not allowed when "style" is "chart": ${CHART_NOTE}.`, 'Remove "deliverable", or remove "style" to keep flat.');
      }
      if (spec.hub === undefined) {
        fail(`A chart spec needs "hub": ${CHART_NOTE}.`, 'Add a "hub" object with "label" and "icon".');
      }
    }

    // Window draws exactly two app-surface windows and a packet dropping
    // into a deliverable tray; it has no layout for a single source, no
    // handwritten aside, and no per-item accent theme, and it needs both a
    // hub and a deliverable to draw the packet and the tray. Flat and chart
    // are unaffected.
    if (spec.style === "window") {
      const WINDOW_NOTE = "window draws two app surfaces and a packet; use sources, hub and deliverable";
      if (!Array.isArray(spec.sources) || spec.sources.length !== 2) {
        fail(`"sources" must have exactly two entries when "style" is "window": ${WINDOW_NOTE}.`, 'Give "sources" exactly two items, one per app surface.');
      }
      if (spec.hub === undefined) {
        fail(`A window spec needs "hub": ${WINDOW_NOTE}.`, 'Add a "hub" object with "label" and "icon".');
      }
      if (spec.deliverable === undefined) {
        fail(`A window spec needs "deliverable": ${WINDOW_NOTE}.`, 'Add a "deliverable" object with "label" and "kind".');
      }
      if (spec.source !== undefined) {
        fail(`"source" is not allowed when "style" is "window": ${WINDOW_NOTE}.`, 'Replace "source" with "sources" (exactly two items), or remove "style" to keep flat.');
      }
      if (spec.aside !== undefined) {
        fail(`"aside" is not allowed when "style" is "window": ${WINDOW_NOTE}.`, 'Remove "aside", or remove "style" to keep flat.');
      }
      if (Array.isArray(spec.handled)) {
        spec.handled.forEach((h, i) => {
          if (isPlainObject(h) && h.theme !== undefined) {
            fail(`"handled[${i}].theme" is not allowed when "style" is "window": ${WINDOW_NOTE}.`, `Remove "theme" from "handled[${i}]", or remove "style" to keep flat.`);
          }
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// icons/known, icons/distinct
// ---------------------------------------------------------------------------

/** Loads the known icon-name list from scripts/icons.mjs, the renderer builder's
 * permanently-owned single source of truth (one entry per name). A missing or
 * broken import is a clear thrown error rather than a crash at module load.
 * iconsUrl is injectable the same way widthsUrl is above, for the same reason:
 * a test can point this at a broken or missing module without touching the
 * repo's own scripts/icons.mjs; real callers never pass it. */
async function loadIconNames(iconsUrl = new URL("./icons.mjs", import.meta.url)) {
  let mod;
  try {
    mod = await import(iconsUrl);
  } catch (err) {
    throw new Error(`Could not load scripts/icons.mjs: ${err.message}`);
  }
  if (!mod.ICONS || typeof mod.ICONS !== "object") {
    throw new Error("scripts/icons.mjs does not export an ICONS object.");
  }
  return Object.keys(mod.ICONS);
}

function collectIconUses(spec) {
  const uses = [];
  if (isPlainObject(spec.source) && spec.source.icon) uses.push({ icon: spec.source.icon, where: "source" });
  for (const [i, s] of (spec.sources ?? []).entries()) if (isPlainObject(s) && s.icon) uses.push({ icon: s.icon, where: `sources[${i}]` });
  if (isPlainObject(spec.hub) && spec.hub.icon) uses.push({ icon: spec.hub.icon, where: "hub" });
  for (const [i, h] of (spec.handled ?? []).entries()) if (isPlainObject(h) && h.icon) uses.push({ icon: h.icon, where: `handled[${i}]` });
  if (isPlainObject(spec.by) && spec.by.icon) uses.push({ icon: spec.by.icon, where: "by" });
  return uses;
}

function checkIconsKnown(spec, iconNames) {
  const F = mkF("icons/known");
  const known = new Set(iconNames);
  const findings = [];
  for (const { icon, where } of collectIconUses(spec)) {
    if (!known.has(icon)) {
      findings.push(F("fail", `${where}.icon "${icon}" is not a known icon.`, `Use one of: ${[...known].sort().join(", ")}.`));
    }
  }
  return findings;
}

function checkIconsDistinct(spec) {
  const F = mkF("icons/distinct");
  const findings = [];
  const byIcon = new Map();
  (spec.handled ?? []).forEach((h, i) => {
    if (!isPlainObject(h) || !h.icon) return;
    if (!byIcon.has(h.icon)) byIcon.set(h.icon, []);
    byIcon.get(h.icon).push(h.label ?? `handled[${i}]`);
  });
  for (const [icon, itemLabels] of byIcon) {
    if (itemLabels.length > 1) {
      findings.push(F("fail", `The icon "${icon}" is shared by more than one handled item: ${itemLabels.join(", ")}.`, "Give each handled item its own icon."));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// text/fits
// ---------------------------------------------------------------------------

function checkTextFits(spec, widths) {
  const F = mkF("text/fits");
  const findings = [];
  const faces = widths.faces;
  const style = spec.style === "chart" ? "chart" : spec.style === "window" ? "window" : "flat";

  const check1 = (text, faceKey, room, where) => {
    if (text === undefined || text === null || text === "") return;
    const width = measureLabel(faces, faceKey, text);
    if (width === null) {
      findings.push(F("warn", `No measured face "${faceKey}" for ${where}; text/fits was skipped for it.`, `Add "${faceKey}" to scripts/widths.json.`));
      return;
    }
    const withMargin = width * 1.1;
    if (withMargin > room) {
      findings.push(
        F(
          "fail",
          `${where} "${text}" measures ${width.toFixed(1)}px (${withMargin.toFixed(1)}px with its ten percent margin), which does not fit the ${room}px room its card gives it.`,
          "Shorten the label, or make the card wider."
        )
      );
    }
  };

  if (style === "chart") {
    // The chart canvas is a fixed 820x500 (CHART_W/CHART_H in
    // scripts/figurehead.mjs); the headline and subhead are centred editorial
    // lines with a 40px margin on each side, so their room is 820 - 40 - 40.
    check1(spec.headline, "serif-700-27", 740, "the chart headline");
    check1(spec.subhead, "serif-italic-16", 740, "the chart subhead");
  }

  if (style === "window") {
    // The window headline is drawn at 25px, system-ui, weight 700, against
    // the 820px canvas room.
    check1(spec.headline, "sans-700-25", 820, "the window headline");
  }

  if (spec.kind === "before-after") {
    for (const p of spec.before?.problems ?? []) check1(p?.label, "sans-600-15", 180, "a before.problems label");
    for (const p of spec.after?.parts ?? []) check1(p?.label, "sans-600-15", 180, "an after.parts label");
  } else {
    for (const h of spec.handled ?? []) {
      if (!isPlainObject(h)) continue;
      if (style === "chart") {
        check1(h.label, "serif-700-19", 220, "a handled title");
        if (h.sub) check1(h.sub, "serif-italic-13.5", 220, "a handled sub");
      } else if (style === "window") {
        // Window draws each handled item as an inbox row: the label sits
        // between the icon column (x 90) and the subject bar (x 150), a
        // 60px room.
        check1(h.label, "sans-600-14", 60, "a window inbox row label");
      } else {
        check1(h.label, "sans-600-17", 152, "a handled title");
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// spec/agrees
// ---------------------------------------------------------------------------

function checkSpecAgrees(spec, svg) {
  const F = mkF("spec/agrees");
  const findings = [];

  // labels(spec), from figurehead.mjs, already walks the whole spec and
  // returns every string under a labelled key (title, label, gives, heading,
  // backing, with, sub, note, headline, subhead, aside — see its own "keys"
  // list), so no field needs collecting here by hand.
  const expected = new Set();
  for (const s of labels(spec)) if (typeof s === "string" && s.trim()) expected.add(s.trim());

  // The renderer is free to split one label across more than one text node
  // (pierless draws its two-line aside as two <text> elements, exactly like
  // the hand-made reference). So every text node's content is collected,
  // unescaped, and joined with single spaces into one whole-document string;
  // a label only needs to appear as a substring of that whole, not within a
  // single node.
  const blocks = [];
  const blockRe = /<title\b[^>]*>([\s\S]*?)<\/title>|<text\b[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = blockRe.exec(svg))) {
    // Invariant: blockRe is a two-way alternation, one capture group per side (title, text).
    // Whenever the regex matches at all, exactly the matched side's group is defined (as at
    // least ""), so matched is never nullish and the "?? ''" below never substitutes for real;
    // kept as defense-in-depth against blockRe growing a third, ungrouped alternative.
    const matched = m[1] ?? m[2];
    /* node:coverage disable */
    const decoded = unescapeXml(matched ?? "");
    /* node:coverage enable */
    blocks.push(stripTags(decoded));
  }
  const haystack = collapseWs(blocks.join(" "));

  for (const label of expected) {
    if (!haystack.includes(collapseWs(label))) {
      findings.push(F("fail", `The label "${label}" does not appear as text in the SVG.`, "Draw the label somewhere in the picture, or remove it from the spec."));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// register/reader-nouns (only with --repo)
// ---------------------------------------------------------------------------

function collectReaderNouns(repoDir) {
  const nouns = new Set();
  const skipDirs = new Set(["node_modules", ".git", ".claude"]);
  const codeExts = new Set([".mjs", ".js", ".ts", ".py"]);
  const identRe = /\b(?:export function|export const|def|class)\s+([A-Za-z_$][\w$]*)/g;

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skipDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        nouns.add(entry.name.toLowerCase());
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const base = path.basename(entry.name, ext);
        if (base) nouns.add(base.toLowerCase());
        if (codeExts.has(ext)) {
          let text;
          try {
            text = readFileSync(full, "utf8");
          } catch {
            continue;
          }
          for (const mm of text.matchAll(identRe)) nouns.add(mm[1].toLowerCase());
        }
      }
    }
  };
  walk(repoDir);
  return nouns;
}

// The strings this check looks at, minus "gives" and "with": those two hold
// the verb or short phrase drawn on a fan/before-after arrow ("gives", e.g.
// sources[i].gives; "with", e.g. by.with), not a name for any part of the
// product, so they are exempt from "does this collide with a real file,
// folder, export or function name" the way a hub, source or handled label is
// not. figurehead.mjs's own labels(spec) export (used by spec/agrees, which
// legitimately wants "gives"/"with" text present in the SVG) does not keep
// which key a string came from, so this mirrors its walk here rather than
// filtering its output, to filter by key rather than by value.
function collectReaderNounLabels(spec) {
  const out = [];
  const keys = ["title", "label", "heading", "backing", "sub", "note", "headline", "subhead", "aside"];
  const walk = (v, key) => {
    if (typeof v === "string") return void (keys.includes(key) && v.trim() && out.push(v.trim()));
    if (Array.isArray(v)) return v.forEach((x) => walk(x, key));
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(spec, "");
  return out;
}

function checkReaderNouns(spec, repoDir) {
  const F = mkF("register/reader-nouns");
  const findings = [];
  if (!repoDir) return findings;
  const nouns = collectReaderNouns(repoDir);

  // Two exemptions, both because the product's own name is meant to be said,
  // not avoided: the hub label is the product's own mark (a fan spec's "hub",
  // e.g. pierless's hub.label "Pierless", which will routinely equal a real
  // folder or package name), and any label that equals the checked repo
  // directory's own basename is the same case by the same reasoning. Every
  // other label — source, sources, handled, deliverable, before/by/after —
  // stays checked, except "gives" and "with" (see collectReaderNounLabels).
  const hubLabel = isPlainObject(spec.hub) && typeof spec.hub.label === "string" ? spec.hub.label.trim().toLowerCase() : null;
  const repoName = path.basename(path.resolve(repoDir)).toLowerCase();

  const seen = new Set();
  for (const label of collectReaderNounLabels(spec)) {
    // Invariant: collectReaderNounLabels's own walk() only ever pushes a value into the array
    // it returns when "typeof v === \"string\"" already held for that value (see its body just
    // above), so every label here is already a string. Kept as defense-in-depth against a
    // future change to that walk loosening what it pushes.
    /* node:coverage disable */
    if (typeof label !== "string") continue;
    /* node:coverage enable */
    const key = label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    if (key === hubLabel || key === repoName) continue;
    if (nouns.has(key)) {
      findings.push(F("fail", `The label "${label}" is also a file, folder, export or function name in the repo.`, "Rename the label to something a reader would say, not the implementation's own name."));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// curves/no-hook
// ---------------------------------------------------------------------------

const SINGLE_CUBIC = /^M\s*(-?[\d.]+)[,\s]+(-?[\d.]+)\s*C\s*(-?[\d.]+)[,\s]+(-?[\d.]+)\s+(-?[\d.]+)[,\s]+(-?[\d.]+)\s+(-?[\d.]+)[,\s]+(-?[\d.]+)\s*$/;

// Fan links, in both styles, are the only curves this rule is about: flat
// draws them with class "flow", chart with class "rope" (the twisted-rope
// link under its dashed twist). A decorative curve like pierless's aside-to-
// hub squiggle (class "line") is free to curl however it likes.
const FAN_LINK_CLASS = /\b(?:flow|rope)\b/;

function checkCurvesNoHook(svg) {
  const F = mkF("curves/no-hook");
  const findings = [];
  const pathRe = /<path\b([^>]*)>/g;
  let m;
  while ((m = pathRe.exec(svg))) {
    const attrs = attrsOf(m[1]);
    if (!attrs.d) continue;
    if (!FAN_LINK_CLASS.test(attrs.class ?? "")) continue; // not a fan link; out of scope for this check
    const d = attrs.d.trim();
    const mm = SINGLE_CUBIC.exec(d);
    if (!mm) continue; // not a single M...C path; out of scope for this check
    const [, x0, , x1, , x2, , x3] = mm.map(Number);
    const lo = Math.min(x0, x3);
    const hi = Math.max(x0, x3);
    const ok = x1 > lo && x1 < hi && x2 > lo && x2 < hi;
    if (!ok) {
      findings.push(F("fail", `A fan curve's control point is not strictly between its endpoints (d="${d}").`, "Set the control x to the midpoint between the hub edge and the card edge."));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// geometry/inside
//
// Best effort, without a DOM. Covered:
//   - the <svg>'s own viewBox attribute.
//   - <rect> and <circle>: their own x/y/width/height or cx/cy/r, offset by a
//     translate() read from their own `transform` attribute and from every
//     enclosing `<g transform="translate(...)">`, tracked with a small stack
//     while the markup is scanned tag by tag in document order.
//   - <text>: its own font-weight/font-style attribute wins when present
//     (the chart headline's inline font-weight="700", a subhead's inline
//     font-style="italic"); otherwise weight/style fall back to the <style>
//     block's `.class { ... }` rules. Combined with the element's own
//     font-size attribute and the family the class rules name, this must
//     name a face measured in scripts/widths.json exactly (e.g. class="title"
//     font-size="17" on the sans stack at weight 600 -> "sans-600-17"; class
//     "serif ink" font-weight="700" font-size="27" -> "serif-700-27"). Its
//     width then comes from the same advances text/fits uses; text-anchor
//     (start/middle/end) sets which side of x the box extends from. A
//     vertical extent is guessed as [y - fontSize, y + 0.3 * fontSize]
//     (ascent/descent), since no measured line-height exists.
// Not covered:
//   - rotate() or scale() on any transform — ignored, per the brief, not composed.
//   - any <path> geometry (arrows, waves, rope, curves, ship, letters) — that
//     needs a real path-bbox walk, which this file does not attempt.
//   - a <text> element whose face doesn't match a widths.json key exactly
//     (inherited/unset font-size, an untabulated size, a class the <style>
//     block doesn't define) is skipped, not failed.
//   - elements inside <defs> are not specially excluded; in the current
//     examples <defs> only holds <marker>/<linearGradient> content, which
//     this scan does not match anyway since it looks only for g/rect/circle/text.
//   - <tspan> and multi-line text are not handled; a <text> with nested markup
//     has its tags stripped for width purposes, which is only exact for plain text.
// ---------------------------------------------------------------------------

function attrsOf(str) {
  const attrs = {};
  const re = /([\w:-]+)\s*=\s*"([^"]*)"/g;
  let m;
  // Invariant: every call site below (checkCurvesNoHook's regex capture, and
  // checkGeometryInside's g/rect/circle/text captures, each guarded by its own
  // "!== undefined" check before calling) already passes a defined string, possibly
  // empty but never undefined. Kept as defense-in-depth against a future caller that
  // skips that guard.
  /* node:coverage disable */
  const safeStr = str ?? "";
  /* node:coverage enable */
  while ((m = re.exec(safeStr))) attrs[m[1]] = m[2];
  return attrs;
}

function parseTranslate(transformAttr) {
  if (!transformAttr) return { dx: 0, dy: 0 };
  const m = /translate\(\s*(-?[\d.]+)(?:[,\s]+(-?[\d.]+))?\s*\)/.exec(transformAttr);
  if (!m) return { dx: 0, dy: 0 };
  return { dx: Number(m[1]), dy: m[2] !== undefined ? Number(m[2]) : 0 };
}

function parseStyleRules(svg) {
  const rules = {};
  const styleM = /<style[^>]*>([\s\S]*?)<\/style>/.exec(svg);
  if (!styleM) return rules;
  const ruleRe = /\.([\w-]+)\s*\{([^}]*)\}/g;
  let m;
  while ((m = ruleRe.exec(styleM[1]))) rules[m[1]] = m[2];
  return rules;
}

function faceKeyFor(classAttr, fontSize, rules, ownAttrs = {}) {
  if (!fontSize) return null;
  const classes = (classAttr ?? "").trim().split(/\s+/).filter(Boolean);
  let body = "";
  for (const c of classes) if (rules[c]) body += rules[c] + ";";
  if (!body) return null;
  // An element's own font-weight/font-style attribute (the chart headline's
  // inline font-weight="700", the hub label's inline font-weight="700", a
  // subhead's inline font-style="italic") wins over the CSS class rules,
  // which for the chart style only ever set font-family and fill: .serif {
  // font-family: Georgia... } carries no weight or style of its own. Reading
  // the class rules only, as before, made every such element resolve to a
  // face key like "serif-400-27" that scripts/widths.json never measured, so
  // it was silently skipped instead of checked.
  const italic = ownAttrs["font-style"] !== undefined ? ownAttrs["font-style"] === "italic" : /font-style\s*:\s*italic/.test(body);
  let weight;
  if (ownAttrs["font-weight"] !== undefined) {
    weight = ownAttrs["font-weight"];
  } else {
    const weightM = /font-weight\s*:\s*(\d+)/.exec(body);
    weight = weightM ? weightM[1] : "400";
  }
  let family = "sans";
  if (/Georgia/.test(body)) family = "serif";
  else if (/Bradley Hand|cursive/.test(body)) family = "hand";
  if (family === "hand") return `hand-${fontSize}`;
  if (family === "serif" && italic) return `serif-italic-${fontSize}`;
  return `${family}-${weight}-${fontSize}`;
}

const GEOMETRY_TAG_RE = /<g\b([^>]*)>|<\/g>|<rect\b([^>]*?)\/?>|<circle\b([^>]*?)\/?>|<text\b([^>]*?)>([\s\S]*?)<\/text>/g;

function checkGeometryInside(svg, widths) {
  const F = mkF("geometry/inside");
  const findings = [];
  const vbM = /<svg\b[^>]*\bviewBox="([^"]+)"/.exec(svg);
  if (!vbM) return findings;
  const [minX, minY, vw, vh] = vbM[1].trim().split(/\s+/).map(Number);
  const maxX = minX + vw;
  const maxY = minY + vh;
  const TOL = 1;
  const rules = parseStyleRules(svg);
  const faces = widths?.faces ?? {};

  const outOf = (x0, y0, x1, y1, where) => {
    if (x0 < minX - TOL || y0 < minY - TOL || x1 > maxX + TOL || y1 > maxY + TOL) {
      findings.push(
        F(
          "fail",
          `${where} box [${x0.toFixed(1)}, ${y0.toFixed(1)}, ${x1.toFixed(1)}, ${y1.toFixed(1)}] leaves the viewBox [${minX}, ${minY}, ${maxX}, ${maxY}].`,
          "Move or shrink the element, or enlarge the viewBox."
        )
      );
    }
  };

  const stack = [];
  const cumulative = () => stack.reduce((acc, t) => ({ dx: acc.dx + t.dx, dy: acc.dy + t.dy }), { dx: 0, dy: 0 });

  GEOMETRY_TAG_RE.lastIndex = 0;
  let m;
  let idx = 0;
  while ((m = GEOMETRY_TAG_RE.exec(svg))) {
    const [whole, gOpen, rectAttrs, circleAttrs, textAttrsStr, textInner] = m;
    if (whole === "</g>") {
      if (stack.length) stack.pop();
      continue;
    }
    if (gOpen !== undefined) {
      stack.push(parseTranslate(attrsOf(gOpen).transform));
      continue;
    }
    const cum = cumulative();
    if (rectAttrs !== undefined) {
      const a = attrsOf(rectAttrs);
      const own = parseTranslate(a.transform);
      const x = Number(a.x ?? 0) + cum.dx + own.dx;
      const y = Number(a.y ?? 0) + cum.dy + own.dy;
      const w = Number(a.width ?? 0);
      const h = Number(a.height ?? 0);
      outOf(x, y, x + w, y + h, `rect#${idx}`);
    } else if (circleAttrs !== undefined) {
      const a = attrsOf(circleAttrs);
      const own = parseTranslate(a.transform);
      const cx = Number(a.cx ?? 0) + cum.dx + own.dx;
      const cy = Number(a.cy ?? 0) + cum.dy + own.dy;
      const r = Number(a.r ?? 0);
      outOf(cx - r, cy - r, cx + r, cy + r, `circle#${idx}`);
    } else if (textAttrsStr !== undefined) {
      const a = attrsOf(textAttrsStr);
      const own = parseTranslate(a.transform);
      const fontSize = a["font-size"] ? Number(a["font-size"]) : null;
      const faceKey = faceKeyFor(a.class, fontSize, rules, a);
      if (faceKey && faces[faceKey]) {
        const text = collapseWs(stripTags(unescapeXml(textInner)));
        const width = measureLabel(faces, faceKey, text);
        const x = Number(a.x ?? 0) + cum.dx + own.dx;
        const y = Number(a.y ?? 0) + cum.dy + own.dy;
        const anchor = a["text-anchor"] ?? "start";
        let x0, x1;
        if (anchor === "middle") {
          x0 = x - width / 2;
          x1 = x + width / 2;
        } else if (anchor === "end") {
          x0 = x - width;
          x1 = x;
        } else {
          x0 = x;
          x1 = x + width;
        }
        outOf(x0, y - fontSize, x1, y + fontSize * 0.3, `text#${idx} "${text}"`);
      }
    }
    idx++;
  }
  return findings;
}

// ---------------------------------------------------------------------------
// xml/valid — a tag-balance parser, not a full XML parser
// ---------------------------------------------------------------------------

function checkXmlValid(svg) {
  const F = mkF("xml/valid");
  const findings = [];
  const stack = [];
  let i = 0;
  const n = svg.length;
  let svgAttrs = null;
  let titleId = null;
  let malformed = false;

  while (i < n) {
    const lt = svg.indexOf("<", i);
    if (lt === -1) break;
    if (svg.startsWith("<!--", lt)) {
      const end = svg.indexOf("-->", lt + 4);
      if (end === -1) {
        malformed = true;
        break;
      }
      i = end + 3;
      continue;
    }
    if (svg.startsWith("<![CDATA[", lt)) {
      const end = svg.indexOf("]]>", lt + 9);
      if (end === -1) {
        malformed = true;
        break;
      }
      i = end + 3;
      continue;
    }
    if (svg.startsWith("<?", lt)) {
      const end = svg.indexOf("?>", lt + 2);
      if (end === -1) {
        malformed = true;
        break;
      }
      i = end + 2;
      continue;
    }
    if (svg.startsWith("<!", lt)) {
      const end = svg.indexOf(">", lt + 2);
      if (end === -1) {
        malformed = true;
        break;
      }
      i = end + 1;
      continue;
    }
    const closeMatch = /^<\/([a-zA-Z][\w:-]*)\s*>/.exec(svg.slice(lt));
    if (closeMatch) {
      const name = closeMatch[1];
      if (!stack.length || stack[stack.length - 1] !== name) {
        malformed = true;
        break;
      }
      stack.pop();
      i = lt + closeMatch[0].length;
      continue;
    }
    const openMatch = /^<([a-zA-Z][\w:-]*)((?:\s+[^<>]*?)?)(\/)?>/.exec(svg.slice(lt));
    if (!openMatch) {
      malformed = true;
      break;
    }
    const [whole, name, attrsStr, selfClose] = openMatch;
    if (name === "svg" && stack.length === 0 && svgAttrs === null) {
      svgAttrs = attrsStr;
    }
    if (name === "title" && stack.length === 1 && stack[0] === "svg" && titleId === null) {
      const idm = /\bid="([^"]*)"/.exec(attrsStr);
      titleId = idm ? idm[1] : "";
    }
    if (!selfClose) {
      if (name === "style") {
        const closeIdx = svg.indexOf("</style>", lt + whole.length);
        if (closeIdx === -1) {
          malformed = true;
          break;
        }
        i = closeIdx + "</style>".length;
        continue;
      }
      stack.push(name);
    }
    i = lt + whole.length;
  }
  if (stack.length) malformed = true;

  if (malformed) {
    findings.push(F("fail", "The SVG is not well formed (unbalanced, unclosed or malformed tags).", "Fix the mismatched or unclosed tag."));
    return findings;
  }
  if (!svgAttrs) {
    findings.push(F("fail", "No <svg> root element was found.", "Wrap the drawing in an <svg> root element."));
    return findings;
  }
  if (!/\brole="img"/.test(svgAttrs)) {
    findings.push(F("fail", 'The <svg> root is missing role="img".', 'Add role="img" to the <svg> tag.'));
  }
  const labelledbyM = /\baria-labelledby="([^"]*)"/.exec(svgAttrs);
  if (!labelledbyM) {
    findings.push(F("fail", "The <svg> root is missing aria-labelledby.", 'Add aria-labelledby="<title id>" to the <svg> tag.'));
  }
  if (titleId === null) {
    findings.push(F("fail", "The <svg> has no <title> child.", "Add <title id=\"...\">...</title> as a direct child of <svg>."));
  } else if (!titleId) {
    findings.push(F("fail", "The <svg>'s <title> child has no id.", 'Give the <title> an id, e.g. <title id="hero-title">.'));
  }
  if (labelledbyM && titleId) {
    if (labelledbyM[1] !== titleId) {
      findings.push(F("fail", `aria-labelledby="${labelledbyM[1]}" does not match the title's id "${titleId}".`, "Make aria-labelledby match the title element's id."));
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// The combined check
// ---------------------------------------------------------------------------

export async function check(spec, svg, options = {}) {
  const findings = [];

  findings.push(...checkSpecShape(spec));

  let iconNames = null;
  try {
    iconNames = await loadIconNames(options.iconsUrl);
  } catch (err) {
    findings.push({ id: "icons/known", level: "fail", message: err.message, repair: "Add scripts/icons.mjs exporting an ICONS object." });
  }
  if (iconNames) findings.push(...checkIconsKnown(spec, iconNames));
  findings.push(...checkIconsDistinct(spec));

  let widths = null;
  try {
    widths = loadWidths(options.widthsUrl);
  } catch (err) {
    findings.push({ id: "text/fits", level: "fail", message: `Could not read scripts/widths.json: ${err.message}`, repair: "Commit scripts/widths.json with the measured advances." });
  }
  if (widths) findings.push(...checkTextFits(spec, widths));

  findings.push(...checkSpecAgrees(spec, svg));
  findings.push(...checkReaderNouns(spec, options.repo));
  findings.push(...checkCurvesNoHook(svg));
  findings.push(...checkGeometryInside(svg, widths));
  findings.push(...checkXmlValid(svg));

  return findings;
}

// Exported for tests that want to exercise one rule directly without a full check() pass.
export const _internal = {
  checkSpecShape,
  checkIconsKnown,
  checkIconsDistinct,
  checkTextFits,
  checkSpecAgrees,
  checkReaderNouns,
  checkCurvesNoHook,
  checkGeometryInside,
  checkXmlValid,
  loadIconNames,
  loadWidths,
  measureLabel,
  stripTags,
};

// ---------------------------------------------------------------------------
// CLI: node scripts/check.mjs <spec.hero.json> <file.svg> [--repo <dir>]
// ---------------------------------------------------------------------------

// Sets process.exitCode rather than calling process.exit() so a test can
// import and call this directly (in the current process, not a spawned
// child) to exercise every branch deterministically: process.exit() would
// kill the test runner itself. Exported for exactly that; real CLI use goes
// through the entry-point guard below, which behaves identically since
// nothing else runs after it.
export async function runCli(argv) {
  const repoIdx = argv.indexOf("--repo");
  const repo = repoIdx !== -1 ? argv[repoIdx + 1] : undefined;
  const positional = repoIdx === -1 ? argv : argv.filter((_, i) => i !== repoIdx && i !== repoIdx + 1);
  const [specPath, svgPath] = positional;

  if (!specPath || !svgPath) {
    console.error("usage: node scripts/check.mjs <spec.hero.json> <file.svg> [--repo <dir>]");
    process.exitCode = 2;
    return;
  }

  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const svg = readFileSync(svgPath, "utf8");
  const findings = await check(spec, svg, repo ? { repo } : {});
  for (const f of findings) console.log([f.id, f.level, f.message, f.repair].join("\t"));
  process.exitCode = findings.some((f) => f.level === "fail") ? 1 : 0;
}

// This condition is only ever true when the file is the process's own entry
// point (a real `node scripts/check.mjs ...` invocation), which by
// definition means this module was not imported by the test suite — it was
// launched as a fresh process. test/check.test.mjs's and
// test/render.test.mjs's end-to-end subprocess tests exercise this exact
// line (and runCli's behaviour through it) for real; their child process's
// own coverage instrumentation is intentionally excluded from this run's
// measurement (see test/README-less note by NODE_V8_COVERAGE in those
// tests) so the reported number does not depend on whether a spawned
// child's coverage file finishes flushing before this process reads its own.
// A disable/enable block, not "ignore next N": the condition below embeds its
// own branch (`process.argv[1] ?? ""`), and "ignore next N" only excludes
// statement/line ranges, not that branch's own coverage counters, so a
// literal, deterministic 100% needs the block form here.
/* node:coverage disable */
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await runCli(process.argv.slice(2));
}
/* node:coverage enable */

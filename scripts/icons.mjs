// The icon subset. One entry per name: [box, path-markup]. Each icon is drawn
// inside a square box of the given side length, stroked (never filled) by
// whichever CSS class the caller wraps it in, so one glyph works in both the
// flat style (slate stroke) and the chart style (per-theme stroke, or a
// literal colour on the source button).
//
// Some glyphs here are simplified from Lucide (https://lucide.dev), ISC
// licence, copyright (c) Lucide Contributors. Full licence text:
// https://lucide.dev/license
//
//   ISC License
//   Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as
//   part of Feather (MIT). All other copyright (c) for Lucide are held by
//   Lucide Contributors 2022-present.
//   Permission to use, copy, modify, and/or distribute this software for any
//   purpose with or without fee is hereby granted, provided that the above
//   copyright notice and this permission notice appear in all copies.
//   THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
//   WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
//   MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
//   ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
//   WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
//   ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
//   OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
export const ICONS = {
  folder: [28, '<path d="M2,8 h9 l3,4 h12 v16 h-24 z"/><path d="M2,12 h24"/>'],
  sparkles: [28, '<path d="M14,2 l2.5,7.5 L24,12 l-7.5,2.5 L14,22 l-2.5,-7.5 L4,12 l7.5,-2.5 z"/><path d="M24,20 l1,3 3,1 -3,1 -1,3 -1,-3 -3,-1 3,-1 z"/>'],
  mail: [28, '<rect x="0" y="4" width="28" height="19" rx="3"/><path d="M0,7 L14,17 L28,7"/>'],
  calendar: [28, '<rect x="1" y="4" width="26" height="22" rx="3"/><path d="M1,11 h26"/><path d="M8,1 v6"/><path d="M20,1 v6"/><path d="M8,17 h2"/><path d="M13,17 h2"/><path d="M18,17 h2"/>'],
  target: [20, '<circle cx="10" cy="10" r="8"/><circle cx="10" cy="10" r="4"/><circle cx="10" cy="10" r="1"/>'],
  "badge-check": [20, '<path d="M10,1 l2.5,2 3,-0.5 1,3 2.5,1.5 -1,3 1,3 -2.5,1.5 -1,3 -3,-0.5 -2.5,2 -2.5,-2 -3,0.5 -1,-3 -2.5,-1.5 1,-3 -1,-3 2.5,-1.5 1,-3 3,0.5 z"/><path d="M6.5,10 l2.5,2.5 4.5,-5"/>'],
  image: [20, '<rect x="1" y="2" width="18" height="16" rx="2"/><circle cx="6" cy="7" r="1.5"/><path d="M1,15 l5,-5 4,4 3,-3 6,6"/>'],
  terminal: [20, '<rect x="1" y="2" width="18" height="16" rx="2"/><path d="M5,7 l4,3 -4,3"/><path d="M10,13 h5"/>'],
  shield: [20, '<path d="M10,1 l8,3 v6 c0,5 -4,8 -8,9 c-4,-1 -8,-4 -8,-9 v-6 z"/><path d="M6.5,10 l2.5,2.5 4.5,-5"/>'],
  link: [20, '<path d="M8,12 a3,3 0 0 1 0,-4 l3,-3 a3,3 0 0 1 4,4 l-1,1"/><path d="M12,8 a3,3 0 0 1 0,4 l-3,3 a3,3 0 0 1 -4,-4 l1,-1"/>'],
  scissors: [20, '<circle cx="5" cy="5" r="3"/><circle cx="5" cy="15" r="3"/><path d="M7.5,7 L19,17"/><path d="M7.5,13 L19,3"/>'],
  car: [20, '<path d="M2,12 l3,-6 h10 l3,6 h1 v6 h-2 a2,2 0 0 1 -4,0 h-6 a2,2 0 0 1 -4,0 h-2 v-6 z"/><path d="M4,12 h12"/>'],
  utensils: [20, '<path d="M5,1 v7 a2,2 0 0 0 4,0 v-7"/><path d="M7,8 v11"/><path d="M14,1 c-2,0 -3,3 -3,6 v3 h3 v9"/>'],
  plane: [20, '<path d="M2,12 l6,-1 5,-8 h2 l-2,8 5,0 2,-2 h1 l-1,4 1,4 h-1 l-2,-2 -5,0 2,8 h-2 l-5,-8 -6,-1 z"/>'],
  bed: [20, '<path d="M1,17 v-8 h18 v8"/><path d="M1,13 h18"/><path d="M3,9 v-3 h5 v3"/><path d="M1,17 v2"/><path d="M19,17 v2"/>'],
  train: [20, '<rect x="3" y="1" width="14" height="14" rx="3"/><path d="M3,9 h14"/><circle cx="7" cy="12" r="1"/><circle cx="13" cy="12" r="1"/><path d="M5,15 l-2,4"/><path d="M15,15 l2,4"/>'],
  wifi: [20, '<path d="M1,7 a13,13 0 0 1 18,0"/><path d="M4,10.5 a9,9 0 0 1 12,0"/><path d="M7,14 a5,5 0 0 1 6,0"/><circle cx="10" cy="17" r="1"/>'],
  more: [20, '<circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/>'],
  "git-merge": [24, '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6,21 V9 a9,9 0 0 0 9,9"/>'],
  anchor: [24, '<circle cx="12" cy="5" r="3"/><path d="M12,22 V8"/><path d="M5,12 H2 a10,10 0 0 0 20,0 h-3"/>'],
  download: [24, '<path d="M21,15 v4 a2,2 0 0 1 -2,2 H5 a2,2 0 0 1 -2,-2 v-4"/><path d="M7,10 L12,15 L17,10"/><path d="M12,15 V3"/>'],
  refresh: [24, '<path d="M22,5 v6 h-6"/><path d="M2,19 v-6 h6"/><path d="M4,10 a9,9 0 0 1 15,-4 l3,3"/><path d="M20,14 a9,9 0 0 1 -15,4 l-3,-3"/>'],
  bell: [24, '<path d="M18,8 a6,6 0 0 0 -12,0 c0,7 -3,9 -3,9 h18 s-3,-2 -3,-9"/><path d="M13.73,21 a2,2 0 0 1 -3.46,0"/>'],
  lock: [24, '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7,11 V7 a5,5 0 0 1 10,0 v4"/>'],
  ban: [24, '<circle cx="12" cy="12" r="10"/><path d="M4.93,4.93 L19.07,19.07"/>'],
  archive: [24, '<path d="M21,8 V21 H3 V8"/><rect x="1" y="3" width="22" height="5"/><path d="M10,12 H14"/>'],
  "heart-pulse": [24, '<path d="M12,21 C12,21 4,14.5 4,9 a4,4 0 0 1 8,-1.5 A4,4 0 0 1 20,9 C20,14.5 12,21 12,21 Z"/><path d="M6,12 h3 l2,-4 l2,7 l2,-3 h3"/>'],
  package: [24, '<path d="M12,2 L21,6.5 V17.5 L12,22 L3,17.5 V6.5 Z"/><path d="M3,6.5 L12,11 L21,6.5"/><path d="M12,22 V11"/>'],
  zap: [24, '<path d="M13,2 L3,14 h9 l-1,8 L21,10 h-9 z"/>'],
};

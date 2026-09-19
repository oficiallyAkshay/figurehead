// The one text-escaping primitive every other component relies on. Moved out of
// scripts/figurehead.mjs verbatim: same four replacements, same order.
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

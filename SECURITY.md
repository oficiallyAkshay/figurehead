# Security

## Supported versions

The current `main` branch and the latest tag. Nothing older gets a fix.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository:
https://github.com/oficiallyAkshay/figurehead/security/advisories/new

Never open a public issue for a vulnerability. Expect an acknowledgement
within seven days.

## Scope

figurehead renders a spec you commit (`<name>.hero.json`) into an SVG on
your own disk, and checks a rendered SVG against that same spec. No
credential, no model call, no network call at all:

- ✅ reads the spec and SVG files you point it at, and writes the
  rendered SVG back to disk
- ✅ with `check --repo <dir>`, also reads that directory's own file,
  folder and export names, to catch a label that collides with one; only
  when that flag is passed
- ❌ does not read your code otherwise
- ❌ does not send a file anywhere
- ❌ does not update itself
- ❌ does not send telemetry

If you find a way for figurehead to reach the network, read outside the
paths you gave it, or execute anything beyond rendering and checking, that
is a vulnerability report, not a bug report.

<h1 align="center">⚓ figurehead</h1>

<p align="center">
  <b>Draws a README's hero from a committed spec, checked before it ships.</b>
</p>

<p align="center"><img alt="figurehead writes a concept statement, picks a shape and a style, then renders the hero from a spec committed beside the SVG, checked against that spec before it ships" src="assets/readme/hero.svg" width="900"></p>

<p align="center">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/license-MIT-2f6f4e?logo=opensourceinitiative&logoColor=white"></a>
  <a href="https://github.com/oficiallyAkshay/clonometer"><img alt="clones of this repository, last seven days and all time" src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/oficiallyAkshay/figurehead/badges/clones.json&query=$.badge&label=clones&logo=github&logoColor=white"></a>
</p>

## Features

figurehead draws the hero graphic at the top of a README, from a spec you commit beside it.

<p align="center">🖼️<br><b>One real picture</b><br>A concept statement first, then a shape and a style: the hero draws the reader's day, not a diagram.</p>

<p align="center">✅<br><b>Checked before it ships</b><br>Every label in the spec has to appear in the picture, fit its card, and stay inside the frame.</p>

<p align="center">🔁<br><b>Never drifts</b><br>Same spec, same bytes: every committed example rebuilds byte for byte, so a stale hero fails the build.</p>

<p align="center">🗣️<br><b>Speaks your words</b><br>A label that matches your own file, function or export name is refused by name.</p>

<p align="center">🔒<br><b>Nothing leaves your machine</b><br>The renderer reads only the spec you hand it: no network call, no telemetry.</p>

## How it compares

| | oficiallyAkshay/figurehead (this repo, private) | [kyechan99/capsule-render](https://github.com/kyechan99/capsule-render) | [wei/socialify](https://github.com/wei/socialify) | [eli64s/readme-ai](https://github.com/eli64s/readme-ai) |
| --- | --- | --- | --- | --- |
| Committed spec | ✅ | ❌ | ❌ | ❌ |
| Byte-for-byte check | ✅ | ❌ | ❌ | ❌ |
| Runs offline | ✅ | ❌ | ❌ | ❌ |
| Installation | Skill | None | None | pip |
| Model | Your agent | None | None | Optional |

## Security and limits

No credential. The concept statement is written by your own agent; render and check are pure code and call no model.

- ❌ reads your code. `check --repo` opens local file, folder and export names only, to catch a label that matches one, and only when that flag is passed
- ❌ sends a file anywhere
- ❌ updates itself
- ❌ sends telemetry

By default, the `register/reader-nouns` check runs only with `--repo`; without it, that one check is skipped. It needs Node 20 or newer and nothing else.

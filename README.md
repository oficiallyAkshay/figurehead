<h1 align="center">⚓ figurehead</h1>

<p align="center">
  <b>Draws a README's hero from a committed spec, checked before it ships.</b>
</p>

<p align="center"><img alt="figurehead writes a concept statement, picks a shape and a style, then renders the hero from a spec committed beside the SVG, checked against that spec before it ships" src="assets/readme/hero.svg" width="900"></p>

<p align="center">
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/license-MIT-2f6f4e?logo=opensourceinitiative&logoColor=white"></a>
  <a href="https://github.com/oficiallyAkshay/clonometer"><img alt="clones of this repository, last seven days and all time" src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/oficiallyAkshay/figurehead/badges/clones.json&query=$.badge&label=clones&logo=github&logoColor=white"></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/oficiallyAkshay/figurehead"><img alt="OpenSSF Scorecard" src="https://api.scorecard.dev/projects/github.com/oficiallyAkshay/figurehead/badge"></a>
</p>

<p align="center">Works with<br>
  <a href="https://github.com/openai/codex"><img alt="Codex" src="https://img.shields.io/badge/Codex-1e1b4b?logo=data:image/svg%2bxml;base64,PHN2ZyBmaWxsPSJ3aGl0ZSIgcm9sZT0iaW1nIiB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHRpdGxlPk9wZW5BSTwvdGl0bGU+PHBhdGggZD0iTTIyLjI4MTkgOS44MjExYTUuOTg0NyA1Ljk4NDcgMCAwIDAtLjUxNTctNC45MTA4IDYuMDQ2MiA2LjA0NjIgMCAwIDAtNi41MDk4LTIuOUE2LjA2NTEgNi4wNjUxIDAgMCAwIDQuOTgwNyA0LjE4MThhNS45ODQ3IDUuOTg0NyAwIDAgMC0zLjk5NzcgMi45IDYuMDQ2MiA2LjA0NjIgMCAwIDAgLjc0MjcgNy4wOTY2IDUuOTggNS45OCAwIDAgMCAuNTExIDQuOTEwNyA2LjA1MSA2LjA1MSAwIDAgMCA2LjUxNDYgMi45MDAxQTUuOTg0NyA1Ljk4NDcgMCAwIDAgMTMuMjU5OSAyNGE2LjA1NTcgNi4wNTU3IDAgMCAwIDUuNzcxOC00LjIwNTggNS45ODk0IDUuOTg5NCAwIDAgMCAzLjk5NzctMi45MDAxIDYuMDU1NyA2LjA1NTcgMCAwIDAtLjc0NzUtNy4wNzI5em0tOS4wMjIgMTIuNjA4MWE0LjQ3NTUgNC40NzU1IDAgMCAxLTIuODc2NC0xLjA0MDhsLjE0MTktLjA4MDQgNC43NzgzLTIuNzU4MmEuNzk0OC43OTQ4IDAgMCAwIC4zOTI3LS42ODEzdi02LjczNjlsMi4wMiAxLjE2ODZhLjA3MS4wNzEgMCAwIDEgLjAzOC4wNTJ2NS41ODI2YTQuNTA0IDQuNTA0IDAgMCAxLTQuNDk0NSA0LjQ5NDR6bS05LjY2MDctNC4xMjU0YTQuNDcwOCA0LjQ3MDggMCAwIDEtLjUzNDYtMy4wMTM3bC4xNDIuMDg1MiA0Ljc4MyAyLjc1ODJhLjc3MTIuNzcxMiAwIDAgMCAuNzgwNiAwbDUuODQyOC0zLjM2ODV2Mi4zMzI0YS4wODA0LjA4MDQgMCAwIDEtLjAzMzIuMDYxNUw5Ljc0IDE5Ljk1MDJhNC40OTkyIDQuNDk5MiAwIDAgMS02LjE0MDgtMS42NDY0ek0yLjM0MDggNy44OTU2YTQuNDg1IDQuNDg1IDAgMCAxIDIuMzY1NS0xLjk3MjhWMTEuNmEuNzY2NC43NjY0IDAgMCAwIC4zODc5LjY3NjVsNS44MTQ0IDMuMzU0My0yLjAyMDEgMS4xNjg1YS4wNzU3LjA3NTcgMCAwIDEtLjA3MSAwbC00LjgzMDMtMi43ODY1QTQuNTA0IDQuNTA0IDAgMCAxIDIuMzQwOCA3Ljg3MnptMTYuNTk2MyAzLjg1NThMMTMuMTAzOCA4LjM2NCAxNS4xMTkyIDcuMmEuMDc1Ny4wNzU3IDAgMCAxIC4wNzEgMGw0LjgzMDMgMi43OTEzYTQuNDk0NCA0LjQ5NDQgMCAwIDEtLjY3NjUgOC4xMDQydi01LjY3NzJhLjc5Ljc5IDAgMCAwLS40MDctLjY2N3ptMi4wMTA3LTMuMDIzMWwtLjE0Mi0uMDg1Mi00Ljc3MzUtMi43ODE4YS43NzU5Ljc3NTkgMCAwIDAtLjc4NTQgMEw5LjQwOSA5LjIyOTdWNi44OTc0YS4wNjYyLjA2NjIgMCAwIDEgLjAyODQtLjA2MTVsNC44MzAzLTIuNzg2NmE0LjQ5OTIgNC40OTkyIDAgMCAxIDYuNjgwMiA0LjY2ek04LjMwNjUgMTIuODYzbC0yLjAyLTEuMTYzOGEuMDgwNC4wODA0IDAgMCAxLS4wMzgtLjA1NjdWNi4wNzQyYTQuNDk5MiA0LjQ5OTIgMCAwIDEgNy4zNzU3LTMuNDUzN2wtLjE0Mi4wODA1TDguNzA0IDUuNDU5YS43OTQ4Ljc5NDggMCAwIDAtLjM5MjcuNjgxM3ptMS4wOTc2LTIuMzY1NGwyLjYwMi0xLjQ5OTggMi42MDY5IDEuNDk5OHYyLjk5OTRsLTIuNTk3NCAxLjQ5OTctMi42MDY3LTEuNDk5N1oiLz48L3N2Zz4="></a>
</p>

## Features

figurehead draws the hero graphic at the top of a README, from a spec you commit beside it.

<p align="center">🖼️<br><b>One real picture</b><br>A concept statement first, then a shape and a style: the hero draws the reader's day, not a diagram.</p>

<p align="center">✅<br><b>Checked before it ships</b><br>Every label in the spec has to appear in the picture, fit its card, and stay inside the frame.</p>

<p align="center">🔁<br><b>Never drifts</b><br>Same spec, same bytes: every committed example rebuilds byte for byte, so a stale hero fails the build.</p>

<p align="center">🗣️<br><b>Speaks your words</b><br>A label that matches your own file, function or export name is refused by name.</p>

<p align="center">🔒<br><b>Nothing leaves your machine</b><br>The renderer reads only the spec you hand it: no network call, no telemetry.</p>

## How it compares

| | [oficiallyAkshay/figurehead](https://github.com/oficiallyAkshay/figurehead) | [kyechan99/capsule-render](https://github.com/kyechan99/capsule-render) | [wei/socialify](https://github.com/wei/socialify) | [eli64s/readme-ai](https://github.com/eli64s/readme-ai) |
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

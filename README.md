# Duplicity (V4)

[![Demo Live](https://img.shields.io/badge/demo-live-b19cd9?style=for-the-badge&logo=githubpages&logoColor=000000)](https://cLonata.github.io/duplicity)
[![Build Status](https://img.shields.io/github/deployments/cLonata/duplicity/github-pages?style=for-the-badge&label=build&logo=githubactions&logoColor=ffffff)](https://github.com/cLonata/duplicity/actions)

[![License: MIT](https://img.shields.io/badge/license-MIT-0f172a?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-22c55e?style=for-the-badge&logo=git&logoColor=white)](https://github.com/cLonata/duplicity/pulls)

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=0f172a)](https://tailwindcss.com/)

A web-based Oxygen Not Included save file editor.

🔗 **Try it now**: [https://cLonata.github.io/duplicity](https://cLonata.github.io/duplicity)

---

## Save File Locations

- **macOS**: `~/Library/Application Support/unity.Klei.Oxygen Not Included/save_files/`
- **Windows**: `C:\Users\<Your Username>\Documents\Klei\OxygenNotIncluded\save_files\`
- **Linux**: `~/.config/unity3d/Klei/Oxygen Not Included/save_files/`

---

## V4

**V4** marks a complete overhaul of the project’s architecture.

The previous version relied heavily on a complex web of legacy tools. This made long-term maintenance difficult, slowed development, and limited compatibility.

To address these issues, **V4 is a full rewrite** from the ground up using modern web technologies:

- ✅ **Next.js** — Simplified routing and easy static site generation for GitHub Pages support.
- ✅ **React** — Component-driven UI, no Redux or global state complexity.
- ✅ **Tailwind CSS** — Fast and responsive styling with utility classes.
- ✅ **JavaScript-first app layer** — The web app UI is plain JavaScript to keep contribution lightweight, while the parser workspace remains TypeScript.
- ✅ **Client-side only** — All functionality runs in the browser. No backend, no data upload, no privacy concerns.

This approach improves maintainability, performance, and makes it easier to add features going forward.

> 🔧 **Note**: This project is a modern fork of the original and popular [`oni-duplicity`](https://github.com/RoboPhred/oni-duplicity) by **RoboPhred**.  
> The new version is rewritten and maintained by **[cLonata](https://github.com/cLonata)**.

---

## Current Save Workflow

- Loads `.sav` files only.
- Parses/writes fully in-browser (no backend upload).
- Supports in-place save on browsers that expose `showOpenFilePicker` / `showSaveFilePicker`.
- Shows a backup prompt before overwrite when saving in place.
- Uses parser strictness controls (`major`, `minor`, `none`) in Settings.

---

## Translations

Duplicity ships English only for now. Translators are welcome.

To contribute a new language, copy the English files and translate them:

- `src/translations/en/common.json`
- `src/translations/en/oni.json`

Add your translated copies under `src/translations/<lang>/` and open a PR.

---

## Implementation

Save file serialization/parsing is powered by [`@clonata/oni-save-parser`](packages/oni-save-parser), maintained in this repo as a workspace package.

By default, Duplicity uses `major` version strictness when parsing saves.
This keeps support best-effort for newer minor save versions within the same major format.

---

## Development

Requirements:
- Node.js `22.x`
- npm `11.x`

---

## Deployment

- GitHub Pages deploys automatically from `master` via `.github/workflows/pages.yml`.
- Next.js is exported statically (`output: "export"`), with `basePath`/`assetPrefix` set in CI.

# Duplicity (V4)

[![GitHub Pages](https://img.shields.io/badge/demo-live-green?logo=github)](https://cLonata.github.io/duplicity)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/cLonata/duplicity/pulls)
[![Built with Next.js](https://img.shields.io/badge/built%20with-Next.js-black?logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/styled%20with-TailwindCSS-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)

A web-based Oxygen Not Included save file editor.

🔗 **Try it now**: [https://cLonata.github.io/duplicity](https://cLonata.github.io/duplicity)

---

## Save File Locations

- **macOS**: `~/Library/Application Support/unity.Klei.Oxygen Not Included/save_files/`
- **Windows**: `C:\Users\<Your Username>\Documents\Klei\OxygenNotIncluded\save_files\`

---

## V4

**V4** marks a complete overhaul of the project’s architecture.

The previous version relied heavily on a complex web of legacy tools. This made long-term maintenance difficult, slowed development, and limited compatibility.

To address these issues, **V4 is a full rewrite** from the ground up using modern web technologies:

- ✅ **Next.js** — Simplified routing and easy static site generation for GitHub Pages support.
- ✅ **React** — Component-driven UI, no Redux or global state complexity.
- ✅ **Tailwind CSS** — Fast and responsive styling with utility classes.
- ✅ **No TypeScript** — Now using plain JavaScript to lower the barrier for contribution.
- ✅ **Client-side only** — All functionality runs in the browser. No backend, no data upload, no privacy concerns.

This approach improves maintainability, performance, and makes it easier to add features going forward.

> 🔧 **Note**: This project is a modern fork of the original and popular [`oni-duplicity`](https://github.com/RoboPhred/oni-duplicity) by **RoboPhred**.  
> The new version is rewritten and maintained by **[cLonata](https://github.com/cLonata)**.

---

## Translations

This project is ready for translations.

To contribute, translate the following files:

- [`/src/translations/en/common.json`](src/translations/en/common.json)
- [`/src/translations/en/oni.json`](src/translations/en/oni.json)

Then submit them in a new issue or pull request.

---

## Implementation

The actual save file serialization and parsing is powered by the excellent [oni-save-parser](https://github.com/RoboPhred/oni-save-parser) library.  
Feel free to use it in your own projects as well!

By default, Duplicity uses `major` version strictness when parsing saves.
This keeps support best-effort for newer minor save versions within the same major format.

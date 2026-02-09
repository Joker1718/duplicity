# Asset Import Plan (V3 → V4)

Last updated: 2026-02-09

## Scope

This plan covers importing legacy V3 image packs into V4 with predictable naming and stable URLs for GitHub Pages.

## Current State

- V4 already stores avatar assets in `public/images/oni/`.
- Heads are present in `public/images/oni/head/` as `head_1.png` … `head_7.png`.
- Hairs are present in `public/images/oni/hair/` as `hair_1.png` … `hair_99.png` (partial coverage based on available files).

## Naming Standard (V4)

- Heads: `public/images/oni/head/head_{n}.png` where `n` is 1–7.
- Hairs: `public/images/oni/hair/hair_{n}.png` where `n` is 1–99.
- Future categories (eyes, mouths, etc.) should follow the same pattern: `{type}_{n}.png`.

## Import Rules

1. **Normalize filenames**
   - Legacy files should be renamed to the V4 standard (`head_{n}.png`, `hair_{n}.png`).
   - Any extra raw or diagnostic filenames should be moved to a separate staging folder (suggested: `references/assets/raw/`).

2. **Canonical location**
   - Only the standardized filenames should live in `public/images/oni/...`.
   - Non-standard files are not used by the app and should not be kept in `public/`.

3. **Indexing**
   - The app assumes 1-indexed ordinals.
   - Missing numbers are allowed but will render blank for those ordinals.

4. **GitHub Pages compatibility**
   - Assets must live under `public/` to be included in static export.

## Follow-up (Optional)

- Build a script to validate missing indices and report gaps.
- Add eyes and other accessories once the data mapping is confirmed.

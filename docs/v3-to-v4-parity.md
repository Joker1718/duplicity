# V3 to V4 Parity Checklist

Last updated: 2026-02-07

## Goal

Migrate Duplicity V3 behavior into V4 before adding net-new features.

## Status Legend

- `[ ]` Not started
- `[-]` In progress
- `[x]` Parity complete
- `[~]` Intentionally deferred from parity scope

## Scope Baseline (from V3)

Source refs:
- `references/duplicity-legacy-v3/src/routes.tsx`
- `references/duplicity-legacy-v3/src/nav-links.ts`

Route-enabled in V3:
- `/` Overview
- `/duplicants`
- `/duplicants/:gameObjectId`
- `/creatures`
- `/creatures/:gameObjectId`
- `/geysers`
- `/raw`
- `/settings`
- `/changelog`

Present but disabled in V3 routes:
- `/planets`
- `/materials`

## Parity Checklist (Must Have Before New Features)

### Core Save Pipeline

- [x] In-browser parse and write worker pipeline in V4 (`src/lib/oni/parser-client.js`, `src/workers/oni-parser.worker.js`)
- [x] Save download flow after write (`src/app/page.js`)
- [x] Default parse strictness fallback = `major` for best-effort newer minor versions (`src/workers/oni-parser.worker.js`)
- [x] Force-load flow for minor version mismatch (V3 behavior in `pages/OverviewPage/components/SaveError/component.tsx`)
- [x] Loading/saving progress UI parity (V3 `components/LoadingDialog/component.tsx`)
- [x] Central save session state model for `idle/loading/saving/ready/error` (V3 `services/oni-save/state.ts`)
- [x] Parse/write error surface parity (include parser error code handling)

### App Shell and Navigation

- [x] Sidebar + nav item parity from `nav-links.ts` with save-required gating
- [x] Top app bar parity: load, save, modified indicator, DLC indicator, settings
- [x] Route parity for all route-enabled V3 pages
- [x] Settings route reachable from shell
- [x] Changelog route reachable from shell

### Overview Page

- [x] No-save state with load control and save-file location hint
- [x] Save overview state with colony name, cycle count, and difficulty editor
- [x] Save-error state with version mismatch guidance and force-load action

### Duplicants Domain

- [x] Duplicant list page parity (`pages/DuplicantsPage`)
- [x] Duplicant detail route + not-found handling (`pages/DuplicantEditorPage`)
- [x] Duplicant name editing
- [x] Traits editing (add/remove)
- [x] Interests editing (add/remove)
- [x] Attributes editing
- [x] Appearance editing
- [x] Health editing
- [x] Skills editing (experience/masteries)
- [x] Effects editing (add/remove)
- [x] Duplicant menu actions parity:
- [x] Copy behaviors
- [x] Paste behaviors
- [x] Import behaviors from JSON
- [x] Export behaviors to JSON
- [x] Clone duplicant
- [x] Import checksum warning dialog parity

### Geysers Domain

- [x] Geyser list by type
- [x] Change geyser type
- [x] Change emission rate
- [x] Change lifecycle length
- [x] Change active fraction
- [x] Change emission fraction

### Raw Editor Domain

- [x] Raw object tree navigation
- [x] Breadcrumb navigation
- [x] Object editor dispatch by field type
- [x] Primitive field editors parity: string, number, boolean

### Creatures Domain

- [x] Creature list page parity
- [~] Creature editor parity (V3 itself says "Not Implemented")

### Settings and i18n

- [x] Language selector parity
- [x] i18n namespace parity (`common.json`, `oni.json`)
- [x] Language packs parity (en, cs, es, ru, zh)
- [~] Offline mode toggle parity (V3 `services/offline-mode/*`; optional for first production parity)

### Changelog

- [ ] Changelog page parity

## Secondary Parity Scope (V3 Present but Route-Disabled)

These exist in V3 code but were commented out in `routes.tsx`.

- [ ] Materials page parity (`pages/MaterialsPage`)
- [ ] Delete loose materials action
- [ ] Planets page parity (`pages/PlanetsPage`)
- [ ] Recoverable element edits on planets

## Data Operation Parity (Reducer/Action Surface)

Source refs:
- `references/duplicity-legacy-v3/src/services/oni-save/actions/*`
- `references/duplicity-legacy-v3/src/services/oni-save/reducer/*`

- [ ] `load-onisave`
- [ ] `save-onisave`
- [ ] `parse-progress`
- [ ] `receive-onisave`
- [ ] `modify-raw`
- [ ] `modify-behavior`
- [ ] `modify-behavior-path`
- [ ] `merge-behaviors`
- [x] `copy-behaviors`
- [x] `paste-behaviors`
- [x] `import-behaviors`
- [x] `export-behaviors`
- [x] `clone-duplicant`
- [x] `change-geyser-type`
- [x] `change-geyser-parameter`
- [ ] `modify-difficulty`
- [ ] `modify-planet`
- [ ] `delete-loose-material`

## Current V4 Done Items

- [x] Local workspace parser package (`packages/oni-save-parser`)
- [x] Scoped package wiring (`@clonata/oni-save-parser`)
- [x] Browser parser smoke-test page with parse summary and round-trip write (`src/app/page.js`)
- [x] Verified parse + write on a real 7.37 save
- [x] Save session provider + app shell scaffold (`src/lib/save-session/save-session-context.js`, `src/components/app-shell.js`)
- [x] Static-export-safe Next.js config for GitHub Pages (`next.config.mjs`)

## Suggested Execution Order

1. Core save session state + app shell + overview
2. Duplicants list/detail + menu actions
3. Geysers
4. Raw editor
5. Creatures list
6. Settings + i18n
7. Changelog
8. Secondary scope: Materials and Planets

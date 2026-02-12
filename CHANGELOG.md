## 4.0.3

Patch release focused on M3 consistency, reusable card UI, and major Duplicant Management polish.

### Duplicant Management Cards
- Traits now render with real in-game names from the known trait list and match editor styling.
- Added `Overjoyed:` and `Stressed:` rows above traits, including reaction values per duplicant.
- Added hover descriptions for both trait and reaction chips.
- Fixed chip hover cursor behavior so traits/reactions/attributes stay non-text (`default`) on hover.
- Reworked reactions and attributes rows to left-label/right-value alignment.
- Corrected attribute handling to prioritize the canonical 12 gameplay attributes and reduce noisy extras.
- Sorted attributes A-Z and rendered them in two-column book order (left column filled first, then right).
- Made avatar area use a single larger container and resized in-card avatar rendering to `0.6`.

### Duplicant Card Actions
- Reworked action toggles to a stricter M3 approach using shared chips and `react-icons` states.
- Standardized corner radius and text color across action chips for visual uniformity.
- Added collapsible `Attributes` and `Actions` sections with expand/collapse animation.
- Updated chevron behavior to `v` (expanded) and `^` (collapsed).
- Set `Actions` collapsed by default.
- Fixed unintended auto-expand of all action blocks when entering Duplicant Management after load.
- Expanded copy buffer details to `Buffer: X behaviors from ...`.
- Moved `Target: Name (ID)` up in the action block for clearer context.
- Copying behaviors now expands action panels across cards to make follow-up actions immediately visible.

### Shared M3 Components
- Extracted reusable `m3-chips` and applied it across traits, reactions, attributes, and action selections.
- Updated chip outlines to match the app pastel-purple accent.
- Added reusable animated `m3-collapsible-section` for section-level hide/show behavior.

### Data / Tooling / Docs
- Updated bundled trait data coverage used by V4 trait resolution and display.
- Added new developer tooling used during card/avatar and styling iteration.
- Updated project README documentation.

### App Shell / Navigation Drawer
- Extracted the left nav into reusable `m3-navigation-drawer`.
- Updated nav item states toward M3 drawer patterns (active/disabled/trailing metadata).
- Added right-aligned live counts for `Duplicants`, `Creatures`, and `Geysers`.
- Removed pill-style number containers and switched to plain trailing numbers to match M3 drawer guidance.

## 4.0.2

Patch release focused on usability polish, Raw Editor scalability, and shared UI standardization.

### Raw Editor
- Replaced legacy tree markers with consistent chevron icons and muted leaf markers.
- Fixed tree row alignment issues between expand/collapse controls and labels.
- Added lazy loading for object children in batches of 50 as you scroll.
- Added lazy loading for primitive fields in batches of 50 as you scroll.
- Replaced hard "Showing first ..." caps with progressive "Loaded X of Y" indicators.
- Standardized tree/breadcrumb controls with neutral ghost-button styling to avoid global button bleed.

### Save Overview / Difficulty
- Home header now shows `Duplicity V4` when no save is loaded and `Save Overview` when a save is loaded.
- Removed duplicate in-card headings (`Save Overview` and `Difficulty`) from the overview content block.
- Reordered overview toggles so they appear below `Bionic Wattage` and `Demolior Impact`.
- Reworked toggle rows into right-aligned checkbox fields (`Label [checkbox]`) with uniform `m3-field` styling.
- Hard-baked Title Case display labels/values in difficulty mappings (removed runtime casing transform).

### App Shell / Save Flow
- Added bottom-center left-nav version stamp (`v4.0.2`).
- Expanded Save File status chip states to `Not Loaded`, `Clean`, `Modified`, and transient `Saved`.
- Upgraded load/save progress modal to display real parser-worker progress messages.
- Added percentage parsing where available and determinate progress bar fallback logic.
- Replaced static progress pulse bar with determinate/indeterminate progress animation behavior.

### Shared UI Components
- Added reusable `m3-button-ghost` for neutral controls in dense/editor contexts.
- Added reusable circular icon button and standardized chevron controls where applied.
- Added reusable `m3-toggle-field` for standardized right-aligned toggle rows.
- Updated dropdown behavior to use adaptive scrolling (no scrollbar for short lists, thin scrollbar for long lists).

### Changelog Page
- Improved markdown hierarchy and spacing so version headers are clearly distinct from subsection headers.
- Styled the legacy divider marker (`Older changelog entries start below.`) for stronger visual separation.

## 4.0.1

Patch release focused on Duplicant Editor UX parity with V3 workflows.

### Duplicant Editor
- Added drag-to-slide carousel with centered active selection behavior.
- Added previous/next navigation controls and improved card interaction behavior.
- Non-selected cards now render in grayscale and restore color on hover.
- Carousel labels now truncate long names to prevent layout overflow.
- Unified gender editing to `FEMALE` / `MALE` / `NB` with `F/M/X` display shorthand.
- Simplified Identity block layout to reduce editor clutter.

### Appearance Preview
- Added baked hair offset support and alignment tooling integration.
- Improved avatar rendering consistency between list cards and editor views.

## 4.0.0

V4 launch. Full rewrite from the V3 codebase.

### Rewrite Scope (V3 -> V4)
- Rebuilt the app architecture with Next.js static export targeting GitHub Pages.
- Replaced V3 page/data flow with a new save-session driven editor model.
- Reworked parser integration for browser-safe read/write flows with progress feedback.

### Core Platform
- New app shell, routing guards, and save-required navigation behavior.
- New save workflow: `.sav`-focused loading, safer saving, and backup-aware overwrite flow.
- Export-safe routing and deployment model for GitHub Pages.

### Feature Parity Delivered
- Duplicants domain migrated with modernized editing UX.
- Geysers domain migrated with parity controls.
- Raw Editor migrated and redesigned in explorer layout.
- Settings migrated with English-first translation baseline.

### Notes
- V4 is a clean-slate implementation, not a direct code migration from V3.
- Secondary V3-only routes (Materials, Planets) remain planned.

---

*Older changelog entries start below.*

---

## 3.19.0

- Hack out nonfunctional editors that no longer apply to save version 4.31

## 3.18.1

- Fix crash when encountering invalid hairstyles.

## 3.18.0

- Make save editor DLC-aware
- Enable planets editor for non-dlc saves.

## 3.17.0

- Support save version 4.25
- Allow bypassing version check.

## 3.16.2

- Support DLC save version 4.23

## 3.16.1

- Support save file 4.17 as well as 4.22

## 3.16.0

- Support save file 4.22
- Disable planets editor for now; it is incompatible with 4.22.

## 3.15.3

- Commit text field changes when navigating away from the page.
- Support save file version 7.17

## 3.15.2

- Support save file version 7.16 (Automation Pack)

## 3.15.1

- Fix incorrect site configuration preventing loading or saving files.

## 3.15.0

- Added offline support, can be enabled through settings.

## 3.14.0

- Allow changing geyser year, active, and emission length.
- Make geyser text translatable.
- Add ability to delete individual loose materials.
- Add ability to search material list.

## 3.13.1

- Update oni-save-parser: Open up restrictions on .NET name validator to support mods with symbols or unicode in property names.

## 3.13.0

- Add planet recoverable element mass editing.

## 3.12.0

- Add traits from Recreation Pack

## 3.11.0

- Toggle inner sandbox mode flag when sandbox difficulty is changed. Possible fix for sandbox mode not changing with difficulty setting.
- Switch to supporting Recreation Pack update.

## 3.10.0

- Improved raw editor - Tree view and field inputs.
- Fix Czech and spanish translations not working.

## 3.9.0

- Fix geyser sliders latching to 0 or 100%.
- Fix UI lag when choosing slider values.
- Add missing traits Allergies and Archaeologist.
- Add Spanish translations, contributed by Galo223344.
- Add Czech translations, contributed by sorashi.
- Fix unable to save if a file is loaded after the example is loaded. Contributed by ferrybig.

## 3.8.5

- Update parser to support save version 7.12

## 3.8.4

- Change arm color with body.
- Update parser for salt water geyser support.
- Fix parsing certain modded fields such as "<Threshold>k\_\_BackingField".
- Fix duplicant clones sharing ownership with their original (Fixes bed sharing).

## 3.8.3

- Update for LU support.

## 3.8.2

- Fix selecting multiple categories to copy/export.
- Persist language selection.
- Show status dialog when saving.

## v3.8.1

- Fix crash on saves with active mods.

## v3.8.0

- Support new QOL3 changes. Breaks compatibility with older saves.
- Fix interests selection in QOL3.

## v3.7.0

- Raw JSON editor

## v3.6.0

- Editor for various difficulty settings.
- Fix geyser rate modification.
- Support saves from 7.6 to 7.8

## v3.5.0

- Change geyser game object type (and artwork) when changing emit element.
- Improve load/save performance.
- "Delete Loose Material" - Option to delete all loose ores on map.

## v3.4.0

- Back button for sub-pages
- Redirect to home page if no save is loaded
- Redirect to home page on 404.
- Materials list
- Imporove "Add Trait/Interest" UI.
- Geysers list
- Basic geyser element and rate editing.
- Duplicant data import / export.
- Fix Tinker and Toggle primary / secondary attribute classification being swapped.

## v3.3.1

- Fix deleting interests

## v3.3.0

- Copy / Paste Duplicant settings.
- Clone Duplicant.

## v3.2.0

- Fix Body Appearance tab.
- Add in-game names for aptitudes and traits

## v3.1.0

- Fill in duplicant property editors.

## v3.0.1

- Fix saves not loading

## v3.0.0

- Rewrite of UI focusing on reusability

## v2.1.3

- Update oni-save-parser to bring in missing traits.

## v2.1.2

- Fix spelling of stamina (#37)
- More flexible type system for identifying save elements to edit.
- Rocketry update supprt.

## v2.1.1

- The same fix to numeric input, preventing editing of some values.
- Chinese language support contributed by [@zsnmwy](https://github.com/zsnmwy)

## v2.1.0

- Fixes to numeric input preventing editing of some values
- Geyser editing (type, rate, lifecycle values)

## v2.0.5

- Fix decimal values not editable.
- Stylistic improvements to tables.

## v2.0.4

- Fix numeric values not editable in browsers other than chrome.

## v2.0.3

- Really remove test button from production build...

## v2.0.2

- Remove test button from production build.

## v2.0.1

- Fix incorrect url path preventing website from loading.

## v2.0.0

Major rewrite of save editor.

- Ground-up rewrite of UI.
- Save / Load progress reporting.
- Edit any recognized template object
- extraData editors duplicant modifiers (health, stamina, germs, diseases, ...)
- extraData editor for storage
- Additional editors for minion modifiers

## v1.4.3

Fix all job mastery and experiences displayed as unmastered / 0.

## v1.4.2

Wallpaper over more bugs due to oni-save-parser@2 save object differences.

## v1.4.1

Slash and burn conversion to support oni-save-parser@2 and the Cosmic Update version of ONI (save version 7.4).

## v1.4.0

- Edit duplicant
  - Interests (aptitudes)
- Edit geysers
  - Type
  - Cycle time factor
  - Active time factor
  - Dormant time factor
- Ability to rename file on download.

## v1.3.0

- Edit current cycle.
- Edit duplicant printer
  - Next duplicant ready
  - Time to next duplicant

## v1.2.1

- Fix save corruption when text with multi-byte accents are encountered.
- Refactor URL layout to make way for future utilities.

## v1.2.0

- Edit Duplicants
  - Current Job
  - Target Job
  - Job Experience
  - Job Mastery

## v1.1.0

- Edit Duplicants
  - Gender (data only; no visual effect)
  - Voice
  - Appearance
- Dedicated load button (no more refreshes to edit new saves)

## v1.0.0

Ground-up rewrite.

- Edit Duplicants
  - Name
  - Size (width and height)
  - Health Status (healthy, critical, incapacitated, invulnurable, ...)
  - Skills (level and experience)
  - Traits
  - Status Effects
- New Theme
- Non-blocking file loading and saving. Prevents browsers from killing the process when working with large saves.
- Internal cleanup for mantainability going forward.

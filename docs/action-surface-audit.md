# Action Surface Parity Audit (V3 to V4)

Last updated: 2026-02-09

This audit maps the V3 reducer/actions to the current V4 save session APIs.

## Summary

- Covered in V4: load/save lifecycle, parse progress, raw edits, behavior merges, difficulty edits.
- Partially covered: generic behavior mutation (V4 has helpers and specific editors, but no single "modify-behavior" public API).
- Missing: planet edits and delete-loose-material actions.

## Mapping

| V3 Action | V4 Equivalent | Status | Notes |
| --- | --- | --- | --- |
| `load-onisave` | `loadSaveFile`, reducer `LOAD_BEGIN/LOAD_SUCCESS` | Covered | `src/lib/save-session/save-session-context.js` load flow. |
| `save-onisave` | `saveCurrentFile`, reducer `SAVE_BEGIN/SAVE_SUCCESS` | Covered | `src/lib/save-session/save-session-context.js` save flow. |
| `parse-progress` | reducer `LOAD_PROGRESS`/`SAVE_PROGRESS` | Covered | Parser worker `onProgress` wires to progress state. |
| `receive-onisave` | reducer `LOAD_SUCCESS` | Covered | Parsed saveGame becomes active state. |
| `modify-raw` | `updateRawValue` (uses `setPathValue`) | Covered | Raw editor writes through path utilities. |
| `modify-behavior` | `modifyBehavior` | Covered | Generic API supports template/extra targets with merge option. |
| `modify-behavior-path` | `updateRawValue` + raw path utils | Covered | Behavior path edits flow through raw editor. |
| `merge-behaviors` | `applyBehaviorMerge` (used by paste/import) | Covered | `copy/paste/import` already use this. |
| `modify-difficulty` | `updateDifficultySetting` | Covered | Also applies sandbox flags. |
| `modify-planet` | `updatePlanet` | Covered | V4 API updates `SpacecraftManager.destinations`. |
| `delete-loose-material` | `deleteLooseMaterial` | Covered | V4 API removes material groups by sim hash name. |

## Gaps to Close

No remaining gaps for Milestone 1.

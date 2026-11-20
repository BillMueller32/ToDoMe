# CLAUDE.md

ToDoMe: a personal, single-user to-do notebook. One page, three views (Today, Upcoming, Later), quick capture that reads dates/times/repeats out of plain text. Works on phone (installed to home screen) and laptop, synced.

## Principles (from the owner)

- Quick, clean, pretty. Fast to open (local-first: the list lives on the device).
- **Zero upkeep.** The user only writes things down and checks them off. Nothing should ever require tending lists. See the rules in `src/lib/items.ts`.
- Keep it small. No feature bloat; remove what isn't used.

## Stack

- React 19 SPA built with Vite, served by a **Cloudflare Worker** (Workers Static Assets) via `@cloudflare/vite-plugin`.
- API in `worker/index.ts` (only `/api/*` runs the Worker). Data in **Cloudflare D1** (binding `DB`), schema created on first request.
- Package manager **Bun**. `bunfig.toml` has a 24h minimum-release-age guard; confirm with the user before adding exclusions.

## Commands

- `bun install`
- `bun run dev` — Vite dev server with the Worker and a local D1 (needs `.dev.vars` with `APP_PASSWORD=...`)
- `bun test` — parser + upkeep-rule tests (`src/lib/*.test.ts`)
- `bun run typecheck`
- `bun run build` — outputs `dist/` (client + worker)
- `bun run deploy` — build + `wrangler deploy` (normally not needed: Cloudflare Workers Builds deploys every push to `main`)

## How it works

- `src/lib/parse.ts` — natural-language capture ("call dentist tomorrow 9am", "water plants every sunday", "pay rent nov 30", "someday"). Short weekday names only count after on/next/every. Add a test for every new phrase.
- `src/lib/items.ts` — the `Item` model and the upkeep rules: anything written without a date goes straight on Today; dated items join Today on their day; missed items carry over and stay until done; anything on Today longer than `FOLD_AFTER_DAYS` (14) folds into a collapsed "Been a while" section; "someday" parks an item in Later (`later: true`); repeats collapse to their latest occurrence; completing a repeat advances it and stores a done copy.
- `src/lib/store.ts` — local-first store (localStorage) + background sync. Each change bumps `updatedAt`; server keeps the newest per item (last write wins) and gives every write a `seq`; devices pull `seq > cursor`. Deletes are tombstones (`deleted: true`).
- Auth: one password in the Worker secret `APP_PASSWORD`; login sets a long-lived HttpOnly cookie derived from it (changing the password signs out every device).
- `src/lib/scenes.ts` + `src/components/Scenery.tsx` — the faint pencil illustration behind the list. Images in `public/scenes/<id>.webp` (3:2, white background, blended with `mix-blend-mode: multiply`); the manifest is `SCENES`. One scene per local day, cycling through all before repeating (`sceneFor`); only today's image loads. Faintness is `--scene-opacity-mobile` / `--scene-opacity-desktop` (plus dark-mode values) in `src/styles.css`; on laptops each scene's `featureTop` keeps its highest feature below `--scene-clear-top`. `bun run dev` shows a scene picker + opacity slider (dev only).
- `public/sw.js` — service worker: app opens instantly/offline from cache, refreshes in the background.

## Conventions

- Dates are local `YYYY-MM-DD` strings; times are `HH:MM` 24h.
- Plain CSS in `src/styles.css` with tokens on `:root` (light) and a dark override. No UI framework. System fonts only: serif (`--font-serif`, New York on Apple devices) for the day and the writing line, system sans for the rest.
- Never commit secrets; `.dev.vars` is gitignored.

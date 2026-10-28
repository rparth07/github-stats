# GitHub Contributor Stats

Explore the people behind a public GitHub repository with a contributor treemap and ranked list.

**Live site:** https://rparth07-github-stats.netlify.app

## Features

- Search public repositories with debounced suggestions, or enter `owner/repository` / a GitHub repository URL and press Generate or Enter.
- Responsive treemap with square-root contribution weighting, rank/count tooltips, keyboard selection, and contributor profiles.
- Hover or keyboard-focus a contributor to expand their photo while neighboring tiles move aside. Leaving the tile restores the original layout. Reduced-motion preferences keep resizing immediate.
- Ranked list view with larger touch targets. Switching views preserves the repository and selected contributor.
- Share a contributor using the native share dialog where supported or copy their deep link. Opening the link highlights that contributor. GitHub bot usernames work too.
- View GitHub profiles and their public website/portfolio field, fetched only when opening a profile.
- Download SVG, PNG, or JPEG with embedded avatars when available. Print / PDF uses the browser print dialog: choose Save as PDF.
- Loading, empty, invalid repository, network, missing contributor, and API rate-limit states.

## Run locally

Node.js 22 or newer is recommended. There are no production npm dependencies. D3 7.9.0 is bundled in `vendor/` with its ISC license.

```sh
npm ci
npm run build
python -m http.server 4177 --bind 127.0.0.1 --directory dist
```

Open http://localhost:4177. Routes: `/`, `/Treemap/`, and `/ListView/`.

## Test

```sh
npx playwright install chromium
npm run build
npm test
```

For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable. Browser tests use mocked GitHub responses to check mobile/desktop bounds, bot deep links, missing contributors, search, empty repositories, 404/rate limits, actual SVG/PNG/JPEG downloads, and print rendering. Mocked tests do not establish current GitHub API availability.

## Data and limitations

- Up to 100 contributors, sorted by GitHub's attributed commit count. These are neither total repository activity nor a measure of contribution quality. GitHub caches statistics.
- Requests go from the browser directly to GitHub's public API. Unauthenticated rate limits apply per public IP and repository-search limits are more restrictive. No access token is stored or published. If a limit is reached, the app displays an error and retry guidance.
- Small treemap tiles remain small by design; list view provides an accessible alternative. Usernames are hidden where a tile is too small, but its full accessible label and tooltip remain available. Counts and ranks are relative to the shown contributors.
- Portfolio links use the public GitHub website field. Arbitrary multiple-link submissions or user accounts would need a separate authenticated backend and are not implemented.
- Shared web links highlight a contributor. PNG/JPEG files cannot contain clickable social-media links; social platforms control their previews. Downloaded SVGs include clickable contributor links when opened in a viewer that supports SVG hyperlinks.
- Browser Print / PDF provides PDF export; there is no separate PDF generation dependency. Avatar export failures fall back to labeled colored tiles.

## Bugs fixed for launch

Fixed the missing homepage, nonfunctional Generate button, stale search responses, treemap sizing and resize listeners, missing-contributor crashes, bot-username selectors, broken share-link state, and navigation losing the selected repository. Both views now share one implementation with keyboard support, responsive layouts, and clear loading/error states.

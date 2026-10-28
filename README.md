# GitHub Contributor Stats

Explore the people behind a public GitHub repository with a contributor treemap and ranked list.

**Live site:** [GitHub Contributor Stats](https://rparth07-github-stats.netlify.app)

## Features

- Search public repositories with debounced suggestions, or enter `owner/repository` / a GitHub repository URL and press Generate or Enter.
- Responsive treemap with square-root contribution weighting, rank/count tooltips, keyboard selection, and contributor profiles.
- Pause the pointer on a contributor for 400ms, or keyboard-focus them, to see their complete profile image, full username, rank, and contribution count. Previews are at least 240px wide when the window allows and sit 12px beside the original tile: right first, then left if needed, or below/above when neither side fits. Previews that overlap the grid allow pointer events through so other tiles stay selectable. Moving across the treemap does not trigger previews; click any tile directly to open its profile. Press Escape to dismiss a preview. Reduced-motion preferences keep resizing immediate.
- Ranked list view with larger touch targets. Switching views preserves the repository and selected contributor.
- Share a contributor using the native share dialog where supported or copy their deep link. Opening the link highlights that contributor. GitHub bot usernames work too.
- View GitHub profiles and their public website/portfolio field, fetched only when opening a profile.
- Download SVG, PNG, or JPEG with embedded avatars when available. Print / PDF uses the browser print dialog: choose Save as PDF.
- Loading, empty, invalid repository, network, missing contributor, and API rate-limit states.

## Run locally

Only Python 3 is needed to run the website. It is a static HTML/CSS/JavaScript project: npm installation and a build are optional. Internet access is needed to load GitHub data and avatars.

1. Clone the current `master` branch into a new folder, then enter it:

```sh
git clone --branch master https://github.com/rparth07/github-stats.git github-stats-local
cd github-stats-local
```

2. Start a server from that folder, where `index.html`, `app.js`, and `style.css` are located:

```sh
python -m http.server 4177 --bind 127.0.0.1 --directory .
```

On Windows, if `python` is unavailable but the Python launcher is installed, use:

```powershell
py -3 -m http.server 4177 --bind 127.0.0.1 --directory .
```

3. Open [http://127.0.0.1:4177](http://127.0.0.1:4177) in your browser. The homepage is the treemap; use the navigation to switch to `/Treemap/` or `/ListView/`.

Keep the server terminal open. Press `Ctrl+C` to stop it. After editing a source file, refresh the browser; no build is required when serving the repository folder. Serve the site over HTTP; opening `index.html` directly does not support its root-relative asset paths.

The current `master` branch includes `package.json` for optional build and test commands. If it is missing in an existing folder, check that you are in the correct repository and branch, or use the fresh-clone instructions above. They leave your existing checkout untouched.

If port 4177 is already in use, choose another port in the server command and open the matching URL. A GitHub rate-limit error means you need to wait for the API limit to reset; it does not require rebuilding the site.

## Test

Optional development tools require Node.js 22 or newer (includes npm). From the current repository folder:

```sh
npm ci
npx playwright install chromium
npm run build
npm test
```

For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable. Tests start their own local server and mock GitHub responses to check desktop/mobile layout, hover expansion and restoration, keyboard/reduced-motion behavior, shared links, search, API errors, image exports, and print rendering.

## Data and limitations

- Up to 100 contributors, sorted by GitHub's attributed commit count. These are neither total repository activity nor a measure of contribution quality. GitHub caches statistics.
- Requests go from the browser directly to GitHub's public API. Unauthenticated rate limits apply per public IP and repository-search limits are more restrictive. No access token is stored or published. If a limit is reached, the app displays an error and retry guidance.
- Hover or keyboard-focus small tiles to expand them, or use list view for larger selection targets. Labels are hidden where space is limited; full accessible names and tooltips remain available.
- Shared web links highlight a contributor. PNG/JPEG files cannot contain clickable social-media links; social platforms control their previews. Downloaded SVGs include clickable contributor links when opened in a viewer that supports SVG hyperlinks.
- Browser Print / PDF provides PDF export; there is no separate PDF generation dependency. Avatar export failures fall back to labeled colored tiles.

## Remaining work

- Let contributors submit multiple portfolio links. Currently the app only reads their public GitHub website field; authenticated submissions and persistent storage are not implemented.


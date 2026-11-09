# My personal website

Live at https://seandas.github.io (GitHub Pages, `main` branch, repo root).

A static site with no build step:

| File | What it is |
|---|---|
| `index.html` | All page content |
| `404.html` | Page shown for an address that doesn't exist |
| `styles.css` | Layout and look (light and dark themes), plus print styles |
| `theme.js` | Applies the saved light/dark choice before the page is drawn |
| `script.js` | Email links, theme toggle, scroll effects, demo terminal, skills filter, case study preview and audio |
| `chat.js` | The "Ask my AI twin" chat widget |
| `assets/` | Photo, link-preview image, icons, case study narration |
| `robots.txt`, `sitemap.xml` | For search engines |

## Edit the content
1. Edit `index.html` and refresh the browser.
2. Photo: replace `assets/profile.jpg` (square works best).
3. Resume: not published; visitors request it by email ("Email for resume" buttons).
4. After changing `styles.css`, `theme.js`, `script.js` or `chat.js`, bump its `?v=` tag in `index.html` so
   browsers fetch the new copy.

## Publishing checklist
1. `git fetch` and compare with `origin/main` before committing.
2. `git status`: only site files are staged.
3. Check the staged diff contains no secrets (the site needs none) and no private notes.
4. Update `<lastmod>` in `sitemap.xml` after a content change.
5. Push, wait a minute, then open the live site and try the chat.

## Search engines
- `robots.txt` lets search engines crawl the site and points to `sitemap.xml`.
- If the site address ever changes from `https://seandas.github.io/`, update it in `robots.txt`,
  `sitemap.xml`, and the `canonical`, `og:` and JSON-LD data in `index.html`.

## Use of this content
© Sean Das. All rights reserved.

The text, photos, audio, resume details and other personal information in this repository are mine
and may not be copied, reused or adapted without my written permission. The code is here so the site
can be hosted; please don't republish the site or impersonate me.

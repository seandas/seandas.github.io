# My personal website

A static site with no build step: `index.html`, `styles.css` and `script.js`.

## Edit the content
1. To change any text, edit `index.html` and refresh the browser.
2. To change your photo, replace `assets/profile.jpg` (a square image works best).
3. To update the resume download, replace `assets/Sean_Das_Resume.pdf`.
4. Preview it locally: run `python3 -m http.server` in this folder, then open http://localhost:8000

## Publish free on GitHub Pages
1. Create a free account at https://github.com
2. Create a **public** repository named exactly `<your-username>.github.io`
3. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Personal website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-username>.github.io.git
   git push -u origin main
   ```
4. In the repo, go to **Settings → Pages**, set **Source** to "Deploy from a branch", then choose `main` and `/ (root)`.
5. After a minute or two the site is live at `https://<your-username>.github.io`

## Optional: custom domain
Buy a domain (about $10–15/year), add a `CNAME` file containing it (e.g. `yourname.com`), set the domain under **Settings → Pages**, and follow GitHub's DNS instructions.

## Search engines
- `robots.txt` lets search engines crawl the whole site and points them to `sitemap.xml`.
- `sitemap.xml` lists the page for Google. After a big content update, change its `<lastmod>` date.
- If the site address changes from `https://seandas.github.io/`, update it in `robots.txt`, `sitemap.xml`, and the `canonical` and `og:` tags in `index.html`.
- After publishing, add the site in Google Search Console (https://search.google.com/search-console), submit `sitemap.xml`, and request indexing.

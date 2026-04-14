# Mady

A mobile-first glassmorphism homepage for GitHub Pages.

## Deploy on GitHub Pages using only browser

1. Open your `homepage-glass` repository on GitHub.
2. Click **Add file → Upload files**.
3. Upload all files and folders from this project ZIP.
4. Commit the files to your default branch.
5. Go to **Settings → Pages**.
6. Under **Build and deployment**, choose **GitHub Actions**.
7. Open the **Actions** tab and wait for **Deploy to GitHub Pages** to finish.
8. Visit:

```txt
https://mady-ghostainum.github.io/homepage-glass/#/
```

## Fixed details

- Vite base path is set to `/homepage-glass/`.
- Routing uses `HashRouter`, safe for GitHub Pages refreshes.
- Settings, bookmarks, custom wallpaper, and search history use IndexedDB only.
- Added Export Config and Import Config.
- News uses Google News RSS through browser-friendly RSS proxies.
- Weather uses Open-Meteo with selected city/state.
- Bookmark icons auto-fetch favicons with emoji/image fallback.

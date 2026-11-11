# Forget Me Not Travel — homepage

Static site built from the Claude Design handoff (`project/Homepage.dc.html`). Plain HTML, CSS and JavaScript, with no framework and no build step.

```
index.html        all copy is real HTML on load (SEO)
css/styles.css    layout, components and responsive rules (mobile ≤768px, compact header <1024px)
css/textures.css  generated SVG-noise paper textures
js/main.js        every interaction (menu, panels, sheet, carousels, form, scroll effects)
assets/           brand (logo), img (photos and posters), video (hero and specialities)
```

**Run locally:** `python3 -m http.server` in this folder, then open http://localhost:8000.

**Deploy:** upload the contents of this folder (`index.html` at the root) to Netlify Drop, Vercel or any static host.

## Not done yet

- **The quote form doesn't send anywhere yet.** `setupForm()` in `js/main.js` only shows the success panel. Connect it to a form service (for example Netlify Forms or Formspree) before launch.
- **Analytics hooks only.** Clicks push `{event}` to `window.dataLayer` (`quote_click`, `trustpilot_click`, `work_with_me_click`, `destination_click`, `form_submit`), ready for Google Tag Manager.
- **The social share image (`og:image`) and the structured-data image** point to `https://www.fmntravel.com/assets/img/her-photo-beach-woman.jpg`. That URL only works once the site is live on that domain.
- **The font is General Sans, loaded from Fontshare** (`api.fontshare.com`). If that service can't be reached, the page falls back to the system sans-serif.
- **Still to confirm before launch:** the Trustpilot score and review count (4.6, 22 reviews), and the ABTA/ATOL/IATA wording.

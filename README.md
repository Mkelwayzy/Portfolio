# Mostafa Khaled — Portfolio

A bilingual portfolio for brand identity, 3D design, and visual work.

## Project structure

- `index.html` — redirects the site root to the portfolio page.
- `Portfolio.html` — page markup.
- `assets/css/styles.css` — custom styles and animations.
- `assets/js/app.js` — portfolio data, page interactions, CMS, routing, and PDF export.

## Run locally

Serve the project directory with any static web server. For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

The page loads Tailwind CSS, IBM Plex fonts, and jsPDF from external CDNs, so those features require an internet connection.

## Content and publishing

CMS edits are saved in the current browser's `localStorage`; they are not shared across browsers or visitors. The client-side passcode is not a security boundary. Do not rely on it to protect private content or administrative actions on a public deployment; use server-side authentication and storage for that.

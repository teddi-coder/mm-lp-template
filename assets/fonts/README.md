# Custom Brand Fonts

If your client has custom brand fonts, replace the Google Fonts `<link>` tags in the `<head>` of `index.html` and `thank-you.html`, then update `--font-heading` and `--font-body` in the `:root` block at the top of `assets/css/style.css`.

If they don't have custom fonts, the default Barlow Condensed + Inter pairing works well for automotive clients.

---

## How to use custom fonts

### Option A — Google Fonts (most common)

If the client's brand fonts are available on Google Fonts, simply replace the existing `<link>` tag in the `<head>` of both HTML files with the new Google Fonts URL, then update the font names in `style.css`:

```css
--font-heading: 'New Heading Font', fallback, sans-serif;
--font-body: 'New Body Font', Arial, sans-serif;
```

### Option B — Self-hosted font files

If the client has supplied `.woff2` font files:

1. Drop the `.woff2` files into this `assets/fonts/` folder.
2. Remove the Google Fonts `<link>` tags from both HTML files.
3. Add `@font-face` declarations at the top of `style.css` (above the `:root` block), for example:

```css
@font-face {
  font-family: 'ClientFontName';
  src: url('../fonts/clientfont-bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}
```

4. Update the font variables in the `:root` block:

```css
--font-heading: 'ClientFontName', Arial, sans-serif;
--font-body: 'ClientBodyFont', Arial, sans-serif;
```

Always include a system font fallback (Arial, sans-serif) so the page is readable if the custom font fails to load.

# Client Images Guide

Images for each client go in their own subfolder under `assets/images/`. Never mix images from different clients in the same folder.

---

## Folder naming convention

Name the folder after the client's slug — lowercase, hyphens only, no spaces. The slug should match the folder name you used for the whole landing page.

Examples:
- `assets/images/smiths-auto-service/`
- `assets/images/bobs-mechanical/`
- `assets/images/premier-auto-[suburb]/`

---

## Image files

The template references two images. Use these exact filenames:

| Filename | Where it appears | Recommended size | Max file size |
|---|---|---|---|
| `hero.jpg` | Hero section — right side | 1200 x 800px | Under 200KB |
| `team.jpg` | About section — right side | 900 x 600px | Under 200KB |

So for a client with slug `smiths-auto-service`, the paths would be:
- `assets/images/smiths-auto-service/hero.jpg`
- `assets/images/smiths-auto-service/team.jpg`

---

## Format and size requirements

- Format: JPG (not PNG, not WebP — keep it simple and compatible)
- Colour space: sRGB
- Quality: export at 80–85% JPG quality — sharp enough, small enough
- Under 200KB per image — use Squoosh (squoosh.app) or ImageOptim to compress if needed

---

## What if there's no image yet?

**Hero image:** If `hero.jpg` is missing or the `<img>` tag src is a broken path, the hero image container shows the brand primary colour (`--brand-primary`) as a fallback background. The page still looks intentional — it won't break.

**Team/about image:** If no team photo is available, remove the `<img>` tag inside `.about__image` in `index.html` and leave the div empty. The CSS will collapse the empty div and the about text will stretch to full width automatically.

---

## Alt text

Always fill in the `alt` attribute on every image. The template includes placeholder alt text — replace it with a description that includes the workshop name and suburb. Example:

```
alt="The team at Smith's Auto Service in Prospect"
```

This helps with accessibility and gives a small SEO benefit.

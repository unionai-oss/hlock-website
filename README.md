# hlock-website

Website for hlock: the agent harness package manager. Live at <https://www.hlock.ai>.

A single static page with no build step. Everything that gets deployed is in `public/`:

| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | All styles |
| `main.js` | Terminal animations, scroll reveals, copy buttons |
| `ambient.js` | The background: a stream of dots that flows, locks into place, and releases |
| `assets/` | Logos, copied from the hlock docs |
| `CNAME` | Custom domain for GitHub Pages (`www.hlock.ai`) |

## Develop

```bash
python3 -m http.server -d public 8000   # http://localhost:8000
```

## Deploy

`.github/workflows/pages.yml` publishes `public/` to GitHub Pages on every push to `main`.

One-time setup:

1. **Settings → Pages → Build and deployment → Source:** GitHub Actions.
2. **Settings → Pages → Custom domain:** `www.hlock.ai`, then tick **Enforce HTTPS** once the
   certificate is issued.
3. **DNS** at your registrar:
   - `www` → `CNAME` → `unionai-oss.github.io`
   - apex `hlock.ai` → `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153` (and optionally `AAAA` `2606:50c0:8000::153` … `8003::153`), so
     `hlock.ai` redirects to `www.hlock.ai`.
4. Optional: verify the domain for the `unionai-oss` org (**Org settings → Pages**) to
   prevent takeover.

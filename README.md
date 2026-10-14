# Atelier Craft

An independent, self-hosted launcher for the official web builds of Craft creative apps. Open them from ChromeOS, Android or any modern desktop browser. The single prebuilt container image is published on GitHub Container Registry (GHCR). Atelier Craft checks upstream releases every 12 hours by default, verifies their published SHA-256 checksums and switches to a new version only after a valid download.

**Atelier Craft is created by [Federico Calicchia](https://calicchia.design). It is not affiliated with, endorsed by or operated by the ArtCraft team.** The Craft apps, their names, code and rights belong to their respective owners. See the [original app catalogue](https://getartcraft.com/apps) and each upstream repository for their licenses and terms. Atelier Craft's MIT license covers only its own launcher code. The repository contains no upstream app binaries or unlicensed screenshots/icons.

PhotoCraft is described by its authors as a [Photoshop alternative](https://github.com/storytold/photocraft); VectorCraft as an [Illustrator alternative](https://github.com/storytold/vectorcraft). These descriptions refer to the original apps, not a feature-equivalence promise by Atelier Craft.

The catalogue also identifies each app's area of use through familiar products such as Adobe Premiere Pro, Lightroom Classic, Acrobat, After Effects, InDesign and Audition; Figma; Microsoft Word, PowerPoint and Excel; and Autodesk AutoCAD. These product names are comparison references only. They do not imply endorsement, affiliation or identical functionality, and web builds may differ from the features described on the original app pages.

## Quick start

```sh
mkdir atelier && cd atelier
curl -fsSLO https://raw.githubusercontent.com/Federicokalik/atelier-craft/main/compose.yaml
docker compose up -d
```

Open `http://SERVER-IP:8080`. Compose pulls the public [GHCR image](https://github.com/Federicokalik/atelier-craft/pkgs/container/atelier-craft); no local image build or registry login is needed. On the first start, the bundled updater downloads compatible app builds from the original projects, verifies their checksums and stores them in the persistent `app_data` Docker volume. Cards become available individually. App binaries are not embedded in the GHCR image. For a different port or update schedule, download `.env.example` from the repository as `.env` and edit it, or set the environment variables shown in `compose.yaml`.

The GitHub Actions workflow builds and publishes the launcher image for `linux/amd64` and `linux/arm64` after changes to the runtime files on `main`. To refresh the container later, run `docker compose pull && docker compose up -d`. The app updater continues checking original releases automatically between container refreshes. Existing app data survives container recreation in the named volume.

For access outside the LAN, put the service behind an **HTTPS reverse proxy** or tunnel. HTTPS is needed for some browser capabilities used by the apps. Do not expose Docker's plain HTTP port directly to the internet. With a proxy on the same host, bind the Compose port to localhost: `127.0.0.1:${HUB_PORT:-8080}:8080`.

## Languages and site files

The homepage is Italian at `/`. The other public routes are `/en/`, `/fr/`, `/nl-be/`, `/de/`, `/es/` and `/pt-pt/`. The launcher, app dock and update messages use the selected language; upstream app interfaces retain their own language options. Future app descriptions come from their upstream repository. Without a configured translator, they remain in the original language.

Edit translations and static SEO copy in `sitegen.py`, then run `python sitegen.py`. This regenerates the seven index pages, `web/i18n.js`, the app wrapper, `robots.txt` and `sitemap.xml`. Original Open Graph and Twitter images are generated for each language by `python scripts/make_social_images.py` (requires Pillow). Generated pages reference JavaScript and CSS with content-hash query versions so a CDN can fetch fresh files on release. If you use your own domain, change `BASE` in `sitegen.py` and regenerate before building your own image. The public instance uses `https://atelier.federico.im`.

## Updates and future apps

The bundled updater checks official `storytold` GitHub releases every `UPDATE_INTERVAL_HOURS` (default 12). For an app, it requires a matching `*-web-*.zip` and `SHA256SUMS.txt`; it verifies SHA-256 and the extracted build before changing the current version. On failure, the previous version remains available. Use `docker compose exec atelier python /srv/updater/update.py` for an immediate check.

Future-app discovery is enabled by default. It checks public `storytold` repositories whose names end in `craft`, then installs a new app only when a compatible, verifiable official web release exists. It cannot guarantee that every future ArtCraft app will provide such a release. Set `DISCOVER_FUTURE_APPS=false` to disable discovery. `GITHUB_TOKEN` is optional and can reduce anonymous API rate limits; use a read-only token and keep `.env` out of Git.

For automatic translation of newly discovered app descriptions, enable the optional self-hosted [LibreTranslate](https://docs.libretranslate.com/guides/installation/) service by setting `COMPOSE_PROFILES=translations` and `TRANSLATE_URL=http://translate:5000/translate` in `.env`, then run `docker compose up -d`. The translator is reachable only inside the Compose network. Its language models live in the separate `translate_models` volume and need extra disk space and memory. The updater translates the English repository description into Italian, French, Dutch, German, Spanish and Portuguese on discovery or when the source text changes, caches successful results in `app_data`, and retries missing translations on later checks. The launcher uses the original English text until a translation is ready. `nl-BE` uses the Dutch model and `pt-PT` the Portuguese model, so regional wording may need human review. For an existing translation API, set `TRANSLATE_URL` (and optionally `TRANSLATE_API_KEY`) without enabling the local service. This translates only launcher catalogue descriptions, not the original apps' interfaces or arbitrary release notes.

While a build is downloading or being verified, the relevant card and any open app wrapper show a localized **update in progress, come back shortly** or **installation in progress** message. An already installed version remains usable while its replacement is prepared. The catalogue is written atomically and the launcher checks it every 15 seconds.

Open launcher tabs refresh their cards, availability, update notices and last-check time without reloading the page. The last-check timestamp uses the `Europe/Rome` time zone, so it displays CET (UTC+1) in winter and CEST (UTC+2) in summer.

Updates are installed automatically once for the whole self-hosted instance; no account or per-user installation is needed. An open app stays on the exact version it loaded. Its wrapper checks the catalogue every 15 seconds and whenever its tab regains focus or connectivity. If a newer version arrives, an in-page notice offers **save your work, then update** or **use it next time**. The latter loads the new version on the next opening. An open launcher tab also announces completed updates. These notices are per open browser tab, so users do not need accounts or notification permissions. Atelier Craft cannot save documents on behalf of an upstream app or notify a browser after the page has closed. The draggable Atelier Craft tab opens the return link and update notice; its position and favorites are stored in that browser.

## Assets, credits and boundaries

Atelier Craft uses original schematic preview art, letter icons, and localized social preview images. Official ArtCraft screenshots and icons are deliberately absent because their redistribution rights have not been verified. See [ASSETS.md](ASSETS.md). Font files under `web/fonts/` have their own OFL notices. Before adding any third-party artwork, record its exact source and redistribution license.

The app builds are fetched at runtime from upstream releases and retain their own licenses. The launcher does not modify the downloaded app code or provide document storage/sync. Android touch support depends on the individual app.

Source and project credits: [Federico Calicchia](https://calicchia.design) · [ArtCraft original projects](https://getartcraft.com/apps).

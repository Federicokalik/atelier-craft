# Atelier Homelab

An independent, self-hosted launcher for the official web builds of Craft creative apps. Open them from ChromeOS, Android or any modern desktop browser. Atelier checks upstream releases every 12 hours by default, verifies their published SHA-256 checksums and switches to a new version only after a valid download.

**Atelier is created by [Federico Calicchia](https://calicchia.design). It is not affiliated with, endorsed by or operated by the ArtCraft team.** The Craft apps, their names, code and rights belong to their respective owners. See the [original app catalogue](https://getartcraft.com/apps) and each upstream repository for their licenses and terms. Atelier's MIT license covers only its own launcher code. The repository contains no upstream app binaries or unlicensed screenshots/icons.

PhotoCraft is described by its authors as a [Photoshop alternative](https://github.com/storytold/photocraft); VectorCraft as an [Illustrator alternative](https://github.com/storytold/vectorcraft). These descriptions refer to the original apps, not a feature-equivalence promise by Atelier.

The catalogue also identifies each app's area of use through familiar products such as Adobe Premiere Pro, Lightroom Classic, Acrobat, After Effects, InDesign and Audition; Figma; Microsoft Word, PowerPoint and Excel; and Autodesk AutoCAD. These product names are comparison references only. They do not imply endorsement, affiliation or identical functionality, and web builds may differ from the features described on the original app pages.

## Quick start

```sh
git clone https://github.com/Federicokalik/atelier-homelab.git
cd atelier-homelab
cp .env.example .env
docker compose up -d
```

Open `http://SERVER-IP:8080`. The first download can take time: cards become available individually as verified web builds arrive. Change `HUB_PORT` in `.env` if needed. The web container serves static launcher files; the updater downloads official releases into the `app_data` Docker volume. The volume is not part of GitHub.

For access outside the LAN, put the service behind an **HTTPS reverse proxy** or tunnel. HTTPS is needed for some browser capabilities used by the apps. Do not expose Docker's plain HTTP port directly to the internet. With a proxy on the same host, bind the Compose port to localhost: `127.0.0.1:${HUB_PORT:-8080}:8080`.

## Languages and site files

The homepage is Italian at `/`. The other public routes are `/en/`, `/fr/`, `/nl-be/`, `/de/`, `/es/` and `/pt-pt/`. The launcher, app dock and update messages use the selected language; upstream app interfaces retain their own language options. Future app descriptions come from their upstream repository and may remain in its original language.

Edit translations and static SEO copy in `sitegen.py`, then run `python sitegen.py`. This regenerates the seven index pages, `web/i18n.js`, the app wrapper, `robots.txt` and `sitemap.xml`. Generated pages reference JavaScript and CSS with content-hash query versions so a CDN can fetch fresh files on release. If you use your own domain, change `BASE` in `sitegen.py` and regenerate before deploying. The public instance uses `https://atelier.federico.im`.

## Updates and future apps

`updater` checks official `storytold` GitHub releases every `UPDATE_INTERVAL_HOURS` (default 12). For an app, it requires a matching `*-web-*.zip` and `SHA256SUMS.txt`; it verifies SHA-256 and the extracted build before changing the current version. On failure, the previous version remains available. Use `docker compose exec updater python /srv/updater/update.py` for an immediate check.

Future-app discovery is enabled by default. It checks public `storytold` repositories whose names end in `craft`, then installs a new app only when a compatible, verifiable official web release exists. It cannot guarantee that every future ArtCraft app will provide such a release. Set `DISCOVER_FUTURE_APPS=false` to disable discovery. `GITHUB_TOKEN` is optional and can reduce anonymous API rate limits; use a read-only token and keep `.env` out of Git.

While a build is downloading or being verified, the relevant card shows a localized **update in progress, come back shortly** or **installation in progress** message. An already installed version remains usable while its replacement is prepared. The catalogue is written atomically and the launcher checks it every 15 seconds.

An open app stays on the exact version it loaded. The wrapper checks the catalogue every minute. If a newer version arrives, it offers **save your work, then update** or **use it next time**. Atelier cannot save documents on behalf of an upstream app. The draggable Atelier tab opens the return link and update notice; its position and favorites are stored in that browser.

## Assets, credits and boundaries

Atelier uses original schematic preview art and letter icons. Official ArtCraft screenshots and icons are deliberately absent because their redistribution rights have not been verified. See [ASSETS.md](ASSETS.md). Font files under `web/fonts/` have their own OFL notices. Before adding any third-party artwork, record its exact source and redistribution license.

The app builds are fetched at runtime from upstream releases and retain their own licenses. The launcher does not modify the downloaded app code or provide document storage/sync. Android touch support depends on the individual app.

Source and project credits: [Federico Calicchia](https://calicchia.design) · [ArtCraft original projects](https://getartcraft.com/apps).

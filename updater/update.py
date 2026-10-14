"""Mirror verified official ArtCraft web releases into a local static volume."""

import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.environ.get("DATA_DIR", "/srv/data"))
OWNER = "storytold"
KNOWN = [
    ("photocraft", "PhotoCraft", "Immagini", "Livelli, maschere e fotoritocco"),
    ("vectorcraft", "VectorCraft", "Vettoriale", "Illustrazione e tracciati"),
    ("filmcraft", "FilmCraft", "Video", "Montaggio video"),
    ("lightcraft", "LightCraft", "Fotografia", "Libreria e sviluppo RAW"),
    ("pdfcraft", "PdfCraft", "Documenti", "Lettura e modifica PDF"),
    ("effectcraft", "EffectCraft", "Motion", "Motion graphics ed effetti"),
    ("designcraft", "DesignCraft", "Layout", "Impaginazione e pubblicazione"),
    ("figcraft", "FigCraft", "Interfacce", "Design e prototipazione"),
    ("wordcraft", "WordCraft", "Scrittura", "Documenti di testo"),
    ("soundcraft", "SoundCraft", "Audio", "Registrazione e mixaggio"),
    ("deckcraft", "DeckCraft", "Presentazioni", "Slide e presentazioni"),
    ("cadcraft", "CADCraft", "Progettazione", "Disegno tecnico"),
    ("gridcraft", "GridCraft", "Dati", "Fogli di calcolo"),
]
MAX_ZIP_BYTES = 250 * 1024 * 1024
MAX_UNPACKED_BYTES = 700 * 1024 * 1024
TRANSLATION_TARGETS = {"it": "it", "fr": "fr", "nl-BE": "nl", "de": "de", "es": "es", "pt-PT": "pt"}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def request(url, *, json_result=False):
    headers = {"User-Agent": "craft-web-hub/0.1", "Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=35) as response:
        data = response.read()
    return json.loads(data) if json_result else data


def discover(previous=None):
    apps = {item[0]: item for item in KNOWN}
    if os.environ.get("DISCOVER_FUTURE_APPS", "true").lower() != "true":
        return list(apps.values())
    try:
        page = 1
        while page <= 5:
            repos = request(f"https://api.github.com/orgs/{OWNER}/repos?per_page=100&page={page}", json_result=True)
            for repo in repos:
                slug = repo.get("name", "").lower()
                if re.fullmatch(r"[a-z0-9-]*craft", slug) and slug != "artcraft" and slug not in apps and not repo.get("archived"):
                    name = repo["name"]
                    apps[slug] = (slug, name, "Nuova app", repo.get("description") or "Nuova app ArtCraft")
            if len(repos) < 100:
                break
            page += 1
    except (urllib.error.URLError, ValueError) as exc:
        print(f"Scoperta nuove app non disponibile: {exc}", flush=True)
        for slug, entry in (previous or {}).items():
            if slug not in apps and re.fullmatch(r"[a-z0-9-]*craft", slug):
                apps[slug] = (slug, entry.get("name", slug), entry.get("category", "Nuova app"), entry.get("description", "Nuova app ArtCraft"))
    return list(apps.values())


def load_catalog():
    path = ROOT / "catalog.json"
    try:
        return {app["slug"]: app for app in json.loads(path.read_text(encoding="utf-8"))["apps"]}
    except (OSError, ValueError, KeyError):
        return {}


def normalize_translation(source, translated, locale):
    if locale == "it" and re.search(r"\bRust\b", source):
        translated = re.sub(r"\bin pura ruggine\b", "interamente in Rust", translated, flags=re.IGNORECASE)
        translated = re.sub(r"\bruggine\b", "Rust", translated, flags=re.IGNORECASE)
    return translated


def localized_descriptions(description, previous):
    """Translate changed upstream copy once, keeping successful results across checks."""
    cached = previous.get("descriptions", {}) if previous.get("description") == description else {}
    translations = {key: normalize_translation(description, value.strip(), key) for key, value in cached.items() if key in TRANSLATION_TARGETS and isinstance(value, str) and value.strip()}
    url = os.environ.get("TRANSLATE_URL", "").strip()
    if not url or not description:
        return translations
    for locale, target in TRANSLATION_TARGETS.items():
        if locale in translations:
            continue
        payload = {"q": description, "source": "en", "target": target, "format": "text"}
        api_key = os.environ.get("TRANSLATE_API_KEY", "").strip()
        if api_key:
            payload["api_key"] = api_key
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json", "User-Agent": "atelier-craft/1"})
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                result = json.load(response)
            translated = result.get("translatedText")
            if isinstance(translated, str) and translated.strip():
                translations[locale] = normalize_translation(description, translated.strip(), locale)
        except (urllib.error.URLError, ValueError, OSError) as exc:
            print(f"Traduzione {locale} rinviata: {exc}", flush=True)
            break
    return translations


def save_catalog(apps):
    ROOT.mkdir(parents=True, exist_ok=True)
    payload = {"updatedAt": now(), "apps": apps}
    target = ROOT / "catalog.json"
    temporary = ROOT / "catalog.json.tmp"
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(target)


def web_asset(release, slug):
    pattern = re.compile(rf"^{re.escape(slug)}-web-.+\.zip$", re.IGNORECASE)
    return next((asset for asset in release.get("assets", []) if pattern.match(asset["name"])), None)


def expected_sha(release, filename):
    asset = next((a for a in release.get("assets", []) if a["name"] == "SHA256SUMS.txt"), None)
    if not asset:
        raise ValueError("SHA256SUMS.txt mancante")
    checksums = request(asset["browser_download_url"]).decode("utf-8")
    for line in checksums.splitlines():
        match = re.fullmatch(r"([0-9a-fA-F]{64})\s+\*?(.+)", line.strip())
        if match and match.group(2) == filename:
            return match.group(1).lower()
    raise ValueError(f"checksum mancante per {filename}")


def extract_safe(archive_bytes, destination):
    zip_path = destination.parent / "release.zip"
    zip_path.write_bytes(archive_bytes)
    with zipfile.ZipFile(zip_path) as archive:
        files = [x for x in archive.infolist() if not x.is_dir()]
        if sum(x.file_size for x in files) > MAX_UNPACKED_BYTES:
            raise ValueError("archivio decompresso troppo grande")
        parts = [Path(x.filename).parts for x in files]
        prefix = parts[0][0] if parts and all(p and p[0] == parts[0][0] for p in parts) else None
        if prefix and not any(len(p) == 1 for p in parts):
            parts = [p[1:] for p in parts]
        for info, path_parts in zip(files, parts):
            if not path_parts or any(p in ("..", "") for p in path_parts) or Path(info.filename).is_absolute() or "\\" in info.filename:
                raise ValueError("percorso non sicuro nell'archivio")
            mode = (info.external_attr >> 16) & 0o170000
            if mode == 0o120000:
                raise ValueError("symlink non consentito nell'archivio")
            target = destination.joinpath(*path_parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
    if not (destination / "index.html").is_file():
        raise ValueError("index.html mancante nella build web")


def install(slug, release, asset):
    version = release["tag_name"]
    if not re.fullmatch(r"v?[0-9][a-zA-Z0-9._-]*", version):
        raise ValueError("tag della release non valido")
    parent = ROOT / "apps" / slug
    parent.mkdir(parents=True, exist_ok=True)
    current = parent / "current"
    if current.is_symlink() and current.resolve().name == version:
        return version
    digest = expected_sha(release, asset["name"])
    data = request(asset["browser_download_url"])
    if len(data) > MAX_ZIP_BYTES:
        raise ValueError("archivio troppo grande")
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError("checksum SHA-256 non valido")
    version_dir = parent / version
    if not version_dir.is_dir():
        with tempfile.TemporaryDirectory(dir=parent) as temp:
            staging = Path(temp) / "site"
            staging.mkdir()
            extract_safe(data, staging)
            staging.rename(version_dir)
    link = parent / "next"
    link.unlink(missing_ok=True)
    link.symlink_to(version, target_is_directory=True)
    link.replace(current)
    return version


def update_once():
    prior = load_catalog()
    result = []
    for slug, name, category, description in discover(prior):
        entry = {
            "slug": slug, "name": name, "category": category, "description": description,
            "source": f"https://github.com/{OWNER}/{slug}", "version": prior.get(slug, {}).get("version"),
            "available": (ROOT / "apps" / slug / "current" / "index.html").is_file(),
            "status": "In attesa", "checkedAt": now(),
        }
        try:
            release = request(f"https://api.github.com/repos/{OWNER}/{slug}/releases/latest", json_result=True)
            asset = web_asset(release, slug)
            if asset:
                if release.get("tag_name") != entry["version"] or not entry["available"]:
                    progress_key = "updating" if entry["available"] else "installing"
                    entry[progress_key] = True
                    entry["status"] = "Aggiornamento in corso" if entry["available"] else "Installazione in corso"
                    save_catalog(result + [entry] + [prior[s] for s in prior if s not in {a["slug"] for a in result} and s != slug])
                entry["version"] = install(slug, release, asset)
                entry["available"] = True
                entry["status"] = "Pronta"
            else:
                entry["status"] = "Versione web non pubblicata"
        except urllib.error.HTTPError as exc:
            if exc.code in (403, 429):
                previous_status = prior.get(slug, {}).get("status")
                entry["status"] = previous_status if previous_status in ("Pronta", "Versione web non pubblicata", "In attesa") else "Pronta" if entry["available"] else "In attesa"
            else:
                entry["status"] = "Versione web non pubblicata" if exc.code == 404 and not entry["available"] else "Aggiornamento non riuscito" if entry["available"] else "Non disponibile"
            if exc.code != 404:
                entry["error"] = str(exc)[:180]
            print(f"{slug}: {exc}", flush=True)
        except (urllib.error.URLError, ValueError, OSError, zipfile.BadZipFile, KeyError) as exc:
            entry["status"] = "Aggiornamento non riuscito" if entry["available"] else "Non disponibile"
            entry["error"] = str(exc)[:180]
            print(f"{slug}: {exc}", flush=True)
        entry.pop("updating", None)
        entry.pop("installing", None)
        if slug not in {item[0] for item in KNOWN}:
            entry["descriptions"] = localized_descriptions(description, prior.get(slug, {}))
        result.append(entry)
        save_catalog(result + [prior[s] for s in prior if s not in {a["slug"] for a in result}])
        print(f"{slug}: {entry['status']} {entry['version'] or ''}", flush=True)
    save_catalog(result)


if __name__ == "__main__":
    if "--loop" not in sys.argv:
        update_once()
    else:
        while True:
            update_once()
            hours = max(1, float(os.environ.get("UPDATE_INTERVAL_HOURS", "12")))
            time.sleep(hours * 3600)

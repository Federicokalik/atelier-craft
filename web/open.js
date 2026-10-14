    const slug = new URLSearchParams(location.search).get('app') || '';
    const requestedLocale = new URLSearchParams(location.search).get('lang') || 'it';
    const localePaths = {it:'/',en:'/en/',fr:'/fr/','nl-BE':'/nl-be/',de:'/de/',es:'/es/','pt-PT':'/pt-pt/'};
    const locale = Object.hasOwn(localePaths, requestedLocale) ? requestedLocale : 'it';
    const copy = window.ATELIER_COPY?.[locale] || window.ATELIER_COPY?.it || {};
    const t = key => copy[key] || key;
    document.documentElement.lang = locale;
    document.querySelector('#update-title').textContent = t('update_available');
    document.querySelector('.update-notice p').textContent = t('update_help');
    document.querySelector('#update-now').textContent = t('update_now');
    document.querySelector('#update-later').textContent = t('update_later');
    document.querySelector('.panel-eyebrow').textContent = `ATELIER / ${t('app_open')}`;
    document.querySelector('.back').href = localePaths[locale];
    document.querySelector('.back').firstChild.textContent = `← ${t('back')} `;
    document.querySelector('#panel-update').textContent = `${t('update_available')} ↗`;
    document.querySelector('#source').textContent = t('original');
    document.querySelector('#dock-trigger').setAttribute('aria-label', t('dock_label'));
    const names = {photocraft:'PhotoCraft',vectorcraft:'VectorCraft',filmcraft:'FilmCraft',lightcraft:'LightCraft',pdfcraft:'PdfCraft',effectcraft:'EffectCraft',designcraft:'DesignCraft',figcraft:'FigCraft',wordcraft:'WordCraft',soundcraft:'SoundCraft',deckcraft:'DeckCraft',cadcraft:'CADCraft',gridcraft:'GridCraft'};
    const dock = document.getElementById('dock');
    const trigger = document.getElementById('dock-trigger');
    const frame = document.getElementById('app-frame');
    const notice = document.getElementById('update-notice');
    const panelUpdate = document.getElementById('panel-update');
    let activeVersion = null;
    let pendingVersion = null;
    let deferredVersion = null;
    let drag = null;
    let suppressClick = false;
    let checking = false;
    const setOpen = value => { dock.classList.toggle('open',value); trigger.setAttribute('aria-expanded',String(value)); };
    const versionPath = version => `/apps/${slug}/${encodeURIComponent(version)}/`;
    const validVersion = version => typeof version === 'string' && /^v?[0-9][a-zA-Z0-9._-]*$/.test(version);
    function showUpdate(version) {
      pendingVersion = version;
      dock.classList.add('has-update');
      panelUpdate.hidden = false;
      document.getElementById('update-title').textContent = t('update_for').replace('{name}', frame.title);
      if (deferredVersion !== version) notice.hidden = false;
    }
    async function checkVersion() {
      if (!/^[a-z0-9-]+$/.test(slug) || checking) return;
      checking = true;
      try {
        const response = await fetch('/catalog.json', {cache:'no-store'});
        if (!response.ok) throw new Error('Catalogo non disponibile');
        const catalog = await response.json();
        const app = catalog.apps?.find(item => item.slug === slug && item.available);
        const progress = document.getElementById('panel-progress');
        progress.hidden = !app?.updating;
        progress.textContent = app?.updating ? t('updating') : '';
        const progressNotice = document.getElementById('progress-notice');
        progressNotice.hidden = !app?.updating || !notice.hidden;
        progressNotice.textContent = app?.updating ? t('updating') : '';
        if (!app || !validVersion(app.version)) {
          if (!activeVersion && !frame.hasAttribute('src')) frame.src = `/apps/${slug}/current/`;
          return;
        }
        if (!activeVersion) {
          activeVersion = app.version;
          frame.src = versionPath(activeVersion);
        } else if (app.version !== activeVersion && app.version !== pendingVersion) {
          showUpdate(app.version);
        }
      } catch {
        if (!activeVersion && !frame.hasAttribute('src')) frame.src = `/apps/${slug}/current/`;
      } finally {
        checking = false;
      }
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      document.getElementById('app-name').textContent = t('invalid');
    } else {
      const name = names[slug] || slug.replace(/craft$/, 'Craft').replace(/^./, c => c.toUpperCase());
      document.title = `${name} — Atelier`;
      document.getElementById('app-name').textContent = name;
      document.getElementById('source').href = `https://github.com/storytold/${slug}`;
      frame.title = name;
      checkVersion();
      setInterval(checkVersion, 15_000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) checkVersion(); });
      window.addEventListener('focus', checkVersion);
      window.addEventListener('online', checkVersion);
    }
    document.getElementById('update-now').addEventListener('click', () => {
      if (!pendingVersion) return;
      activeVersion = pendingVersion;
      pendingVersion = null;
      deferredVersion = null;
      notice.hidden = true;
      panelUpdate.hidden = true;
      dock.classList.remove('has-update');
      setOpen(false);
      frame.src = versionPath(activeVersion);
    });
    document.getElementById('update-later').addEventListener('click', () => {
      deferredVersion = pendingVersion;
      notice.hidden = true;
    });
    panelUpdate.addEventListener('click', () => { notice.hidden = false; setOpen(false); panelUpdate.blur(); });
    trigger.addEventListener('click', event => {
      if (suppressClick) { suppressClick = false; event.preventDefault(); return; }
      const opening = !dock.classList.contains('open');
      setOpen(opening);
      if (!opening) trigger.blur();
    });
    dock.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') trigger.setAttribute('aria-expanded','true'); });
    dock.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse' && !dock.classList.contains('open')) trigger.setAttribute('aria-expanded','false'); });
    try {
      const stored = Number(localStorage.getItem('atelier:dock-bottom'));
      if (Number.isFinite(stored) && stored >= 8) dock.style.bottom = `${Math.min(stored, Math.max(8,innerHeight-220))}px`;
    } catch {}
    trigger.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      drag = {y:event.clientY,bottom:parseFloat(getComputedStyle(dock).bottom),moved:false};
      trigger.setPointerCapture(event.pointerId);
    });
    trigger.addEventListener('pointermove', event => {
      if (!drag) return;
      const delta = drag.y-event.clientY;
      if (Math.abs(delta)>6) drag.moved = true;
      if (drag.moved) dock.style.bottom = `${Math.max(8,Math.min(innerHeight-220,drag.bottom+delta))}px`;
    });
    trigger.addEventListener('pointerup', () => {
      if (!drag) return;
      if (drag.moved) {
        suppressClick = true;
        setOpen(false);
        trigger.blur();
        try { localStorage.setItem('atelier:dock-bottom',String(parseFloat(getComputedStyle(dock).bottom))); } catch {}
      }
      drag = null;
    });
    trigger.addEventListener('pointercancel', () => { drag = null; });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { setOpen(false); trigger.blur(); } });
    document.addEventListener('pointerdown', event => { if (!dock.contains(event.target)) setOpen(false); });

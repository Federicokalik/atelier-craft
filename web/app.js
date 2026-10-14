const known = [
  ['photocraft','PhotoCraft','cat_image'],['vectorcraft','VectorCraft','cat_vector'],
  ['filmcraft','FilmCraft','cat_video'],['lightcraft','LightCraft','cat_photo'],
  ['pdfcraft','PdfCraft','cat_docs'],['effectcraft','EffectCraft','cat_motion'],
  ['designcraft','DesignCraft','cat_layout'],['figcraft','FigCraft','cat_ui'],
  ['wordcraft','WordCraft','cat_text'],['soundcraft','SoundCraft','cat_audio'],
  ['deckcraft','DeckCraft','cat_slides'],['cadcraft','CADCraft','cat_cad'],
  ['gridcraft','GridCraft','cat_data']
];
const locale = document.body.dataset.locale || 'it';
const copy = window.ATELIER_COPY?.[locale] || window.ATELIER_COPY?.it || {};
const t = key => copy[key] || key;
const knownSlugs = new Set(known.map(item => item[0]));
const comparisons = {photocraft:'Adobe Photoshop',vectorcraft:'Adobe Illustrator',filmcraft:'Adobe Premiere Pro',lightcraft:'Adobe Lightroom Classic',pdfcraft:'Adobe Acrobat',effectcraft:'Adobe After Effects',designcraft:'Adobe InDesign',figcraft:'Figma',wordcraft:'Microsoft Word',soundcraft:'Adobe Audition',deckcraft:'Microsoft PowerPoint',cadcraft:'Autodesk AutoCAD',gridcraft:'Microsoft Excel'};
const accents = ['#78a9ff','#ff826a','#a786ff','#ffc36a','#93d0b5','#ef82bd','#a4d26f','#48dcb0','#9aa9ff','#71cbe8','#ff9c62','#6ad2dc','#a7d899'];
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const safeSlug = slug => typeof slug === 'string' && /^[a-z0-9-]+$/.test(slug) ? slug : '';
const appDescription = app => knownSlugs.has(app.slug) ? t(`desc_${app.slug}`) : app.descriptions?.[locale] || app.description || '';
let apps = known.map(([slug,name]) => ({slug,name,available:false}));
let activeFilter = 'all';
let updatedAt = null;
let seenVersions = null;
let refreshing = false;
const updateToast = document.createElement('aside');
updateToast.className = 'catalog-update-toast';
updateToast.setAttribute('role','status');
updateToast.setAttribute('aria-live','polite');
updateToast.hidden = true;
const updateMessage = document.createElement('span');
const dismissUpdate = document.createElement('button');
dismissUpdate.type = 'button';
dismissUpdate.textContent = t('dismiss');
dismissUpdate.addEventListener('click', () => { updateToast.hidden = true; });
updateToast.append(updateMessage, dismissUpdate);
document.body.append(updateToast);
let favorites;
try { favorites = new Set(JSON.parse(localStorage.getItem('atelier:favorites') || '[]')); }
catch { favorites = new Set(); }

function renderFilters() {
  const filters = [['all','all'],['favorites','favorites'],['install','install']];
  $('filters').innerHTML = filters.map(([id,key]) => `<button class="filter ${activeFilter === id ? 'active' : ''}" type="button" data-filter="${id}" aria-pressed="${activeFilter === id}">${escapeHtml(t(key))}</button>`).join('');
  $('filters').querySelectorAll('button').forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; render(); }));
}

function preview(app, index) {
  const cells = Array.from({length: 4}, (_, i) => `<i style="--h:${[64,38,78,52][(i + index) % 4]}%"></i>`).join('');
  return `<div class="shot-schematic" role="img" aria-label="${escapeHtml(t('preview'))} ${escapeHtml(app.name)}"><span class="schematic-word">${escapeHtml(app.name)}</span><span class="schematic-bands">${cells}</span><span class="schematic-caption">ATELIER CRAFT / ${String(index + 1).padStart(2,'0')}</span></div>`;
}

function promo() {
  return `<article class="promo-card"><span class="promo-index">+ / CRAFT APPS</span><h3>${escapeHtml(t('future_title'))}</h3><p>${escapeHtml(t('future_text'))}</p><ol><li>${escapeHtml(t('discover'))}</li><li>${escapeHtml(t('verify'))}</li><li>${escapeHtml(t('publish'))}</li></ol><div class="promo-host"><strong>${escapeHtml(t('host_title'))}</strong><p>${escapeHtml(t('host_text'))}</p><a href="https://github.com/Federicokalik/atelier-craft">${escapeHtml(t('github_cta'))}</a></div><small>${escapeHtml(t('disclaimer'))}</small></article>`;
}

function render() {
  renderFilters();
  const ready = apps.filter(app => app.available).length;
  $('header-count').textContent = `${ready} ${t('ready')}`;
  $('ready-count').innerHTML = `${ready}<span> / ${apps.length}</span>`;
  $('catalog-count').textContent = `${apps.length} ${t('tools')}`;
  if (updatedAt) {
    const date = new Date(updatedAt);
    $('last-updated').textContent = Number.isNaN(date.getTime()) ? t('catalog_updated') : `${t('updated')} ${new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome',timeZoneName:'short'}).format(date)}`;
  }
  const query = $('search').value.trim().toLocaleLowerCase(locale);
  const filtered = apps.filter(app => {
    if (activeFilter === 'favorites' && !favorites.has(app.slug)) return false;
    if (activeFilter === 'install' && app.available) return false;
    const knownItem = known.find(item => item[0] === app.slug);
    const category = knownItem ? t(knownItem[2]) : t('new_app');
    const description = appDescription(app);
    return `${app.name} ${category} ${description} ${comparisons[app.slug] || ''}`.toLocaleLowerCase(locale).includes(query);
  });
  $('empty').hidden = filtered.length > 0;
  $('empty').textContent = activeFilter === 'favorites' && !query ? t('fav_hint') : t('none');
  const cards = filtered.map(app => {
    const slug = safeSlug(app.slug);
    const number = apps.findIndex(item => item.slug === slug) + 1;
    const accent = accents[(number - 1) % accents.length];
    const isFavorite = favorites.has(slug);
    const knownItem = known.find(item => item[0] === slug);
    const category = knownItem ? t(knownItem[2]) : t('new_app');
    const description = appDescription(app);
    const comparison = comparisons[slug] ? `<span class="card-compare">${escapeHtml(t('similar_to'))} ${escapeHtml(comparisons[slug])}.</span>` : '';
    const progress = app.updating ? t('updating') : app.installing ? t('installing') : '';
    const unavailableKey = app.status === 'Versione web non pubblicata' ? 'web_unavailable' : app.status === 'Non disponibile' ? 'unavailable' : 'waiting';
    const href = app.available ? `/open.html?app=${slug}&lang=${encodeURIComponent(locale)}` : `https://github.com/storytold/${slug}`;
    const target = app.available ? '' : ' target="_blank" rel="noopener noreferrer"';
    const action = app.available ? t('open') : t('source');
    return `<article class="card" style="--card-accent:${accent}"><a class="card-link" href="${href}"${target} aria-label="${escapeHtml(action)}: ${escapeHtml(app.name)}"></a><div class="shot">${preview(app,number - 1)}<span class="card-number">${String(number).padStart(2,'0')} / ${String(apps.length).padStart(2,'0')}</span><span class="app-monogram" aria-hidden="true">${escapeHtml(app.name.slice(0,1))}</span><button class="favorite ${isFavorite ? 'selected' : ''}" type="button" data-favorite="${slug}" aria-label="${escapeHtml(t(isFavorite ? 'remove_fav' : 'add_fav'))} ${escapeHtml(app.name)} ${escapeHtml(t(isFavorite ? 'from_fav' : 'to_fav'))}" aria-pressed="${isFavorite}">${isFavorite ? '★' : '☆'}</button></div><div class="card-main"><span class="card-kicker">${escapeHtml(category)}</span><h3>${escapeHtml(app.name)}</h3><p class="card-desc">${escapeHtml(description)}</p>${comparison}</div><div class="card-footer"><span class="status ${progress ? 'progress' : app.available ? '' : 'unavailable'}">${progress ? `◌ ${escapeHtml(progress)}` : app.available ? `● ${escapeHtml(t('available'))} · ${escapeHtml(app.version || '')}` : escapeHtml(t(unavailableKey))}</span><span class="open-link ${app.available ? '' : 'unavailable'}" aria-hidden="true">${escapeHtml(action)}</span></div></article>`;
  }).join('');
  const showPromo = activeFilter === 'all' && !query;
  $('apps').innerHTML = cards + (showPromo ? promo() : '');
  if (showPromo) {
    const promoNode = $('apps').querySelector('.promo-card');
    [4,3,2].forEach(cols => promoNode.style.setProperty(`--span-${cols}`, String(cols - (filtered.length % cols) || cols)));
  }
  $('apps').querySelectorAll('[data-favorite]').forEach(button => button.addEventListener('click', () => {
    const slug = button.dataset.favorite;
    if (favorites.has(slug)) favorites.delete(slug); else favorites.add(slug);
    try { localStorage.setItem('atelier:favorites', JSON.stringify([...favorites])); } catch {}
    render();
  }));
}

async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    const response = await fetch('/catalog.json', {cache:'no-store'});
    if (!response.ok) throw new Error('Catalog unavailable');
    const catalog = await response.json();
    if (Array.isArray(catalog.apps)) {
      const changed = seenVersions ? catalog.apps.filter(app => app.available && app.version && seenVersions.has(app.slug) && seenVersions.get(app.slug) !== app.version) : [];
      seenVersions = new Map(catalog.apps.filter(app => app.available && app.version).map(app => [app.slug,app.version]));
      if (changed.length) {
        updateMessage.textContent = t('auto_updated').replace('{name}', changed.map(app => app.name).join(', '));
        updateToast.hidden = false;
      }
      const bySlug = new Map(catalog.apps.filter(app => safeSlug(app.slug)).map(app => [app.slug,app]));
      const merged = known.map(([slug,name]) => ({slug,name,...bySlug.get(slug)}));
      const extras = catalog.apps.filter(app => safeSlug(app.slug) && !knownSlugs.has(app.slug));
      apps = [...merged,...extras];
      updatedAt = catalog.updatedAt || null;
    }
  } catch {} finally { refreshing = false; }
  render();
}

$('search').addEventListener('input', render);
render();
refresh();
setInterval(refresh,15_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
window.addEventListener('focus', refresh);
window.addEventListener('online', refresh);

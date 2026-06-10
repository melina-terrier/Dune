import { parallaxe } from './parallaxe.js';


/* ============================================================
   1. UI CHROME — loader, menu, footer
   ============================================================ */

/* --- Loader (filet JS, doublé d'un filet CSS dans style.css) --- */
const loader = document.querySelector('#loader');
if (loader) {
  const fill = document.querySelector('#loader-fill');
  const hide = () => loader.classList.add('hidden');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion || !fill) {
    document.readyState === 'complete' ? hide() : addEventListener('load', hide);
  } else {
    fill.addEventListener('animationend', hide, { once: true });
    setTimeout(hide, 5000);
  }
}


/* --- Menu hamburger : toggle + Escape ferme + retour focus --- */
const menuToggle = document.querySelector('#menu-toggle');
const menu = document.querySelector('#menu');
if (menuToggle && menu) {
  const setOpen = (open) => {
    menuToggle.classList.toggle('active', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('active', open);
  };
  const isOpen = () => menuToggle.getAttribute('aria-expanded') === 'true';

  menuToggle.addEventListener('click', () => setOpen(!isOpen()));
  menu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => setOpen(false))
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      menuToggle.focus();
    }
  });
}


/* --- Année dynamique du footer --- */
const yearEl = document.querySelector('#copyright-year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());


/* ============================================================
   2. CARROUSELS — init générique
   ============================================================ */

function initCarousel(rootSel) {
  const root = document.querySelector(rootSel);
  if (!root) return;
  const slides = root.querySelectorAll('.slides > picture');
  const caption = root.querySelector('.caption');
  const total = slides.length;
  if (!total) return;
  if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '0');

  let i = 0;

  // Lazy : diffère le téléchargement des diapos non visibles. srcset/src déplacé
  // en data-* puis restauré à la demande (diapo affichée + ses voisines).
  slides.forEach((pic, idx) => {
    if (idx === 0) { pic.dataset.loaded = '1'; return; }
    pic.querySelectorAll('source[srcset]').forEach((s) => {
      s.dataset.srcset = s.getAttribute('srcset');
      s.removeAttribute('srcset');
    });
    const img = pic.querySelector('img');
    if (img) {
      if (img.getAttribute('srcset')) {
        img.dataset.srcset = img.getAttribute('srcset');
        img.removeAttribute('srcset');
      }
      img.dataset.src = img.getAttribute('src');
      img.removeAttribute('src');
    }
  });

  const loadSlide = (idx) => {
    const pic = slides[idx];
    if (!pic || pic.dataset.loaded) return;
    pic.dataset.loaded = '1';
    pic.querySelectorAll('source[data-srcset]').forEach((s) => {
      s.setAttribute('srcset', s.dataset.srcset);
      delete s.dataset.srcset;
    });
    const img = pic.querySelector('img[data-src]');
    if (img) {
      if (img.dataset.srcset) img.setAttribute('srcset', img.dataset.srcset);
      img.setAttribute('src', img.dataset.src);
      delete img.dataset.src;
      delete img.dataset.srcset;
    }
  };

  // Charge la diapo + ses deux voisines (clic suivant/précédent instantané).
  const preload = (idx) => {
    loadSlide(idx);
    loadSlide((idx + 1) % total);
    loadSlide((idx - 1 + total) % total);
  };

  const setCaption = (idx) => {
    if (!caption) return;
    const alt = slides[idx].querySelector('img')?.alt || '';
    const prefix = document.createElement('span');
    prefix.className = 'sr-only';
    prefix.textContent = `Image ${idx + 1} of ${total}${alt ? ': ' : ''}`;
    caption.replaceChildren(prefix, document.createTextNode(alt));
  };

  const show = (next) => {
    if (next === i) return;
    preload(next);
    slides[i].classList.remove('active');
    slides[i].inert = true;
    slides[next].classList.add('active');
    slides[next].inert = false;
    setCaption(next);
    i = next;
  };

  slides[0].classList.add('active');
  slides.forEach((s, idx) => { if (idx !== 0) s.inert = true; });
  setCaption(0);
  preload(0); // diapo active + voisines prêtes pour un premier clic instantané

  const goNext = () => show((i + 1) % total);
  const goPrev = () => show((i - 1 + total) % total);

  root.querySelector('.navigation > .next')?.addEventListener('click', goNext);
  root.querySelector('.navigation > .prev')?.addEventListener('click', goPrev);
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
  });
}

['#characters-carousel', '#videos-carousel'].forEach(initCarousel);


/* ============================================================
   3. YOUTUBE — façade « click-to-load » + PiP au scroll
   ============================================================ */

let player;
let pipThreshold = Infinity;
let pipThresholdDirty = false;
let ytApiPromise = null;

// Charge l'API YouTube à la demande (au clic), pas au chargement de la page :
// gros gain perf (pas de JS tiers ni de requête YouTube avant interaction).
function loadYouTubeApi() {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = resolve;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = reject;
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

function createPlayer() {
  player = new YT.Player('video', {
    height: '390',
    width: '640',
    videoId: '8g18jFHCLXk',
    host: 'https://www.youtube-nocookie.com',
    playerVars: {
      autoplay: 1, // le clic sur la façade fournit le geste utilisateur requis
      color: 'white',
      rel: 0,
      playsinline: 1,
      hl: 'en',
      cc_lang_pref: 'en',
    },
    events: { onReady: onPlayerReady, onStateChange: checkPip },
  });
}

// Façade (miniature + bouton play). Au clic : charge l'API puis crée le player.
const videoFacade = document.querySelector('#video-facade');
if (videoFacade) {
  let loading = false;
  videoFacade.addEventListener('click', async () => {
    if (loading) return;
    loading = true;
    videoFacade.disabled = true;
    try {
      await loadYouTubeApi();
      createPlayer();
      videoFacade.hidden = true;
    } catch {
      loading = false;
      videoFacade.disabled = false;
    }
  });
}

function onPlayerReady(event) {
  event.target.setVolume(50);
  const iframe = event.target.getIframe();
  if (iframe && !iframe.title) iframe.title = 'Dune — Official Trailer';
  recalcPipThreshold();
}

function recalcPipThreshold() {
  const video = document.querySelector('#video');
  if (!video) return;
  // En mode épinglé la vidéo est `position: fixed` et réduite : sa géométrie
  // ne reflète plus sa place naturelle. On diffère le recalcul jusqu'à la
  // sortie du mode PiP (cf. checkPip) pour ne pas figer un seuil faux.
  if (video.classList.contains('scroll')) { pipThresholdDirty = true; return; }
  const rect = video.getBoundingClientRect();
  pipThreshold = rect.top + scrollY + 0.75 * rect.height;
  pipThresholdDirty = false;
}

function checkPip() {
  const video = document.querySelector('#video');
  if (!video) return;
  const isPlaying = player?.getPlayerState?.() === 1;
  const pinned = scrollY > pipThreshold && isPlaying;
  video.classList.toggle('scroll', pinned);
  // Un resize survenu pendant l'épinglage a marqué le seuil « périmé » :
  // on le recalcule dès qu'on sort du mode PiP, géométrie redevenue fiable.
  if (!pinned && pipThresholdDirty) recalcPipThreshold();
}

recalcPipThreshold();
addEventListener('scroll', checkPip, { passive: true });
addEventListener('resize', recalcPipThreshold, { passive: true });


/* ============================================================
   4. MAP — Leaflet lazy + cinémas + géolocalisation
   ============================================================ */

let leafletPromise = null;
let map;
let cinemasLoaded = false;

/* MAINTENANCE — Leaflet & markercluster sont ÉPINGLÉS aux versions ci-dessous,
   avec SRI en dur. Pour bumper une version, régénérer CHAQUE hash, sinon le
   navigateur rejette la ressource (intégrité) et la carte ne se charge pas :
     curl -s <url> | openssl dgst -sha256 -binary | openssl base64 -A
   puis préfixer le résultat par "sha256-". */
function loadLeaflet() {
  if (leafletPromise) return leafletPromise;

  // CSS + JS chargés depuis unpkg avec SRI (vérif d'intégrité par hash SHA-256)
  [
    ['https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
     'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='],
    ['https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css',
     'sha256-YU3qCpj/P06tdPBJGPax0bm6Q1wltfwjsho5TR4+TYc='],
    ['https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css',
     'sha256-YSWCMtmNZNwqex4CEw1nQhvFub2lmU7vcCKP+XVwwXA='],
  ].forEach(([href, integrity]) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.integrity = integrity;
    link.crossOrigin = '';
    document.head.appendChild(link);
  });

  const loadJs = (src, integrity) => new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = src;
    tag.integrity = integrity;
    tag.crossOrigin = '';
    tag.onload = resolve;
    tag.onerror = reject;
    document.head.appendChild(tag);
  });

  leafletPromise = loadJs(
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
  ).then(() => loadJs(
    'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js',
    'sha256-Hk4dIpcqOSb0hZjgyvFOP+cEmDXUKKNE/tT542ZbNQg='
  ));
  return leafletPromise;
}

function initMap() {
  if (map) return;
  map = L.map('map', { center: [47.2608, 2.4189], zoom: 5, minZoom: 4, maxZoom: 19 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  }).addTo(map);
  L.control.scale().addTo(map);
}

// Popup en nœuds DOM (pas d'interpolation HTML → 0 XSS possible)
function buildCinemaPopup(p) {
  const div = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = p.NOM_ETABLISSEMENT || 'Cinema';
  div.append(
    name,
    document.createElement('br'),
    document.createTextNode(`${p.CODE_COMMUNE || ''}, ${p.COMMUNE || ''}`),
    document.createElement('br'),
    document.createTextNode(`Number of seats : ${p.FAUTEUILS ?? '—'}`)
  );
  return div;
}

// Rayon de la « zone » affichée autour de la position (cf. texte de la page).
const NEARBY_RADIUS_KM = 200;

function nearbyFeatures(geojson, center) {
  const features = geojson?.features || [];
  if (!center) return features;
  // Pré-filtre par boîte englobante : évite de matérialiser toute la France
  // (~2000 marqueurs) alors que seuls ceux « de ta région » sont pertinents.
  const dLat = NEARBY_RADIUS_KM / 111;
  const dLng = NEARBY_RADIUS_KM /
    (111 * Math.cos((center.latitude * Math.PI) / 180));
  return features.filter((f) => {
    const c = f.geometry?.coordinates; // [lng, lat]
    return c &&
      Math.abs(c[1] - center.latitude) <= dLat &&
      Math.abs(c[0] - center.longitude) <= dLng;
  });
}

function addCinemasLayer(geojson, center) {
  const feats = nearbyFeatures(geojson, center);
  const icon = L.icon({
    iconUrl: 'medias/logos/clapperboard.png',
    iconSize: [30, 30],
    iconAnchor: [16, 44],
    popupAnchor: [-3, -36],
  });
  const cluster = L.markerClusterGroup({
    maxClusterRadius: 50,
    showCoverageOnHover: false,
    spiderfyOnMaxZoom: true,
  });
  // Popup bindé par marqueur (sinon perdu en re-parentant vers le cluster)
  L.geoJSON(feats, {
    pointToLayer: (feature, latlng) => {
      const p = feature.properties || {};
      return L.marker(latlng, {
        icon,
        alt: p.NOM_ETABLISSEMENT || 'Cinema',
        keyboard: true,
      }).bindPopup(buildCinemaPopup(p));
    },
  }).eachLayer((layer) => cluster.addLayer(layer));
  map.addLayer(cluster);
  return feats.length;
}

/* --- Géolocalisation --- */
const coordinatesEl = document.querySelector('#coordinates');
const setCoords = (text) => {
  if (coordinatesEl) coordinatesEl.textContent = text;
};

// Codes garantis par la spec : 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
const LOCATION_ERRORS = {
  1: 'You have not allowed geolocation.',
  2: 'Your position could not be determined.',
  3: 'Geolocation is taking too long...',
};

function onLocationSuccess({ coords }) {
  const coordsText =
    `Latitude: ${coords.latitude.toFixed(3)}°, longitude: ${coords.longitude.toFixed(3)}°`;
  setCoords(coordsText);
  map.setZoom(10);
  map.panTo([coords.latitude, coords.longitude]);

  const userIcon = L.divIcon({
    className: 'user-location-marker',
    html: '<span aria-label="Your current location" role="img"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  L.marker([coords.latitude, coords.longitude], {
    icon: userIcon,
    title: 'Your location',
    alt: 'Your current location',
    keyboard: true,
  }).addTo(map);

  if (cinemasLoaded) return;
  cinemasLoaded = true;
  fetch('medias/cinema.json')
    .then((r) => r.json())
    .then((geojson) => {
      const count = addCinemasLayer(geojson, coords);
      if (!count) {
        setCoords(`${coordsText} — No cinemas found within ${NEARBY_RADIUS_KM} km.`);
      }
    })
    .catch(() => {
      cinemasLoaded = false;
      setCoords('Could not load nearby cinemas.');
    });
}

const onLocationError = (error) =>
  setCoords(LOCATION_ERRORS[error.code] || 'An unexpected error occurred.');

/* --- Bouton "Find a theater" --- */
const locateBtn = document.querySelector('#locate');
if (locateBtn) {
  locateBtn.addEventListener('click', async () => {
    if (!('geolocation' in navigator)) {
      setCoords('Geolocation is not supported by your browser.');
      return;
    }
    const originalText = locateBtn.textContent;
    const restore = () => {
      locateBtn.disabled = false;
      locateBtn.textContent = originalText;
    };
    locateBtn.disabled = true;
    locateBtn.textContent = 'Locating…';

    try {
      await loadLeaflet();
      initMap();
    } catch {
      restore();
      setCoords('Map could not be loaded.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { restore(); onLocationSuccess(pos); },
      (err) => { restore(); onLocationError(err); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  });
}

/* --- Pré-charge Leaflet quand #theaters approche du viewport --- */
const theatersSection = document.querySelector('#theaters');
if (theatersSection) {
  const obs = new IntersectionObserver(
    (entries, o) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadLeaflet().then(initMap)
          .catch((e) => console.warn('Leaflet preload failed:', e));
        o.disconnect();
      }
    },
    { rootMargin: '300px' }
  );
  obs.observe(theatersSection);
}


/* ============================================================
   5. FONDS DE SECTION — lazy-load via data-bg
   ============================================================ */

{
  const sections = document.querySelectorAll('section[data-bg]');
  const loadBg = (el) => {
    const url = el.dataset.bg;
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      el.style.backgroundImage = `url("${url}")`;
      el.removeAttribute('data-bg');
    };
    img.src = url;
  };

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          loadBg(e.target);
          obs.unobserve(e.target);
        }
      });
    },
    { rootMargin: '400px' }
  );
  sections.forEach((s) => obs.observe(s));
}


/* ============================================================
   6. PARALLAX — application aux 5 sections
   ============================================================ */

['#home', '#about', '#characters', '#videos', '#theaters'].forEach((sel) => {
  const el = document.querySelector(sel);
  if (el) parallaxe(el, 0.5);
});

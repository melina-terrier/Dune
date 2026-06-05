# Dune — Projet pédagogique d'intégration web

Site fan statique pour _Dune_ (2021) de Denis Villeneuve, réalisé dans le cadre d'un cursus d'intégration web.

**Démo** : [dune.melinaterrier.fr](https://dune.melinaterrier.fr)

---

## 4 fonctionnalités du cours

- **YouTube** + Picture-in-Picture déclenché au scroll
- **Leaflet** + géolocalisation opt-in + cinémas français (dataset CNC, clustering)
- **Parallaxe** sur les fonds de section
- **Carrousels** clavier-friendly (← / →)

---

## Stack

HTML5 sémantique · CSS (custom properties, `scroll-snap`, `100svh`) · JavaScript **vanilla en ES Modules**

Points notables :

- **Performances** : AVIF + WebP responsive, polices auto-hébergées WOFF2, lazy-load Leaflet
- **Accessibilité** : WCAG 2.5.5, ARIA landmarks, `inert` sur slides inactives, focus management, `prefers-reduced-motion`
- **Sécurité** : CSP stricte, popups Leaflet en DOM nodes (zéro XSS), embed `youtube-nocookie`

---

## Lancer en local

```bash
docker compose up
```

Puis ouvrir [http://localhost:8082](http://localhost:8082).

---

## Mentions légales

Projet pédagogique étudiant indépendant — **non affilié à Warner Bros. ni Legendary Pictures**.
Matériel visuel utilisé sous fair use / courte citation (art. L122-5 CPI).
Détails dans [`legal.html`](legal.html).

---

**Mélina Terrier** — [melinaterrier.fr](https://www.melinaterrier.fr)

// ---------------------------------------------------------------------------
// sw.js — service worker minimal, pour que l'application s'ouvre sans réseau.
//
// Stratégie « réseau d'abord » : on tente toujours la version en ligne, et on
// ne se rabat sur la copie locale qu'en cas d'échec. Conséquence importante :
// une mise à jour publiée sur GitHub Pages est prise en compte dès la première
// ouverture avec du réseau, sans avoir à vider quoi que ce soit.
// ---------------------------------------------------------------------------

const CACHE = 'liste-v1';

const FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/dates.js',
  './js/parser.js',
  './js/defaults.js',
  './js/store.js',
  './js/model.js',
  './js/ui-commun.js',
  './js/graphique.js',
  './js/ui-liste.js',
  './js/ui-detail.js',
  './js/ui-progression.js',
  './js/ui-editeur.js',
  './js/ui-regles.js',
];

self.addEventListener('install', (e) => {
  // addAll échouerait entièrement si un seul fichier manquait : on met en
  // cache fichier par fichier pour rester tolérant.
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.all(FICHIERS.map((f) => c.add(f).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((reponse) => {
        // On garde une copie fraîche pour la prochaine coupure de réseau.
        const copie = reponse.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copie)).catch(() => {});
        return reponse;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});

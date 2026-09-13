// ---------------------------------------------------------------------------
// ui-graphique.js — les commandes du graphique, partagées par trois endroits.
//
// Le graphique vit sur l'écran Progression en petit, sur l'écran Détail en
// grand avec ses commandes, et en plein écran quand on l'agrandit. La fenêtre
// de temps et la mesure choisies sont les mêmes partout et sont conservées
// d'une ouverture à l'autre : elles sont dans l'état, pas dans l'écran.
//
// Les menus sont des <select> ordinaires. Sur iPhone ils ouvrent le sélecteur
// natif, qui se manipule mieux au pouce que n'importe quel menu déroulant
// qu'on écrirait soi-même — et qui ne coûte pas une ligne de JavaScript.
// ---------------------------------------------------------------------------

import { $, el, vider } from './ui-commun.js';
import { serieJours, moyenneSerie } from './model.js';
import { dessinerGraphique, graphiqueDisponible } from './graphique.js';
import { PERIODES_GRAPHIQUE, MESURES_GRAPHIQUE } from './store.js';

let api = null;

// Une période « depuis le début » vaut null dans l'état ; un <select> ne
// connaît que des chaînes. On traduit dans les deux sens en un seul endroit.
const TOUT = 'tout';
const versValeur = (j) => (j === null ? TOUT : String(j));
const versJours = (v) => (v === TOUT ? null : Number(v));

export function initGraphique(a) {
  api = a;

  remplir($('#graph-periode'), PERIODES_GRAPHIQUE.map(
    (p) => [versValeur(p.jours), p.libelle]));
  remplir($('#plein-periode'), PERIODES_GRAPHIQUE.map(
    (p) => [versValeur(p.jours), p.libelle]));
  remplir($('#graph-mesure'), MESURES_GRAPHIQUE.map((m) => [m.cle, m.libelle]));
  remplir($('#plein-mesure'), MESURES_GRAPHIQUE.map((m) => [m.cle, m.libelle]));

  for (const sel of ['#graph-periode', '#plein-periode']) {
    $(sel).addEventListener('change', (e) => choisir({ jours: versJours(e.target.value) }));
  }
  for (const sel of ['#graph-mesure', '#plein-mesure']) {
    $(sel).addEventListener('change', (e) => choisir({ mesure: e.target.value }));
  }

  $('#graph-agrandir').addEventListener('click', ouvrirPlein);
  $('#graph-fermer').addEventListener('click', fermerPlein);

  // En plein écran, on regarde le graphique en tournant le téléphone. Chart.js
  // se redimensionne tout seul, mais la toile a pu être mesurée pendant la
  // rotation : on la redessine une fois celle-ci terminée.
  window.addEventListener('orientationchange', () => setTimeout(redessinerPlein, 250));
  window.addEventListener('resize', redessinerPlein);
}

function remplir(select, paires) {
  vider(select);
  for (const [valeur, libelle] of paires) {
    select.append(el('option', { value: valeur, text: libelle }));
  }
}

/** Change ce que montre le graphique, et le redessine partout. */
function choisir(champs) {
  Object.assign(api.etat.graphique, champs);
  api.sauver();
  api.rafraichir();
}

// --- Ce qui se dit au-dessus du graphique -----------------------------------

function titre(mesure) {
  return mesure === 'rates' ? 'Ratés par jour' : 'Taux de réussite';
}

/** « 4,2 » plutôt que « 4.2 » : on écrit en français. */
function nombre(x, decimales = 1) {
  return x.toFixed(decimales).replace('.', ',');
}

function libelleMoyenne(moy, mesure) {
  if (!moy.jours) return { valeur: '—', detail: 'pas encore de journée close' };
  const jours = `sur ${moy.jours} jour${moy.jours > 1 ? 's' : ''}`;
  return mesure === 'rates'
    ? { valeur: nombre(moy.rates), detail: `ratés par jour, ${jours}` }
    : { valeur: `${Math.round(moy.taux * 100)} %`, detail: `de réussite, ${jours}` };
}

// --- Le rendu ----------------------------------------------------------------

/**
 * Dessine le graphique de l'écran Détail, ses commandes et sa moyenne.
 * Redessine aussi le plein écran s'il est ouvert.
 */
export function rendreGraphiqueDetail(etat, jour) {
  const g = etat.graphique;
  const serie = serieJours(etat, jour, g.jours);
  const moy = libelleMoyenne(moyenneSerie(serie), g.mesure);

  $('#graph-periode').value = versValeur(g.jours);
  $('#graph-mesure').value = g.mesure;
  $('#titre-graph').textContent = titre(g.mesure);
  $('#moyenne-valeur').textContent = moy.valeur;
  $('#moyenne-detail').textContent = moy.detail;

  const toile = $('#graph-detail');
  const secours = $('#detail-secours');
  secours.hidden = graphiqueDisponible();
  toile.hidden = !graphiqueDisponible();
  dessinerGraphique(toile, serie, { mesure: g.mesure, cible: 6 });

  if (!$('#overlay-graph').hidden) rendrePlein(etat, jour);
}

/** Le petit graphique de l'écran Progression : même fenêtre, sans commandes. */
export function rendrePetitGraphique(etat, jour) {
  const g = etat.graphique;
  const secours = $('#graph-secours');
  const toile = $('#graph-30');
  $('#titre-graph-30').textContent = titre(g.mesure);
  if (!graphiqueDisponible()) {
    secours.hidden = false;
    toile.hidden = true;
    return;
  }
  secours.hidden = true;
  toile.hidden = false;
  // Moins d'étiquettes qu'en grand : la toile fait la moitié de la hauteur et
  // le tiers de l'attention.
  dessinerGraphique(toile, serieJours(etat, jour, g.jours), { mesure: g.mesure, cible: 4 });
}

// --- Le plein écran ----------------------------------------------------------

function rendrePlein(etat, jour) {
  const g = etat.graphique;
  const serie = serieJours(etat, jour, g.jours);
  const moy = libelleMoyenne(moyenneSerie(serie), g.mesure);

  $('#plein-periode').value = versValeur(g.jours);
  $('#plein-mesure').value = g.mesure;
  $('#titre-plein').textContent = titre(g.mesure);
  $('#moyenne-plein').textContent = moy.valeur === '—' ? '' : `${moy.valeur} · ${moy.detail}`;
  // En paysage l'écran est large et bas : on peut étiqueter beaucoup plus de
  // dates qu'en portrait.
  const paysage = window.innerWidth > window.innerHeight;
  dessinerGraphique($('#graph-plein'), serie, { mesure: g.mesure, cible: paysage ? 12 : 7 });
}

function ouvrirPlein() {
  $('#overlay-graph').hidden = false;
  // La toile vient d'apparaître : elle n'avait aucune dimension jusqu'ici.
  // On attend le premier rendu du navigateur avant de la mesurer.
  requestAnimationFrame(() => api.rafraichir());
}

function fermerPlein() { $('#overlay-graph').hidden = true; }

function redessinerPlein() {
  if ($('#overlay-graph') && !$('#overlay-graph').hidden) api.rafraichir();
}

/** Vrai si le plein écran est ouvert — app.js le referme au changement de jour. */
export function pleinEcranOuvert() {
  const o = $('#overlay-graph');
  return Boolean(o) && !o.hidden;
}

export { fermerPlein };

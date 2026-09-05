// ---------------------------------------------------------------------------
// ui-liste.js — l'écran d'accueil.
//
// Contrainte de design prioritaire : toutes les habitudes du jour tiennent sur
// un seul écran, sans défilement, et remplissent cet écran. Les lignes sont
// donc élastiques : elles se partagent exactement la hauteur disponible.
//
// Le calibrage est automatique. On mesure la hauteur réellement disponible,
// on la divise par le nombre de lignes (celles qui portent une information
// secondaire comptent un peu plus), et on publie le résultat dans la variable
// CSS --h-ligne. Les tailles de texte, la pastille et le compteur en
// découlent : 12 habitudes donnent de grandes lignes confortables, 30 des
// lignes serrées, sans jamais déborder ni laisser de vide.
//
// Les nœuds ne sont recréés que si la composition de la liste change ; sinon
// on met à jour sur place, ce qui laisse les animations se dérouler.
// ---------------------------------------------------------------------------

import { $, el, vider } from './ui-commun.js';
import { ratesDeLaSemaine, formatLitres } from './model.js';

const DUREE_APPUI_LONG = 420; // ms

// Hauteur de la barre d'état des iPhone à encoche, réservée quand iOS ne la
// déclare pas lui-même.
const HAUTEUR_BARRE = 47;

// Une ligne avec note occupe une fois et demie la hauteur d'une ligne simple.
const FACTEUR_NOTE = 1.5;

let zone;           // #lignes
let signature = ''; // composition actuelle de la liste affichée
let api = null;

export function initListe(a) {
  api = a;
  zone = $('#lignes');

  // Gestion du tap court / tap long, en délégation sur le conteneur.
  let presse = null;
  const annuler = () => { if (presse) { clearTimeout(presse.minuteur); presse = null; } };

  zone.addEventListener('pointerdown', (e) => {
    const noeud = e.target.closest('.ligne');
    if (!noeud) return;
    // Taper le compteur (« 1¾/3 ») retire une unité au lieu d'en ajouter une.
    // C'est le moyen de décocher l'eau, les prises et le grease the groove,
    // sans ajouter le moindre bouton : le compteur devient le bouton.
    const surCompteur = Boolean(e.target.closest('.cpt'));
    presse = { noeud, nom: noeud.dataset.nom, long: false, surCompteur,
               x: e.clientX, y: e.clientY };
    presse.minuteur = setTimeout(() => {
      if (!presse) return;
      presse.long = true;
      api.retirerUn(presse.nom);
    }, DUREE_APPUI_LONG);
  });

  zone.addEventListener('pointermove', (e) => {
    if (!presse) return;
    // Un glissement de plus de 12 px n'est plus un tap.
    if (Math.hypot(e.clientX - presse.x, e.clientY - presse.y) > 12) annuler();
  });

  zone.addEventListener('pointerup', () => {
    if (!presse) return;
    clearTimeout(presse.minuteur);
    if (!presse.long) {
      if (presse.surCompteur) api.retirerUn(presse.nom);
      else api.tap(presse.nom);
    }
    presse = null;
  });

  zone.addEventListener('pointercancel', annuler);
  // Empêche le menu contextuel iOS pendant l'appui long.
  zone.addEventListener('contextmenu', (e) => e.preventDefault());

  // La hauteur disponible peut changer après coup : rotation, barre d'adresse
  // qui apparaît, hauteur d'écran connue tardivement au premier affichage.
  // Un observateur recalibre à chaque fois que la zone change de taille, ce
  // qui évite de garder des tailles de texte calculées sur une hauteur
  // provisoire — et donc une liste au texte trop petit pour ses lignes.
  // On observe l'écran, pas la liste : calibrer() fixe la hauteur de la liste,
  // l'observer elle-même bouclerait indéfiniment. L'écran, lui, a toujours la
  // taille de la fenêtre.
  if (window.ResizeObserver) new ResizeObserver(calibrer).observe($('#ecran-liste'));
  window.addEventListener('resize', calibrer);
  window.addEventListener('orientationchange', () => setTimeout(calibrer, 150));
  window.addEventListener('load', calibrer);
}

export function rendreListe(etat, jour) {
  document.body.classList.toggle('repos', jour.repos);

  if (jour.repos) {
    const r = ratesDeLaSemaine(etat, jour.date);
    $('#repos-detail').textContent =
      r === 0 ? 'Aucun raté du lundi au samedi.'
              : `${r} raté${r > 1 ? 's' : ''} du lundi au samedi, sous le seuil de 3.`;
    vider(zone);
    signature = 'repos';
    return;
  }

  // Une signature qui change signifie que la composition de la liste a bougé
  // (habitude ajoutée, retirée, protocole lancé, quota modifié) : on rebâtit.
  const sig = jour.visibles.map((l) => `${l.nom}|${l.type}|${l.max}`).join('~');
  if (sig !== signature) {
    signature = sig;
    vider(zone);
    for (const ligne of jour.visibles) zone.append(creerLigne(ligne));
  }

  for (const ligne of jour.visibles) {
    const noeud = zone.querySelector(`[data-nom="${cssEchappe(ligne.nom)}"]`);
    if (noeud) majLigne(noeud, ligne, jour);
  }

  calibrer();
}

/** Vrai si la page tourne en application ajoutée à l'écran d'accueil. */
function enApplication() {
  return window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Détermine la place réellement disponible, et cesse de faire confiance à
 * env(safe-area-inset-*).
 *
 * En application ajoutée, iOS pose un bandeau translucide en haut de l'écran,
 * mais ne déclare pas toujours la zone sûre correspondante : env() peut
 * renvoyer zéro, et les premières habitudes passent alors sous le bandeau.
 * On réserve donc nous-même la hauteur d'une barre d'état quand env() se tait.
 *
 * En bas, rien à réserver : la liste descend jusqu'au bord de l'écran.
 */
function ajusterZonesSures() {
  const racine = document.documentElement;
  const declare = parseFloat(getComputedStyle(racine).getPropertyValue('--haut')) || 0;
  let haut = declare;

  if (enApplication()) {
    // En application ajoutée, la barre d'état d'iOS recouvre toujours le haut
    // de la page. env() devrait le déclarer, mais se tait souvent : on réserve
    // alors la hauteur nous-même.
    //
    // Une tentative précédente comparait la hauteur de l'écran à celle de la
    // fenêtre pour deviner si la barre recouvrait la page. C'était faux : cette
    // différence vient tout aussi bien de la zone du bas, et des habitudes se
    // retrouvaient inaccessibles sous le bandeau. Mieux vaut réserver quelques
    // points de trop que rendre une ligne impossible à cocher.
    haut = Math.max(declare, window.innerHeight >= 750 ? HAUTEUR_BARRE : 22);
  }

  racine.style.setProperty('--haut', `${haut}px`);
  return haut;
}

/**
 * Fixe la hauteur de la liste et publie la hauteur d'une ligne dans --h-ligne.
 *
 * La hauteur vient de window.innerHeight, la seule mesure fiable de ce qui est
 * réellement visible — et non d'un calcul en dvh moins des zones sûres qui
 * peuvent être mal déclarées. Toutes les tailles de l'écran Liste découlent
 * ensuite de --h-ligne : la liste remplit l'écran quel que soit le nombre
 * d'habitudes du jour.
 */
function calibrer() {
  const haut = ajusterZonesSures();
  const respire = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--respire')) || 0;
  const hauteur = Math.max(120, window.innerHeight - haut - respire);
  zone.style.height = `${hauteur}px`;

  const lignes = zone.children;
  if (!lignes.length) return;
  let unites = 0;
  for (const l of lignes) unites += l.classList.contains('avec-note') ? FACTEUR_NOTE : 1;
  zone.style.setProperty('--h-ligne', `${(hauteur / unites).toFixed(2)}px`);
}

/** Échappe un nom d'habitude pour l'utiliser dans un sélecteur CSS. */
function cssEchappe(s) {
  return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&');
}

// Le trait de la coche, tracé à main levée. pathLength="100" normalise sa
// longueur : le décalage du pointillé vaut alors directement un pourcentage,
// ce qui permet de dessiner le trait petit à petit.
const TRACE = 'M3.5 13.8 C5.9 15.3 7.7 17.7 9.1 20.5 C12.3 12.6 16.1 7.1 22.1 3.3';
const SVG_NS = 'http://www.w3.org/2000/svg';

function chemin(classe) {
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('class', classe);
  p.setAttribute('d', TRACE);
  p.setAttribute('pathLength', '100');
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke-width', '2.7');
  p.setAttribute('stroke-linecap', 'round');
  return p;
}

function creerCoche() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'coche');
  svg.setAttribute('viewBox', '0 0 26 26');
  const fantome = chemin('fantome');
  const trait = chemin('trait');
  trait.setAttribute('stroke-dasharray', '100');
  trait.setAttribute('stroke-dashoffset', '100');
  svg.append(fantome, trait);
  return svg;
}

function creerLigne(ligne) {
  const marque = el('span', { class: 'marque' }, [creerCoche()]);
  const nom = el('span', { class: 'nom', text: ligne.nom });
  const note = el('span', { class: 'note' });
  const txt = el('span', { class: 'txt' }, [nom, note]);
  const cpt = el('span', { class: 'cpt' });
  return el('button', { class: 'ligne', 'data-nom': ligne.nom, type: 'button' }, [marque, txt, cpt]);
}

/**
 * Texte du compteur. Il s'affiche pour toutes les lignes qui en sont
 * vraiment un — même quand le maximum vaut 1, par exemple les jours de stade
 * où le quota de grease the groove tombe à une seule série. C'est
 * l'information la plus importante de ces lignes, elle ne disparaît jamais.
 */
function texteCompteur(ligne) {
  if (ligne.type === 'case') return '';
  const v = Math.min(ligne.valeur, ligne.max);
  if (ligne.type === 'eau') return `${formatLitres(v)}/${formatLitres(ligne.max)} L`;
  return `${v}/${ligne.max}`;
}

function majLigne(noeud, ligne, jour) {
  const etaitFaite = noeud.dataset.faite === '1';
  noeud.dataset.faite = ligne.faite ? '1' : '0';
  noeud.classList.toggle('faite', ligne.faite);

  // La coche se dessine à mesure : un douzième de trait par quart de litre.
  // Elle n'est entière qu'une fois la ligne faite.
  const part = ligne.max > 0 ? Math.min(ligne.valeur / ligne.max, 1) : 0;
  const trait = noeud.querySelector('.coche .trait');
  trait.setAttribute('stroke-dashoffset', (100 - part * 100).toFixed(1));
  // À longueur nulle, un bout de trait arrondi laisse malgré tout un point
  // sur le papier : on efface le trait tant que rien n'est commencé.
  trait.style.display = part > 0 ? '' : 'none';
  // Le trait fantôme montre où la plume ira. Il ne concerne que les lignes qui
  // se cochent en plusieurs fois : une habitude ordinaire pas encore faite
  // laisse la marge vide, comme dans un cahier.
  noeud.querySelector('.coche .fantome').style.display =
    ligne.type !== 'case' && !ligne.faite ? '' : 'none';

  const note = noeud.querySelector('.note');
  note.textContent = ligne.note;
  noeud.classList.toggle('avec-note', Boolean(ligne.note));

  const cpt = noeud.querySelector('.cpt');
  cpt.textContent = texteCompteur(ligne);
  // Quota GTG bâti sur des heures non confirmées : petit point d'avertissement.
  cpt.classList.toggle('doute', ligne.type === 'gtg' && !jour.heures.confirmee);

  // Éclat bref au moment où la ligne devient faite (jamais au décochage).
  if (ligne.faite && !etaitFaite) {
    noeud.classList.remove('eclat');
    void noeud.offsetWidth; // force le redémarrage de l'animation
    noeud.classList.add('eclat');
    setTimeout(() => noeud.classList.remove('eclat'), 340);
  }
}

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
  if (window.ResizeObserver) new ResizeObserver(calibrer).observe(zone);
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

/**
 * Publie la hauteur d'une ligne dans --h-ligne. Toutes les tailles de l'écran
 * Liste en dépendent : la liste remplit l'écran quel que soit son nombre
 * d'habitudes.
 */
function calibrer() {
  const lignes = zone.children;
  const dispo = zone.clientHeight;
  if (!lignes.length || !dispo) return;
  let unites = 0;
  for (const l of lignes) unites += l.classList.contains('avec-note') ? FACTEUR_NOTE : 1;
  zone.style.setProperty('--h-ligne', `${(dispo / unites).toFixed(2)}px`);
}

/** Échappe un nom d'habitude pour l'utiliser dans un sélecteur CSS. */
function cssEchappe(s) {
  return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&');
}

function creerLigne(ligne) {
  const puce = el('span', { class: 'puce' }, [el('i')]);
  const nom = el('span', { class: 'nom', text: ligne.nom });
  const note = el('span', { class: 'note' });
  const txt = el('span', { class: 'txt' }, [nom, note]);
  const cpt = el('span', { class: 'cpt' });
  return el('button', { class: 'ligne', 'data-nom': ligne.nom, type: 'button' }, [puce, txt, cpt]);
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

  // Le pavé intérieur suit l'avancement du compteur : on voit d'un coup d'œil
  // qu'il reste un quart de litre à boire.
  const part = ligne.max > 0 ? Math.min(ligne.valeur / ligne.max, 1) : 0;
  noeud.querySelector('.puce i').style.transform = `scale(${part.toFixed(3)})`;

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

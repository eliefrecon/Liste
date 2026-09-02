// ---------------------------------------------------------------------------
// ui-liste.js — l'écran d'accueil.
//
// Contrainte de design prioritaire : toutes les habitudes du jour tiennent sur
// un seul écran, sans défilement. Les lignes sont donc élastiques : elles se
// partagent la hauteur disponible. Une ligne qui porte une information
// secondaire (« OpenClassrooms », les exercices du jour…) reçoit un peu plus
// de place que les autres, sans que le total dépasse jamais l'écran.
//
// Les nœuds ne sont recréés que si la composition de la liste change ; sinon
// on met à jour sur place, ce qui laisse les animations se dérouler.
// ---------------------------------------------------------------------------

import { $, el, vider } from './ui-commun.js';
import { ratesDeLaSemaine } from './model.js';

const DUREE_APPUI_LONG = 420; // ms

let zone;          // #lignes
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
    // Taper le compteur (« 2/3 ») retire une unité au lieu d'en ajouter une.
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

  // Garde-fou : si la liste devient si longue qu'elle déborde malgré tout,
  // on resserre encore. Aucune ligne ne doit être coupée en bas de l'écran.
  zone.classList.remove('tres-dense');
  if (zone.scrollHeight > zone.clientHeight + 1) zone.classList.add('tres-dense');
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

function majLigne(noeud, ligne, jour) {
  const etaitFaite = noeud.dataset.faite === '1';
  noeud.dataset.faite = ligne.faite ? '1' : '0';
  noeud.classList.toggle('faite', ligne.faite);

  // Le disque intérieur suit l'avancement du compteur : on voit d'un coup
  // d'œil qu'il reste un verre d'eau à boire.
  const part = ligne.max > 0 ? Math.min(ligne.valeur / ligne.max, 1) : 0;
  noeud.querySelector('.puce i').style.transform = `scale(${part.toFixed(3)})`;

  const note = noeud.querySelector('.note');
  note.textContent = ligne.note;
  noeud.classList.toggle('avec-note', Boolean(ligne.note));

  // Compteur affiché seulement pour les lignes qui en sont vraiment un.
  const cpt = noeud.querySelector('.cpt');
  cpt.textContent = ligne.max > 1 ? `${Math.min(ligne.valeur, ligne.max)}/${ligne.max}` : '';
  // Quota GTG bâti sur des heures non confirmées : petit point d'avertissement.
  cpt.classList.toggle('doute', ligne.type === 'gtg' && !jour.heures.confirmee);

  // Éclat bref au moment où la ligne devient faite (jamais au décochage).
  if (ligne.faite && !etaitFaite) {
    noeud.classList.remove('eclat');
    void noeud.offsetWidth; // force le redémarrage de l'animation
    noeud.classList.add('eclat');
    setTimeout(() => noeud.classList.remove('eclat'), 320);
  }
}

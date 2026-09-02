// ---------------------------------------------------------------------------
// ui-editeur.js — modifier la liste comme on écrit dans une application de notes.
//
// Technique de la coloration en direct : la zone de saisie est rendue
// transparente (seul le curseur reste visible) et posée exactement au-dessus
// d'un bloc <pre> qui affiche le même texte, coloré. Les deux partagent la
// même police, la même taille et les mêmes marges — sinon les lettres se
// décalent. Le défilement de l'un est recopié sur l'autre.
// ---------------------------------------------------------------------------

import { $ } from './ui-commun.js';
import { colorer, analyserListe } from './parser.js';

let api = null;
let zone;        // <textarea>
let calque;      // <pre>
let minuteur = null;

export function initEditeur(a) {
  api = a;
  zone = $('#edition');
  calque = $('#coloration');

  zone.addEventListener('input', () => {
    peindre();
    // On enregistre avec un léger retard : inutile d'écrire dans localStorage
    // à chaque frappe, mais rien ne doit être perdu si l'application se ferme.
    clearTimeout(minuteur);
    minuteur = setTimeout(enregistrer, 350);
  });

  // Le calque doit suivre le défilement de la zone de saisie.
  zone.addEventListener('scroll', () => {
    calque.scrollTop = zone.scrollTop;
    calque.scrollLeft = zone.scrollLeft;
  });

  // Sortie de l'écran : on enregistre sans attendre le minuteur.
  zone.addEventListener('blur', enregistrer);
}

/** Recopie le texte de l'état dans l'éditeur (à l'entrée sur l'écran). */
export function rendreEditeur(etat) {
  if (document.activeElement !== zone) zone.value = etat.liste;
  peindre();
}

function peindre() {
  calque.innerHTML = colorer(zone.value);
  calque.scrollTop = zone.scrollTop;

  // Résumé des erreurs, sans jamais empêcher d'écrire.
  const { lignes, habitudes } = analyserListe(zone.value);
  const fautives = lignes
    .map((l, i) => ({ ...l, n: i + 1 }))
    .filter((l) => !l.vide && !l.valide);

  $('#etat-edition').textContent = fautives.length
    ? `Ligne ${fautives.map((l) => l.n).join(', ')} : ${fautives[0].erreur}.`
    : `${habitudes.length} habitudes.`;
}

function enregistrer() {
  clearTimeout(minuteur);
  if (api.etat.liste === zone.value) return;
  api.etat.liste = zone.value;
  // La liste peut changer en cours de journée : les cases déjà cochées sont
  // conservées telles quelles, et l'historique des habitudes supprimées reste
  // en place — si elles reviennent, leurs statistiques reprennent.
  api.apresAction();
}

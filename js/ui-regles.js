// ---------------------------------------------------------------------------
// ui-regles.js — le mémo des consignes.
// Une entrée par habitude, modifiable en texte libre. Consultable uniquement
// depuis l'écran Progression : jamais depuis l'accueil.
// ---------------------------------------------------------------------------

import { $, el, vider } from './ui-commun.js';
import { analyserListe, sansAccent } from './parser.js';

let api = null;
let minuteur = null;

export function initRegles(a) { api = a; }

export function rendreRegles(etat) {
  const cible = $('#liste-regles');
  // On ne redessine pas pendant que l'utilisateur est en train d'écrire.
  if (cible.contains(document.activeElement)) return;
  vider(cible);

  for (const regle of etat.regles) cible.append(bloc(regle));

  // Les habitudes de la liste qui n'ont pas encore de consigne : on propose
  // d'en créer une d'un tap.
  const { habitudes } = analyserListe(etat.liste);
  const couvertes = etat.regles.map((r) => sansAccent(r.titre));
  const orphelines = habitudes.filter((h) => !couvertes.some(
    (t) => t.includes(sansAccent(h.nom)) || sansAccent(h.nom).includes(t)));

  if (orphelines.length) {
    cible.append(el('div', { class: 'bloc' }, [
      el('h2', { text: 'Sans consigne' }),
      ...orphelines.map((h) => el('button', {
        class: 'item',
        onclick: () => {
          etat.regles.push({ titre: h.nom, texte: '' });
          api.sauver();
          rendreRegles(etat);
        },
      }, [
        el('div', { class: 'ptxt' }, [el('div', { class: 'ptitre', text: h.nom })]),
        el('span', { class: 'paction', text: 'Ajouter' }),
      ])),
    ]));
  }
}

function bloc(regle) {
  const champ = el('textarea', { rows: 1, spellcheck: 'false' });
  champ.value = regle.texte;
  champ.addEventListener('input', () => {
    ajuster(champ);
    regle.texte = champ.value;
    clearTimeout(minuteur);
    minuteur = setTimeout(() => api.sauver(), 400);
  });
  champ.addEventListener('blur', () => api.sauver());
  // La hauteur est ajustée au contenu dès l'affichage.
  requestAnimationFrame(() => ajuster(champ));
  return el('div', { class: 'regle' }, [el('h3', { text: regle.titre }), champ]);
}

function ajuster(champ) {
  champ.style.height = 'auto';
  champ.style.height = `${champ.scrollHeight}px`;
}

// ---------------------------------------------------------------------------
// ui-regles.js — le mémo des consignes.
//
// Deux parties :
//
//  1. Les réglages, en haut. Ce sont des champs identifiés, pas du texte
//     libre : ce qui y est écrit s'affiche tel quel sur l'écran Liste. Il
//     n'existe donc qu'un seul endroit où modifier les exercices du jour, le
//     détail des deux prises de médicaments et l'objectif d'eau.
//
//  2. Les consignes, en dessous. Du texte libre, une entrée par habitude.
//
// Écran accessible uniquement depuis Progression, jamais depuis l'accueil.
// ---------------------------------------------------------------------------

import { $, el, vider, confirmer } from './ui-commun.js';
import { analyserListe, sansAccent } from './parser.js';
import { TAPS_PAR_LITRE } from './model.js';

let api = null;
let minuteur = null;

export function initRegles(a) { api = a; }

/** Enregistre sans écrire dans le stockage à chaque frappe. */
function enregistrerBientot() {
  clearTimeout(minuteur);
  minuteur = setTimeout(() => api.sauver(), 400);
}

export function rendreRegles(etat) {
  const cible = $('#liste-regles');
  // On ne redessine pas pendant que l'utilisateur est en train d'écrire.
  if (cible.contains(document.activeElement)) return;
  vider(cible);

  cible.append(blocReglages(etat));

  const { habitudes } = analyserListe(etat.liste);
  const noms = habitudes.map((h) => sansAccent(h.nom).trim());

  const consignes = el('section', { class: 'bloc' }, [
    el('h2', { text: 'Consignes' }),
    el('p', { class: 'vide', style: 'margin:-6px 0 10px',
      text: 'Le titre se modifie, la croix supprime.' }),
  ]);
  for (const regle of etat.regles) consignes.append(blocRegle(regle, etat, noms));
  cible.append(consignes);

  // Les habitudes de la liste qui n'ont pas encore de consigne : on propose
  // d'en créer une d'un tap.
  const couvertes = etat.regles.map((r) => sansAccent(r.titre).trim()).filter(Boolean);
  const orphelines = habitudes.filter((h) => !couvertes.some(
    (t) => t.includes(sansAccent(h.nom).trim()) || sansAccent(h.nom).trim().includes(t)));

  if (orphelines.length) {
    cible.append(el('section', { class: 'bloc' }, [
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

// --- Les champs structurés --------------------------------------------------

function blocReglages(etat) {
  const r = etat.reglages;
  return el('section', { class: 'bloc' }, [
    el('h2', { text: 'Réglages' }),
    el('p', { class: 'vide', style: 'margin:-6px 0 14px',
      text: 'Ces champs pilotent directement l’écran Liste.' }),

    groupe('Grease the groove', 'Les exercices s’affichent sur la ligne.', [
      champ('Jours impairs', r.gtgImpair, (v) => { r.gtgImpair = v; }),
      champ('Jours pairs', r.gtgPair, (v) => { r.gtgPair = v; }),
    ]),

    groupe('Médicaments', 'Le psyllium le matin, tout le reste le soir.', [
      champ('Prise du matin', r.medMatin, (v) => { r.medMatin = v; }),
      champ('Prise du soir', r.medSoir, (v) => { r.medSoir = v; }),
    ]),

    groupe('Eau', `Chaque litre se coche en ${TAPS_PAR_LITRE} taps, un quart à la fois.`, [
      champNombre('Objectif', r.eauLitres, 'litres', (v) => { r.eauLitres = v; }),
    ]),
  ]);
}

function groupe(titre, aide, champs) {
  return el('div', { class: 'groupe' }, [
    el('h3', { text: titre }),
    el('p', { class: 'aide-groupe', text: aide }),
    ...champs,
  ]);
}

/** Un champ texte étiqueté. Chaque frappe met l'écran Liste à jour. */
function champ(etiquette, valeur, appliquer) {
  const saisie = el('input', { class: 'champ', type: 'text', spellcheck: 'false' });
  saisie.value = valeur || '';
  saisie.addEventListener('input', () => {
    appliquer(saisie.value);
    api.rafraichir();      // la ligne concernée change tout de suite
    enregistrerBientot();
  });
  saisie.addEventListener('blur', () => api.sauver());
  return el('label', { class: 'ligne-champ' }, [
    el('span', { class: 'etiquette', text: etiquette }),
    saisie,
  ]);
}

/** Le même, pour un nombre, avec son unité affichée à droite. */
function champNombre(etiquette, valeur, unite, appliquer) {
  const saisie = el('input', {
    class: 'champ court', type: 'number', inputmode: 'decimal',
    min: '0.25', max: '10', step: '0.25',
  });
  saisie.value = String(valeur);
  const valider = () => {
    const v = Number(saisie.value);
    if (!Number.isFinite(v) || v <= 0) return;
    appliquer(Math.min(10, Math.max(0.25, v)));
    api.rafraichir();
    enregistrerBientot();
  };
  saisie.addEventListener('input', valider);
  saisie.addEventListener('blur', () => { saisie.value = String(api.etat.reglages.eauLitres); api.sauver(); });
  return el('label', { class: 'ligne-champ' }, [
    el('span', { class: 'etiquette', text: etiquette }),
    el('span', { class: 'avec-unite' }, [saisie, el('span', { class: 'unite', text: unite })]),
  ]);
}

// --- Les consignes en texte libre -------------------------------------------

/**
 * Une consigne : son titre, son texte, et de quoi la supprimer.
 *
 * Le titre est un champ de saisie et non un simple intitulé : renommer une
 * habitude dans l'éditeur de liste laissait sinon sa consigne orpheline, avec
 * un titre devenu faux et impossible à corriger.
 *
 * `noms` est la liste des habitudes réellement présentes : une consigne qui ne
 * correspond à aucune d'elles est signalée, pour repérer d'un coup d'œil celles
 * qui restent d'habitudes supprimées.
 */
function blocRegle(regle, etat, noms) {
  const titre = el('input', { class: 'titre-regle', type: 'text', spellcheck: 'false' });
  titre.value = regle.titre;
  titre.addEventListener('input', () => {
    regle.titre = titre.value;
    majOrpheline();
    enregistrerBientot();
  });
  titre.addEventListener('blur', () => api.sauver());

  const zone = el('textarea', { rows: 1, spellcheck: 'false' });
  zone.value = regle.texte;
  zone.addEventListener('input', () => {
    ajuster(zone);
    regle.texte = zone.value;
    enregistrerBientot();
  });
  zone.addEventListener('blur', () => api.sauver());
  requestAnimationFrame(() => ajuster(zone));

  const supprimer = el('button', { class: 'supprimer-regle', text: '✕',
    'aria-label': 'Supprimer cette consigne',
    onclick: async () => {
      const nom = regle.titre.trim() || 'cette consigne';
      if (!await confirmer('Supprimer la consigne ?',
        `« ${nom} » sera effacée. L’habitude, elle, n’est pas touchée.`, 'Supprimer')) return;
      etat.regles.splice(etat.regles.indexOf(regle), 1);
      api.sauver();
      rendreRegles(etat);
    } });

  const marque = el('span', { class: 'orpheline', text: 'sans habitude' });
  const bloc = el('div', { class: 'regle' }, [
    el('div', { class: 'entete-regle' }, [titre, supprimer]),
    marque, zone,
  ]);

  function majOrpheline() {
    bloc.classList.toggle('est-orpheline', !correspond(regle.titre, noms));
  }
  majOrpheline();
  return bloc;
}

/** Vrai si le titre d'une consigne renvoie à une habitude de la liste. */
function correspond(titre, noms) {
  const t = sansAccent(titre).trim();
  if (!t) return false;
  return noms.some((n) => n.includes(t) || t.includes(n));
}

function ajuster(zone) {
  zone.style.height = 'auto';
  zone.style.height = `${zone.scrollHeight}px`;
}

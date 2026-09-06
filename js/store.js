// ---------------------------------------------------------------------------
// store.js — l'unique source de vérité, conservée dans localStorage.
//
// Forme des données :
// {
//   version   : 1,
//   liste     : "texte de l'éditeur",
//   regles    : [ {titre, texte}, … ],
//   jour      : {                       // la journée logique en cours
//       date        : "2026-09-02",
//       cases       : { "nom" : nombre },   // 0/1 pour une case simple,
//                                           // 0..3 pour l'eau, 0..2 pour les prises
//       gtgSeries   : 0,                    // séries de grease the groove faites
//       gtgPalier   : 0,                    // dernier palier de 2 déjà traité
//       protoFaits  : ["Maths"],            // étapes de protocole validées
//       heures      : 2.5 | null,           // heures hors de la maison
//       heuresOk    : false                 // saisie confirmée ?
//   },
//   histoire  : { "2026-09-01": {…} },  // une photo par journée écoulée
//   protocoles: [ {id, matiere, jours, debut, fin, arreteLe} ],
//   heuresLog : { "0": [{date, valeur}], … }  // apprentissage par jour de semaine
// }
// ---------------------------------------------------------------------------

import { LISTE_PAR_DEFAUT, REGLES_PAR_DEFAUT, REGLAGES_PAR_DEFAUT } from './defaults.js';
import { cleAujourdhui } from './dates.js';

const CLE_STOCKAGE = 'habitudes.v1';

// Version du format des données. À incrémenter quand une nouvelle donnée
// apparaît : consolider() se charge alors de compléter les sauvegardes
// existantes sans rien perdre de ce qui est déjà enregistré.
const VERSION = 2;

/** Fabrique un objet « journée » vierge. */
export function jourVierge(date = cleAujourdhui()) {
  return {
    date,
    cases: {},
    gtgSeries: 0,
    gtgPalier: 0,
    protoFaits: [],
    heures: null,
    heuresOk: false,
    commeStade: false,   // « autant de temps à la maison qu'un jour de stade »
    // null = on suit le calendrier (mardi et jeudi) ; true ou false = déclaré
    // à la main pour aujourd'hui seulement.
    stade: null,
  };
}

/** Fabrique un état complet par défaut (premier lancement). */
export function etatParDefaut() {
  return {
    version: VERSION,
    liste: LISTE_PAR_DEFAUT,
    regles: REGLES_PAR_DEFAUT.map((r) => ({ ...r })),
    reglages: { ...REGLAGES_PAR_DEFAUT },
    jour: jourVierge(),
    histoire: {},
    protocoles: [],
    heuresLog: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
  };
}

/**
 * Complète un état lu du stockage avec les champs manquants.
 * Indispensable : une sauvegarde ancienne ou un import partiel ne doit jamais
 * faire planter l'application.
 */
function consolider(brut) {
  const def = etatParDefaut();
  const e = { ...def, ...(brut || {}) };
  e.jour = { ...def.jour, ...(brut && brut.jour ? brut.jour : {}) };
  e.jour.cases = e.jour.cases || {};
  e.jour.protoFaits = Array.isArray(e.jour.protoFaits) ? e.jour.protoFaits : [];
  e.histoire = e.histoire && typeof e.histoire === 'object' ? e.histoire : {};
  e.protocoles = Array.isArray(e.protocoles) ? e.protocoles : [];
  e.regles = Array.isArray(e.regles) && e.regles.length ? e.regles : def.regles;
  e.liste = typeof e.liste === 'string' ? e.liste : def.liste;
  const log = e.heuresLog && typeof e.heuresLog === 'object' ? e.heuresLog : {};
  e.heuresLog = {};
  for (let j = 0; j < 7; j++) e.heuresLog[j] = Array.isArray(log[j]) ? log[j] : [];

  // Les réglages structurés : on complète champ par champ, pour qu'une
  // sauvegarde partielle ou ancienne ne laisse jamais un champ manquant.
  e.reglages = { ...def.reglages, ...(brut && brut.reglages ? brut.reglages : {}) };
  const litres = Number(e.reglages.eauLitres);
  e.reglages.eauLitres = Number.isFinite(litres) && litres > 0 ? litres : def.reglages.eauLitres;

  // Migration vers la version 2 : la consigne des médicaments n'existait pas.
  // On l'ajoute aux sauvegardes plus anciennes sans toucher au reste.
  if (!(Number(brut && brut.version) >= 2)) {
    const dejaLa = e.regles.some((r) => /^psy/i.test(r.titre.trim()));
    if (!dejaLa) {
      const modele = def.regles.find((r) => /^psy/i.test(r.titre));
      if (modele) e.regles.push({ ...modele });
    }
  }
  e.version = VERSION;
  return e;
}

/** L'état vivant de l'application. Tout le code lit et écrit dans cet objet. */
export const etat = charger();

function charger() {
  try {
    const txt = localStorage.getItem(CLE_STOCKAGE);
    if (!txt) return etatParDefaut();
    return consolider(JSON.parse(txt));
  } catch (err) {
    // Stockage corrompu : on repart proprement plutôt que d'afficher une page blanche.
    console.error('Lecture du stockage impossible, retour aux valeurs par défaut.', err);
    return etatParDefaut();
  }
}

/** Écrit l'état dans localStorage. À appeler après chaque modification. */
export function sauver() {
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(etat));
  } catch (err) {
    console.error('Sauvegarde impossible (stockage plein ou navigation privée ?)', err);
  }
}

/** Remplace tout le contenu de l'état (utilisé par l'import JSON). */
export function remplacerEtat(nouveau) {
  const propre = consolider(nouveau);
  for (const k of Object.keys(etat)) delete etat[k];
  Object.assign(etat, propre);
  sauver();
}

/** Le JSON complet, indenté, pour l'export manuel. */
export function exporterJSON() {
  return JSON.stringify(etat, null, 2);
}

/**
 * Import : vérifie sommairement la forme avant d'écraser quoi que ce soit.
 * Renvoie un message d'erreur, ou null si tout s'est bien passé.
 */
export function importerJSON(texte) {
  let obj;
  try {
    obj = JSON.parse(texte);
  } catch {
    return 'Fichier illisible : ce n’est pas du JSON.';
  }
  if (!obj || typeof obj !== 'object' || typeof obj.liste !== 'string') {
    return 'Ce fichier ne ressemble pas à une sauvegarde de l’application.';
  }
  remplacerEtat(obj);
  return null;
}

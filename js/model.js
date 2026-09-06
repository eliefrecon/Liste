// ---------------------------------------------------------------------------
// model.js — toute la logique métier, sans une seule ligne d'interface.
//
// Point d'entrée principal : construireJour(). Il renvoie, pour une date
// donnée, la liste complète des habitudes avec leur état, ce qui est visible,
// ce qui est retiré et pourquoi, le quota de grease the groove, etc.
// L'interface se contente d'afficher ce que cette fonction calcule.
// ---------------------------------------------------------------------------

import {
  cleAujourdhui, jourSemaine, estJourImpair, estJourDeStade,
  ajouterJours, lundiDeLaSemaine, cle, versDate,
} from './dates.js';
import { analyserListe, sansAccent } from './parser.js';
import { jourVierge } from './store.js';

/**
 * Nombre de taps pour valider la ligne « Eau ». Chaque litre se coche en
 * quatre fois, un quart de litre par tap. L'objectif se règle dans l'écran
 * Règles : changer 3 en 2 litres fait passer la ligne de 12 à 8 taps.
 */
export const TAPS_PAR_LITRE = 4;

export function quartsPourObjectif(reglages) {
  const litres = Number(reglages && reglages.eauLitres);
  return Math.max(1, Math.round((Number.isFinite(litres) ? litres : 3) * TAPS_PAR_LITRE));
}

const FRACTIONS = ['', '¼', '½', '¾'];

/** 7 quarts → « 1¾ ». Sert au compteur de la ligne Eau. */
export function formatLitres(quarts) {
  const entier = Math.floor(quarts / TAPS_PAR_LITRE);
  const reste = quarts % TAPS_PAR_LITRE;
  if (!reste) return String(entier);
  return (entier ? String(entier) : '') + FRACTIONS[reste];
}

// --- Reconnaissance des lignes particulières -------------------------------

/**
 * Détermine le comportement d'une ligne à partir de son nom :
 *  'eau'       compteur en quarts de litre
 *  'prises'    deux prises distinctes (psyllium le matin, le reste le soir)
 *  'gtg'       compteur de séries, rempli par l'overlay
 *  'protocole' compteur d'étapes, une par matière en protocole
 *  'case'      simple case à cocher
 *
 * Un cinquième type, 'compteur', ne se devine pas au nom : il naît d'un « x3 »
 * écrit dans l'éditeur de liste. construireJour() s'en charge.
 */
export function typeHabitude(nom) {
  const n = sansAccent(nom);
  if (/^eau\b/.test(n)) return 'eau';
  if (/^psy\b/.test(n)) return 'prises';
  if (/^grease the groove/.test(n)) return 'gtg';
  if (/^protocole/.test(n)) return 'protocole';
  return 'case';
}

// --- Protocoles d'évaluation -----------------------------------------------

/**
 * Un protocole est actif à la date k s'il a commencé, qu'il n'a pas été arrêté
 * à la main avant, et que son échéance n'est pas dépassée.
 * fin === null signifie « durée indéterminée ».
 */
export function protocoleActifLe(p, k) {
  if (k < p.debut) return false;
  if (p.arreteLe && k >= p.arreteLe) return false; // arrêt manuel : inactif dès ce jour
  if (p.fin && k > p.fin) return false;            // échéance dépassée
  return true;
}

/** Les protocoles actifs à une date, dans leur ordre de lancement. */
export function protocolesActifs(etat, k = cleAujourdhui()) {
  return etat.protocoles.filter((p) => protocoleActifLe(p, k));
}

/** Crée un protocole. Un seul par matière : relancer une matière remplace l'ancien. */
export function lancerProtocole(etat, matiere, jours) {
  const k = cleAujourdhui();
  const nom = matiere.trim();
  // On arrête le protocole déjà en cours sur cette matière.
  for (const p of etat.protocoles) {
    if (protocoleActifLe(p, k) && sansAccent(p.matiere) === sansAccent(nom)) {
      p.arreteLe = k;
    }
  }
  const p = {
    id: `p${Date.now()}${Math.floor(Math.random() * 1000)}`,
    matiere: nom,
    jours,
    debut: k,
    // Le dernier jour actif est inclus : une durée de 3 jours couvre J, J+1, J+2.
    fin: jours ? ajouterJours(k, jours - 1) : null,
    arreteLe: null,
  };
  etat.protocoles.push(p);
  return p;
}

/** Arrêt manuel : le protocole n'est plus actif dès aujourd'hui. */
export function arreterProtocole(etat, id) {
  const p = etat.protocoles.find((x) => x.id === id);
  if (p) p.arreteLe = cleAujourdhui();
}

// --- Heures hors de la maison ----------------------------------------------

function mediane(valeurs) {
  const v = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  const val = v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  return Math.round(val * 4) / 4; // arrondi au quart d'heure
}

/**
 * Valeur proposée pour les heures passées dehors, apprise par jour de semaine.
 * À partir de deux saisies pour ce jour, on propose leur médiane.
 * Avant ça, on se rabat sur la seule saisie connue, puis sur la médiane globale.
 * Jamais appliquée en silence : l'interface la présente comme une proposition.
 */
export function propositionHeures(etat, k = cleAujourdhui()) {
  const j = jourSemaine(k);
  const entrees = etat.heuresLog[j] || [];
  if (entrees.length >= 2) {
    return { valeur: mediane(entrees.map((e) => e.valeur)), source: 'mediane', n: entrees.length };
  }
  if (entrees.length === 1) {
    return { valeur: entrees[0].valeur, source: 'unique', n: 1 };
  }
  const toutes = Object.values(etat.heuresLog).flat().map((e) => e.valeur);
  if (toutes.length) return { valeur: mediane(toutes), source: 'globale', n: toutes.length };
  return { valeur: 0, source: 'aucune', n: 0 };
}

/** Heures retenues pour le calcul du quota + savoir si elles sont confirmées. */
export function heuresRetenues(etat, k, jour) {
  const prop = propositionHeures(etat, k);
  if (jour.heuresOk && typeof jour.heures === 'number') {
    return { valeur: jour.heures, confirmee: true, proposition: prop };
  }
  const valeur = typeof jour.heures === 'number' ? jour.heures : prop.valeur;
  return { valeur, confirmee: false, proposition: prop };
}

/** Confirme la saisie du jour et la mémorise pour ce jour de la semaine. */
export function confirmerHeures(etat, valeur) {
  const k = etat.jour.date;
  etat.jour.heures = valeur;
  etat.jour.heuresOk = true;
  const j = jourSemaine(k);
  const log = etat.heuresLog[j];
  const dejaCeJour = log.find((e) => e.date === k);
  if (dejaCeJour) dejaCeJour.valeur = valeur; // on corrige au lieu d'empiler
  else log.push({ date: k, valeur });
}

// --- Quota de grease the groove --------------------------------------------

/**
 * Jour de stade, en tenant compte d'une éventuelle déclaration manuelle.
 *
 * Mardi et jeudi le sont par défaut ; n'importe quelle journée peut être
 * déclarée ou dédéclarée depuis l'écran Progression, pour ce jour-là
 * seulement — la déclaration repart de zéro à la bascule de journée.
 *
 * Cette réponse vaut pour tout : le quota de grease the groove comme le
 * marqueur (stade) qui masque des habitudes.
 */
export function estStade(k, jour) {
  if (jour && jour.stade != null) return jour.stade;
  return estJourDeStade(k);
}

/**
 * Nombre de séries à faire aujourd'hui, par ordre de priorité :
 *   1. jour de stade (mardi, jeudi, dimanche) → 1 série ;
 *   1 bis. journée déclarée « comme un jour de stade » → 1 série aussi.
 *      C'est le cas d'une journée passée dehors autant que si on était allé
 *      au stade : la case se coche à la main dans l'écran Progression ;
 *   2. au moins 10 heures dehors → 2 séries ;
 *   3. sinon 12 − heures dehors arrondies à l'heure supérieure.
 */
export function quotaGTG(etat, k, jour) {
  if (estStade(k, jour) || jour.commeStade) return 1;
  const h = heuresRetenues(etat, k, jour).valeur;
  if (h >= 10) return 2;
  return 12 - Math.ceil(h);
}

/**
 * À partir de combien d'heures dehors on propose la case « comme un jour de
 * stade ». En dessous, la question ne se pose pas : la journée n'a rien d'un
 * jour de stade.
 */
export const SEUIL_COMME_STADE = 8;

// --- Restrictions ----------------------------------------------------------

/** Renvoie la liste des motifs de retrait qui s'appliquent à une habitude. */
function retraitsDe(habitude, ctx) {
  const out = [];
  if (habitude.marqueurs.includes('évale') && ctx.protos.length) {
    out.push({ marqueur: 'évale', motif: 'protocole d’évaluation en cours' });
  }
  if (habitude.marqueurs.includes('stade') && ctx.stade) {
    const motif = ctx.stadeDeclare ? 'jour de stade déclaré'
      : ctx.jsem === 2 ? 'mardi, jour de stade' : 'jeudi, jour de stade';
    out.push({ marqueur: 'stade', motif });
  }
  if (habitude.marqueurs.includes('jeudi') && ctx.jsem === 4) {
    out.push({ marqueur: 'jeudi', motif: 'jeudi' });
  }
  return out;
}

// --- Construction d'une journée --------------------------------------------

/**
 * Le calcul central. Renvoie tout ce dont les écrans ont besoin pour une date.
 * `jour` est l'objet journée correspondant (par défaut celui en cours).
 */
export function construireJour(etat, k = cleAujourdhui(), jour = etat.jour) {
  const { habitudes } = analyserListe(etat.liste);
  const protos = protocolesActifs(etat, k);
  const jsem = jourSemaine(k);
  const impair = estJourImpair(k);
  const quota = quotaGTG(etat, k, jour);
  const heures = heuresRetenues(etat, k, jour);
  // Les réglages voyagent dans le contexte : exercices du jour, détail des
  // deux prises de médicaments, objectif d'eau.
  const stade = estStade(k, jour);
  const ctx = { k, jsem, impair, protos, quota, reglages: etat.reglages,
                stade, stadeDeclare: jour.stade != null };
  const quartsEau = quartsPourObjectif(etat.reglages);

  // Étapes de protocole : on ne compte que les matières encore actives.
  const matieresActives = protos.map((p) => p.matiere);
  const etapesFaites = (jour.protoFaits || []).filter((m) => matieresActives.includes(m));

  // Le dimanche de repos : la liste n'est pas affichée du tout.
  const repos = jsem === 0 && ratesDeLaSemaine(etat, k) < 3;

  const lignes = habitudes.map((h) => {
    let type = typeHabitude(h.nom);
    // Un compteur écrit dans l'éditeur (« x3 ») transforme une case ordinaire
    // en compteur. Les quatre lignes spéciales gardent leur comportement.
    if (type === 'case' && h.compteur > 1) type = 'compteur';
    const max = type === 'eau' ? quartsEau
      : type === 'prises' ? 2
      : type === 'gtg' ? quota
      : type === 'protocole' ? protos.length
      : type === 'compteur' ? h.compteur
      : 1;
    const valeur = type === 'gtg' ? (jour.gtgSeries || 0)
      : type === 'protocole' ? etapesFaites.length
      : (jour.cases[h.nom] || 0);

    const ligne = {
      nom: h.nom,
      poids: h.poids,
      marqueurs: h.marqueurs,
      type,
      max,
      valeur,
      faite: max > 0 && valeur >= max,
      retraits: [],
      auto: false,   // « réussie d'office », cas de Protocole évale sans protocole
      visible: true,
      note: '',
    };

    if (type === 'protocole' && protos.length === 0) {
      // Pas de protocole en cours : la ligne n'existe pas et ne produit
      // jamais de raté — elle est comptée comme réussie dans les statistiques.
      ligne.visible = false;
      ligne.auto = true;
      ligne.faite = true;
    } else {
      ligne.retraits = retraitsDe(h, ctx);
      if (ligne.retraits.length) ligne.visible = false;
    }

    if (repos) ligne.visible = false; // dimanche de repos : rien n'est affiché

    ligne.note = noteDynamique(ligne, ctx, etapesFaites);
    return ligne;
  });

  const visibles = lignes.filter((l) => l.visible);
  const retirees = lignes.filter((l) => !l.visible && !l.auto);
  const faites = visibles.filter((l) => l.faite).length;
  const bonus = retirees.filter((l) => l.faite);

  return {
    date: k, jsem, impair, repos, protos, quota, heures,
    stade, stadeAuto: estJourDeStade(k), stadeDeclare: jour.stade != null,
    lignes, visibles, retirees, bonus,
    faites,
    total: visibles.length,
    taux: visibles.length ? faites / visibles.length : 1,
    rates: visibles.length - faites,   // ratés « en cours », si la journée s'arrêtait là
    poidsCumules: lignes.filter((l) => l.faite && !l.auto).reduce((s, l) => s + l.poids, 0),
    etapesFaites,
    matieresRestantes: matieresActives.filter((m) => !etapesFaites.includes(m)),
  };
}

/** Texte secondaire affiché sous le nom, recalculé chaque jour. */
function noteDynamique(ligne, ctx, etapesFaites) {
  const n = sansAccent(ligne.nom);
  const r = ctx.reglages;

  // Programmation : OpenClassrooms les jours impairs, Lerno les jours pairs.
  if (n.startsWith('programmation')) return ctx.impair ? 'OpenClassrooms' : 'Lerno';

  // Les exercices du jour, tels qu'ils sont écrits dans les Règles.
  if (ligne.type === 'gtg') return (ctx.impair ? r.gtgImpair : r.gtgPair) || '';

  // Deux prises distinctes : la note dit laquelle est déjà faite, et de quoi
  // chacune se compose — le détail vient lui aussi des Règles.
  if (ligne.type === 'prises') {
    if (ligne.valeur === 0) return `matin : ${r.medMatin}`;
    if (ligne.valeur === 1) return `matin fait · soir : ${r.medSoir}`;
    return 'les deux prises faites';
  }

  if (ligne.type === 'protocole') {
    const restantes = ctx.protos.map((p) => p.matiere).filter((m) => !etapesFaites.includes(m));
    if (!restantes.length) return 'toutes les matières sont faites';
    // Le premier jour d'un protocole, la feuille blanche est obligatoire :
    // on nomme les matières concernées séparément des autres.
    const feuilleBlanche = ctx.protos
      .filter((p) => p.debut === ctx.k && restantes.includes(p.matiere))
      .map((p) => p.matiere);
    const autres = restantes.filter((m) => !feuilleBlanche.includes(m));
    const bouts = [];
    if (feuilleBlanche.length) bouts.push(`feuille blanche : ${feuilleBlanche.join(', ')}`);
    if (autres.length) bouts.push(feuilleBlanche.length ? `puis ${autres.join(', ')}` : autres.join(', '));
    return bouts.join(' · ');
  }

  return '';
}

// --- Cochage ---------------------------------------------------------------

/**
 * Valeur réellement stockée pour une ligne. On la relit dans l'état plutôt que
 * de faire confiance à l'objet ligne, qui peut dater d'un rendu précédent.
 */
function valeurActuelle(etat, ligne, jourCalcule) {
  if (ligne.type === 'gtg') return etat.jour.gtgSeries || 0;
  if (ligne.type === 'protocole') return jourCalcule.etapesFaites.length;
  return etat.jour.cases[ligne.nom] || 0;
}

/**
 * Un tap sur une ligne. Renvoie true si l'état a changé.
 * Les compteurs s'incrémentent et s'arrêtent à leur maximum ; les cases
 * simples basculent. Pour revenir en arrière, voir retirerUn() : c'est le
 * tap sur le compteur lui-même.
 */
export function taper(etat, ligne, jourCalcule) {
  const j = etat.jour;
  const v = valeurActuelle(etat, ligne, jourCalcule);
  switch (ligne.type) {
    case 'gtg':
      // L'overlay n'est pas le seul moyen d'ajouter une série : on peut aussi
      // taper la ligne directement, quand on en a fait une de son côté.
      if (v >= jourCalcule.quota) return false;
      j.gtgSeries = v + 1;
      return true;
    case 'eau':
    case 'compteur':
      // Un tap = un cran. Le maximum vient de l'objectif d'eau réglé dans les
      // Règles, ou du « x3 » écrit dans l'éditeur de liste.
      if (v >= ligne.max) return false;
      j.cases[ligne.nom] = v + 1;
      return true;
    case 'prises':
      if (v >= 2) return false;
      j.cases[ligne.nom] = v + 1;
      return true;
    case 'protocole': {
      const suivante = jourCalcule.matieresRestantes[0];
      if (!suivante) return false;
      j.protoFaits = [...(j.protoFaits || []), suivante];
      return true;
    }
    default:
      j.cases[ligne.nom] = v ? 0 : 1;
      return true;
  }
}

/**
 * Retire une unité : décrémente un compteur, décoche une case simple.
 * Déclenché par un tap sur le compteur affiché à droite de la ligne (« 2/3 »),
 * ou par un appui long n'importe où sur la ligne. Le compteur sert donc à la
 * fois d'information et de bouton de retour en arrière — sans ajouter le
 * moindre bouton à l'écran d'accueil.
 */
export function retirerUn(etat, ligne, jourCalcule) {
  const j = etat.jour;
  const v = valeurActuelle(etat, ligne, jourCalcule);
  switch (ligne.type) {
    case 'gtg':
      if (v <= 0) return false;
      j.gtgSeries = v - 1;
      return true;
    case 'eau':
    case 'prises':
    case 'compteur':
      if (v <= 0) return false;
      j.cases[ligne.nom] = v - 1;
      return true;
    case 'protocole': {
      const faites = jourCalcule.etapesFaites;
      if (!faites.length) return false;
      const derniere = faites[faites.length - 1];
      j.protoFaits = (j.protoFaits || []).filter((m) => m !== derniere);
      return true;
    }
    default:
      if (!v) return false;
      j.cases[ligne.nom] = 0;
      return true;
  }
}

// --- Overlay grease the groove ---------------------------------------------

/**
 * Palier atteint = nombre de fois que le cumul des poids a franchi un multiple
 * de 2. On compare au dernier palier déjà traité pour savoir s'il faut ouvrir
 * l'overlay. Si l'utilisateur décoche, le palier redescend : le déclenchement
 * pourra donc se reproduire, ce qui est le comportement attendu.
 */
export function palierAtteint(jourCalcule) {
  return Math.floor(jourCalcule.poidsCumules / 2);
}

export function doitDeclencherGTG(etat, jourCalcule) {
  return palierAtteint(jourCalcule) > (etat.jour.gtgPalier || 0);
}

/**
 * Réponse à l'overlay. fait = true pour « Fait », false pour « Pas chez moi ».
 * Dans les deux cas le palier est consommé : il ne se redéclenchera pas.
 *
 * Le palier ne redescend jamais, même si on décoche une habitude. Sans quoi
 * décocher puis recocher une case ferait revenir l'overlay pour un palier déjà
 * traité — ce qui est agaçant et faux : la série a bien été proposée.
 */
export function repondreGTG(etat, jourCalcule, fait) {
  etat.jour.gtgPalier = palierAtteint(jourCalcule);
  if (fait) etat.jour.gtgSeries = (etat.jour.gtgSeries || 0) + 1;
}

// --- Bascule de journée et archivage ---------------------------------------

/** Photo d'une journée terminée, conservée pour les statistiques. */
export function photographier(etat, k, jour) {
  const j = construireJour(etat, k, jour);
  return {
    repos: j.repos,
    affichees: j.visibles.map((l) => l.nom),
    cochees: j.visibles.filter((l) => l.faite).map((l) => l.nom),
    bonus: j.bonus.map((l) => l.nom),
    auto: j.lignes.filter((l) => l.auto).map((l) => l.nom),
    faites: j.faites,
    total: j.total,
    rates: j.rates,
    heures: j.heures.valeur,
    gtgSeries: jour.gtgSeries || 0,
    gtgQuota: j.quota,
  };
}

/**
 * Vérifie qu'on est bien sur la bonne journée logique ; sinon archive la
 * précédente et repart de zéro. Appelée au démarrage, au retour d'arrière-plan
 * et par un minuteur — pour couvrir le cas où l'application reste ouverte
 * pendant la nuit.
 * Renvoie true si une bascule a eu lieu.
 */
export function assurerJour(etat) {
  const k = cleAujourdhui();
  if (etat.jour.date === k) return false;

  // On n'archive que la journée réellement suivie. Les jours où l'application
  // n'a pas été ouverte ne sont pas inventés : mieux vaut un trou dans
  // l'historique qu'une vingtaine de ratés fictifs.
  if (etat.jour.date && etat.jour.date < k) {
    etat.histoire[etat.jour.date] = photographier(etat, etat.jour.date, etat.jour);
  }
  etat.jour = jourVierge(k);
  return true;
}

// --- Ratés, séries, statistiques -------------------------------------------

/**
 * Ratés du lundi au samedi de la semaine contenant k, d'après les journées
 * déjà archivées. Sert à la règle du dimanche.
 */
export function ratesDeLaSemaine(etat, k = cleAujourdhui()) {
  const lundi = lundiDeLaSemaine(k);
  let total = 0;
  for (let i = 0; i < 6; i++) { // lundi → samedi
    const snap = etat.histoire[ajouterJours(lundi, i)];
    if (snap) total += snap.rates || 0;
  }
  return total;
}

/** Série en cours et meilleure série (jours consécutifs sans aucun raté). */
export function series(etat) {
  const cles = Object.keys(etat.histoire).sort();
  if (!cles.length) return { courante: 0, meilleure: 0 };

  // En cours : on remonte jour par jour depuis la dernière journée archivée.
  let courante = 0;
  let k = cles[cles.length - 1];
  while (etat.histoire[k] && (etat.histoire[k].rates || 0) === 0) {
    courante++;
    k = ajouterJours(k, -1);
  }

  // Meilleure : parcours complet, un trou de date casse la série.
  let meilleure = 0; let cur = 0; let prec = null;
  for (const c of cles) {
    if (prec && ajouterJours(prec, 1) !== c) cur = 0;
    if ((etat.histoire[c].rates || 0) === 0) { cur++; if (cur > meilleure) meilleure = cur; }
    else cur = 0;
    prec = c;
  }
  return { courante, meilleure: Math.max(meilleure, courante) };
}

/** Les n derniers jours (clés), du plus ancien au plus récent, aujourd'hui inclus. */
export function dernieresCles(n = 30, fin = cleAujourdhui()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(ajouterJours(fin, -i));
  return out;
}

/**
 * Séries de données pour le graphique des 30 derniers jours.
 * La dernière barre est la journée en cours (non terminée).
 */
export function serie30jours(etat, jourCalcule) {
  const cles = dernieresCles(30, etat.jour.date);
  return cles.map((k) => {
    if (k === etat.jour.date) {
      return { date: k, faites: jourCalcule.faites, total: jourCalcule.total,
               taux: jourCalcule.total ? jourCalcule.faites / jourCalcule.total : null,
               repos: jourCalcule.repos, encours: true };
    }
    const s = etat.histoire[k];
    if (!s) return { date: k, faites: 0, total: 0, taux: null, vide: true };
    return { date: k, faites: s.faites || 0, total: s.total || 0,
             taux: s.total ? s.faites / s.total : null, repos: s.repos };
  });
}

/**
 * Taux de réussite par habitude sur la période, du moins bon au meilleur.
 * C'est l'information qui sert à décider quelles lignes retirer de la liste.
 * Les jours où une habitude était retirée ne comptent pas dans son total ;
 * les jours « réussis d'office » (Protocole évale sans protocole) comptent
 * comme des réussites.
 */
export function tauxParHabitude(etat, jours = 30, jourCalcule = null) {
  const cles = dernieresCles(jours, etat.jour.date);
  const compte = new Map();
  const ajouter = (nom, reussi) => {
    const e = compte.get(nom) || { nom, faites: 0, total: 0 };
    e.total++; if (reussi) e.faites++;
    compte.set(nom, e);
  };

  for (const k of cles) {
    if (k === etat.jour.date && jourCalcule) {
      // La journée en cours compte elle aussi, pour rester à jour.
      for (const l of jourCalcule.visibles) ajouter(l.nom, l.faite);
      for (const l of jourCalcule.lignes) if (l.auto) ajouter(l.nom, true);
      continue;
    }
    const s = etat.histoire[k];
    if (!s) continue;
    for (const nom of s.affichees || []) ajouter(nom, (s.cochees || []).includes(nom));
    for (const nom of s.auto || []) ajouter(nom, true);
  }

  // Une habitude retirée de la liste garde son historique — c'est ce qui lui
  // permet de reprendre ses statistiques si elle revient. On la marque donc
  // au lieu de l'écarter : l'écran Progression sépare les deux.
  const actuelles = new Set(analyserListe(etat.liste).habitudes.map((h) => h.nom));

  return [...compte.values()]
    .map((e) => ({ ...e, taux: e.total ? e.faites / e.total : 0,
                   actuelle: actuelles.has(e.nom) }))
    .sort((a, b) => a.taux - b.taux || b.total - a.total);
}

/**
 * Efface toute trace d'une habitude dans l'historique : elle disparaît des
 * statistiques par habitude, et ne reviendra pas si on la réajoute plus tard.
 *
 * Les totaux journaliers (faites, total, ratés) ne sont volontairement pas
 * recalculés : oublier une habitude ne doit pas réécrire le passé et
 * transformer après coup une journée ratée en journée parfaite. Le graphique
 * des 30 jours et les séries restent donc exactement ce qu'ils étaient.
 */
export function oublierHabitude(etat, nom) {
  for (const snap of Object.values(etat.histoire)) {
    for (const champ of ['affichees', 'cochees', 'bonus', 'auto']) {
      if (Array.isArray(snap[champ])) snap[champ] = snap[champ].filter((n) => n !== nom);
    }
  }
  delete etat.jour.cases[nom];
}

/** Vrai si la date est dans le futur par rapport au jour logique (garde-fou). */
export function dansLeFutur(k) {
  return versDate(k) > versDate(cleAujourdhui());
}

/** Petite aide de formatage : 2.5 → « 2 h 30 ». */
export function formatHeures(h) {
  const heures = Math.floor(h);
  const minutes = Math.round((h - heures) * 60);
  return minutes ? `${heures} h ${String(minutes).padStart(2, '0')}` : `${heures} h`;
}

export { cle };

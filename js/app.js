// ---------------------------------------------------------------------------
// app.js — démarrage et coordination.
//
// Le principe : un seul objet d'état (store.js), une seule fonction de calcul
// (construireJour), et un rendu qui redescend du calcul vers les écrans.
// Aucun écran ne modifie l'état directement : ils passent par les fonctions
// de model.js, puis appellent apresAction().
// ---------------------------------------------------------------------------

import { etat, sauver } from './store.js';
import {
  construireJour, assurerJour, taper, retirerUn as retirerUneUnite,
  doitDeclencherGTG, repondreGTG, palierAtteint,
} from './model.js';
import { msAvantProchainReset, cleAujourdhui, estJourImpair } from './dates.js';
import { $, montrer, surEntree, ecranCourant, fermerModale } from './ui-commun.js';
import { initListe, rendreListe } from './ui-liste.js';
import { initProgression, rendreProgression } from './ui-progression.js';
import { initEditeur, rendreEditeur } from './ui-editeur.js';
import { initRegles, rendreRegles } from './ui-regles.js';

// L'état calculé de la journée en cours. Recalculé après chaque modification :
// c'est peu coûteux et cela évite toute désynchronisation.
let jour = null;

function recalculer() { jour = construireJour(etat); }

/** Redessine l'écran affiché. */
function rendre() {
  rendreListe(etat, jour);
  switch (ecranCourant()) {
    case 'progression': rendreProgression(etat, jour); break;
    case 'editeur': rendreEditeur(etat); break;
    case 'regles': rendreRegles(etat); break;
  }
}

/** Après toute modification de l'état : recalcul, rendu, sauvegarde, GTG. */
function apresAction() {
  recalculer();
  rendre();
  sauver();
  verifierGTG();
}

/** Simple rafraîchissement, sans sauvegarde ni déclenchement d'overlay. */
function rafraichir() { recalculer(); rendre(); }

// --- Interface passée aux écrans -------------------------------------------

const api = {
  etat,
  sauver,
  rafraichir,
  apresAction,
  tap(nom) {
    const ligne = jour.lignes.find((l) => l.nom === nom);
    if (ligne && taper(etat, ligne, jour)) apresAction();
  },
  // Tap sur le compteur, ou appui long n'importe où sur la ligne.
  retirerUn(nom) {
    const ligne = jour.lignes.find((l) => l.nom === nom);
    if (ligne && retirerUneUnite(etat, ligne, jour)) apresAction();
  },
  rechargerApresImport() {
    assurerJour(etat);
    sauver();
    recalculer();
    rendre();
    montrer('liste');
  },
};

// --- Overlay « Fais ton GTG » ----------------------------------------------

const overlay = () => $('#overlay-gtg');

function verifierGTG() {
  if (!doitDeclencherGTG(etat, jour)) return;
  if (!overlay().hidden) return;               // déjà ouvert
  // Les exercices affichés sont ceux écrits dans l'écran Règles.
  $('#gtg-detail').textContent =
    estJourImpair(jour.date) ? etat.reglages.gtgImpair : etat.reglages.gtgPair;
  $('#gtg-compte').textContent =
    `série ${(etat.jour.gtgSeries || 0) + 1} sur ${jour.quota}`;
  overlay().hidden = false;
}

function repondre(fait) {
  repondreGTG(etat, jour, fait);
  overlay().hidden = true;
  apresAction();   // si un autre palier a été franchi, l'overlay revient
}

// --- Bascule de journée -----------------------------------------------------

/**
 * Vérifie qu'on est toujours sur la bonne journée logique. Appelée au
 * démarrage, chaque minute, au retour d'arrière-plan, et exactement à 4h00.
 * Couvre le cas de l'application laissée ouverte toute la nuit et celui du
 * protocole qui arrive à échéance pendant le sommeil.
 */
function verifierJour() {
  if (assurerJour(etat)) {
    overlay().hidden = true;   // un overlay resté ouvert n'a plus de sens
    fermerModale();
    sauver();
    recalculer();
    rendre();
  } else {
    // Même sans bascule, un protocole a pu expirer : on recalcule.
    recalculer();
    rendre();
  }
  programmerProchainReset();
}

let minuteurReset = null;
function programmerProchainReset() {
  clearTimeout(minuteurReset);
  // +2 s de marge pour être sûr d'être passé de l'autre côté de 4h00.
  minuteurReset = setTimeout(verifierJour, msAvantProchainReset() + 2000);
}

// --- Démarrage --------------------------------------------------------------

function demarrer() {
  assurerJour(etat);
  sauver();
  recalculer();

  initListe(api);
  initProgression(api);
  initEditeur(api);
  initRegles(api);

  $('#bascule').addEventListener('click', () => montrer('progression'));
  $('#gtg-fait').addEventListener('click', () => repondre(true));
  $('#gtg-absent').addEventListener('click', () => repondre(false));

  // Chaque écran se dessine au moment où on y entre.
  surEntree('progression', () => rendreProgression(etat, jour));
  surEntree('editeur', () => rendreEditeur(etat));
  surEntree('regles', () => rendreRegles(etat));
  surEntree('liste', () => rendreListe(etat, jour));

  rendre();
  verifierGTG();

  programmerProchainReset();
  setInterval(verifierJour, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) verifierJour();
  });
  // Retour depuis le cache de navigation d'iOS.
  window.addEventListener('pageshow', verifierJour);

  // Sécurité : on écrit l'état avant toute mise en arrière-plan.
  window.addEventListener('pagehide', sauver);

  // Le service worker rend l'application utilisable hors ligne. Il va
  // toujours chercher la version en ligne d'abord : une mise à jour du dépôt
  // est donc prise en compte dès la première ouverture avec du réseau.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sans importance */ });
  }
}

// Le graphique arrive par CDN avec `defer` : on attend que la page soit prête.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', demarrer);
} else {
  demarrer();
}

// Utile pour bidouiller depuis la console du navigateur.
window.appli = { etat, get jour() { return jour; }, recalculer, rendre, palierAtteint, cleAujourdhui };

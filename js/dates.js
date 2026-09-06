// ---------------------------------------------------------------------------
// dates.js — tout ce qui touche au temps.
//
// Règle centrale du projet : la journée ne commence pas à minuit mais à 4h00.
// On appelle « jour logique » la journée de l'application. Concrètement, tout
// ce qui se passe entre 00h00 et 03h59 appartient encore à la veille.
// ---------------------------------------------------------------------------

// Heure de réinitialisation quotidienne.
export const HEURE_RESET = 4;

/**
 * Renvoie la date logique (un objet Date) correspondant à un instant réel.
 * On recule simplement l'horloge de 4 heures : à 2h du matin le 5, on obtient
 * le 4 ; à 5h du matin le 5, on obtient le 5.
 */
export function dateLogique(maintenant = new Date()) {
  return new Date(maintenant.getTime() - HEURE_RESET * 3600 * 1000);
}

/** Transforme une Date en clé de stockage « AAAA-MM-JJ » (heure locale). */
export function cle(d) {
  const an = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${an}-${mois}-${jour}`;
}

/** Clé du jour logique courant. C'est la fonction la plus utilisée du fichier. */
export function cleAujourdhui(maintenant = new Date()) {
  return cle(dateLogique(maintenant));
}

/** Transforme une clé « AAAA-MM-JJ » en Date locale (minuit). */
export function versDate(k) {
  const [a, m, j] = k.split('-').map(Number);
  return new Date(a, m - 1, j);
}

/** Décale une clé de n jours (n peut être négatif). */
export function ajouterJours(k, n) {
  const d = versDate(k);
  d.setDate(d.getDate() + n);
  return cle(d);
}

/** Jour de la semaine : 0 = dimanche, 1 = lundi … 6 = samedi. */
export function jourSemaine(k) {
  return versDate(k).getDay();
}

/** Numéro du jour dans le mois (1 à 31). Sert à la parité. */
export function numeroDuJour(k) {
  return versDate(k).getDate();
}

/** Vrai si le numéro du jour dans le mois est impair. */
export function estJourImpair(k) {
  return numeroDuJour(k) % 2 === 1;
}

/**
 * Vrai si c'est un jour de stade « par défaut » : mardi (2) ou jeudi (4).
 *
 * Le dimanche n'en fait plus partie : c'était un jour de stade pour le quota
 * de grease the groove, mais pas pour le marqueur (stade), qui gardait ses
 * habitudes affichées ce jour-là. Cette exception n'a plus lieu d'être.
 *
 * Cette valeur n'est qu'un défaut : la journée peut être déclarée autrement
 * depuis l'écran Progression. Voir estStade() dans model.js.
 */
export function estJourDeStade(k) {
  const j = jourSemaine(k);
  return j === 2 || j === 4;
}

/** Lundi de la semaine contenant la clé donnée (semaine lundi → dimanche). */
export function lundiDeLaSemaine(k) {
  const j = jourSemaine(k);
  const recul = j === 0 ? 6 : j - 1; // le dimanche est le 7e jour, pas le 1er
  return ajouterJours(k, -recul);
}

const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
              'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « mardi 2 septembre » — pour l'affichage. */
export function dateLisible(k) {
  const d = versDate(k);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

/** « 02/09 » — format court pour les graphiques. */
export function dateCourte(k) {
  const d = versDate(k);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Nom du jour de la semaine à partir de son numéro. */
export function nomJourSemaine(n) {
  return JOURS[n];
}

/**
 * Millisecondes restantes avant la prochaine réinitialisation (le prochain 4h00).
 * Sert à programmer un minuteur qui bascule de journée même si l'application
 * reste ouverte toute la nuit.
 */
export function msAvantProchainReset(maintenant = new Date()) {
  const prochain = new Date(maintenant);
  prochain.setHours(HEURE_RESET, 0, 0, 0);
  if (prochain <= maintenant) prochain.setDate(prochain.getDate() + 1);
  return prochain.getTime() - maintenant.getTime();
}

// ---------------------------------------------------------------------------
// ui-progression.js — le second écran : tout ce qui n'est pas la liste.
//
// Ordre d'importance à l'écran :
//   1. les heures hors de la maison (tout le quota GTG en dépend) ;
//   2. les protocoles et les habitudes retirées, qui changent la liste du jour ;
//   3. les statistiques, dont le taux par habitude — l'information qui sert
//      vraiment à décider quelles lignes garder.
// ---------------------------------------------------------------------------

import { $, el, vider, montrer, ouvrirModale, fermerModale, confirmer, informer } from './ui-commun.js';
import {
  formatHeures, confirmerHeures, lancerProtocole, arreterProtocole,
  series, serie30jours, tauxParHabitude, ratesDeLaSemaine, taper,
  protocolesActifs, SEUIL_COMME_STADE,
} from './model.js';
import { DUREES_PROTOCOLE } from './defaults.js';
import { dateLisible, dateCourte, jourSemaine, nomJourSemaine, estJourDeStade } from './dates.js';
import { exporterJSON, importerJSON } from './store.js';

let api = null;
let graphique = null;
let saisieHeures = 0;   // valeur actuellement affichée par la réglette

export function initProgression(a) {
  api = a;

  // --- Réglette des heures ---
  const curseur = $('#heures-curseur');
  const majSaisie = (v) => {
    saisieHeures = Math.max(0, Math.min(16, Math.round(v * 4) / 4));
    curseur.value = saisieHeures;
    // On enregistre tout de suite pour que le quota se recalcule sous les yeux,
    // mais la valeur reste marquée « non confirmée » tant qu'on n'a pas validé.
    api.etat.jour.heures = saisieHeures;
    api.etat.jour.heuresOk = false;
    api.rafraichir();
  };
  curseur.addEventListener('input', () => majSaisie(Number(curseur.value)));
  $('#heures-moins').addEventListener('click', () => majSaisie(saisieHeures - 0.25));
  $('#heures-plus').addEventListener('click', () => majSaisie(saisieHeures + 0.25));
  $('#heures-confirmer').addEventListener('click', () => {
    confirmerHeures(api.etat, saisieHeures);
    api.apresAction();
  });

  // --- Boutons de navigation et actions ---
  $('#btn-protocole').addEventListener('click', ouvrirChoixMatiere);
  $('#btn-export').addEventListener('click', ouvrirExport);
  $('#btn-import').addEventListener('click', ouvrirImport);
  $('#fichier-import').addEventListener('change', lireFichierImport);
  for (const b of document.querySelectorAll('[data-vers]')) {
    b.addEventListener('click', () => montrer(b.dataset.vers));
  }
}

export function rendreProgression(etat, jour) {
  $('#prog-date').textContent = dateLisible(jour.date);
  rendreHeures(etat, jour);
  rendreGTG(etat, jour);
  rendreProtocoles(etat, jour);
  rendreRetirees(etat, jour);
  rendreChiffres(etat, jour);
  rendreGraphique(etat, jour);
  rendreTaux(etat, jour);
}

// --- Heures hors de la maison ----------------------------------------------

function rendreHeures(etat, jour) {
  const h = jour.heures;
  saisieHeures = h.valeur;
  $('#heures-curseur').value = h.valeur;
  // « 2h30 », ou « 3h » tout court quand il n'y a pas de minutes.
  $('#heures-valeur').innerHTML = `${Math.floor(h.valeur)}<small>h</small>` +
    (h.valeur % 1 ? String(Math.round((h.valeur % 1) * 60)).padStart(2, '0') : '');

  const etatTxt = $('#heures-etat');
  const p = h.proposition;
  if (h.confirmee) {
    etatTxt.className = '';
    etatTxt.textContent = 'Confirmé pour aujourd’hui.';
  } else if (p.source === 'mediane') {
    etatTxt.className = 'propose';
    etatTxt.textContent = `Proposition d’après tes ${p.n} ${nomJourSemaine(jourSemaine(jour.date))}s — à valider.`;
  } else if (p.source === 'unique' || p.source === 'globale') {
    etatTxt.className = 'propose';
    etatTxt.textContent = 'Proposition provisoire — à valider.';
  } else {
    etatTxt.className = 'propose';
    etatTxt.textContent = 'Pas encore confirmé aujourd’hui.';
  }
  $('#heures-confirmer').disabled = h.confirmee;
}

// --- Rappel du quota GTG ----------------------------------------------------

function rendreGTG(etat, jour) {
  const cible = $('#gtg-resume');
  const vraiStade = estJourDeStade(jour.date);
  let motif;
  if (vraiStade) motif = 'jour de stade : 1 série';
  else if (etat.jour.commeStade) motif = 'compté comme un jour de stade : 1 série';
  else if (jour.heures.valeur >= 10) motif = `${formatHeures(jour.heures.valeur)} dehors, au moins 10 h : 2 séries`;
  else motif = `12 − ${Math.ceil(jour.heures.valeur)} h dehors`;

  const faites = etat.jour.gtgSeries || 0;
  vider(cible);
  cible.append(
    el('div', { class: 'item' }, [
      el('div', { class: 'ptxt' }, [
        el('div', { class: 'ptitre', text: faites >= jour.quota
          ? `Quota atteint — ${faites} série${faites > 1 ? 's' : ''}`
          : `${faites} série${faites > 1 ? 's' : ''} sur ${jour.quota}` }),
        el('div', { class: 'psous', text: motif + (jour.heures.confirmee ? '' : ' · heures non confirmées') }),
      ]),
      jour.heures.confirmee ? null : el('span', { class: 'etiq', text: 'provisoire' }),
    ]),
  );

  // Une journée passée dehors autant qu'un jour de stade donne droit au même
  // quota d'une seule série. La case n'apparaît que si la question se pose,
  // c'est-à-dire à partir de plusieurs heures passées hors de la maison.
  const pertinent = !vraiStade
    && (jour.heures.valeur >= SEUIL_COMME_STADE || etat.jour.commeStade);
  if (!pertinent) return;

  cible.append(el('button', {
    class: `item interrupteur${etat.jour.commeStade ? ' actif' : ''}`,
    onclick: () => { etat.jour.commeStade = !etat.jour.commeStade; api.apresAction(); },
  }, [
    el('div', { class: 'ptxt' }, [
      el('div', { class: 'ptitre', text: 'Comme si j’étais allé au stade' }),
      el('div', { class: 'psous', text: 'autant de temps hors de la maison qu’un jour de stade : 1 seule série' }),
    ]),
    el('span', { class: 'voyant' }, [el('i')]),
  ]));
}

// --- Protocoles d'évaluation ------------------------------------------------

function rendreProtocoles(etat, jour) {
  const cible = $('#liste-protocoles');
  vider(cible);
  if (!jour.protos.length) {
    cible.append(el('div', { class: 'vide', text: 'Aucun protocole en cours.' }));
    return;
  }
  for (const p of jour.protos) {
    const fin = p.fin ? `jusqu’au ${dateLisible(p.fin)}` : 'durée indéterminée';
    const premier = p.debut === jour.date ? ' · feuille blanche obligatoire aujourd’hui' : '';
    cible.append(el('div', { class: 'item' }, [
      el('div', { class: 'ptxt' }, [
        el('div', { class: 'ptitre', text: p.matiere }),
        el('div', { class: 'psous', text: fin + premier }),
      ]),
      el('button', { class: 'paction', text: 'Arrêter', onclick: async () => {
        if (await confirmer('Arrêter le protocole ?', `« ${p.matiere} » ne comptera plus à partir d’aujourd’hui.`, 'Arrêter')) {
          arreterProtocole(etat, p.id);
          api.apresAction();
        }
      } }),
    ]));
  }
}

/** Étape 1 : la matière. Les matières déjà utilisées sont proposées d'un tap. */
function ouvrirChoixMatiere() {
  const champ = el('input', { class: 'champ', type: 'text', placeholder: 'Matière (maths, histoire…)',
    autocapitalize: 'sentences' });

  const anciennes = [...new Set(api.etat.protocoles.map((p) => p.matiere))].slice(-6).reverse();
  const raccourcis = anciennes.length
    ? el('div', { class: 'pile', style: 'margin-top:10px' }, anciennes.map((m) =>
        el('button', { class: 'btn discret', text: m, onclick: () => ouvrirChoixDuree(m) })))
    : null;

  ouvrirModale(
    el('h2', { text: 'Protocole d’évaluation' }),
    el('p', { class: 'intro', text: 'Sur quelle matière porte l’évaluation ?' }),
    champ,
    el('button', { class: 'btn plein', text: 'Suivant', style: 'margin-top:12px',
      onclick: () => { if (champ.value.trim()) ouvrirChoixDuree(champ.value.trim()); } }),
    raccourcis,
  );
  setTimeout(() => champ.focus(), 60);
}

/** Étape 2 : la durée, avec le type d'évaluation correspondant. */
function ouvrirChoixDuree(matiere) {
  const dejaEnCours = protocolesActifs(api.etat).some(
    (p) => p.matiere.toLowerCase() === matiere.toLowerCase());

  ouvrirModale(
    el('h2', { text: matiere }),
    el('p', { class: 'intro', text: dejaEnCours
      ? 'Un protocole tourne déjà sur cette matière : il sera remplacé.'
      : 'Quelle est l’ampleur de l’évaluation ?' }),
    ...DUREES_PROTOCOLE.map((d) => el('button', { class: 'choix', onclick: () => {
      lancerProtocole(api.etat, matiere, d.jours);
      fermerModale();
      api.apresAction();
    } }, [
      el('b', { text: d.libelle }),
      el('span', { text: d.detail }),
    ])),
  );
}

// --- Habitudes retirées aujourd'hui ----------------------------------------

function rendreRetirees(etat, jour) {
  const cible = $('#liste-retirees');
  vider(cible);
  if (!jour.retirees.length) {
    cible.append(el('div', { class: 'vide', text: 'Aucune : toute la liste est affichée.' }));
    return;
  }
  for (const ligne of jour.retirees) {
    const motif = jour.repos
      ? 'dimanche de repos'
      : ligne.retraits.map((r) => r.motif).join(' · ');
    const compteur = ligne.max > 1 ? ` ${Math.min(ligne.valeur, ligne.max)}/${ligne.max}` : '';
    cible.append(el('button', {
      class: `item${ligne.faite ? ' fait' : ''}`,
      onclick: () => { if (taper(etat, ligne, jour)) api.apresAction(); },
    }, [
      el('div', { class: 'ptxt' }, [
        el('div', { class: 'ptitre', text: ligne.nom }),
        el('div', { class: 'psous', text: motif }),
      ]),
      ligne.faite
        ? el('span', { class: 'etiq', text: 'bonus' })
        : el('span', { class: 'paction', text: `Cocher${compteur}` }),
    ]));
  }
}

// --- Statistiques -----------------------------------------------------------

function rendreChiffres(etat, jour) {
  const cible = $('#chiffres');
  const s = series(etat);
  // Un raté ne se compte qu'à la fin d'une journée : le compteur de la semaine
  // ne retient que les jours déjà archivés. Les cases encore vides
  // d'aujourd'hui sont annoncées à part, comme un risque, pas comme un raté.
  const rates = ratesDeLaSemaine(etat, jour.date);
  const enJeu = jourSemaine(jour.date) === 0 ? 0 : jour.rates;
  const jsem = jourSemaine(jour.date);
  const reposPossible = rates < 3;

  vider(cible);
  cible.append(
    tuile(String(s.courante), 'série en cours', s.courante >= 3 ? 'bien' : ''),
    tuile(String(s.meilleure), 'meilleure série'),
    tuile(String(rates), 'ratés cette semaine', reposPossible ? 'bien' : 'alerte'),
  );

  // Rappel de l'état de la règle du dimanche, en toutes lettres.
  const reste = 3 - rates;
  const risque = enJeu ? ` ${enJeu} case${enJeu > 1 ? 's' : ''} encore vide${enJeu > 1 ? 's' : ''} aujourd’hui.` : '';
  $('#regle-dimanche').textContent = (jsem === 0
    ? (jour.repos ? 'Dimanche de repos : la liste n’est pas affichée.'
                  : 'Seuil dépassé : ce dimanche est un jour normal.')
    : reposPossible
      ? `Encore ${reste} raté${reste > 1 ? 's' : ''} possible${reste > 1 ? 's' : ''} avant de perdre le repos du dimanche.`
      : 'Seuil de 3 ratés atteint : pas de repos dimanche.') + risque;
}

function tuile(valeur, libelle, classe = '') {
  return el('div', { class: `chiffre ${classe}`.trim() }, [
    el('b', { text: valeur }),
    el('span', { text: libelle }),
  ]);
}

function rendreGraphique(etat, jour) {
  const donnees = serie30jours(etat, jour);
  const secours = $('#graph-secours');

  if (!window.Chart) {           // CDN injoignable : on dégrade proprement
    secours.hidden = false;
    $('#graph-30').hidden = true;
    return;
  }
  secours.hidden = true;
  $('#graph-30').hidden = false;

  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--accent').trim();
  const attenue = style.getPropertyValue('--attenue').trim();
  const filet = style.getPropertyValue('--filet').trim();

  const labels = donnees.map((d) => dateCourte(d.date));
  const cochees = donnees.map((d) => d.faites);
  const taux = donnees.map((d) => (d.taux === null ? null : Math.round(d.taux * 100)));

  if (graphique) {
    graphique.data.labels = labels;
    graphique.data.datasets[0].data = cochees;
    graphique.data.datasets[1].data = taux;
    graphique.update('none');
    return;
  }

  graphique = new Chart($('#graph-30'), {
    data: {
      labels,
      datasets: [
        { type: 'bar', data: cochees, backgroundColor: accent, borderRadius: 2,
          barPercentage: 0.72, categoryPercentage: 0.9, yAxisID: 'y', order: 2 },
        { type: 'line', data: taux, borderColor: attenue, borderWidth: 1.4,
          pointRadius: 0, tension: 0.35, spanGaps: true, yAxisID: 'y1', order: 1 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 260 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            label: (c) => (c.datasetIndex === 0
              ? `${c.raw} cochée${c.raw > 1 ? 's' : ''} sur ${donnees[c.dataIndex].total}`
              : `${c.raw}% de complétion`),
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: filet },
          ticks: { color: attenue, font: { size: 9 }, maxRotation: 0, autoSkip: false,
            callback: (v, i) => (i % 6 === 0 || i === labels.length - 1 ? labels[i] : '') },
        },
        y: {
          beginAtZero: true, grid: { color: filet }, border: { display: false },
          ticks: { color: attenue, font: { size: 9 }, precision: 0, maxTicksLimit: 4 },
        },
        y1: {
          display: false, min: 0, max: 100, position: 'right',
        },
      },
    },
  });
}

function rendreTaux(etat, jour) {
  const cible = $('#taux-habitudes');
  vider(cible);
  const lignes = tauxParHabitude(etat, 30, jour);
  if (!lignes.length) {
    cible.append(el('div', { class: 'vide', text: 'Pas encore assez d’historique.' }));
    return;
  }
  for (const l of lignes) {
    const pct = Math.round(l.taux * 100);
    const classe = pct < 40 ? 'faible' : pct >= 85 ? 'forte' : '';
    cible.append(el('div', { class: `barre ${classe}`.trim() }, [
      el('div', { class: 'haut' }, [
        el('b', { text: l.nom }),
        el('span', { text: `${pct}% · ${l.faites}/${l.total}` }),
      ]),
      el('div', { class: 'piste' }, [el('div', { class: 'jauge', style: `width:${pct}%` })]),
    ]));
  }
}

// --- Export / import --------------------------------------------------------

function ouvrirExport() {
  const json = exporterJSON();
  const nom = `liste-${api.etat.jour.date}.json`;
  const zone = el('textarea', { class: 'champ', rows: 5, readonly: 'readonly', style: 'margin-top:12px' });
  zone.value = json;

  ouvrirModale(
    el('h2', { text: 'Exporter' }),
    el('p', { class: 'intro', text: 'Enregistre le fichier, ou copie le texte quelque part de sûr.' }),
    el('div', { class: 'pile' }, [
      el('button', { class: 'btn plein', text: 'Enregistrer le fichier', onclick: () => {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = el('a', { href: url, download: nom });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      } }),
      el('button', { class: 'btn', text: 'Copier le texte', onclick: async () => {
        try {
          await navigator.clipboard.writeText(json);
          informer('Copié', 'La sauvegarde est dans le presse-papier.');
        } catch {
          zone.select();
          informer('À copier à la main', 'Sélectionne le texte puis copie-le.');
        }
      } }),
      el('button', { class: 'btn discret', text: 'Fermer', onclick: fermerModale }),
    ]),
    zone,
  );
}

function ouvrirImport() {
  const zone = el('textarea', { class: 'champ', rows: 5, placeholder: 'Colle ici le contenu d’une sauvegarde',
    style: 'margin-top:12px' });
  ouvrirModale(
    el('h2', { text: 'Importer' }),
    el('p', { class: 'intro', text: 'L’import remplace entièrement les données actuelles.' }),
    el('div', { class: 'pile' }, [
      el('button', { class: 'btn', text: 'Choisir un fichier', onclick: () => $('#fichier-import').click() }),
      el('button', { class: 'btn plein', text: 'Importer le texte collé',
        onclick: () => appliquerImport(zone.value) }),
      el('button', { class: 'btn discret', text: 'Annuler', onclick: fermerModale }),
    ]),
    zone,
  );
}

function lireFichierImport(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const lecteur = new FileReader();
  lecteur.onload = () => appliquerImport(String(lecteur.result));
  lecteur.readAsText(f);
  e.target.value = ''; // pour pouvoir réimporter le même fichier ensuite
}

async function appliquerImport(texte) {
  if (!texte.trim()) return;
  const ok = await confirmer('Remplacer toutes les données ?',
    'Les habitudes, l’historique et les protocoles actuels seront écrasés.', 'Remplacer');
  if (!ok) return;
  const erreur = importerJSON(texte);
  if (erreur) { informer('Import impossible', erreur); return; }
  fermerModale();
  api.rechargerApresImport();
}

// ---------------------------------------------------------------------------
// ui-detail.js — l'écran Détail, ouvert depuis Progression.
//
// Tout ce qui demande à être lu posément plutôt que consulté d'un coup d'œil :
// le graphique en grand, les moyennes par période, le taux par jour de la
// semaine, et le classement des habitudes.
//
// La journée en cours n'entre dans aucune moyenne : elle n'est pas finie, et
// son taux partiel tirerait tous les chiffres vers le bas. Seul le graphique
// la montre, comme dernière barre.
// ---------------------------------------------------------------------------

import { $, el, vider, confirmer, ouvrirModale, fermerModale } from './ui-commun.js';
import {
  serie30jours, statsPeriode, tauxParJourSemaine, tendance,
  tauxParHabitude, oublierHabitude, series,
  veilleModifiable, cocherVeille,
} from './model.js';
import { dessinerTaux, graphiqueDisponible } from './graphique.js';
import { dateLisible } from './dates.js';

let api = null;

export function initDetail(a) { api = a; }

/** « 73 % », ou « — » quand la période ne contient aucune journée. */
function pct(x) {
  return x === null || x === undefined ? '—' : `${Math.round(x * 100)} %`;
}

export function rendreDetail(etat, jour) {
  const cible = $('#detail-contenu');
  vider(cible);

  // Le graphique vit dans index.html, hors de la zone reconstruite : sa toile
  // reste le même élément d'un affichage à l'autre, et Chart.js peut la
  // retrouver au lieu de peindre sur une toile détachée.
  const toile = $('#graph-detail');
  const secours = $('#detail-secours');
  secours.hidden = graphiqueDisponible();
  toile.hidden = !graphiqueDisponible();
  dessinerTaux(toile, serie30jours(etat, jour), { hauteurEtiquettes: 5 });

  cible.append(blocVeille(etat));
  cible.append(blocPeriodes(etat));
  cible.append(blocTendance(etat));
  cible.append(blocSemaine(etat));
  cible.append(blocHabitudes(etat, jour));
}

// --- Le rattrapage de la veille ---------------------------------------------

/**
 * Ce bloc n'a de sens qu'aujourd'hui : demain, hier ne sera plus modifiable.
 * Il est donc placé en tête de l'écran, avant les statistiques qu'on lit
 * posément — c'est la seule chose ici qui expire.
 */
function blocVeille(etat) {
  const v = veilleModifiable(etat);
  const bloc = el('section', { class: 'bloc' }, [el('h2', { text: 'Hier' })]);

  if (!v) {
    bloc.append(el('div', { class: 'vide',
      text: 'Rien à corriger : aucune journée enregistrée hier.' }));
    return bloc;
  }

  bloc.append(el('div', { class: 'item' }, [
    el('div', { class: 'ptxt' }, [
      el('div', { class: 'ptitre', text: v.oubliees
        ? `${v.oubliees} case${v.oubliees > 1 ? 's' : ''} non cochée${v.oubliees > 1 ? 's' : ''}`
        : 'Tout était coché' }),
      el('div', { class: 'psous', text: `${dateLisible(v.date)} · ${v.faites} sur ${v.total}` }),
    ]),
    el('button', { class: 'paction', text: 'Corriger',
      onclick: () => ouvrirRattrapage(etat) }),
  ]));
  bloc.append(el('p', { class: 'vide', style: 'margin:8px 0 0',
    text: 'Seule la veille se corrige. Demain, cette journée sera close.' }));
  return bloc;
}

/** La feuille où l'on coche et décoche les habitudes d'hier. */
function ouvrirRattrapage(etat) {
  const dessiner = () => {
    const v = veilleModifiable(etat);
    if (!v) { fermerModale(); return; }

    // Les oubliées d'abord : ce sont elles qu'on vient corriger.
    const lignes = [...v.lignes].sort((a, b) => Number(a.faite) - Number(b.faite));

    ouvrirModale(
      el('h2', { text: 'Corriger hier' }),
      el('p', { class: 'intro',
        text: `${dateLisible(v.date)} — ${v.faites} cochée${v.faites > 1 ? 's' : ''} sur ${v.total}.` }),
      el('div', { class: 'rattrapage' }, lignes.map((l) => el('button', {
        class: `veille${l.faite ? ' faite' : ''}`,
        onclick: () => {
          if (cocherVeille(etat, l.nom, !l.faite)) {
            api.apresAction();   // ratés, séries et graphique suivent aussitôt
            dessiner();          // et la feuille se redessine sur place
          }
        },
      }, [
        el('span', { class: 'marque-veille', text: l.faite ? '✓' : '' }),
        el('span', { class: 'nom-veille', text: l.nom }),
      ]))),
      el('button', { class: 'btn plein', text: 'Terminé', style: 'margin-top:14px',
        onclick: fermerModale }),
    );
  };
  dessiner();
}

// --- Les moyennes par période -----------------------------------------------

const PERIODES = [
  { jours: 7,    titre: '7 derniers jours' },
  { jours: 30,   titre: '30 derniers jours' },
  { jours: 90,   titre: '3 derniers mois' },
  { jours: null, titre: 'Depuis le début' },
];

function blocPeriodes(etat) {
  const bloc = el('section', { class: 'bloc' }, [
    el('h2', { text: 'Moyennes' }),
    el('p', { class: 'vide', style: 'margin:-6px 0 12px',
      text: 'La journée en cours n’est pas comptée : elle n’est pas finie.' }),
  ]);

  for (const p of PERIODES) {
    const s = statsPeriode(etat, p.jours);
    if (!s.joursComptes) {
      bloc.append(el('div', { class: 'periode' }, [
        el('h3', { text: p.titre }),
        el('div', { class: 'vide', text: 'Aucune journée terminée sur cette période.' }),
      ]));
      continue;
    }
    bloc.append(el('div', { class: 'periode' }, [
      el('h3', { text: p.titre }),
      el('div', { class: 'grand-taux' }, [
        el('b', { text: pct(s.tauxMoyen) }),
        el('span', { text: `moyenne sur ${s.joursComptes} jour${s.joursComptes > 1 ? 's' : ''}` }),
      ]),
      el('dl', { class: 'faits' }, [
        ...fait('Cases cochées', `${s.faites} sur ${s.total}`, `soit ${pct(s.tauxGlobal)}`),
        ...fait('Ratés', String(s.rates), `${s.ratesParJour.toFixed(1).replace('.', ',')} par jour`),
        ...fait('Journées parfaites', String(s.parfaits),
                `sur ${s.joursComptes}${s.joursRepos ? ` · ${s.joursRepos} repos` : ''}`),
        ...fait('Meilleure', pct(s.meilleur.taux), joli(s.meilleur.date)),
        ...fait('Plus basse', pct(s.pire.taux), joli(s.pire.date)),
      ]),
    ]));
  }
  return bloc;
}

/** Une ligne « intitulé — valeur — précision ». */
function fait(intitule, valeur, precision) {
  return [
    el('dt', { text: intitule }),
    el('dd', {}, [
      el('b', { text: valeur }),
      precision ? el('i', { text: precision }) : null,
    ]),
  ];
}

/** « 04/09 » — assez pour situer un jour dans les trois derniers mois. */
function joli(k) {
  const [, m, j] = k.split('-');
  return `le ${j}/${m}`;
}

// --- La tendance -------------------------------------------------------------

function blocTendance(etat) {
  const t = tendance(etat);
  const s = series(etat);
  const bloc = el('section', { class: 'bloc' }, [el('h2', { text: 'Tendance' })]);

  if (t.delta === null) {
    bloc.append(el('div', { class: 'vide',
      text: 'Il faut deux semaines terminées pour comparer.' }));
  } else {
    const pts = Math.round(t.delta * 100);
    const sens = pts > 0 ? 'hausse' : pts < 0 ? 'baisse' : 'stable';
    bloc.append(el('div', { class: `tendance ${sens}` }, [
      el('b', { text: `${pts > 0 ? '+' : ''}${pts} points` }),
      el('span', { text: `${pct(t.avant.tauxMoyen)} la semaine d’avant, ${pct(t.recent.tauxMoyen)} cette semaine` }),
    ]));
  }

  bloc.append(el('dl', { class: 'faits' }, [
    ...fait('Série en cours', `${s.courante} jour${s.courante > 1 ? 's' : ''}`, 'sans aucun raté'),
    ...fait('Meilleure série', `${s.meilleure} jour${s.meilleure > 1 ? 's' : ''}`, ''),
  ]));
  return bloc;
}

// --- Le taux par jour de la semaine ------------------------------------------

function blocSemaine(etat) {
  const bloc = el('section', { class: 'bloc' }, [
    el('h2', { text: 'Par jour de la semaine' }),
    el('p', { class: 'vide', style: 'margin:-6px 0 10px',
      text: 'Le taux tient compte de la longueur de la liste : les jours courts ne sont pas avantagés.' }),
  ]);
  const lignes = tauxParJourSemaine(etat);
  if (!lignes.some((l) => l.taux !== null)) {
    bloc.append(el('div', { class: 'vide', text: 'Pas encore d’historique.' }));
    return bloc;
  }
  for (const l of lignes) {
    const p = l.taux === null ? 0 : Math.round(l.taux * 100);
    bloc.append(el('div', { class: `barre ${p < 40 ? 'faible' : p >= 85 ? 'forte' : ''}`.trim() }, [
      el('div', { class: 'haut' }, [
        el('b', { text: l.nom }),
        el('span', { text: l.taux === null ? '—' : `${p} % · ${l.jours} j` }),
      ]),
      el('div', { class: 'piste' }, [el('div', { class: 'jauge', style: `width:${p}%` })]),
    ]));
  }
  return bloc;
}

// --- Le classement des habitudes ---------------------------------------------

function blocHabitudes(etat, jour) {
  const bloc = el('section', { class: 'bloc' }, [
    el('h2', { text: 'Taux de réussite par habitude' }),
  ]);
  const lignes = tauxParHabitude(etat, 30, jour);
  if (!lignes.length) {
    bloc.append(el('div', { class: 'vide', text: 'Pas encore assez d’historique.' }));
    return bloc;
  }

  // Ce classement sert à décider quelles lignes garder : il ne montre donc que
  // les habitudes de la liste actuelle. Celles qu'on en a retirées sont
  // reléguées plus bas, avec de quoi les oublier pour de bon.
  const actuelles = lignes.filter((l) => l.actuelle);
  const anciennes = lignes.filter((l) => !l.actuelle);

  for (const l of actuelles) bloc.append(barreHabitude(l));

  if (anciennes.length) {
    bloc.append(el('div', { class: 'anciennes' }, [
      el('h3', { text: 'Retirées de la liste' }),
      el('p', { class: 'vide', style: 'margin:-2px 0 8px',
        text: 'Leur historique est gardé au cas où elles reviendraient. La croix l’efface définitivement.' }),
      ...anciennes.map((l) => barreHabitude(l, async () => {
        if (!await confirmer('Oublier cette habitude ?',
          `L’historique de « ${l.nom} » sera effacé. Les taux des journées passées, eux, ne changent pas.`,
          'Oublier')) return;
        oublierHabitude(etat, l.nom);
        api.apresAction();
      })),
    ]));
  }
  return bloc;
}

/** Une barre du classement. `oublier` ajoute la croix de suppression. */
function barreHabitude(l, oublier) {
  const p = Math.round(l.taux * 100);
  return el('div', { class: `barre ${p < 40 ? 'faible' : p >= 85 ? 'forte' : ''}`.trim() }, [
    el('div', { class: 'haut' }, [
      el('b', { text: l.nom }),
      el('span', { text: `${p} % · ${l.faites}/${l.total}` }),
      oublier ? el('button', { class: 'oublier', text: '✕',
        'aria-label': 'Oublier cette habitude', onclick: oublier }) : null,
    ]),
    el('div', { class: 'piste' }, [el('div', { class: 'jauge', style: `width:${p}%` })]),
  ]);
}

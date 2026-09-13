// ---------------------------------------------------------------------------
// graphique.js — le graphique de l'historique, dessiné par Chart.js.
//
// Il apparaît à trois endroits : en petit sur l'écran Progression, en grand
// sur l'écran Détail, et en plein écran quand on l'agrandit. Même code, trois
// toiles. Les instances sont gardées dans une table pour être mises à jour
// plutôt que recréées à chaque affichage — une instance Chart.js oubliée
// continue de vivre et fuit.
//
// Deux mesures possibles en ordonnée :
//
//  - « ratés » : le nombre de cases non cochées dans la journée. C'est la
//    mesure juste quand la liste ne fait pas la même longueur tous les jours :
//    un jeudi où trois habitudes sont masquées, le pourcentage compare une
//    journée de douze cases à une journée de quinze, alors que le nombre de
//    ratés compte la même chose partout. L'axe est renversé — le zéro en haut
//    — et la barre part du bas pour monter jusqu'à sa valeur : une barre haute
//    est une bonne journée, exactement comme en pourcentage.
//
//  - « réussite » : le pourcentage, conservé parce qu'il répond à l'autre
//    question — quelle part de ma journée est-ce que je fais.
// ---------------------------------------------------------------------------

import { dateCourte } from './dates.js';

const instances = new Map();

/** Vrai si Chart.js a bien été chargé depuis le CDN. */
export function graphiqueDisponible() {
  return Boolean(window.Chart);
}

/**
 * Combien d'étiquettes de dates afficher sous le graphique.
 *
 * On rend un pas : une étiquette toutes les N barres. Trois jours tiennent
 * tous ; deux cents jours n'en supportent qu'une poignée.
 */
function pasEtiquettes(nombre, cible = 6) {
  return Math.max(1, Math.ceil(nombre / cible));
}

/**
 * Quelles barres reçoivent leur date.
 *
 * On compte à rebours depuis la dernière : la date du jour est le repère qui
 * compte le plus, elle doit toujours être écrite. Compter depuis la première
 * et forcer la dernière en plus, comme on le faisait, produit deux étiquettes
 * collées quand le compte ne tombe pas juste — « 12/0913/09 ».
 */
function etiquette(labels, pas) {
  return (v, i) => ((labels.length - 1 - i) % pas === 0 ? labels[i] : '');
}

/**
 * Le plafond de l'axe des ratés : le nombre de ratés à partir duquel la barre
 * disparaît tout à fait.
 *
 * Il est fixe, et c'est un choix. Le faire suivre le pire jour de la fenêtre
 * remplirait toujours la hauteur, mais l'échelle changerait d'une fenêtre à
 * l'autre : une semaine calme et une semaine difficile se ressembleraient, et
 * une seule très mauvaise journée écraserait toutes les autres. Fixe, toutes
 * les fenêtres se comparent entre elles d'un coup d'œil.
 *
 * Douze, parce que c'est la plus courte des listes du propriétaire. Au-delà,
 * il n'y a plus de barre du tout — une journée à quinze ratés se lit comme une
 * journée à douze, ce qui est sans importance : à ce niveau-là on ne cherche
 * plus à mesurer, on constate.
 */
const PLAFOND_RATES = 12;

/**
 * Le pas des graduations : le plus petit qui divise le plafond et laisse au
 * plus cinq intervalles. Douze donne trois — 0, 3, 6, 9, 12.
 */
function pasAxe(plafond) {
  for (const pas of [1, 2, 3, 4, 5, 10, 20, 25, 50]) {
    if (plafond % pas === 0 && plafond / pas <= 5) return pas;
  }
  return Math.ceil(plafond / 5);
}

/**
 * Dessine ou met à jour le graphique.
 *
 * `donnees` vient de serieJours() : une entrée par jour, portant les deux
 * mesures. `mesure` vaut 'rates' ou 'taux'.
 */
export function dessinerGraphique(toile, donnees, { mesure = 'rates', cible = 6 } = {}) {
  if (!graphiqueDisponible() || !toile) return;

  const style = getComputedStyle(document.documentElement);
  const encre = style.getPropertyValue('--signal').trim();
  const pale = style.getPropertyValue('--encre-pale').trim();
  const douce = style.getPropertyValue('--encre-douce').trim();
  const reglure = style.getPropertyValue('--filet').trim();

  const ratés = mesure === 'rates';
  const labels = donnees.map((d) => dateCourte(d.date));
  // En ratés, la valeur est plafonnée : au-delà du plafond la barre n'existe
  // plus, et il vaut mieux la ramener sur le bord que la laisser déborder du
  // cadre. L'infobulle, elle, dit toujours le vrai nombre.
  const valeurs = donnees.map((d) => (ratés
    ? (d.rates === null ? null : Math.min(d.rates, PLAFOND_RATES))
    : (d.taux === null ? null : Math.round(d.taux * 100))));

  // La journée en cours est dessinée plus pâle. Elle n'est pas finie : en
  // ratés, elle en compte forcément beaucoup le matin, et il ne faut pas la
  // lire comme une mauvaise journée. Elle est exclue de la moyenne pour la
  // même raison.
  const couleurs = donnees.map((d) => (d.encours ? pale : encre));

  const pas = pasEtiquettes(labels.length, cible);

  // En ratés, l'axe est renversé — le zéro en haut — et la barre part du bas
  // pour monter jusqu'à sa valeur. Peu de ratés donne donc une barre haute, et
  // une journée parfaite une barre pleine. C'est la même lecture que le
  // pourcentage : plus c'est haut, mieux c'est. `base` dit où la barre
  // commence ; sans elle, Chart.js les fait pendre depuis le zéro.
  const axeY = ratés
    ? { min: 0, max: PLAFOND_RATES, reverse: true, base: PLAFOND_RATES,
        ticks: { stepSize: pasAxe(PLAFOND_RATES), callback: (v) => v } }
    : { min: 0, max: 100, reverse: false, base: 0,
        ticks: { stepSize: 50, callback: (v) => `${v} %` } };

  const infobulle = (c) => {
    const d = donnees[c.dataIndex];
    if (d.repos) return 'Dimanche de repos';
    if (d.vide) return 'Aucune journée enregistrée';
    const encours = d.encours ? ' (journée en cours)' : '';
    return ratés
      ? `${d.rates} raté${d.rates > 1 ? 's' : ''} sur ${d.total} case${d.total > 1 ? 's' : ''}${encours}`
      : `${c.raw} % — ${d.faites} cochée${d.faites > 1 ? 's' : ''} sur ${d.total}${encours}`;
  };

  const existant = instances.get(toile.id);
  if (existant) {
    // L'identifiant nomme une place, pas un objet : une toile refabriquée porte
    // le même nom sans être le même élément. Si l'instance est restée accrochée
    // à l'ancienne toile, elle peindrait dans le vide — la nouvelle resterait
    // blanche. On vérifie donc l'identité de l'élément, pas son nom.
    if (existant.canvas === toile && toile.isConnected) {
      existant.data.labels = labels;
      existant.data.datasets[0].data = valeurs;
      existant.data.datasets[0].backgroundColor = couleurs;
      existant.data.datasets[0].base = axeY.base;
      const y = existant.options.scales.y;
      y.min = axeY.min; y.max = axeY.max; y.reverse = axeY.reverse;
      y.ticks.stepSize = axeY.ticks.stepSize;
      y.ticks.callback = axeY.ticks.callback;
      const x = existant.options.scales.x;
      x.ticks.callback = etiquette(labels, pas);
      existant.options.plugins.tooltip.callbacks.label = infobulle;
      existant.update('none');
      // La toile a pu être mesurée alors que son écran était encore masqué :
      // on lui redonne ses dimensions au cas où.
      existant.resize();
      return;
    }
    existant.destroy();
    instances.delete(toile.id);
  }

  instances.set(toile.id, new window.Chart(toile, {
    data: {
      labels,
      datasets: [{ type: 'bar', data: valeurs, backgroundColor: couleurs, borderRadius: 2,
                   base: axeY.base, barPercentage: 0.72, categoryPercentage: 0.9 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 260 },
      plugins: {
        legend: { display: false },
        tooltip: { displayColors: false, callbacks: { label: infobulle } },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: reglure },
          ticks: { color: douce, font: { size: 9 }, maxRotation: 0, autoSkip: false,
            callback: etiquette(labels, pas) },
        },
        y: {
          min: axeY.min, max: axeY.max, reverse: axeY.reverse,
          grid: { color: reglure }, border: { display: false },
          ticks: { color: douce, font: { size: 9 },
                   stepSize: axeY.ticks.stepSize, callback: axeY.ticks.callback },
        },
      },
    },
  }));
}

/** Oublie l'instance attachée à une toile — à appeler quand on la démonte. */
export function oublierGraphique(id) {
  const c = instances.get(id);
  if (c) { c.destroy(); instances.delete(id); }
}

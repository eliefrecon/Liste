// ---------------------------------------------------------------------------
// graphique.js — le graphique du taux de réussite, dessiné par Chart.js.
//
// Il apparaît à deux endroits : en petit sur l'écran Progression, en grand sur
// l'écran Détail. Même code, deux toiles. Les instances sont gardées dans une
// table pour être mises à jour plutôt que recréées à chaque affichage — une
// instance Chart.js oubliée continue de vivre et fuit.
// ---------------------------------------------------------------------------

import { dateCourte } from './dates.js';

const instances = new Map();

/** Vrai si Chart.js a bien été chargé depuis le CDN. */
export function graphiqueDisponible() {
  return Boolean(window.Chart);
}

/**
 * Dessine ou met à jour le graphique.
 *
 * `donnees` vient de serie30jours() : une entrée par jour, avec son taux.
 * Les barres montrent le taux et non le nombre de cases : le dénominateur
 * étant le nombre d'habitudes réellement affichées, un jeudi tout coché donne
 * 100 %, comparable à n'importe quel autre jour.
 */
export function dessinerTaux(toile, donnees, { hauteurEtiquettes = 6 } = {}) {
  if (!graphiqueDisponible() || !toile) return;

  const style = getComputedStyle(document.documentElement);
  const vert = style.getPropertyValue('--vert').trim();
  const douce = style.getPropertyValue('--encre-douce').trim();
  const reglure = style.getPropertyValue('--reglure').trim();

  const labels = donnees.map((d) => dateCourte(d.date));
  const taux = donnees.map((d) => (d.taux === null ? null : Math.round(d.taux * 100)));

  const existant = instances.get(toile.id);
  if (existant) {
    existant.data.labels = labels;
    existant.data.datasets[0].data = taux;
    existant.update('none');
    return;
  }

  instances.set(toile.id, new window.Chart(toile, {
    data: {
      labels,
      datasets: [{ type: 'bar', data: taux, backgroundColor: vert, borderRadius: 2,
                   barPercentage: 0.72, categoryPercentage: 0.9 }],
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
            label: (c) => {
              const d = donnees[c.dataIndex];
              return `${c.raw} % — ${d.faites} cochée${d.faites > 1 ? 's' : ''} sur ${d.total}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: reglure },
          ticks: { color: douce, font: { size: 9 }, maxRotation: 0, autoSkip: false,
            callback: (v, i) => (i % hauteurEtiquettes === 0 || i === labels.length - 1
              ? labels[i] : '') },
        },
        y: {
          min: 0, max: 100,
          grid: { color: reglure }, border: { display: false },
          ticks: { color: douce, font: { size: 9 }, stepSize: 50, callback: (v) => `${v} %` },
        },
      },
    },
  }));
}

// ---------------------------------------------------------------------------
// parser.js — lecture de la liste d'habitudes écrite en texte libre.
//
// Une ligne = une habitude. Syntaxe :
//     nom de l'habitude (marqueur)(marqueur) poids
//
// Exemple :  Programmation (évale)(stade) 2
//
// Difficulté principale : certains noms contiennent eux-mêmes des parenthèses
// (« Eau (3L) », « Lire 6 pages (Pape, Paulo, David) »). Seuls trois contenus
// de parenthèses sont des marqueurs : évale, stade, jeudi. Tout le reste fait
// partie du nom.
// ---------------------------------------------------------------------------

/** Les trois seuls marqueurs de retrait reconnus. */
export const MARQUEURS = ['évale', 'stade', 'jeudi'];

// On accepte la saisie sans accent (« (evale) ») pour ne pas piéger l'utilisateur.
const RE_MARQUEUR = /\(\s*(évale|evale|stade|jeudi)\s*\)/gi;

// Un poids = un nombre isolé en fin de ligne, précédé d'une espace.
// « Poser tel à 21h15 » ne matche pas : il n'y a pas d'espace avant « 15 ».
const RE_POIDS = /\s+(\d+)\s*$/;

/** Enlève les accents et passe en minuscules — pour comparer des marqueurs. */
export function sansAccent(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Analyse une seule ligne.
 * Renvoie { vide, nom, marqueurs, poids, valide, erreur, brut }.
 */
export function analyserLigne(brut) {
  const res = { brut, vide: false, nom: '', marqueurs: [], poids: 0, valide: true, erreur: '' };

  if (!brut.trim()) {
    res.vide = true;
    return res;
  }

  let reste = brut;

  // 1. Le poids, tout à la fin.
  const mPoids = reste.match(RE_POIDS);
  if (mPoids) {
    res.poids = Number(mPoids[1]);
    reste = reste.slice(0, mPoids.index);
  }

  // 2. Les marqueurs, où qu'ils soient. On les retire du texte au passage.
  reste = reste.replace(RE_MARQUEUR, (_m, mot) => {
    const normalise = sansAccent(mot) === 'evale' ? 'évale' : sansAccent(mot);
    if (!res.marqueurs.includes(normalise)) res.marqueurs.push(normalise);
    return ' ';
  });

  // 3. Ce qui reste est le nom.
  res.nom = reste.trim().replace(/\s+/g, ' ');

  // 4. Contrôles de syntaxe. On signale sans jamais bloquer la saisie.
  if (!res.nom) {
    res.valide = false;
    res.erreur = 'nom vide';
  } else if (!parenthesesEquilibrees(res.nom)) {
    res.valide = false;
    res.erreur = 'parenthèse non fermée';
  } else if (res.poids > 2) {
    res.valide = false;
    res.erreur = 'le poids doit être 1 ou 2';
  }

  return res;
}

/** Vérifie que les parenthèses restantes dans le nom sont bien appariées. */
function parenthesesEquilibrees(txt) {
  let n = 0;
  for (const c of txt) {
    if (c === '(') n++;
    else if (c === ')') n--;
    if (n < 0) return false;
  }
  return n === 0;
}

/**
 * Analyse la liste entière.
 * Renvoie { habitudes, lignes } :
 *  - habitudes : uniquement les lignes valides et non vides, dans l'ordre ;
 *  - lignes    : le détail de chaque ligne (utile à l'éditeur pour colorer
 *                et signaler les erreurs).
 */
export function analyserListe(texte) {
  const lignes = String(texte || '').split('\n').map(analyserLigne);

  // Les doublons de nom sont interdits : le nom sert de clé pour l'historique.
  const vus = new Set();
  for (const l of lignes) {
    if (l.vide || !l.valide) continue;
    const k = l.nom.toLowerCase();
    if (vus.has(k)) {
      l.valide = false;
      l.erreur = 'nom en double';
    } else {
      vus.add(k);
    }
  }

  const habitudes = lignes.filter((l) => !l.vide && l.valide)
    .map((l) => ({ nom: l.nom, marqueurs: l.marqueurs, poids: l.poids }));

  return { habitudes, lignes };
}

// --- Coloration syntaxique de l'éditeur ------------------------------------

function echapper(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Produit le HTML coloré affiché derrière la zone de texte :
 * marqueurs en rouge, poids en bleu, ligne fautive soulignée.
 */
export function colorer(texte) {
  return String(texte || '').split('\n').map((brut) => {
    const info = analyserLigne(brut);
    let html = echapper(brut);

    // Poids en bleu (on le traite avant les marqueurs, il est en fin de ligne).
    html = html.replace(RE_POIDS, (m, n) => m.replace(n, `<b class="w">${n}</b>`));
    // Marqueurs en rouge.
    html = html.replace(RE_MARQUEUR, (m) => `<b class="m">${m}</b>`);

    const classe = !info.vide && !info.valide ? ' class="err"' : '';
    const titre = info.erreur ? ` title="${echapper(info.erreur)}"` : '';
    // Le ​ garde une hauteur de ligne sur les lignes vides.
    return `<span${classe}${titre}>${html || '&#8203;'}</span>`;
  }).join('\n');
}

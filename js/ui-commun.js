// ---------------------------------------------------------------------------
// ui-commun.js — les quelques outils partagés par tous les écrans :
// raccourcis DOM, navigation entre écrans, modale glissante.
// ---------------------------------------------------------------------------

export const $ = (sel, racine = document) => racine.querySelector(sel);
export const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];

/** Crée un élément : el('div', {class:'x', text:'a'}, [enfants]) */
export function el(balise, props = {}, enfants = []) {
  const n = document.createElement(balise);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'style') n.setAttribute('style', v);
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== false && v !== undefined) n.setAttribute(k, v);
  }
  for (const e of [].concat(enfants)) if (e) n.append(e);
  return n;
}

/** Vide un conteneur. */
export function vider(n) { while (n.firstChild) n.removeChild(n.firstChild); }

// --- Navigation ------------------------------------------------------------

// Le rang sert à choisir le sens de la transition : on glisse vers la droite
// quand on s'enfonce dans l'application, vers la gauche quand on revient.
const ECRANS = {
  liste:       { id: 'ecran-liste',       rang: 0 },
  progression: { id: 'ecran-progression', rang: 1 },
  editeur:     { id: 'ecran-editeur',     rang: 2 },
  regles:      { id: 'ecran-regles',      rang: 2 },
};

let courant = 'liste';
const abonnes = {};

/** Enregistre une fonction appelée à chaque entrée sur un écran. */
export function surEntree(nom, fn) { abonnes[nom] = fn; }

export function ecranCourant() { return courant; }

export function montrer(nom) {
  if (!ECRANS[nom] || nom === courant) return;
  const avant = ECRANS[courant];
  const apres = ECRANS[nom];
  const noeudAvant = document.getElementById(avant.id);
  const noeudApres = document.getElementById(apres.id);

  noeudAvant.classList.remove('actif');
  noeudAvant.classList.toggle('gauche', apres.rang > avant.rang);
  noeudApres.classList.remove('gauche');
  noeudApres.classList.add('actif');

  courant = nom;
  if (abonnes[nom]) abonnes[nom]();
}

// --- Modale ----------------------------------------------------------------

const fond = () => document.getElementById('modale');
const feuille = () => document.getElementById('modale-contenu');

/** Ouvre la feuille du bas avec le contenu donné. */
export function ouvrirModale(...contenu) {
  const f = feuille();
  vider(f);
  for (const c of contenu) if (c) f.append(c);
  fond().hidden = false;
}

export function fermerModale() { fond().hidden = true; vider(feuille()); }

// Taper à côté de la feuille referme la modale (l'overlay GTG, lui,
// n'utilise pas ce mécanisme : il faut choisir).
document.addEventListener('pointerdown', (e) => {
  const f = fond();
  if (!f.hidden && e.target === f) fermerModale();
});

/** Petite confirmation « oui / non », renvoie une promesse. */
export function confirmer(titre, texte, libelleOui = 'Confirmer') {
  return new Promise((resolve) => {
    const oui = el('button', { class: 'btn plein', text: libelleOui,
      onclick: () => { fermerModale(); resolve(true); } });
    const non = el('button', { class: 'btn discret', text: 'Annuler',
      onclick: () => { fermerModale(); resolve(false); } });
    ouvrirModale(
      el('h2', { text: titre }),
      el('p', { class: 'intro', text: texte }),
      el('div', { class: 'pile' }, [oui, non]),
    );
  });
}

/** Message simple avec un seul bouton. */
export function informer(titre, texte) {
  ouvrirModale(
    el('h2', { text: titre }),
    el('p', { class: 'intro', text: texte }),
    el('button', { class: 'btn', text: 'Fermer', onclick: fermerModale }),
  );
}

# Liste

Suivi d'habitudes quotidiennes. Un seul téléphone, aucune synchronisation,
aucune étape de compilation : HTML, CSS et JavaScript, servis tels quels.

---

## Mise en ligne sur GitHub Pages

1. **Créer le dépôt.** Sur github.com : *New repository*, nom au choix
   (par exemple `liste`), visibilité *Private* ou *Public* — Pages fonctionne
   avec les deux sur un compte gratuit tant que le dépôt est public ; s'il est
   privé, il faut un compte payant. Le plus simple : **Public**.

2. **Envoyer les fichiers.** Depuis ce dossier, en remplaçant `TON-COMPTE` et
   `liste` :

   ```bash
   git init && git add . && git commit -m "Première version" && git branch -M main && git remote add origin https://github.com/TON-COMPTE/liste.git && git push -u origin main
   ```

   (Ou, sans ligne de commande : sur la page du dépôt vide, *uploading an
   existing file*, puis glisser **tous** les fichiers et dossiers.)

3. **Activer Pages.** Dépôt → *Settings* → *Pages* → *Source* : **Deploy from a
   branch**, branche `main`, dossier `/ (root)` → *Save*.

4. **Attendre une minute.** L'adresse s'affiche en haut de la même page :
   `https://TON-COMPTE.github.io/liste/`

Chaque `git push` met le site à jour. La page va toujours chercher la version
en ligne en premier : une mise à jour est prise en compte à la première
ouverture avec du réseau.

## Ajout à l'écran d'accueil de l'iPhone

1. Ouvrir l'adresse **dans Safari** (pas Chrome : lui ne sait pas installer de
   page sur l'écran d'accueil sous iOS).
2. Bouton *Partager* (le carré avec la flèche) → **Sur l'écran d'accueil**.
3. Valider. L'icône apparaît ; l'application s'ouvre en plein écran, sans barre
   d'adresse ni onglets.

À faire une fois installée : ouvrir l'application une fois avec du réseau pour
qu'elle se mette en cache. Ensuite elle fonctionne hors ligne.

> **Important.** Toutes les données vivent dans le stockage local de Safari, sur
> ce téléphone. Elles ne partent nulle part, mais iOS peut purger ce stockage si
> l'application reste des semaines sans être ouverte. D'où le bouton
> **Exporter** dans l'écran Progression : à utiliser de temps en temps, et à
> conserver dans Fichiers ou dans un mail à soi-même.

---

## Organisation des fichiers

```
index.html              la page ; les quatre écrans y sont décrits
manifest.webmanifest    nom, icône et mode plein écran de l'application
sw.js                   fonctionnement hors ligne
css/style.css           toute la mise en forme
icones/                 les icônes de l'écran d'accueil
js/
  dates.js        la journée qui commence à 4h00, la parité des jours,
                  les jours de stade, les semaines
  parser.js       lecture de la liste écrite en texte libre + coloration
  defaults.js     la liste et les règles du premier lancement
  store.js        lecture/écriture dans le stockage du navigateur, export/import
  model.js        toute la logique : restrictions, quota GTG, protocoles,
                  bascule de journée, ratés, statistiques
  ui-commun.js    navigation entre écrans, modales
  ui-liste.js     l'écran d'accueil
  ui-progression.js  le second écran
  ui-editeur.js   l'éditeur de liste
  ui-regles.js    le mémo des consignes
  app.js          démarrage et coordination
.claude/serveur.mjs  petit serveur pour essayer l'application sur l'ordinateur
```

Aucun fichier ne dépend d'un outil de compilation. Pour modifier quelque chose :
ouvrir le fichier, changer, `git push`.

### Essayer sur l'ordinateur

Les fichiers `js/*.js` sont des *modules* : ouvrir `index.html` directement
depuis le Finder ne marche pas, il faut un serveur.

```bash
node .claude/serveur.mjs
```

puis ouvrir `http://localhost:8765`.

---

## Les gestes de l'écran d'accueil

- **Taper une ligne** : coche la case, ou ajoute une unité à un compteur
  (eau, prises, grease the groove, protocole).
- **Taper le compteur** — le petit pavé « 2/3 » à droite — **retire une
  unité**. C'est le moyen de revenir en arrière sur l'eau, les prises et le
  grease the groove, sans ajouter le moindre bouton à l'écran.
- **Appui long sur la ligne** : fait la même chose que taper le compteur,
  depuis n'importe où sur la ligne.
- Le **grease the groove se coche aussi à la main**, en tapant la ligne :
  l'overlay n'est pas le seul moyen d'ajouter une série.

## Quelques règles du fonctionnement, pour s'y retrouver dans le code

- **La journée change à 4h00**, pas à minuit (`js/dates.js`). Ce qui est coché à
  2h du matin appartient encore à la veille.
- **L'overlay « Fais ton GTG » ne redemande jamais un palier déjà traité.**
  Décocher puis recocher une habitude ne le fait donc pas revenir : seul un
  nouveau multiple de 2 le déclenche (`gtgPalier` dans `js/model.js`).
- **« Comme si j'étais allé au stade »** : une journée passée dehors autant
  qu'un jour de stade donne droit au même quota d'une seule série. La case
  apparaît dans l'écran Progression à partir de 8 h hors de la maison
  (`SEUIL_COMME_STADE`).
- **Un « raté »** est une case affichée et non cochée *à la fin* d'une journée.
  Les cases encore vides de la journée en cours ne comptent pas : l'écran
  Progression les annonce à part.
- **Les habitudes retirées** (marqueurs `(évale)`, `(stade)`, `(jeudi)`) ne
  comptent pas dans le total du jour. Les cocher depuis l'écran Progression
  donne un bonus, sans fausser le taux de complétion.
- **Le poids GTG** (le nombre bleu dans l'éditeur) sert uniquement à déclencher
  l'overlay : à chaque fois que le cumul des poids cochés franchit un multiple
  de 2.
- **L'historique est conservé par nom d'habitude.** Supprimer une ligne de
  l'éditeur n'efface rien : si elle revient plus tard sous le même nom, ses
  statistiques reprennent.
- **Les jours où l'application n'est pas ouverte ne sont pas archivés.** Ils
  laissent un trou dans l'historique plutôt que d'inventer vingt ratés.

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

## La direction artistique : la presse

L'application est une page de journal. Tout part de là.

- **Le papier** (`--papier`) est un gris chaud de papier journal, avec son
  grain : un bruit inscrit dans la feuille de style, multiplié par-dessus tout.
  Il n'y a pas de thème sombre — un journal ne change pas de couleur la nuit.
- **L'encre** (`--encre`) est un noir d'impression. Il y a **une seule couleur
  d'appoint** (`--rouge`), celle d'une manchette : elle sert aux intertitres,
  aux marqueurs de l'éditeur, et à ce qui va mal. Jamais ailleurs.
- **Les filets sont massifs là où ils ne coûtent rien, fins ailleurs.** 9 px
  pour les deux qui ouvrent et ferment la liste, 7 px sous le titre d'un
  écran, 2,5 px entre deux sections — tous dans des endroits où ils ne
  prennent la place de rien. Entre deux habitudes, en revanche, chaque point
  d'épaisseur est un point de moins pour l'habitude : le filet y est fin, et
  il y a été massif puis absent avant de trouver sa mesure. Absent, il ne
  marchait pas non plus — sans limite visible, une ligne de 50 px se lit plus
  petite qu'elle n'est.
- **Le haut de l'écran Liste est réduit au strict nécessaire** : la barre
  d'état d'iOS, 2 px, puis le filet. Tout ce qui était décor au-dessus de la
  première habitude a été rendu aux habitudes.
- **Le texte s'écarte largement des filets.** Les noms sont plus petits que la
  hauteur de ligne ne le permettrait : c'est ce vide qui fait respirer un écran
  de quinze habitudes.
- **Deux familles, deux rôles.** Une condensée grasse (Avenir Next Condensed)
  pour les noms et les titres de rubrique ; un Didot italique pour tout ce qui
  commente, chiffre ou précise. On sait au premier coup d'œil ce qui est une
  habitude et ce qui est une glose.
- **La marque se remplit par le bas.** Un pavé cerné d'encre, dont l'intérieur
  monte d'un cran à chaque tap : un douzième pour une série de grease the
  groove, un quart de litre pour l'eau. Une habitude ordinaire est vide ou
  pleine. Toutes ces lignes passent par une seule fraction, `valeur / max`.
- **Une ligne cochée reçoit un fond grisé** et son nom recule d'un cran. Le
  gris est volontairement léger : un jour bien rempli met dix lignes sur quinze
  dans cet état, et un gris franc ferait passer le fait au premier plan alors
  que c'est le reste à faire qu'il faut voir.
- **La bande du haut**, sous la barre d'état d'iOS, est opaque et de la couleur
  du papier : elle cache les habitudes qui glisseraient dessous quand on fait
  défiler, sans assombrir l'heure qu'iOS y écrit en noir.
- **L'icône, elle, ne suit pas la direction de l'application** : elle suit
  celle d'iOS, parce qu'elle vit sur l'écran d'accueil au milieu des icônes
  d'Apple et non dans l'application. Fond plein en dégradé sombre, un seul
  signe blanc au centre, beaucoup de vide autour : trois lignes de liste, les
  deux premières faites, la troisième qui se remplit par le bas en rouge. Elle
  est dessinée par `outils/icone.py`, sans aucune bibliothèque, à partir de
  fonctions de distance signée — d'où les angles arrondis et l'anticrénelage
  sans suréchantillonnage.
- **Aucune police n'est téléchargée.** Avenir Next Condensed et Didot sont déjà
  présentes sur iPhone ; l'application n'a aucune dépendance.

Pour changer l'ensemble des couleurs, il suffit de modifier les variables en
haut de `css/style.css`.

## Organisation des fichiers

```
index.html              la page ; les cinq écrans y sont décrits
manifest.webmanifest    nom, icône et mode plein écran de l'application
sw.js                   fonctionnement hors ligne
css/style.css           toute la mise en forme
icones/                 les icônes de l'écran d'accueil
outils/icone.py         le script qui les dessine (page de cahier, marge
                        rouge, coches dans la marge). python3 outils/icone.py
                        les régénère.
js/
  dates.js        la journée qui commence à 4h00, la parité des jours,
                  les jours de stade, les semaines
  parser.js       lecture de la liste écrite en texte libre + coloration
  defaults.js     la liste et les règles du premier lancement
  store.js        lecture/écriture dans le stockage du navigateur, export/import
  model.js        toute la logique : restrictions, quota GTG, protocoles,
                  bascule de journée, ratés, statistiques
  ui-commun.js    navigation entre écrans, modales
  graphique.js    le graphique du taux, partagé par deux écrans
  ui-liste.js     l'écran d'accueil
  ui-progression.js  le second écran
  ui-detail.js    l'écran Détail : moyennes, tendance, classements
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

## Les réglages : une seule source de vérité

Trois contenus s'affichent sur l'écran Liste mais se modifient dans l'écran
**Règles**, tout en haut, dans des champs identifiés :

| Champ | Ce qu'il pilote |
| --- | --- |
| Grease the groove — jours impairs / pairs | le texte affiché sous « Grease the groove » |
| Médicaments — prise du matin / du soir | le texte affiché sous la ligne des médicaments, et son état intermédiaire |
| Eau — objectif en litres | le nombre de taps de la ligne « Eau » |

Ils ne sont écrits qu'à un seul endroit (`reglages` dans le stockage) : modifier
un champ met la liste à jour immédiatement. Le reste des Règles est du texte
libre, sans effet sur l'affichage.

Chaque consigne a son **titre modifiable** et sa **croix de suppression** :
renommer une habitude dans l'éditeur n'oblige donc pas à vivre avec un titre
devenu faux. Une consigne dont le titre ne renvoie à aucune habitude de la
liste porte le repère « sans habitude » — c'est généralement le reste d'une
habitude supprimée.

> L'objectif d'eau et le **nom** de l'habitude sont deux choses distinctes :
> passer l'objectif à 2 L ne renomme pas la ligne « Eau (3L) ». Le nom se
> change dans l'éditeur de liste.

## Les gestes de l'écran d'accueil

- **Taper une ligne** : coche la case, ou ajoute une unité à un compteur
  (eau, prises, grease the groove, protocole).
- L'**eau se compte par quarts de litre** : quatre taps par litre, soit douze
  taps pour un objectif de 3 L. Le compteur affiche `1¾/3 L`.
- **Un compteur se déclare dans l'éditeur** : ajouter `x3` en fin de ligne fait
  une habitude qui se coche en trois taps. `Prières ✞ ✝︎ ☨ x3 2` se lit
  « nom, compteur de 3, poids 2 ». Retirer le `x3` la ramène à une case simple.
- **Taper le compteur** — le petit pavé à droite — **retire une unité**. C'est le moyen de revenir en arrière sur l'eau, les prises et le
  grease the groove, sans ajouter le moindre bouton à l'écran.
- **Appui long sur la ligne** : fait la même chose que taper le compteur,
  depuis n'importe où sur la ligne.
- Le **grease the groove se coche aussi à la main**, en tapant la ligne :
  l'overlay n'est pas le seul moyen d'ajouter une série.

## Quelques règles du fonctionnement, pour s'y retrouver dans le code

- **La journée change à 4h00**, pas à minuit (`js/dates.js`). Ce qui est coché à
  2h du matin appartient encore à la veille.
- **Les jours de stade sont le mardi et le jeudi** — plus le dimanche. Ce n'est
  qu'un défaut : l'interrupteur « Jour de stade » de l'écran Progression permet
  de déclarer n'importe quelle journée, ou d'annuler un mardi. La déclaration
  ne vaut que pour la journée en cours et repart de zéro à 4h00. Elle vaut pour
  tout : le quota de grease the groove comme le marqueur `(stade)` qui retire
  des habitudes (`estStade` dans `js/model.js`).
- **« Comme si j'étais allé au stade » est autre chose** : le quota tombe à 1
  série, mais les habitudes `(stade)` restent affichées. C'est le cas d'une
  journée passée dehors sans être allé au stade.
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
- **La hauteur des lignes est calculée, pas figée.** `ui-liste.js` mesure la
  place disponible, la divise par le nombre de lignes du jour et publie le
  résultat dans la variable CSS `--h-ligne` ; les tailles de texte, la
  pastille et le compteur en découlent. Douze habitudes donnent de grandes
  lignes, trente des lignes serrées, sans jamais déborder ni laisser de vide.
- **Le compteur ne disparaît jamais**, même quand le maximum vaut 1 — les
  jours de stade, où le quota de grease the groove tombe à une seule série.
- **En application ajoutée, la barre d'état est toujours réservée** (47 px), que
  `env(safe-area-inset-top)` la déclare ou non. Une version antérieure essayait
  de deviner, en comparant la hauteur de l'écran à celle de la fenêtre : c'était
  faux, cette différence pouvant venir du bas, et des habitudes se retrouvaient
  inaccessibles sous le bandeau.
- **Corriger la veille.** L'écran Détail propose, tout en haut, de cocher ce
  qu'on a oublié hier. Seule la veille est modifiable : la fenêtre se ferme
  d'elle-même à la bascule de 4h00 (`veilleModifiable` dans `js/model.js`).
  Oublier de cocher arrive ; réécrire une semaine entière après coup viderait
  les statistiques de leur sens. La correction recalcule les totaux de la
  journée, donc les ratés, la série et le graphique suivent — c'est le but :
  rattraper un oubli doit pouvoir sauver une série.
- **L'écran Détail** s'ouvre depuis le bouton sous le graphique de Progression.
  Il rassemble ce qui se lit posément : le graphique en grand, les moyennes sur
  7 jours, 30 jours, 3 mois et depuis le début, la tendance d'une semaine à
  l'autre, le taux par jour de la semaine, et le classement des habitudes.
- **Le graphique retient ses instances par élément, pas par identifiant.**
  `graphique.js` garde les instances Chart.js dans une table indexée par l'`id`
  de la toile. Mais un `id` nomme une place, pas un objet : quand un écran est
  reconstruit, la nouvelle toile porte le même nom sans être le même élément,
  et l'instance continuerait de peindre sur l'ancienne — détachée du document.
  D'où la vérification `instance.canvas === toile` avant toute mise à jour, et
  la toile de l'écran Détail sortie de la zone reconstruite.
- **Deux moyennes cohabitent, et ne disent pas la même chose.** `tauxMoyen` est
  la moyenne des taux journaliers : chaque journée pèse pareil, qu'elle compte
  12 ou 21 cases. `tauxGlobal` est le ratio cases cochées ÷ cases affichées :
  les journées longues y pèsent plus lourd. La première répond à « quelle part
  de ma journée est-ce que je fais », la seconde à « combien de cases ai-je
  faites ». Voir `statsPeriode` dans `js/model.js`.
- **La journée en cours n'entre dans aucune moyenne** : elle n'est pas finie,
  et son taux partiel tirerait tous les chiffres vers le bas. Seul le graphique
  la montre, comme dernière barre.
- **Les fenêtres de temps ont leur début inclus et leur fin exclue**
  (`journeesTerminees`). C'est cette convention qui permet d'accoler la semaine
  en cours et la précédente sans trou ni chevauchement.
- **Le classement par habitude ne montre que la liste actuelle.** C'est à quoi
  il sert : décider quelles lignes garder. Les habitudes retirées de la liste
  sont reléguées sous le classement, avec leur historique et une croix pour
  l'effacer définitivement (`oublierHabitude` dans `js/model.js`). Cet oubli ne
  recalcule pas les totaux journaliers : il ne doit pas réécrire le passé et
  transformer après coup une journée ratée en journée parfaite.
- **Le graphique des 30 jours montre un taux, pas un nombre de cases.** Le
  dénominateur est le nombre d'habitudes réellement affichées ce jour-là : un
  jeudi, où plusieurs habitudes sont retirées, tout cocher donne bien 100 %.
  Deux journées de longueurs différentes deviennent ainsi comparables.
- **Le stockage a une version** (`VERSION` dans `js/store.js`). Quand une
  donnée nouvelle apparaît, on incrémente ce numéro et `consolider()` complète
  les sauvegardes déjà présentes sur le téléphone, sans rien effacer.

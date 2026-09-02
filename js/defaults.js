// ---------------------------------------------------------------------------
// defaults.js — contenu chargé au tout premier lancement.
// Modifiable ensuite depuis l'éditeur de liste et l'écran Règles ; ce fichier
// ne sert plus une fois que les données existent dans localStorage.
// ---------------------------------------------------------------------------

export const LISTE_PAR_DEFAUT = `✞ 1
✝︎ 1
☨ 2
Résumé ☑️ (évale) 1
Lire 6 pages (Pape, Paulo, David) (évale)(stade) 2
Pompier 2
Echecs (évale)(jeudi) 2
3 rappels en moins 2
Programmation (évale)(stade) 2
Eau (3L)
Grease the groove
Maths (manuel, ou Khan academy) (évale)(jeudi) 2
Psy, zn, mucus, ergy, mg, prob, vitA, vitD, aker
3 musiques + remettre réveil et HUE 2
Créer flash-cards 1
Finir quota quotidien 2
Protocole évale 1
Poser tel à 21h15 (évale)
Journal, prière, médit, gratitude (évale)
Couché 22h
Dépenses du jour notées
Clarté (évale)(stade) 1`;

// Mémo des consignes. Une entrée = un titre + un texte libre.
export const REGLES_PAR_DEFAUT = [
  {
    titre: '✞ / ✝︎ / ☨',
    texte: `Trois gestes chrétiens distincts. ✞ : la lecture quotidienne dans l'application Bible. ✝︎ : lire la Bible. ☨ : tout le reste — prier, faire une prière de la Bible, la messe, une méditation chrétienne, une vraie pensée ou action chrétienne.`,
  },
  {
    titre: 'Résumé ☑️',
    texte: `Lire 1 résumé qui va être coché ☑️ (au début, lire juste les thèmes du résumé pour savoir s'il apprend quelque chose) ou qui a déjà été coché ☑️ et qui le reste. Les résumés déplacés vers « résumés nuls » ne comptent pas. On peut aussi relire une sous-page de la page « Cours + Ted », mais en entier.`,
  },
  {
    titre: 'Lire 6 pages (Pape, Paulo, David)',
    texte: `6 pages au total, réparties librement entre les trois livres.`,
  },
  {
    titre: 'Pompier',
    texte: `Une seule de ces choses : choisir le jour de disponibilité de garde du mois prochain, mail garde / inscription gardes, s'inscrire à une manœuvre, faire une manœuvre, faire une garde, faire un prêt acquis, s'inscrire à une épreuve sportive, ou réviser. Pour les révisions : 1 thème au maximum, au choix, en s'imaginant le plus de situations aléatoires possibles (SUAP, div, BAT, BAL, PRF…).`,
  },
  {
    titre: 'Echecs',
    texte: `Gagner au moins 1 élo par rapport au jour précédent. S'arrêter à 3 parties perdues si on n'y arrive pas : on a le droit de cocher la case si on a perdu 3 parties et qu'on a compris pourquoi.`,
  },
  {
    titre: '3 rappels en moins',
    texte: `Supprimer au moins 3 rappels présents depuis au moins hier, rappels normaux ou liste d'achat, pour aujourd'hui ou pour bien avant. Ce qu'on rajoute est indifférent.`,
  },
  {
    titre: 'Programmation',
    texte: `Jours impairs : OpenClassrooms (10 minutes). Si je ne comprends pas ce que fait le code que j'écris, je creuse tout de suite (MDN). Si je me demande « pourquoi ce choix ? », « et si on faisait autrement ? », « est-ce que ça marcherait de cette manière ? » : une ligne dans curiosité annexe. Si je bloque en créant sur Lerno, je demande à Claude. Jours pairs : Lerno (10 minutes). Chaque jour on reprend tous les blocs qui doivent être finis à la v1 ; quand on pense n'avoir plus rien à ajouter sur un bloc, on passe au suivant. À la fin des 10 minutes, noter ce qu'on vient de faire et ce qu'on doit faire les jours suivants, dans ouJEnSuis.txt.`,
  },
  {
    titre: 'Grease the groove',
    texte: `Jours impairs : Tractions 10, Squat en force 5, Avant-bras 1 négative par bras. Jours pairs : Pompes 20, Pogo 100, Curl pronation 5. À chaque changement de 2 tâches : nouvelle partie, autre chose de la liste, avant un repas, dès qu'on sort de la chambre…`,
  },
  {
    titre: 'Maths',
    texte: `3 exercices du manuel, ou 3 parties de Khan Academy.`,
  },
  {
    titre: 'Créer flash-cards',
    texte: `Prendre tous les cours du jour (et des jours précédents si ça n'a pas déjà été fait) : uniquement les cours écrits par moi ou les fiches des profs, pas les exercices. Trier ceux qui peuvent devenir des flash-cards et ceux qui ne le peuvent absolument pas. En cas de doute, mieux vaut demander à Claude de générer les cartes et les retirer si elles sont mauvaises que l'inverse.`,
  },
  {
    titre: 'Protocole évale',
    texte: `Déclenchement : évaluation toute petite ou très peu de connaissances → 1 jour avant ; 1 seul chapitre et pas trop grosse → 3 jours ; 1 chapitre entier ou plusieurs chapitres mais petite → 5 jours ; plusieurs chapitres et grosse → 7 jours ; bac blanc → 2 semaines. S'il n'y a pas d'évaluation en vue, la case est cochée automatiquement. Si plusieurs professeurs annoncent des évaluations dans des matières différentes, il faut faire le protocole dans toutes les matières, et une étape par matière pour cocher la case. Le premier jour du protocole, la feuille blanche est obligatoire. Les étapes, toutes à refaire plusieurs fois :

1. Méthode de la feuille blanche — écrire sur le tableau tout ce dont je me souviens du cours, une première fois, sans l'avoir relu ; reprendre le cours, prendre un autre stylo, corriger les oublis et les erreurs ; photographier le tableau et l'enregistrer dans l'album « feuille blanche » — quand une nouvelle photo porte sur le même cours qu'une ancienne, je supprime l'ancienne ; le dernier tableau écrit sur un chapitre est ma fiche de révision. Essayer de la refaire jusqu'à ce que ce soit à peu près parfait, mais une seule fois suffit pour cocher la case.

2. Exercice type ou représentatif du chapitre — un exercice du manuel, un exercice de TD déjà corrigé en classe, ou un exercice d'une ancienne évaluation du prof.

3. Sujet blanc, sur le tableau aussi — une évaluation du même type (un ensemble d'exercices) : donner à Claude d'anciennes évaluations du prof sur d'anciens chapitres et lui demander d'en imaginer une nouvelle sur le chapitre actuel, ou chercher des évaluations sur ce chapitre sur internet. Ou bien un sujet blanc pour les évaluations de rédaction.`,
  },
  {
    titre: 'Poser tel à 21h15',
    texte: `À 21h15 le téléphone doit être posé en train de recharger dans la salle. Seules actions possibles : noter des rappels, lancer une méditation, lancer Endel. Toute autre action = case à décocher.`,
  },
  {
    titre: 'Journal, prière, médit, gratitude',
    texte: `Une solution de 10 minutes, de préférence dans le noir et en aérant, sans musique, mais possible avec Endel : écrire dans mon journal, Petit Bambou, app sommeil, app Respirelax, app Hallow, Mood, méditer tout seul, penser au calme tout seul, réfléchir à des gratitudes, noter des gratitudes.`,
  },
  {
    titre: 'Règle du dimanche',
    texte: `Pas de liste le dimanche si on a tenu moins de 3 ratés durant toute la semaine.`,
  },
];

// Les six durées proposées au lancement d'un protocole d'évaluation.
// jours = null signifie « durée indéterminée » (arrêt manuel uniquement).
export const DUREES_PROTOCOLE = [
  { jours: 1,  libelle: '1 jour',      detail: 'évaluation toute petite, ou très peu de connaissances à avoir' },
  { jours: 3,  libelle: '3 jours',     detail: '1 seul chapitre et pas trop grosse' },
  { jours: 5,  libelle: '5 jours',     detail: '1 chapitre entier, ou plusieurs chapitres mais petite' },
  { jours: 7,  libelle: '7 jours',     detail: 'plusieurs chapitres et grosse' },
  { jours: 14, libelle: '2 semaines',  detail: 'bac blanc' },
  { jours: null, libelle: 'Indéterminée', detail: "ne s'arrête jamais tout seul, à arrêter à la main" },
];

// Exercices « grease the groove » selon la parité du jour du mois.
export const GTG_IMPAIR = ['Tractions 10', 'Squat en force 5', 'Avant-bras 1 négative par bras'];
export const GTG_PAIR   = ['Pompes 20', 'Pogo 100', 'Curl pronation 5'];

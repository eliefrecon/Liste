# -*- coding: utf-8 -*-
"""
Génère les icônes de l'application, dans la manière des icônes d'Apple.

Le principe de ces icônes-là tient en trois règles : un fond plein en dégradé
doux, un seul signe blanc au centre, et beaucoup de vide autour. Pas de cadre,
pas de filet, pas de texte — iOS arrondit lui-même les angles, on dessine donc
un carré plein.

Le signe est une liste de trois lignes : à gauche un marqueur, à droite une
barre. Les deux premiers marqueurs sont pleins, le troisième se remplit par le
bas en rouge — c'est exactement le geste de l'application.

Ce dernier marqueur est rempli aux sept dixièmes plutôt qu'à moitié : à 60 pt,
la taille réelle sur l'écran d'accueil, un remplissage à moitié ne se lit plus
et le marqueur redevient un carré quelconque. Aux sept dixièmes il reste un
bloc rouge franc de loin, et le geste est visible de près.

Aucune bibliothèque : le PNG est écrit à la main (zlib + struct). Les formes
sont décrites par des fonctions de distance signée, ce qui donne les angles
arrondis et l'anticrénelage sans suréchantillonnage.
"""

import zlib, struct

FOND_HAUT = (0x44, 0x3d, 0x34)   # le dégradé du fond, du plus clair…
FOND_BAS  = (0x15, 0x13, 0x0f)   # … au plus sombre
BLANC     = (0xf4, 0xf1, 0xe9)   # le blanc légèrement chaud du papier
ROUGE     = (0xd8, 0x3a, 0x2a)   # la seule couleur, celle de la manchette

# Les trois lignes du signe, en fractions du côté : hauteur de leur axe, et
# longueur de la barre de droite.
AXES = (0.305, 0.500, 0.695)
BARRE_FIN = (0.815, 0.760, 0.700)

MARQUEUR_X = 0.185          # bord gauche des marqueurs
MARQUEUR_COTE = 0.140       # côté d'un marqueur
MARQUEUR_RAYON = 0.036      # arrondi de ses angles
MARQUEUR_TRAIT = 0.028      # épaisseur du cerne, pour le marqueur non fait

BARRE_X = 0.395             # début des barres
BARRE_EP = 0.054            # leur épaisseur

REMPLI = 0.70               # part déjà remplie du dernier marqueur


def sd_rrect(px, py, x0, y0, x1, y1, r):
    """Distance signée à un rectangle aux angles arrondis : négative dedans,
    positive dehors, et sa valeur est la distance en pixels. C'est elle qui
    donne l'anticrénelage : un pixel à 0,3 px du bord est couvert à 80 %."""
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    hx, hy = (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
    dx, dy = abs(px - cx) - hx, abs(py - cy) - hy
    dehors = (max(dx, 0.0) ** 2 + max(dy, 0.0) ** 2) ** 0.5
    return dehors + min(max(dx, dy), 0.0) - r


def formes(S, ech):
    """La liste des formes à peindre, du fond vers le dessus.

    Chacune est une fonction (x, y) -> distance signée, avec sa couleur.
    """
    def n(v):
        # Passe des fractions aux pixels, en resserrant le signe si l'icône
        # peut être rognée par le système.
        return (0.5 + (v - 0.5) * ech) * S

    def e(v):
        # Une épaisseur ou un rayon : mis à l'échelle, mais pas recentré.
        return v * S * ech

    liste = []
    for i, axe in enumerate(AXES):
        demi = MARQUEUR_COTE / 2
        mx0, my0 = n(MARQUEUR_X), n(axe - demi)
        mx1, my1 = n(MARQUEUR_X + MARQUEUR_COTE), n(axe + demi)
        r = e(MARQUEUR_RAYON)

        if i < len(AXES) - 1:
            # Un marqueur fait : plein.
            liste.append((lambda x, y, a=(mx0, my0, mx1, my1, r):
                          sd_rrect(x, y, *a), BLANC))
        else:
            # Le dernier : un cerne, et un remplissage qui monte depuis le bas.
            t = e(MARQUEUR_TRAIT)
            liste.append((lambda x, y, a=(mx0, my0, mx1, my1, r), t=t:
                          abs(sd_rrect(x, y, *a) + t / 2) - t / 2, BLANC))
            # Le remplissage tient dans le cerne, coupé par une horizontale :
            # l'intersection de deux formes, c'est le maximum de leurs
            # distances.
            dedans = (mx0 + t, my0 + t, mx1 - t, my1 - t, max(r - t, 0.0))
            coupe = my1 - t - (my1 - my0 - 2 * t) * REMPLI
            liste.append((lambda x, y, a=dedans, c=coupe:
                          max(sd_rrect(x, y, *a), c - y), ROUGE))

        # La barre de droite, aux bouts parfaitement ronds.
        demi_ep = BARRE_EP / 2
        bx0, by0 = n(BARRE_X), n(axe - demi_ep)
        bx1, by1 = n(BARRE_FIN[i]), n(axe + demi_ep)
        liste.append((lambda x, y, a=(bx0, by0, bx1, by1, e(demi_ep)):
                      sd_rrect(x, y, *a), BLANC))
    return liste


def dessiner(S, marge_interne=0.0):
    ech = 1 - marge_interne
    formes_ = formes(S, ech)

    lignes = bytearray()
    for py in range(S):
        lignes.append(0)   # filtre PNG « None »
        # Le dégradé du fond, ligne par ligne.
        t = py / max(1, S - 1)
        fond = tuple(FOND_HAUT[i] + (FOND_BAS[i] - FOND_HAUT[i]) * t for i in range(3))
        for px in range(S):
            c = fond
            x, y = px + 0.5, py + 0.5
            for distance, couleur in formes_:
                d = distance(x, y)
                if d > 0.5:
                    continue
                a = min(max(0.5 - d, 0.0), 1.0)
                c = tuple(c[i] + (couleur[i] - c[i]) * a for i in range(3))
            lignes += bytes(max(0, min(255, round(v))) for v in c)
    return bytes(lignes)


def png(chemin, S, marge_interne=0.0):
    brut = dessiner(S, marge_interne)

    def bloc(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))

    data = (b'\x89PNG\r\n\x1a\n'
            + bloc(b'IHDR', struct.pack('>IIBBBBB', S, S, 8, 2, 0, 0, 0))
            + bloc(b'IDAT', zlib.compress(brut, 9))
            + bloc(b'IEND', b''))
    open(chemin, 'wb').write(data)
    print(chemin, S, len(data), 'octets')


if __name__ == '__main__':
    png('icones/icone-180.png', 180)
    png('icones/icone-192.png', 192)
    png('icones/icone-512.png', 512)
    # La version « maskable » peut être rognée par le système : on resserre le
    # signe, le fond restant à bord perdu.
    png('icones/icone-maskable-512.png', 512, marge_interne=0.24)

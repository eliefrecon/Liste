# -*- coding: utf-8 -*-
"""
Génère les icônes de l'application, dans la direction « presse ».

Le motif est celui de l'application elle-même, réduit à son geste : sur du
papier journal, deux filets massifs comme ceux qui ouvrent et ferment la liste,
un filet rouge de manchette, et entre les deux le pavé d'une habitude, cerné
d'encre et rempli aux deux tiers par le bas.

Aucune bibliothèque : le PNG est écrit à la main (zlib + struct). Tout le
dessin est fait de rectangles à bords droits, dont on calcule exactement la
part recouvrant chaque pixel — c'est ce qui donne l'anticrénelage, sans
suréchantillonnage.
"""

import zlib, struct

PAPIER = (0xea, 0xe5, 0xda)
ENCRE  = (0x14, 0x12, 0x0e)
ROUGE  = (0xab, 0x23, 0x18)

# Le pavé, en coordonnées relatives : où il commence, où il finit, l'épaisseur
# de son cerne, et la part déjà remplie en partant du bas.
PAVE = (0.315, 0.360, 0.685, 0.730)
CERNE = 0.052
REMPLI = 0.66


def rects():
    """La liste des rectangles à peindre, du fond vers le dessus.

    Chacun est donné en (x0, y0, x1, y1, couleur), en fractions du côté.
    """
    x0, y0, x1, y1 = PAVE
    r = [
        # Les deux filets massifs : ceux qui ouvrent et ferment la liste.
        (0.115, 0.135, 0.885, 0.185, ENCRE),
        (0.115, 0.815, 0.885, 0.865, ENCRE),
        # Le filet de manchette, la seule couleur de l'application.
        (0.115, 0.205, 0.885, 0.232, ROUGE),

        # Le pavé : un cadre plein, puis on recreuse l'intérieur.
        (x0, y0, x1, y1, ENCRE),
        (x0 + CERNE, y0 + CERNE, x1 - CERNE, y1 - CERNE, PAPIER),
    ]
    # Et le remplissage, qui monte depuis le bas de l'intérieur. Il déborde
    # d'un cheveu sur le cerne : sans ce débordement, les pixels à demi
    # couverts du bord intérieur resteraient gris et dessineraient un liseré.
    e = 0.004
    dedans_haut, dedans_bas = y0 + CERNE, y1 - CERNE
    hauteur = (dedans_bas - dedans_haut) * REMPLI
    r.append((x0 + CERNE - e, dedans_bas - hauteur, x1 - CERNE + e, dedans_bas + e, ENCRE))
    return r


def bruit(x, y):
    """Grain du papier, déterministe : la même icône à chaque génération."""
    h = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h >> 16) & 0xFF) / 255.0 - 0.5


def dessiner(S, marge_interne=0.0):
    ech = 1 - marge_interne

    def n(v):
        """Passe des fractions aux pixels, en resserrant si l'icône peut être
        rognée par le système."""
        return (0.5 + (v - 0.5) * ech) * S

    formes = [(n(a), n(b), n(c), n(d), coul) for a, b, c, d, coul in rects()]

    lignes = bytearray()
    for py in range(S):
        lignes.append(0)   # filtre PNG « None »
        for px in range(S):
            c = PAPIER
            for ax, ay, bx, by, couleur in formes:
                # Part exacte du pixel recouverte par le rectangle : c'est le
                # produit des recouvrements en x et en y, chacun entre 0 et 1.
                lx = min(px + 1, bx) - max(px, ax)
                ly = min(py + 1, by) - max(py, ay)
                if lx <= 0 or ly <= 0:
                    continue
                a = min(lx, 1.0) * min(ly, 1.0)
                c = tuple(c[i] + (couleur[i] - c[i]) * a for i in range(3))
            g = bruit(px, py) * 6
            lignes += bytes(max(0, min(255, round(v + g))) for v in c)
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
    # La version « maskable » peut être rognée par le système : on resserre.
    png('icones/icone-maskable-512.png', 512, marge_interne=0.24)

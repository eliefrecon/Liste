# -*- coding: utf-8 -*-
"""
Génère les icônes de l'application, dans le style du carnet.

Le motif : une page de cahier. Un filet de marge rouge, trois réglures, trois
lignes d'écriture manuscrite de longueurs différentes, et dans la marge trois
coches à l'encre verte — la dernière à moitié tracée, qui est le geste propre
à cette application.

Aucune bibliothèque : le PNG est écrit à la main (zlib + struct), et le dessin
se fait par distance aux segments, ce qui donne l'anticrénelage gratuitement.
"""

import zlib, struct, math

PAPIER_HAUT = (0xf6, 0xea, 0xcb)
PAPIER_BAS  = (0xea, 0xdc, 0xb2)
REGLURE     = (0xa9, 0xb8, 0xd6)
MARGE       = (0xc2, 0x48, 0x3a)
ENCRE       = (0x23, 0x30, 0x4d)
VERT        = (0x2f, 0x7d, 0x4f)

# Les trois lignes : ligne de base de la réglure, longueur de l'écriture, et
# fraction de la coche déjà tracée (1 = faite, 0.45 = en cours).
LIGNES = [
    (0.285, 0.90, 1.00),
    (0.530, 0.80, 1.00),
    (0.775, 0.62, 0.68),
]

MARGE_X = 0.345          # position du filet de marge
ECRITURE_X = 0.415       # là où commence l'écriture, après le filet


def melange(fond, dessus, a):
    a = max(0.0, min(1.0, a))
    return tuple(fond[i] + (dessus[i] - fond[i]) * a for i in range(3))


def dist_seg(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy
    t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def polyligne(points, fraction=1.0):
    """Coupe une polyligne à une fraction de sa longueur totale : c'est ainsi
    qu'une coche peut n'être qu'à moitié tracée."""
    if fraction >= 1.0:
        return points
    total = sum(math.dist(points[i], points[i + 1]) for i in range(len(points) - 1))
    cible = total * fraction
    gardes, parcouru = [points[0]], 0.0
    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        d = math.dist(a, b)
        if parcouru + d >= cible:
            t = (cible - parcouru) / d if d else 0
            gardes.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            break
        parcouru += d
        gardes.append(b)
    return gardes


def coche(cx, cy, taille, fraction=1.0):
    """La coche du carnet, tracée d'un geste, légèrement penchée."""
    brut = [(-0.60, 0.02), (-0.42, 0.24), (-0.20, 0.46), (0.18, -0.14), (0.60, -0.54)]
    ang = math.radians(-7)
    pts = []
    for x, y in polyligne(brut, fraction):
        xr = x * math.cos(ang) - y * math.sin(ang)
        yr = x * math.sin(ang) + y * math.cos(ang)
        pts.append((cx + xr * taille, cy + yr * taille))
    return pts


def ecriture(x0, x1, y, graine):
    """Une ligne d'écriture, rendue comme une suite de mots séparés par des
    blancs. C'est le blanc entre les mots qui fait lire « du texte » plutôt
    qu'un trait ondulé — et le tracé reste déterministe."""
    alea = graine
    def suivant():
        nonlocal alea
        alea = (alea * 1103515245 + 12345) & 0x7FFFFFFF
        return alea / 0x7FFFFFFF

    mots, x = [], x0
    while x < x1 - 0.03:
        longueur = min(0.075 + suivant() * 0.10, x1 - x)
        n = max(4, int(longueur / 0.012))
        pts = []
        for i in range(n + 1):
            t = i / n
            # une ondulation légère : assez pour que ce soit une main,
            # pas assez pour que le trait devienne une chenille
            pts.append((x + longueur * t,
                        y + math.sin(t * 9 + graine) * 0.0065))
        mots.append(pts)
        x += longueur + 0.030 + suivant() * 0.022
    return mots


def bruit(x, y):
    """Grain du papier, déterministe : la même icône à chaque génération."""
    h = (x * 374761393 + y * 668265263) & 0xFFFFFFFF
    h = (h ^ (h >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((h >> 16) & 0xFF) / 255.0 - 0.5


def dessiner(S, marge_interne=0.0):
    ech = 1 - marge_interne
    def n(v):
        return (0.5 + (v - 0.5) * ech) * S

    traits = []   # (points, rayon, couleur)
    for i, (y, longueur, frac) in enumerate(LIGNES):
        # la réglure, d'un bord à l'autre
        traits.append(([(n(0.045), n(y)), (n(0.955), n(y))], 0.006 * S * ech, REGLURE))
        # l'écriture, posée sur la réglure, en mots séparés
        for mot in ecriture(ECRITURE_X, longueur, y - 0.055, 7 + i * 31):
            traits.append(([(n(px), n(py)) for px, py in mot], 0.0135 * S * ech, ENCRE))
        # la coche, dans la marge
        traits.append((coche(n(0.185), n(y - 0.055), 0.115 * S * ech, frac),
                       0.026 * S * ech, VERT))

    # le filet de marge, par-dessus les réglures
    traits.append(([(n(MARGE_X), n(-0.05)), (n(MARGE_X), n(1.05))], 0.0085 * S * ech, MARGE))

    lignes = bytearray()
    for py in range(S):
        lignes.append(0)   # filtre PNG « None »
        t = py / max(1, S - 1)
        base = tuple(PAPIER_HAUT[i] + (PAPIER_BAS[i] - PAPIER_HAUT[i]) * t for i in range(3))
        for px in range(S):
            c = base
            x, y = px + 0.5, py + 0.5
            for points, r, couleur in traits:
                d = min(dist_seg(x, y, *points[k], *points[k + 1])
                        for k in range(len(points) - 1)) if len(points) > 1 else 1e9
                if d < r + 1:
                    c = melange(c, couleur, (r - d) + 0.5)
            g = bruit(px, py) * 7
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

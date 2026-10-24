"""Petits utilitaires SQL / JSON (aucun '%' litteral dans les requetes : on passe les motifs en parametres)."""
import datetime
import decimal
import json

from django.db import connection
from django.http import JsonResponse


class Encodeur(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        if isinstance(o, (datetime.date, datetime.datetime)):
            return o.isoformat()
        return super().default(o)


def reponse(data, **kw):
    return JsonResponse(data, encoder=Encodeur, safe=False, json_dumps_params={"ensure_ascii": False}, **kw)


def lignes(sql, params=None):
    """Liste de dictionnaires."""
    with connection.cursor() as cur:
        cur.execute(sql, params)
        cols = [c[0] for c in cur.description]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


def ligne(sql, params=None):
    r = lignes(sql, params)
    return r[0] if r else None


def collection(sql, params=None, geom="geometry", ident="id"):
    """Execute `sql` (une colonne GeoJSON texte nommee `geometry`) et renvoie une FeatureCollection."""
    feats = []
    for r in lignes(sql, params):
        g = r.pop(geom, None)
        feats.append({
            "type": "Feature",
            "id": r.get(ident),
            "geometry": json.loads(g) if g else None,
            "properties": r,
        })
    return {"type": "FeatureCollection", "features": feats}

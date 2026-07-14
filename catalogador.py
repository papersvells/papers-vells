#!/usr/bin/env python3
"""
afegir_autors_citats.py
═══════════════════════════════════════════════════════════
Recorre tots els articles a content/ buscant cognoms d'autors
(extrets de content/autors/*/_index.md, camp "cognom") escrits
amb majúscula inicial dins el text de l'article. Per cada
coincidència trobada, mostra el context (3 paraules abans i 3
després) i pregunta si s'ha d'afegir aquell autor al camp
"autors_citats" del front matter de l'article.

DETALLS:
- Només compta paraules amb majúscula inicial exacta (p. ex.
  "Pla" compta, "pla" no compta).
- Si el cognom coincideix amb més d'un autor (p. ex. "Soldevila"
  → Carles Soldevila i Ferran Soldevila), es mostren totes les
  opcions perquè triïs quina és.
- Per defecte, s'ignoren les coincidències amb el cognom del propi
  autor de l'article (evita preguntar coses òbvies). Usa
  --incloure-propi per desactivar-ho.
- Es pregunta un cop per article + autor trobat (no un cop per
  cada aparició), mostrant el primer context trobat i el nombre
  total d'aparicions.
- Si l'autor ja és al camp "autors_citats" de l'article, no es
  torna a preguntar.

ÚS:
  1. Backup abans de res:
     tar -cJf backup-$(date +%Y%m%d).tar.xz --exclude='.git' --exclude='public' .

  2. Executa:
     python3 afegir_autors_citats.py

  3. Per veure què faria sense escriure res (encara pregunta,
     però no desa els canvis):
     python3 afegir_autors_citats.py --dry-run
"""

import argparse
import re
import unicodedata
from pathlib import Path


# ── Utilitats de front matter ──────────────────────────────

def separa_frontmatter(text):
    """Retorna (frontmatter_text, body_text) o (None, text) si no en té."""
    m = re.match(r'^---\s*\n(.*?\n)---\s*\n(.*)$', text, re.DOTALL)
    if not m:
        return None, text
    return m.group(1), m.group(2)


def troba_camp_llista(frontmatter, camp):
    """
    Extreu una llista tipus autors: ["A", "B"] del front matter.
    Retorna una llista de strings (buida si no existeix).
    """
    m = re.search(rf'^{camp}:\s*\[(.*?)\]\s*$', frontmatter, re.MULTILINE)
    if not m:
        return []
    contingut = m.group(1)
    valors = re.findall(r'"([^"]*)"|\'([^\']*)\'', contingut)
    return [a or b for a, b in valors if (a or b)]


def actualitza_camp_llista(text, camp, nous_valors):
    """
    Insereix o actualitza una línia 'camp: ["a", "b"]' al front matter.
    Si ja existeix, la reemplaça. Si no, la insereix després de
    'autors:' si hi és, si no després de 'date:', si no després
    del primer '---'.
    """
    linia_nova = camp + ': [' + ', '.join(f'"{v}"' for v in nous_valors) + ']'

    patro_existent = re.compile(rf'^{camp}:\s*\[.*?\]\s*$', re.MULTILINE)
    if patro_existent.search(text):
        return patro_existent.sub(linia_nova, text, count=1)

    for ancora in (r'^autors:.*$', r'^date:.*$'):
        m = re.search(ancora, text, re.MULTILINE)
        if m:
            pos = m.end()
            return text[:pos] + "\n" + linia_nova + text[pos:]

    m = re.search(r'^---\s*$', text, re.MULTILINE)
    if m:
        pos = m.end()
        return text[:pos] + "\n" + linia_nova + text[pos:]

    return text


# ── Carrega d'autors coneguts ───────────────────────────────

def carrega_autors(content_dir):
    """
    Recorre content/autors/*/_index.md i retorna:
      cognom_a_autors: {cognom: [{"title": nom_complet, "slug": slug}, ...]}
    """
    cognom_a_autors = {}
    autors_dir = content_dir / "autors"
    if not autors_dir.exists():
        return cognom_a_autors

    for index_md in autors_dir.rglob("_index.md"):
        text = index_md.read_text(encoding="utf-8")
        fm, _ = separa_frontmatter(text)
        if not fm:
            continue
        m_title = re.search(r'^title:\s*["\']?(.*?)["\']?\s*$', fm, re.MULTILINE)
        m_cognom = re.search(r'^cognom:\s*["\']?(.*?)["\']?\s*$', fm, re.MULTILINE)
        if not (m_title and m_cognom):
            continue
        title = unicodedata.normalize("NFC", m_title.group(1).strip())
        cognom = unicodedata.normalize("NFC", m_cognom.group(1).strip())
        cognom_a_autors.setdefault(cognom, []).append({
            "title": title,
            "slug": index_md.parent.name,
        })

    return cognom_a_autors


# ── Context de la coincidència ──────────────────────────────

def obte_context(body, inici, final, n=3):
    """Retorna una cadena amb n paraules abans i n paraules després del match."""
    paraules = list(re.finditer(r'\S+', body))
    idx_actual = None
    for i, p in enumerate(paraules):
        if p.start() <= inici < p.end():
            idx_actual = i
            break
    if idx_actual is None:
        return body[max(0, inici - 40):final + 40].strip()

    abans = paraules[max(0, idx_actual - n):idx_actual]
    despres = paraules[idx_actual + 1:idx_actual + 1 + n]

    text_abans = " ".join(p.group() for p in abans)
    text_despres = " ".join(p.group() for p in despres)
    paraula_trobada = paraules[idx_actual].group()

    return f"{text_abans} **{paraula_trobada}** {text_despres}".strip()


# ── Programa principal ──────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--content", default="content")
    parser.add_argument("--dry-run", action="store_true",
                         help="Pregunta igualment, però no desa cap canvi als fitxers")
    parser.add_argument("--incloure-propi", action="store_true",
                         help="No descarta les coincidències amb el propi autor de l'article")
    args = parser.parse_args()

    content_dir = Path(args.content)
    cognom_a_autors = carrega_autors(content_dir)

    if not cognom_a_autors:
        print("No s'ha trobat cap autor a content/autors/. Revisa la ruta.")
        return

    total_cognoms = len(cognom_a_autors)
    ambigus = {c: a for c, a in cognom_a_autors.items() if len(a) > 1}
    print(f"Autors carregats: {sum(len(v) for v in cognom_a_autors.values())} "
          f"({total_cognoms} cognoms diferents, {len(ambigus)} ambigus)\n")
    if ambigus:
        print("Cognoms compartits per més d'un autor:")
        for c, a in ambigus.items():
            noms = ", ".join(x["title"] for x in a)
            print(f"  - {c}: {noms}")
        print()

    # Excloem les pàgines de terme (autors, publicacions) i altres no-articles
    exclusions_carpeta = {"autors", "publicacions"}
    fitxers_md = []
    for f in content_dir.rglob("*.md"):
        if f.name == "_index.md":
            continue
        rel = f.relative_to(content_dir)
        if rel.parts and rel.parts[0] in exclusions_carpeta:
            continue
        fitxers_md.append(f)

    print(f"Articles a revisar: {len(fitxers_md)}\n")

    total_afegits = 0
    total_articles_modificats = 0

    for fitxer in sorted(fitxers_md):
        text = fitxer.read_text(encoding="utf-8")
        fm, body = separa_frontmatter(text)
        if fm is None:
            continue

        autors_propis = troba_camp_llista(fm, "autors")
        cognoms_propis = set()
        for nom_complet in autors_propis:
            for c in cognom_a_autors:
                if any(a["title"] == nom_complet for a in cognom_a_autors[c]):
                    cognoms_propis.add(c)

        ja_citats = troba_camp_llista(fm, "autors_citats")

        confirmats_aquest_article = list(ja_citats)  # ja existents, es mantenen
        hi_ha_novetats = False

        for cognom, candidats in cognom_a_autors.items():

            if not args.incloure_propi and cognom in cognoms_propis:
                continue

            # Ja confirmat prèviament per a algun dels candidats d'aquest cognom?
            if any(c["title"] in confirmats_aquest_article for c in candidats):
                continue

            # Cerca totes les aparicions exactes (case-sensitive, paraula sencera)
            patro = re.compile(r'\b' + re.escape(cognom) + r'\b')
            coincidencies = list(patro.finditer(body))
            if not coincidencies:
                continue

            primer = coincidencies[0]
            context = obte_context(body, primer.start(), primer.end())
            n_aparicions = len(coincidencies)

            print("\n" + "─" * 60)
            print(f"Article: {fitxer.relative_to(content_dir)}")
            print(f"Cognom trobat: \"{cognom}\"  ({n_aparicions} aparició(ns))")
            print(f"Context: ...{context}...")

            if len(candidats) == 1:
                autor = candidats[0]
                resp = input(f"  Afegir \"{autor['title']}\" a autors_citats? [s/N]: ").strip().lower()
                if resp == "s":
                    confirmats_aquest_article.append(autor["title"])
                    hi_ha_novetats = True
                    print(f"  -> Afegit: {autor['title']}")
                else:
                    print("  -> Descartat.")
            else:
                print("  Cognom ambigu, tria l'autor correcte:")
                for i, c in enumerate(candidats, 1):
                    print(f"    {i}. {c['title']}")
                print(f"    0. Cap (no afegir / no és cap d'aquests)")
                resp = input("  Tria un número: ").strip()
                if resp.isdigit() and 1 <= int(resp) <= len(candidats):
                    autor = candidats[int(resp) - 1]
                    confirmats_aquest_article.append(autor["title"])
                    hi_ha_novetats = True
                    print(f"  -> Afegit: {autor['title']}")
                else:
                    print("  -> Descartat.")

        if hi_ha_novetats:
            nou_text = actualitza_camp_llista(text, "autors_citats", confirmats_aquest_article)
            if args.dry_run:
                print(f"\n  [dry-run] {fitxer}  ->  autors_citats: {confirmats_aquest_article}")
            else:
                fitxer.write_text(nou_text, encoding="utf-8")
                print(f"\n  Desat: {fitxer}  ->  autors_citats: {confirmats_aquest_article}")
            total_articles_modificats += 1
            total_afegits += len(confirmats_aquest_article) - len(ja_citats)

    print("\n\n--- Resum --------------------------------------")
    print(f"Articles modificats: {total_articles_modificats}")
    print(f"Autors citats afegits en total: {total_afegits}")
    if args.dry_run:
        print("\nAixò ha estat una simulació. Cap fitxer s'ha modificat.")


if __name__ == "__main__":
    main()

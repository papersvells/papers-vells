# Papers Vells — Context del projecte

## Què és

Arxiu de premsa antiga catalana (1899–1938). Web estàtica feta amb **Hugo**, desplegada a **Cloudflare Pages** (`papers-vells.pages.dev`). El tema és custom (no és un tema extern).

## Com buildar

```bash
cd /home/victor/Papers\ Vells\ 2.0/web/papersvells
hugo          # build a public/
hugo server   # servidor local
```

## Estructura de directoris

```
papersvells/
├── hugo.toml                  # Configuració del lloc
├── content/                   # TOT el contingut
│   ├── *.md                   # ~265 articles (arrel directa, NO en subcarpetes)
│   ├── autors/                # 100 autors, cadascun amb _index.md
│   │   └── <nom-slug>/_index.md
│   ├── publicacions/          # 34 publicacions, cadascuna amb _index.md
│   │   └── <nom-slug>/_index.md
│   ├── projecte/_index.md      # Pàgina estática "El Projecte"
│   └── cerca/_index.md        # Pàgina de cerca (outputs: html, json)
├── themes/papersvells/        # El tema custom
│   ├── layouts/
│   │   ├── _default/          # baseof.html, single.html, list.html, taxonomy.html
│   │   ├── _partials/fitxa.html
│   │   ├── index.html         # Portada (scroll infinit)
│   │   ├── cerca/             # list.html (UI), list.json (índex cerca)
│   │   ├── projecte/list.html
│   │   └── shortcodes/estadistiques.html
│   ├── assets/css/            # main.css, header.css, cerca.css
│   ├── assets/js/main.js      # Només un console.log
│   └── static/
│       ├── js/                # menu.js, header-scroll.js, cerca.js
│       ├── fonts/             # Alegreya (Regular, Italic, Medium, Bold, BoldItalic), Rubik, Alegreya-Sans
│       └── images/
│           ├── autors/        # Fotos dels autors (webp)
│           ├── publicacions/  # Logos de les publicacions (webp)
│           ├── articles/      # Imatges dels articles (webp)
│           ├── logo-horitzontal.webp
│           ├── logo-vertical.webp
│           ├── og-default.webp
│           ├── lupa.webp, twpv.webp, wikipedia.webp, arca.webp
│           └── articles/
├── static/                    # Favicon, robots.txt, apple-touch-icon
├── public/                    # Output del build (gitignore)
└── data/                      # Buit
```

## Front matter dels articles

```yaml
---
title: "Títol de l'article"
autors: ["Nom de l'Autor"]         # Array (pot tenir 1+ elements)
publicacions: ["Nom de la Revista"] # Array
date: 1925-03-18                    # Data històrica original
publicat: 2019-08-14                # Data de publicació al web (ordenació portada)
categoria: "Assaig"                 # Taxonomy
slug: "autor-slug/titol-slug"       # URL personalitzada
image: "fitxer.webp"                # Imatge de capçalera (opcional)
description: "Text breu"            # Meta descripció (opcional)
draft: false

# Camps opcionals:
tema: "Descripció del context"
serie: "Nom de la sèrie"
respon_a: "Títol de l'article al qual respon"
respostes: true
questions: ["Premi Crexells de 1928"]  # Taxonomy (array)
autors_citats: ["Nom A", "Nom B"]      # Array d'autors esmentats (no és taxonomy, és camp de text)
---
```

**IMPORTANT:** `autors_citats` NO és una taxonomy — és un camp array normal que s'usa al template per trobar articles on surt un autor esmentat.

## Taxonomies (definides a hugo.toml)

| Taxonomy       | Ús                                      | Ordenació         |
|----------------|------------------------------------------|--------------------|
| `autors`       | Per cognom (slug del directori)          | `Params.cognom` asc |
| `publicacions` | Nom de la revista/diari                  | Alfabètica         |
| `questions`    | Qüestions/debats (ex: Premi Crexells)   | Alfabètica         |
| `categoria`    | Gènere de l'article (Assaig, Ressenya…) | Alfabètica         |
| `tags`         | Etiquetes (poc usat)                     | Alfabètica         |

## Estructura d'un autor

```
content/autors/josep-pla/
└── _index.md
```

```yaml
---
title: "Josep Pla"
cognom: "Pla"
bio: "Escriptor i periodista de Palafrugell (1897–1981)..."
wikipedia: "https://ca.wikipedia.org/wiki/Josep_Pla_i_Casadevall"
---
```

- `cognom` és clau: s'usa per ordenar la graella d'autors
- `wikipedia` és opcional: si existeix, es mostra icona de Viquipèdia

## Estructura d'una publicació

```yaml
---
title: "La Veu de Catalunya"
bio: "La Veu de Catalunya va ser un destacat diari..."
wikipedia: "https://ca.wikipedia.org/wiki/La_Veu_de_Catalunya"
---
```

## Convencions de noms de fitxers

- Articles: `YYYY-MM-DD_publicacio_autor_-_titol.md` (guions, sense accents al fitxer)
- Imatges d'autors: `<slug-sense-accents>.webp` (mateix nom que el directori)
- Imatges de publicacions: `<slug>.webp`
- Imatges d'articles: `<mateix-nom-del-fitxer-md>.webp`

## Layouts clau

| Ruta                   | Layout                         | Què fa                              |
|------------------------|--------------------------------|--------------------------------------|
| `/`                    | `layouts/index.html`           | Portada, graella 4 columnes, scroll infinit |
| `/_autor/`             | `taxonomy.html` (vista individual) | Header avatar + llista articles   |
| `/publicacions/`       | `taxonomy.html` (vista global) | Graella de logos                     |
| `/autors/`             | `taxonomy.html` (vista global) | Graella d'avatars circulars B/N      |
| `/questions/`          | `taxonomy.html` (vista global) | Llista targetes amb anys             |
| `/categoria/`          | `taxonomy.html` (vista global) | Llista targetes sense anys           |
| `/article/`            | `single.html`                  | Article amb fitxa documental sticky  |
| `/cerca/`              | `cerca/list.html` + `list.json`| Cerca client-side                   |
| `/projecte/`           | `projecte/list.html`           | Pàgina estática amb estadístiques   |

## CSS i JS

- **CSS:** 3 fitxers concatenats via Hugo Pipes: `header.css` + `main.css` + `cerca.css` → `bundle.css` (minified + fingerprinted)
- **JS (static):** `menu.js` (hamburguesa), `header-scroll.js` (hide on scroll), `cerca.js` (cerca client-side)
- **Font principal:** Alegreya (serif) + Rubik (metadades) + Alegreya-Sans (nav)
- **Color accent:** `#973330` (vermell fosc)

## Cerca

Funciona 100% client-side:
1. Hugo genera `/cerca/index.json` amb array de {t, u, a, p, d, x} (títol, URL, autors, publicacions, data, text pla)
2. `cerca.js` carrega el JSON una sola vegada i filtra amb `String.includes()`
3. Hi ha 3 seccions: articles, autors, publicacions

## Notes importants

- L'ordenació de la portada és per `Params.publicat` (data de pujada al web), NO per `Date` (data històrica)
- El camp `autors_citats` permet trobar articles on surt un autor esmentat (veure `taxonomy.html` línia 455+)
- El shortcode `{{< estadistiques >}}` mostra xifres del projecte (articles, autors, publicacions, període)
- El theme NO té fitxer `theme.toml` ni `package.json` — és totalment custom
- `public/` està al `.gitignore`
- Script de desplegament: `pujar-a-github.sh` (git add + commit + push)

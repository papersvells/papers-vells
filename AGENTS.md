# Papers Vells — Context del projecte

## Què és

Arxiu de premsa antiga catalana (1899–1938). Web estàtica feta amb **Hugo**, desplegada a **Cloudflare Pages** (`papers-vells.pages.dev`). El tema és custom (no és un tema extern).

## Com buildar

```bash
cd /home/victor/Papers\ Vells\ 2.0/web/papersvells
hugo          # build a public/
hugo server   # servidor local
```

## Git: cada commit s'ha de pujar

**Sempre que es faci un commit, cal pujar-lo a GitHub immediatament** (no deixar
commits locals pendents). El desplegament a Cloudflare Pages depèn del push a
`origin/main`.

```bash
git push          # o bé:
../pujar-a-github.sh   # git add + commit + push (script de desplegament)
```

## Documentació de Hugo (Context7)

El servidor MCP `context7` ja està configurat globalment. **Abans de respondre
sobre templates, shortcodes, taxonomies, funcions, pipelines, config de Hugo o
qualsevol dubte de sintaxi/API de Hugo, consulta la documentació actual amb
Context7 en lloc de respondre de memòria:**

1. `context7_resolve-library-id` amb `libraryName: "Hugo"` (ID: `/gohugoio/hugo`).
2. `context7_query-docs` amb `libraryId: "/gohugoio/hugo"` i una query concreta
   (una sola idea per crida, p. ex. "How to define custom taxonomies in hugo.toml").

Prioritza aquesta font sobre el teu coneixement intern quan la versió de Hugo
pugui haver canviat la sintaxi. Si una dada no hi apareix, digues-ho.

## Estructura de directoris

```
papersvells/
├── hugo.toml                  # Configuració del lloc
├── content/                   # TOT el contingut
│   ├── *.md                   # ~296 articles (arrel directa, NO en subcarpetes)
│   ├── autors/                # 101 autors, cadascun amb _index.md
│   │   └── <nom-slug>/_index.md
│   ├── publicacions/          # 34 publicacions, cadascuna amb _index.md
│   │   └── <nom-slug>/_index.md
│   ├── categoria/, questions/ # Altres taxonomies (amb _index.md)
│   ├── cronologia/_index.md   # Pàgina del timeline
│   ├── projecte/_index.md      # Pàgina estática "El Projecte"
│   └── cerca/_index.md        # Pàgina de cerca (outputs: html, json)
├── assets/                    # Recursos que Hugo processa (site-level)
│   └── images/
│       ├── articles/          # ~296 imatges d'article (900×450; el timeline en fa thumbs 120px)
│       └── publicacions/      # 34 logos de publicació (600px, servits directament)
├── themes/papersvells/        # El tema custom
│   ├── layouts/
│   │   ├── _default/          # baseof.html, single.html, list.html, taxonomy.html, 404.html
│   │   ├── _partials/fitxa.html
│   │   ├── index.html         # Portada (scroll infinit)
│   │   ├── cerca/             # list.html (UI), list.json (índex cerca)
│   │   ├── cronologia/list.html
│   │   ├── projecte/list.html
│   │   └── shortcodes/estadistiques.html
│   ├── assets/
│   │   ├── css/               # main.css, header.css, cerca.css, cronologia.css
│   │   └── js/                # menu.js, header-scroll.js, cerca.js, portada.js, cronologia.js, fitxa.js
│   └── static/
│       ├── fonts/             # Alegreya (Regular, Italic, Medium, Bold, BoldItalic), Rubik Mono One, Alegreya-Sans
│       └── images/
│           ├── autors/        # Fotos dels autors (webp)
│           ├── logo-horitzontal.webp
│           ├── logo-vertical.webp
│           ├── og-default.webp
│           └── lupa.webp, twpv.webp, wikipedia.webp, arca.webp
├── static/                    # Favicon, robots.txt, apple-touch-icon, _headers
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
- Imatges de publicacions: `<slug>.webp` — **600px d'ample** (es serveixen directament, sense
  resize de Hugo; exporta sempre els logos nous a 600px). Virolles a `assets/images/publicacions/`
- Imatges d'articles: `<mateix-nom-del-fitxer-md>.webp` (900×450, a `assets/images/articles/`;
  el timeline en genera miniatures de 120px amb `images.Fill`)

## IMPORTANT: carpetes de termes amb accents/apòstrofs

La carpeta d'un terme (`content/autors/<nom>/`, `content/publicacions/<nom>/`) ha de tenir
el nom **EXACTE del terme** tal com apareix als articles (ex: `Lluís Nicolau d'Olwer`,
`Víctor Català`, `L'Amic de les arts`), amb accents i apòstrofs inclosos.

- L'URL es normalitza sol (`/lluis-nicolau-dolwer/`): Hugo treu accents i apòstrofs del path
- Si la carpeta NO coincideix exactament amb el terme, Hugo pot NO adoptar l'`_index.md`
  (bio, wikipedia, cognom) de forma no determinista — cada build "guanya" un subconjunt
  aleatori — o fallar sempre. És un bug conegut de la lògica de termes+contingut
- Per afegir un terma nou: copieu el nom EXACTE del terme des d'un article (front matter)

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

- **CSS:** bundles via Hugo Pipes. `base.css` = `header.css` + `main.css` (a totes les pàgines);
  `cerca.css` (a `/cerca/` i 404) i `cronologia.css` (a `/cronologia/`) es carreguen només on cal,
  via el bloc `css-extra` de `baseof.html`. Minified + fingerprinted.
- **JS (`themes/papersvells/assets/js/`):** `principal.js` = concatenació de `menu.js` (hamburguesa)
  i `header-scroll.js` (hide on scroll), a totes les pàgines. Específics: `portada.js`,
  `cronologia.js`, `fitxa.js`, `cerca.js`. Minified + fingerprinted; només queda inline el
  `documentElement.classList.add('js')` del `<head>`.
- **Font principal:** Alegreya (serif) + Rubik Mono One (metadades) + Alegreya-Sans (nav)
- **Color accent:** `#973330` (vermell fosc)

## Cerca

Funciona 100% client-side:
1. Hugo genera `/cerca/index.json` amb array de {t, u, a, p, d, x} (títol, URL, autors, publicacions, data, text pla)
2. `cerca.js` carrega el JSON una sola vegada i filtra amb `String.includes()`
3. Hi ha 3 seccions: articles, autors, publicacions

## Notes importants

- L'ordenació de la portada és per `Params.publicat` (data de pujada al web), NO per `Date` (data històrica)
- El camp `autors_citats` permet trobar articles on surt un autor esmentat (secció «Ha estat citat en…» de `taxonomy.html`)
- El shortcode `{{< estadistiques >}}` mostra xifres del projecte (articles, autors, publicacions, període)
- El theme NO té fitxer `theme.toml` ni `package.json` — és totalment custom
- `.gitignore`: `public/`, `/resources/_gen/`, `/.hugo_build.lock`, `/skills-lock.json`. `public/` ja no es versiona
- Script de desplegament (a la carpeta pare): `pujar-a-github.sh` (git add + commit + push)
- L'Hugo local i el de Cloudflare Pages han d'anar lligats (Cloudflare: `HUGO_VERSION = 0.164.0`)

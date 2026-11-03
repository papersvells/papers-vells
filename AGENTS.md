# Papers Vells — Context del projecte

## Què és

Arxiu de premsa antiga catalana (1899–1938). Web estàtica feta amb **Hugo**, desplegada a **Cloudflare Pages** al domini **`https://papersvells.cat/`** (el canònic és el domini propi, sense `www`: tant `www.papersvells.cat` com `papers-vells.pages.dev` redirigeixen amb **301** cap aquí). El tema és custom (no és un tema extern).

**`baseURL` de `hugo.toml` és la font de veritat de l'URL pública:** d'ella surten
`rel=canonical`, `og:url`, `og:image`, els enllaços absoluts de CSS/JS/imatges i les
URL del `sitemap.xml` i de l'`index.xml`. Si algun dia canvia el domini, s'ha de
canviar només aquí (i actualitzar la línia `Sitemap:` de `static/robots.txt` i la
redirecció corresponent a Cloudflare).

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

## Domini, canonical i redireccions

**Domini canònic: `https://papersvells.cat/`**, sense `www`, amb barra final. Tres
portes responen a DNS (àpex, `www` i `papers-vells.pages.dev`), però només l'àpex
serveix contingut: les altres dues són 301 cap a ell.

### Qui fa què

| Capa | Funció | On viu |
|---|---|---|
| `baseURL = 'https://papersvells.cat/'` | Font de veritat de totes les URL absolutes | `hugo.toml` (repo) |
| `{{ .Permalink }}` | `rel=canonical` de cada pàgina | `themes/.../baseof.html` |
| `Sitemap:` | Assenyala el sitemap als cercadors | `static/robots.txt` |
| Redirect Rule `www` | 301 de `www.*` a l'àpex | Cloudflare → zona → Rules → Redirect Rules |
| Bulk Redirect `pages.dev` | 301 de `*.pages.dev` a l'àpex | Cloudflare → compte → Bulk Redirects |
| Search Console | Domini verificat + sitemap enviat | Google Search Console |

### Regla de `www` → àpex (zona)

- *Request URL*: `https://www.papersvells.cat/*`
- *Target URL*: `https://papersvells.cat/${1}`
- *Status*: `301`, *Preserve query string*: ✓

`${1}` és el *wildcard replacement* (l'`*` captura la resta de la ruta i `${1}` la
torna a enganxar), així que una sola regla cobreix tots els articles. La plantilla
del panell **"Redirigir de WWW a raíz"** ja ho genera.

### Regla de `pages.dev` → àpex (compte)

Llista de Bulk Redirects amb una entrada:

| Source URL | Target URL | Status | Paràmetres |
|---|---|---|---|
| `papers-vells.pages.dev` | `https://papersvells.cat` | `301` | Preserve query string, **Subpath matching**, **Preserve path suffix** |

- **Subpath matching** + **Preserve path suffix** són imprescindibles: sense elles,
  `/josep-pla/…` cauria a la portada en lloc de conservar la ruta.
- **Include subdomains** desactivat a propòsit: així els desplegaments de preview
  (`<hash>.papers-vells.pages.dev`) segueixen accessibles per provar coses.
- Una llista **sola no fa res**: cal una **Bulk Redirect Rule** que la faci servir.
  Les Bulk Redirect Rules s'executen *davant* del projecte de Pages.

### Per què no es fa tot des de `static/_redirects`

`papers-vells.pages.dev` **no és una zona del compte** (el domini és de Cloudflare),
així que no admet Redirect Rules de zona. El `_redirects` del repo sí que accepta un
hostname al costat esquerre, però Cloudflare documenta les **Bulk Redirects** com el
camí per a aquest cas. `static/_redirects` queda per a paths del propi lloc
(les regles estàtiques sempre al principi del fitxer; les dinàmiques al final).

Si mai coincideixen Bulk Redirect i `_redirects`, no hi ha conflicte ni bucle: les
Bulk Redirects corren primer.

### Errors a no repetir

- **Mai** crear una regla amb *"Todas las solicitudes entrantes"* a la zona de
  `papersvells.cat`: redirigiria l'àpex cap a si mateix i faria un bucle (la web cauria).
- El `www` de la regla ha de portar `https://` explícit a la URL de sol·licitud.
- Si canvia el domini: tocar `baseURL`, la línia `Sitemap:` de `static/robots.txt` i
  les dues redireccions de Cloudflare. No hi ha cap URL absoluta hardcodejada al codi.

### Com verificar-ho

```bash
curl -sI https://papersvells.cat/ | head -1                        # 200
curl -sI https://www.papersvells.cat/ | head -1                    # 301 → àpex
curl -sI https://papers-vells.pages.dev/ | head -1                 # 301 → àpex
curl -sI "https://www.papersvells.cat/cerca/?q=pla" | head -3      # 301 amb ?q=pla
curl -sI https://papersvells.cat/el-diari/ | head -3               # 301 → /projecte/
```

### Google Search Console

- Propietat de tipus **Dominio** per a `papersvells.cat`, verificada amb un registre
  TXT `google-site-verification=…` al DNS de Cloudflare. **No esborrar aquest TXT**:
  és el que manté la propietat verificada.
- Sitemap enviat (`https://papersvells.cat/sitemap.xml`); el `robots.txt` també hi apunta.
- Un `504` en verificar és un error **transitori de Google** (no del DNS): comprovar
  que el TXT ja es propaga i reintentar al cap d'una estona.

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
│   ├── *.md                   # 298 articles (arrel directa, NO en subcarpetes)
│   ├── autors/                # 101 autors, cadascun amb _index.md
│   │   └── <nom-slug>/_index.md
│   ├── publicacions/          # 35 publicacions, cadascuna amb _index.md
│   │   └── <nom-slug>/_index.md
│   ├── categoria/, questions/ # Altres taxonomies (amb _index.md)
│   ├── cronologia/_index.md   # Pàgina del timeline
│   ├── projecte/_index.md      # Pàgina estática "El Projecte"
│   └── cerca/_index.md        # Pàgina de cerca (outputs: html, json)
├── assets/                    # Recursos que Hugo processa (site-level)
│   └── images/
│       ├── articles/          # 298 imatges d'article (900×450; hero a 720px, thumbs a 120px)
│       └── publicacions/      # 35 logos de publicació (600px, servits directament)
├── themes/papersvells/        # El tema custom
│   ├── layouts/
│   │   ├── _default/          # baseof.html, single.html, list.html, taxonomy.html, 404.html
│   │   ├── _partials/fitxa.html
│   │   ├── index.html         # Portada (scroll infinit)
│   │   ├── cerca/             # list.html (UI), list.json (índex cerca)
│   │   ├── cronologia/list.html
│   │   ├── projecte/list.html
│   │   └── shortcodes/estadistiques.html
│   └── assets/
│       ├── css/               # main.css, header.css, cerca.css, cronologia.css
│       └── js/                # menu.js, header-scroll.js, cerca.js, portada.js, cronologia.js, fitxa.js
├── static/                    # Fitxers servits tal qual (sense processar)
│   ├── fonts/                 # Alegreya (Regular, Italic, Medium, Bold, BoldItalic), Rubik Mono One, Alegreya-Sans
│   ├── images/
│   │   ├── autors/            # Fotos dels autors (webp, 240×240)
│   │   ├── logo-horitzontal.webp, logo-vertical.webp, og-default.jpg
│   │   └── lupa.webp, twpv.webp, wikipedia.webp, arca.webp, floritura.webp, rsslogo.webp
│   ├── _headers, _redirects  # Cache-Control; 301 de paths antics (estàtics primer)
│   └── favicon.ico, apple-touch-icon.png, robots.txt, icon-*.png, icon.svg
├── scripts/                   # Utilitats (Node, sense dependències)
│   └── estadistiques.mjs      # Baixa i acumula visites de Cloudflare RUM
├── estadistiques/             # CSV acumulatius de visites (arxiu permanent)
├── docs/estadistiques.md      # Com funcionen les estadístiques
├── .github/workflows/         # estadistiques.yml (cron setmanal)
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
arca: "https://arca.bnc.cat/arcabib_pro/ca/consulta/registro.do?id=2321"
---
```

- `arca` és opcional: enllaç al registre de la publicació a ARCA (Arxiu de Revistes
  Catalanes Antigues). Es mostra com a insígnia al costat de la de Viquipèdia i
  s'afegeix al `sameAs` del JSON-LD. Ha de ser la URL completa
  (`https://arca.bnc.cat/arcabib_pro/ca/consulta/registro.do?id=NNNN`), triada de
  manera que el període del registre cobreixi els articles publicats al web
  (algunes capçaleres tenen diversos registres, un per etapa). Per obtenir l'id:
  cerca el títol a https://arca.bnc.cat, obre la fitxa i copia el `id=` de la URL
  del registre

## Convencions de noms de fitxers

- Articles: `YYYY-MM-DD_publicacio_autor_-_titol.md` (guions, sense accents al fitxer)
- Imatges d'autors: `<slug-sense-accents>.webp` (mateix nom que el directori)
- Imatges de publicacions: `<slug>.webp` — **600px d'ample** (es serveixen directament, sense
  resize de Hugo; exporta sempre els logos nous a 600px). Virolles a `assets/images/publicacions/`
- Imatges d'articles: `<mateix-nom-del-fitxer-md>.webp` (900×450, a `assets/images/articles/`).
  L'original fa de màster: el hero se serveix com a variant de 720px (`.Resize "720x webp q82"`)
  i el timeline en genera miniatures de 120px amb `images.Fill`

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

## Estadístiques (separat del disseny de la web)

Les visites es guarden fora de Cloudflare perquè el beacon només en conserva ~184 dies.

- Script: `scripts/estadistiques.mjs` (Node, sense dependències).
- Dades: `estadistiques/*.csv` (acumulatives; vegeu `docs/estadistiques.md`).
- Automatització: `.github/workflows/estadistiques.yml`, dilluns 06:00 UTC, amb el
  secret `CF_ANALYTICS_TOKEN` (`Account Analytics: Read`).
- **No modificar els CSV a mà** ni reordenar-ne les files: el script reemplaça la
  finestra dels últims 30 dies a cada execució.
- Tot el detall tècnic (dataset, límits, com citar xifres) a `docs/estadistiques.md`.

## Notes importants

- L'ordenació de la portada és per `Params.publicat` (data de pujada al web), NO per `Date` (data històrica)
- El camp `autors_citats` permet trobar articles on surt un autor esmentat (secció «Ha estat citat en…» de `taxonomy.html`)
- El shortcode `{{< estadistiques >}}` mostra xifres del projecte (articles, autors, publicacions, període)
- El theme NO té fitxer `theme.toml` ni `package.json` — és totalment custom
- `.gitignore`: `public/`, `/resources/_gen/`, `/.hugo_build.lock`, `/skills-lock.json`. `public/` ja no es versiona
- Script de desplegament (a la carpeta pare): `pujar-a-github.sh` (git add + commit + push)
- L'Hugo local i el de Cloudflare Pages han d'anar lligats (Cloudflare: `HUGO_VERSION = 0.164.0`)
- El domini canònic, el `rel=canonical`, les redireccions `www`/`pages.dev` i la
  verificació de Search Console es documenten a «Domini, canonical i redireccions»

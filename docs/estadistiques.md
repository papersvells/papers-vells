# Estadístiques de Papers Vells

Arxiu permanent de les visites, independent del disseny de la web. Cloudflare
només conserva ~184 dies de dades; aquests CSV les guarden per sempre.

## D'on surten les dades

Cloudflare **Web Analytics** (el beacon `beacon.min.js` que Cloudflare injecta a
l'HTML), consultat per l'API **GraphQL** amb el dataset RUM:

- Endpoint: `https://api.cloudflare.com/client/v4/graphql`
- Dataset: `rumPageloadEventsAdaptiveGroups` (nivell de compte)
- Dimensions: `date`, `requestPath`, `siteTag`, `bot`
- Mètriques: `count` (pàgines vistes), `sum { visits }`
- Filtre: `siteTag` del lloc + `bot: 0` (fora robots)

Identificadors (no són secrets):

| Cosa | Valor |
|---|---|
| Account ID | `253c205ac294d2d34ce46b9c4849a3c9` |
| Site tag | `8b7f059d5e784c519c2c914212d84c39` |
| Zone ID | `e9c729271c23b93b31d03ef7ab96c24c` |

Límits del compte (node `settings`):

| Dataset | Retenció | Màxim per consulta |
|---|---|---|
| `rumPageloadEventsAdaptiveGroups` | **184 dies** | 93 dies |
| `httpRequestsAdaptive` | 32 dies | 32 dies |

El token necessita el permís **Account → Account Analytics → Read**.

## Fitxers

```
estadistiques/articles-diari.csv    data,path,titol,pageviews,visites
estadistiques/lloc-diari.csv        data,pageviews,visites
estadistiques/articles-total.csv    titol,path,pageviews,visites   (rànquing de sempre)
estadistiques/articles-30dies.csv   titol,path,pageviews,visites   (llista pública)
```

- `articles-diari.csv` i `lloc-diari.csv` són **la font de veritat** i no es poden
  perdre: és l'únic lloc on aquestes dades existiran quan Cloudflare les esborri.
- `articles-total.csv` i `articles-30dies.csv` es regeneren sencers a cada execució.
- Només s'hi guarden **articles** (els paths que apareixen a `/cerca/index.json`).
  Portada, `/autors/`, `/cronologia/`, 404 i imatges queden fora del rànquing
  d'articles, però **sí** que compten a `lloc-diari.csv`.

## Com funciona el script

`scripts/estadistiques.mjs`, Node >= 18, sense dependències.

1. Calcula des de quan ha de demanar dades (finestra de 30 dies per defecte; 180
   dies el primer cop).
2. Baixa les dades en trossos de **7 dies**. És crític: a partir de 10 dies,
   l'API fa un *rollup* i retorna una sola fila (les dades diàries desapareixen, i
   els números no quadren). Amb finestres de 7 dies les xifres són estables.
3. **Reemplaça** tota la finestra relligada amb el que diu l'API. No fa *upsert*:
   Cloudflare revisa les xifres dels primers dies i una fila pot desaparèixer.
   Les files més antigues que la finestra no es toquen mai.
4. Genera els dos rànquings.
5. Comprova si hi ha dies sense dades i avisa.

Si l'API torna buida però ja teníem dades, el script **no escriu res** (protecció
contra un buidatge accidental).

### Ordres

```bash
CF_TOKEN=... node scripts/estadistiques.mjs                # actualitza i mostra el rànquing
CF_TOKEN=... node scripts/estadistiques.mjs --dies 30      # taula de l'últim mes
CF_TOKEN=... node scripts/estadistiques.mjs --resum        # resum per anys (subvencions)
CF_TOKEN=... node scripts/estadistiques.mjs --dry-run      # no escriu res
```

Opcions completes: `--dies`, `--top`, `--finestra`, `--public`, `--min`, `--des`,
`--resum`, `--dry-run`. Vegeu `--ajuda`.

## Automatització

`.github/workflows/estadistiques.yml`:

- S'executa **cada dilluns a les 06:00 UTC** i també a mà (*Actions → Estadístiques
  → Run workflow*).
- Fa commit només si els CSV canvien.
- Necessita el secret **`CF_ANALYTICS_TOKEN`** a
  *Settings → Secrets and variables → Actions*.
- El resum anual apareix al **Summary** de cada execució.

Els cron de GitHub Actions només corren a `main` i s'aturen si el repo queda 60
dies sense activitat; el commit setmanal ho evita.

## Coses a saber

- **Mai demanar més de 7 dies en una sola consulta.** A partir de 10 dies l'API
  canvia d'agregació, retorna una sola fila i les xifres diàries s'esfumen
  (comprovat: 8 dies → 19 pàgines vistes repartides per dia; 10 dies → 1 fila amb 20).
- **Les xifres es revisen.** Els primers dies, Cloudflare pot corregir a l'alça o
  a la baixa. Per això es relligeixen 30 dies cada cop. Si una revisió arriba més
  tard de 30 dies, es perdrà.
- **`visites` sovint és 0.** La mètrica de sessions no sempre es pobla. El rànquing
  va per `pageviews`, que és la dada fiable.
- **El RUM compta els 404.** Un path que no és a l'índex de cerca es descarta del
  rànquing d'articles, però suma al total del lloc.
- **No hi ha visitants únics.** El beacon és *cookieless* i no identifica
  navegadors; per article només existeixen pàgines vistes i (de vegades) sessions.
- **Dades anteriors al 2026-11-02 no existeixen**: és quan es va activar el beacon.

## Com citar els números

| Frase | Número |
|---|---|
| «X visites» | `visites` (sessions) |
| «X pàgines vistes» | `pageviews` |

No barrejar-los ni sumar-los. Per a una memòria o subvenció, `--resum` dóna el
total per any i els últims 12 mesos, amb avís si la cobertura és parcial.

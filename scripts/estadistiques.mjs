#!/usr/bin/env node
/**
 * Estadístiques de Papers Vells
 * -----------------------------
 * Baixa les visites de Cloudflare Web Analytics (dataset RUM), les acumula en
 * CSV dins del repo i genera els rànquings. Cloudflare només guarda ~184 dies
 * de dades; els CSV són l'arxiu permanent.
 *
 * Ús:
 *   CF_TOKEN=... node scripts/estadistiques.mjs
 *   CF_TOKEN=... node scripts/estadistiques.mjs --dies 30
 *   CF_TOKEN=... node scripts/estadistiques.mjs --resum
 *   CF_TOKEN=... node scripts/estadistiques.mjs --dry-run
 *
 * Sense dependències: només Node >= 18 (fetch global).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';

// ─────────────────────────────────────────────────────────────────────────────
// Configuració
// ─────────────────────────────────────────────────────────────────────────────

const CFG = {
  accountId: '253c205ac294d2d34ce46b9c4849a3c9',
  siteTag: '8b7f059d5e784c519c2c914212d84c39',
  siteUrl: 'https://papersvells.cat',
  api: 'https://api.cloudflare.com/client/v4/graphql',
  dir: 'estadistiques',
  // Cloudflare només conserva ~184 dies: no demanem mai més enrere que això.
  maximEnrere: 180,
};

const FITXERS = {
  articlesDiari: `${CFG.dir}/articles-diari.csv`,
  llocDiari: `${CFG.dir}/lloc-diari.csv`,
  articlesTotal: `${CFG.dir}/articles-total.csv`,
  articles30dies: `${CFG.dir}/articles-30dies.csv`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilitats de dates (tot en UTC, per no dependre de la zona del runner)
// ─────────────────────────────────────────────────────────────────────────────

const DIA = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);
const deIso = (s) => new Date(`${s}T00:00:00Z`);
const sumaDies = (d, n) => new Date(d.getTime() + n * DIA);
const avui = () => deIso(iso(new Date()));
const minim = (a, b) => (b === undefined ? a : a < b ? a : b);
const maxim = (a, b) => (b === undefined ? a : a > b ? a : b);

// ─────────────────────────────────────────────────────────────────────────────
// Utilitats CSV (parser mínim RFC 4180: els títols porten comes i cometes)
// ─────────────────────────────────────────────────────────────────────────────

function parseCsv(text) {
  const files = [];
  let fila = [];
  let camp = '';
  let entreCometes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (entreCometes) {
      if (c === '"') {
        if (text[i + 1] === '"') { camp += '"'; i++; }
        else entreCometes = false;
      } else {
        camp += c;
      }
    } else if (c === '"') {
      entreCometes = true;
    } else if (c === ',') {
      fila.push(camp); camp = '';
    } else if (c === '\n') {
      fila.push(camp); files.push(fila); fila = []; camp = '';
    } else if (c !== '\r') {
      camp += c;
    }
  }
  if (camp !== '' || fila.length) { fila.push(camp); files.push(fila); }
  return files.filter((f) => f.length > 1 || (f.length === 1 && f[0] !== ''));
}

function llegeixCsv(text, camps) {
  if (!text.trim()) return [];
  const files = parseCsv(text);
  const capçalera = files.shift();
  const idx = Object.fromEntries(capçalera.map((c, i) => [c.trim(), i]));
  const falten = camps.filter((c) => !(c in idx));
  if (falten.length) throw new Error(`CSV sense les columnes: ${falten.join(', ')}`);
  return files.map((f) => Object.fromEntries(camps.map((c) => [c, (f[idx[c]] ?? '').trim()])));
}

const escapa = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csv = (camps, files) =>
  [camps.join(','), ...files.map((f) => camps.map((c) => escapa(f[c])).join(','))].join('\n') + '\n';

async function llegeixFitxer(ruta) {
  try { return await readFile(ruta, 'utf8'); } catch { return ''; }
}

// ─────────────────────────────────────────────────────────────────────────────
// API de Cloudflare
// ─────────────────────────────────────────────────────────────────────────────

async function gql(query, variables) {
  const token = process.env.CF_TOKEN;
  if (!token) {
    throw new Error('Falta la variable d\'entorn CF_TOKEN (token de Cloudflare amb "Account Analytics: Read").');
  }
  const res = await fetch(CFG.api, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} de l'API de Cloudflare`);
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`API: ${json.errors.map((e) => e.message).join(' | ')}`);
  }
  return json.data;
}

const Q_LLOC = `
  query ($a: String!, $t: String!, $s: Time!, $e: Time!) {
    viewer {
      accounts(filter: { accountTag: $a }) {
        dades: rumPageloadEventsAdaptiveGroups(
          limit: 10000
          filter: { siteTag: $t, bot: 0, datetime_geq: $s, datetime_leq: $e }
          orderBy: [date_ASC]
        ) {
          count
          sum { visits }
          dimensions { date }
        }
      }
    }
  }`;

const Q_ARTICLES = `
  query ($a: String!, $t: String!, $s: Time!, $e: Time!) {
    viewer {
      accounts(filter: { accountTag: $a }) {
        dades: rumPageloadEventsAdaptiveGroups(
          limit: 10000
          filter: { siteTag: $t, bot: 0, datetime_geq: $s, datetime_leq: $e }
          orderBy: [date_ASC, count_DESC]
        ) {
          count
          sum { visits }
          dimensions { date requestPath }
        }
      }
    }
  }`;

// IMPORTANT: a partir de 10 dies, l'API fa un rollup i retorna una sola fila
// (les dades diàries desapareixen). Amb finestres de 7 dies les xifres són
// estables i coincideixen entre consultes. No apujar aquest valor.
const MAX_DIES_PER_CONSULTA = 7;

async function baixaDades(query, des, fins, { anteriors, nom, accepta = () => true }) {
  const files = [];
  for (let inici = des; inici <= fins; inici = sumaDies(inici, MAX_DIES_PER_CONSULTA)) {
    const final = minim(sumaDies(inici, MAX_DIES_PER_CONSULTA - 1), fins);
    const primerDia = iso(inici);
    const ultimDia = iso(final);
    const data = await gql(query, {
      a: CFG.accountId,
      t: CFG.siteTag,
      s: `${primerDia}T00:00:00Z`,
      e: `${ultimDia}T23:59:59Z`,
    });
    const dades = data?.viewer?.accounts?.[0]?.dades;
    if (!Array.isArray(dades)) {
      throw new Error(`Resposta incompleta de l'API (${nom}, ${primerDia} → ${ultimDia}). No s'ha tocat cap fitxer.`);
    }
    // Validem cada tram abans de reemplaçar-lo: una altra consulta o un altre
    // tram amb dades no han d'amagar una resposta buida que esborraria l'històric.
    const acceptades = dades.filter(accepta).length;
    const previes = anteriors.filter((f) => f.data >= primerDia && f.data <= ultimDia).length;
    if (acceptades === 0 && previes > 0) {
      throw new Error(`L'API no ha retornat files acceptades per a ${nom} (${primerDia} → ${ultimDia}), però ja hi havia dades. Files retornades: ${dades.length}; acceptades: ${acceptades}; prèvies: ${previes}. No s'ha tocat cap fitxer.`);
    }
    files.push(...dades);
  }
  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// Índex de cerca: dóna títols i permet filtrar només articles
// ─────────────────────────────────────────────────────────────────────────────

async function baixaIndex() {
  const res = await fetch(`${CFG.siteUrl}/cerca/index.json`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`No s'ha pogut baixar /cerca/index.json (HTTP ${res.status})`);
  const json = await res.json();
  if (!Array.isArray(json.articles)) throw new Error('/cerca/index.json no té la clau "articles"');
  const index = new Map();
  for (const a of json.articles) {
    if (a.u && a.t) index.set(a.u, a.t);
  }
  return index;
}

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────

function args() {
  const a = process.argv.slice(2);
  const val = (nom, def) => {
    const i = a.indexOf(nom);
    if (i === -1) return def;
    const v = Number(a[i + 1]);
    return Number.isFinite(v) ? v : def;
  };
  return {
    dies: val('--dies', 0),            // 0 = tot l'històric (només afecta la taula)
    top: val('--top', 10),             // files que s'imprimeixen
    finestra: val('--finestra', 30),   // dies de la llista pública
    public: val('--public', 10),       // files de la llista pública
    minim: val('--min', 5),            // visites mínimes per entrar a la llista pública
    des: val('--des', 30),             // dies que es tornen a llegir cada execució
    resum: a.includes('--resum'),
    dryRun: a.includes('--dry-run'),
    ajuda: a.includes('--ajuda') || a.includes('-h'),
  };
}

const AJUDA = `
Estadístiques de Papers Vells

  node scripts/estadistiques.mjs [opcions]

Opcions:
  --dies N      mostra només els últims N dies a la taula (per defecte: tot)
  --top N       quantes files imprimeix (per defecte: 10)
  --finestra N  dies de la llista pública (per defecte: 30)
  --public N    files de la llista pública (per defecte: 10)
  --min N       visites mínimes per entrar a la llista pública (per defecte: 5)
  --des N       quants dies es tornen a llegir de l'API (per defecte: 30)
  --resum       només imprimeix el resum per anys i els últims 12 mesos
  --dry-run     no escriu cap fitxer
  -h, --ajuda   aquesta ajuda

Variable d'entorn:
  CF_TOKEN     token de Cloudflare amb permís "Account Analytics: Read"
`;

// ─────────────────────────────────────────────────────────────────────────────
// Càlcul i escriptura
// ─────────────────────────────────────────────────────────────────────────────

const suma = (files, camp) => files.reduce((t, f) => t + (Number(f[camp]) || 0), 0);

const ordena = (files, campPrincipal = 'pageviews', campSecundari = 'visites') =>
  files.sort((a, b) =>
    (Number(b[campPrincipal]) - Number(a[campPrincipal])) ||
    (Number(b[campSecundari]) - Number(a[campSecundari])) ||
    String(a.titol).localeCompare(String(b.titol), 'ca'));

function taula(capçaleres, files) {
  const ample = capçaleres.map((h, i) =>
    Math.max(String(h).length, ...files.map((f) => String(f[i]).length)));
  const linia = (cels) => cels.map((c, i) => String(c).padEnd(ample[i])).join('  ').trimEnd();
  return [linia(capçaleres), ample.map((n) => '─'.repeat(n)).join('  '), ...files.map(linia)].join('\n');
}

async function main() {
  const opcions = args();
  if (opcions.ajuda) { console.log(AJUDA); return; }

  await mkdir(CFG.dir, { recursive: true });

  const textArticles = await llegeixFitxer(FITXERS.articlesDiari);
  const textLloc = await llegeixFitxer(FITXERS.llocDiari);
  const articles = llegeixCsv(textArticles, ['data', 'path', 'titol', 'pageviews', 'visites']);
  const lloc = llegeixCsv(textLloc, ['data', 'pageviews', 'visites']);

  // ── Resum: no toca l'API ni els fitxers ────────────────────────────────────
  if (opcions.resum) {
    imprimeixResum(lloc);
    return;
  }

  // ── Rang a demanar ────────────────────────────────────────────────────────
  const ultim = articles.reduce((data, f) => maxim(data, f.data), '');
  const inici = maxim(
    ultim
      ? minim(sumaDies(deIso(ultim), 1), sumaDies(avui(), -opcions.des + 1))
      : sumaDies(avui(), -CFG.maximEnrere),
    sumaDies(avui(), -CFG.maximEnrere),
  );
  const fi = avui();

  if (inici > fi) {
    console.log('No hi ha dies nous per demanar.');
  }

  const index = await baixaIndex();

  let novesArticles = [];
  let novesLloc = [];
  if (inici <= fi) {
    console.log(`Demanant a Cloudflare: ${iso(inici)} → ${iso(fi)} (${Math.round((fi - inici) / DIA) + 1} dies)…`);

    // Títols coneguts: els de l'índex i, si cal, els que ja teníem guardats.
    const titols = new Map(articles.map((f) => [f.path, f.titol]));
    for (const [u, t] of index) titols.set(u, t);

    const dadesLloc = await baixaDades(Q_LLOC, inici, fi, {
      anteriors: lloc, nom: 'lloc',
    });
    const dadesArticles = await baixaDades(Q_ARTICLES, inici, fi, {
      anteriors: articles, nom: 'articles',
      accepta: (f) => titols.has(f.dimensions.requestPath),
    });

    novesLloc = dadesLloc.map((f) => ({
      data: f.dimensions.date,
      pageviews: String(f.count),
      visites: String(f.sum?.visits ?? 0),
    }));

    novesArticles = dadesArticles
      .map((f) => ({
        data: f.dimensions.date,
        path: f.dimensions.requestPath,
        titol: titols.get(f.dimensions.requestPath) ?? '',
        pageviews: String(f.count),
        visites: String(f.sum?.visits ?? 0),
      }))
      .filter((f) => f.titol); // només articles publicats
  }

  // ── Reemplaçament de la finestra relligada ────────────────────────────────
  // Cloudflare revisa les xifres dels primers dies (poden pujar o baixar), i
  // alguna fila pot desaparèixer. Per això no fem upsert: esborrem tot el que
  // cau dins la finestra relligada i hi posem exactament el que diu l'API.
  // Les files anteriors a la finestra no es toquen mai.
  const desdeFinestra = iso(inici);

  const articlesFora = articles.filter((f) => f.data < desdeFinestra);
  const llocFora = lloc.filter((f) => f.data < desdeFinestra);

  const articlesFinals = [...articlesFora, ...novesArticles]
    .sort((a, b) => a.data.localeCompare(b.data) || a.path.localeCompare(b.path));
  const llocFinal = [...llocFora, ...novesLloc]
    .sort((a, b) => a.data.localeCompare(b.data));

  // ── Rànquings ─────────────────────────────────────────────────────────────
  const esArticle = (path) => index.has(path);

  const total = ordena(
    agrupa(articlesFinals.filter((f) => esArticle(f.path)), 'path'),
    'pageviews', 'visites');

  const rankingDelsUltimsDies = (dies) => {
    const desde = iso(sumaDies(avui(), -dies + 1));
    return ordena(
      agrupa(articlesFinals.filter((f) => esArticle(f.path) && f.data >= desde), 'path'),
      'pageviews', 'visites');
  };
  const recent = rankingDelsUltimsDies(opcions.finestra);
  const informe = opcions.dies > 0 ? rankingDelsUltimsDies(opcions.dies) : total;

  // La llista pública: top N amb un mínim de visites per no ensenyar empats a 1.
  const publiques = recent
    .filter((f) => Number(f.pageviews) >= opcions.minim)
    .slice(0, opcions.public);

  // ── Escriptura ────────────────────────────────────────────────────────────
  if (!opcions.dryRun) {
    await writeFile(FITXERS.articlesDiari, csv(['data', 'path', 'titol', 'pageviews', 'visites'], articlesFinals));
    await writeFile(FITXERS.llocDiari, csv(['data', 'pageviews', 'visites'], llocFinal));
    await writeFile(FITXERS.articlesTotal, csv(['titol', 'path', 'pageviews', 'visites'], total));
    await writeFile(FITXERS.articles30dies, csv(['titol', 'path', 'pageviews', 'visites'], publiques));
    console.log(`\nDesat a ${CFG.dir}/: ${articlesFinals.length} files d'articles, ${llocFinal.length} dies del lloc.`);
  } else {
    console.log('\n[--dry-run] No s\'ha escrit res.');
  }

  // ── Informe ───────────────────────────────────────────────────────────────
  const rangs = opcions.dies > 0
    ? `últims ${opcions.dies} dies`
    : `tot l'històric (${llocFinal[0]?.data ?? '—'} → ${llocFinal.at(-1)?.data ?? '—'})`;

  console.log(`\nEls més llegits — ${rangs}\n`);
  const files = informe.slice(0, opcions.top)
    .map((f, i) => [String(i + 1), f.titol, f.pageviews, f.visites]);
  console.log(taula(['#', 'Títol', 'Pàg.', 'Vis.'], files));

  const totalPv = suma(llocFinal, 'pageviews');
  const totalVis = suma(llocFinal, 'visites');
  console.log(`\nLloc sencer: ${totalPv.toLocaleString('ca')} pàgines vistes · ${totalVis.toLocaleString('ca')} visites`);
  console.log(`Articles guardats: ${articlesFinals.length} files · ${total.length} articles distints`);

  const ultimDia = llocFinal.at(-1)?.data;
  if (ultimDia) {
    const diesSense = diesBuits(llocFinal);
    if (diesSense.length) {
      console.log(`\n⚠️  Forats detectats (${diesSense.length} dies sense dades):`);
      console.log(`   ${diesSense.slice(0, 10).join(', ')}${diesSense.length > 10 ? '…' : ''}`);
      console.log('   Es poden recuperar mentre Cloudflare els guardi (184 dies).');
    }
  }
}

function agrupa(files, clau) {
  const mapa = new Map();
  for (const f of files) {
    const k = f[clau];
    const previ = mapa.get(k);
    if (previ) {
      previ.pageviews = String(Number(previ.pageviews) + Number(f.pageviews));
      previ.visites = String(Number(previ.visites) + Number(f.visites));
    } else {
      mapa.set(k, { ...f });
    }
  }
  return [...mapa.values()];
}

function diesBuits(lloc) {
  if (lloc.length < 2) return [];
  const presents = new Set(lloc.map((f) => f.data));
  const buits = [];
  const ultim = deIso(lloc.at(-1).data);
  for (let d = deIso(lloc[0].data); d < ultim; d = sumaDies(d, 1)) {
    if (!presents.has(iso(d))) buits.push(iso(d));
  }
  return buits;
}

function imprimeixResum(lloc) {
  if (!lloc.length) { console.log('Encara no hi ha dades.'); return; }

  const perAny = new Map();
  for (const f of lloc) {
    const any = f.data.slice(0, 4);
    const previ = perAny.get(any) ?? { pv: 0, vis: 0 };
    perAny.set(any, { pv: previ.pv + Number(f.pageviews), vis: previ.vis + Number(f.visites) });
  }

  const files = [...perAny.entries()].map(([any, v]) => [any, v.pv.toLocaleString('ca'), v.vis.toLocaleString('ca')]);
  files.push(['—'.repeat(4), '—'.repeat(10), '—'.repeat(10)]);
  files.push(['Total', suma(lloc, 'pageviews').toLocaleString('ca'), suma(lloc, 'visites').toLocaleString('ca')]);

  console.log('Resum per anys\n');
  console.log(taula(['Any', 'Pàgines vistes', 'Visites'], files));

  const fa12 = iso(sumaDies(avui(), -364));
  const ultims12 = lloc.filter((f) => f.data >= fa12);
  const copert = ultims12[0]?.data ?? '—';

  console.log(`\nÚltims 12 mesos (${copert} → ${lloc.at(-1).data}):`);
  console.log(`  ${suma(ultims12, 'pageviews').toLocaleString('ca')} pàgines vistes · ${suma(ultims12, 'visites').toLocaleString('ca')} visites`);

  if (copert > fa12) {
    console.log(`  ⚠️  Cobertura parcial: les dades comencen el ${copert}, no fa 12 mesos.`);
  }
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

// Executem el CLI real en un context aïllat, substituint només les dependències
// externes: rellotge, API, consola i fitxers. No es toca estadistiques/*.csv.
const codi = (await readFile(new URL('./estadistiques.mjs', import.meta.url), 'utf8'))
  .replace("import { readFile, writeFile, mkdir } from 'node:fs/promises';", '');

const ARA = '2026-11-13T12:00:00Z';
const TITOLS = {
  '/antic/': 'Article antic',
  '/recent/': 'Article recent',
  '/nou/': 'Article nou',
};

class DataFixa extends Date {
  constructor(...args) { super(...(args.length ? args : [ARA])); }
  static now() { return Date.parse(ARA); }
}

const article = (data, path, pageviews = 10) => ({
  data, path, titol: TITOLS[path], pageviews, visites: 0,
});
const filaAPI = (f) => ({
  dimensions: { date: f.data, requestPath: f.path },
  count: Number(f.pageviews), sum: { visits: Number(f.visites) },
});
const aCsv = (camps, files) =>
  [camps.join(','), ...files.map((f) => camps.map((c) => f[c]).join(','))].join('\n') + '\n';

async function executa({
  args = [],
  articlesVells = [article('2026-11-12', '/nou/')],
  llocVell = [...new Set(articlesVells.map((f) => f.data))]
    .map((data) => ({ data, pageviews: 20, visites: 0 })),
  articlesNous = articlesVells.map(filaAPI),
  llocNou = llocVell.map(filaAPI),
  resposta,
} = {}) {
  const fitxers = new Map([
    ['estadistiques/articles-diari.csv', aCsv(['data', 'path', 'titol', 'pageviews', 'visites'], articlesVells)],
    ['estadistiques/lloc-diari.csv', aCsv(['data', 'pageviews', 'visites'], llocVell)],
  ]);
  const escrits = new Map();
  const consultes = [];
  const logs = [];
  const errors = [];
  let exitCode = 0;

  await runInNewContext(codi, {
    Date: DataFixa,
    AbortSignal,
    console: {
      log: (...texts) => logs.push(texts.join(' ')),
      error: (...texts) => errors.push(texts.join(' ')),
    },
    process: {
      argv: ['node', 'estadistiques.mjs', ...args],
      env: { CF_TOKEN: 'token-simulat' },
      exit: (code) => { exitCode = code; },
    },
    mkdir: async () => {},
    readFile: async (ruta) => fitxers.get(ruta) ?? '',
    writeFile: async (ruta, text) => { escrits.set(ruta, text); },
    fetch: async (url, opcions) => {
      if (url === 'https://papersvells.cat/cerca/index.json') {
        return { ok: true, json: async () => ({
          articles: Object.entries(TITOLS).map(([u, t]) => ({ u, t })),
        }) };
      }
      assert.equal(url, 'https://api.cloudflare.com/client/v4/graphql');
      const { query, variables } = JSON.parse(opcions.body);
      const consulta = {
        tipus: query.includes('requestPath') ? 'articles' : 'lloc',
        des: variables.s.slice(0, 10),
        fins: variables.e.slice(0, 10),
      };
      consultes.push(consulta);
      const files = consulta.tipus === 'articles' ? articlesNous : llocNou;
      const data = resposta?.(consulta) ?? { viewer: { accounts: [{ dades:
        files.filter((f) => f.dimensions.date >= consulta.des && f.dimensions.date <= consulta.fins),
      }] } };
      return { ok: true, json: async () => ({ data }) };
    },
  }, { filename: 'estadistiques.mjs' });

  return { escrits, consultes, logs: logs.join('\n'), errors: errors.join('\n'), exitCode };
}

test('l’última data es calcula amb totes les files, no només les dues primeres', async () => {
  const resultat = await executa({ articlesVells: [
    article('2026-04-01', '/antic/'),
    article('2026-04-01', '/recent/'),
    article('2026-11-12', '/nou/'),
  ] });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.equal(resultat.consultes[0].des, '2026-10-15');
  assert.match(resultat.escrits.get('estadistiques/articles-diari.csv'), /2026-04-01/);
});

test('l’última data no depèn de l’ordre de les files', async () => {
  const resultat = await executa({ articlesVells: [
    article('2026-04-01', '/antic/'),
    article('2026-11-12', '/nou/'),
    article('2026-05-01', '/recent/'),
  ] });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.equal(resultat.consultes[0].des, '2026-10-15');
});

test('un arxiu nou continua consultant 180 dies en trams de fins a 7 dies', async () => {
  const resultat = await executa({ articlesVells: [] });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.equal(resultat.consultes[0].des, '2026-05-17');
  assert.equal(resultat.consultes.at(-1).fins, '2026-11-13');
  for (const consulta of resultat.consultes) {
    assert.ok((new Date(consulta.fins) - new Date(consulta.des)) / 86400000 < 7);
  }
});

test('--dies 7 exclou articles de fa 19 dies però no canvia la llista pública de 30 dies', async () => {
  const resultat = await executa({
    args: ['--dies', '7'],
    articlesVells: [article('2026-10-25', '/antic/'), article('2026-11-12', '/nou/')],
  });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.match(resultat.logs, /últims 7 dies/);
  assert.match(resultat.logs, /Article nou/);
  assert.doesNotMatch(resultat.logs, /Article antic/);
  assert.match(resultat.escrits.get('estadistiques/articles-30dies.csv'), /Article antic/);
});

test('--dies 60 i --finestra 7 calculen dos rànquings independents', async () => {
  const resultat = await executa({
    args: ['--dies', '60', '--finestra', '7'],
    articlesVells: [article('2026-10-04', '/antic/'), article('2026-11-12', '/nou/')],
  });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.match(resultat.logs, /Article antic/);
  const publiques = resultat.escrits.get('estadistiques/articles-30dies.csv');
  assert.match(publiques, /Article nou/);
  assert.doesNotMatch(publiques, /Article antic/);
});

test('--dies filtra les files abans de sumar les visites d’un mateix article', async () => {
  const resultat = await executa({
    args: ['--dies', '7'],
    articlesVells: [article('2026-10-25', '/nou/', 30), article('2026-11-12', '/nou/', 10)],
  });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.match(resultat.logs, /Article nou\s+10\s+0/);
  assert.match(resultat.escrits.get('estadistiques/articles-30dies.csv'), /Article nou,\/nou\/,40,0/);
});

test('--dies 0 continua mostrant tot l’històric', async () => {
  const resultat = await executa({
    args: ['--dies', '0'],
    articlesVells: [article('2026-04-01', '/antic/'), article('2026-11-12', '/nou/')],
  });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.match(resultat.logs, /tot l'històric/);
  assert.match(resultat.logs, /Article antic/);
});

test('--dies 1 només inclou avui, no ahir', async () => {
  const resultat = await executa({
    args: ['--dies', '1'],
    articlesVells: [article('2026-11-12', '/antic/'), article('2026-11-13', '/nou/')],
  });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.match(resultat.logs, /Article nou/);
  assert.doesNotMatch(resultat.logs, /Article antic/);
});

for (const [nom, dades] of [
  ['articles buits amb dades del lloc', { articlesNous: [] }],
  ['lloc buit amb dades d’articles', { llocNou: [] }],
  ['les dues consultes buides', { articlesNous: [], llocNou: [] }],
  ['paths que no són articles', { articlesNous: [filaAPI({
    data: '2026-11-12', path: '/', pageviews: 3, visites: 0,
  })] }],
]) {
  test(`conserva les dades prèvies del tram: ${nom}`, async () => {
    const resultat = await executa(dades);
    assert.equal(resultat.exitCode, 0);
    assert.match(resultat.logs, /Tram protegit/);
    assert.match(resultat.escrits.get('estadistiques/articles-diari.csv'), /2026-11-12,\/nou\//);
    assert.match(resultat.escrits.get('estadistiques/lloc-diari.csv'), /2026-11-12,20,0/);
  });
}

test('el diagnòstic distingeix una resposta buida de paths no reconeguts', async () => {
  const buida = await executa({ articlesNous: [] });
  assert.match(buida.logs, /0 files retornades, 0 acceptades, 1 prèvies/);

  const desconeguda = await executa({ articlesNous: [filaAPI({
    data: '2026-11-12', path: '/', pageviews: 3, visites: 0,
  })] });
  assert.match(desconeguda.logs, /1 files retornades, 0 acceptades, 1 prèvies/);
});

test('el diagnòstic compara les rutes i el total del lloc sense paràmetres sensibles', async () => {
  const resultat = await executa({ articlesNous: [filaAPI({
    data: '2026-11-12', path: '/altra/?secret=valor', pageviews: 3, visites: 0,
  })] });
  assert.match(resultat.logs, /Articles retornats:.*"path":"\/altra\/".*"pageviews":3/);
  assert.match(resultat.logs, /Articles previs:.*"path":"\/nou\/"/);
  assert.match(resultat.logs, /Total del lloc retornat:.*"pageviews":20/);
  assert.doesNotMatch(resultat.logs, /secret=valor/);
});

test('un tram buit no queda amagat per dades d’un altre tram de la mateixa consulta', async () => {
  const resultat = await executa({
    articlesVells: [article('2026-10-20', '/antic/'), article('2026-11-12', '/nou/')],
    articlesNous: [filaAPI(article('2026-11-12', '/nou/', 27))],
  });
  assert.equal(resultat.exitCode, 0);
  assert.match(resultat.logs, /Tram protegit 2026-10-15 → 2026-10-21 \(articles\)/);
  assert.match(resultat.escrits.get('estadistiques/articles-diari.csv'), /2026-10-20,\/antic\//);
  assert.match(resultat.escrits.get('estadistiques/articles-diari.csv'), /2026-11-12,\/nou\/,Article nou,27,0/);
});

for (const tipus of ['lloc', 'articles']) {
  test(`una resposta incompleta de ${tipus} no es tracta com una llista buida`, async () => {
    const resultat = await executa({
      resposta: (consulta) => consulta.tipus === tipus ? { viewer: { accounts: [] } } : undefined,
    });
    assert.equal(resultat.exitCode, 1);
    assert.match(resultat.errors, /Resposta incompleta/);
    assert.equal(resultat.escrits.size, 0);
  });
}

test('els trams buits sense dades prèvies no bloquegen una actualització vàlida', async () => {
  const resultat = await executa();
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.equal(resultat.escrits.size, 4);
  assert.match(resultat.escrits.get('estadistiques/articles-diari.csv'), /Article nou/);
});

test('un període nou sense visites conserva l’històric fora de la finestra', async () => {
  const resultat = await executa({
    articlesVells: [article('2026-04-01', '/antic/')],
    articlesNous: [], llocNou: [],
  });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.match(resultat.escrits.get('estadistiques/articles-diari.csv'), /2026-04-01,\/antic\//);
  assert.match(resultat.escrits.get('estadistiques/lloc-diari.csv'), /2026-04-01/);
});

test('es permeten revisions a la baixa i files desaparegudes en un tram no buit', async () => {
  const resultat = await executa({
    articlesVells: [article('2026-11-12', '/antic/'), article('2026-11-12', '/nou/')],
    articlesNous: [filaAPI(article('2026-11-12', '/nou/', 2))],
  });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  const articles = resultat.escrits.get('estadistiques/articles-diari.csv');
  assert.match(articles, /Article nou,2,0/);
  assert.doesNotMatch(articles, /Article antic/);
});

test('--dry-run no escriu cap fitxer després d’una resposta vàlida', async () => {
  const resultat = await executa({ args: ['--dry-run'] });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.match(resultat.logs, /No s'ha escrit res/);
  assert.equal(resultat.escrits.size, 0);
});

test('--resum continua funcionant sense consultar la xarxa ni escriure', async () => {
  const resultat = await executa({ args: ['--resum'] });
  assert.equal(resultat.exitCode, 0, resultat.errors);
  assert.equal(resultat.consultes.length, 0);
  assert.equal(resultat.escrits.size, 0);
  assert.match(resultat.logs, /Resum per anys/);
});

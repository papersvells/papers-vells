import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, baixaDades, Q_LLOC, llegeixFitxer, desaFitxers } from './estadistiques.mjs';

test('correccions i integritat de les estadístiques', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'papersvells-estadistiques-'));
  const cwd = process.cwd();
  const argv = process.argv;
  const fetchOriginal = globalThis.fetch;
  const log = console.log;
  const token = process.env.CF_TOKEN;
  process.chdir(dir);
  process.env.CF_TOKEN = 'test';
  await mkdir('estadistiques');
  const dia = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const cap = 'data,path,titol,pageviews,visites\n';
  const hist = `${cap}${dia(100)},/antic/,Antic,1,0\n${dia(50)},/antic/,Antic,1,0\n${dia(1)},/recent/,Recent,1,0\n`;
  const lloc = `data,pageviews,visites\n${dia(100)},1,0\n${dia(1)},1,0\n`;
  const restaura = async () => {
    await writeFile('estadistiques/articles-diari.csv', hist);
    await writeFile('estadistiques/lloc-diari.csv', lloc);
  };
  try {
    await t.test('només ENOENT es tracta com un arxiu absent', async () => {
      assert.equal(await llegeixFitxer('absent.csv'), '');
      await assert.rejects(llegeixFitxer('estadistiques'));
      await writeFile('buit.csv', '');
      await assert.rejects(llegeixFitxer('buit.csv'), /buit/);
    });
    await t.test('rebutja arguments incorrectes abans de consultar la xarxa', async () => {
      globalThis.fetch = () => { throw new Error('No hauria de consultar la xarxa'); };
      for (const args of [['--dies', 'abc'], ['--des', '0'], ['--top', '-1'], ['--finestra'], ['--inventat']]) {
        process.argv = ['node', 'script', ...args];
        await assert.rejects(main(), /invàlid|desconeguda/);
      }
    });
    await t.test('una resposta sense compte no modifica els CSV', async () => {
      await restaura();
      process.argv = ['node', 'script'];
      console.log = () => {};
      globalThis.fetch = async (url) => ({
        ok: true, json: async () => String(url).includes('/cerca/')
          ? { articles: [{ u: '/recent/', t: 'Recent' }] }
          : { data: { viewer: { accounts: [] } } },
      });
      await assert.rejects(main(), /compte/);
      assert.equal(await readFile('estadistiques/articles-diari.csv', 'utf8'), hist);
      assert.equal(await readFile('estadistiques/lloc-diari.csv', 'utf8'), lloc);
    });
    await t.test('última data, període independent i preservació de l’històric', async () => {
      await restaura();
      process.argv = ['node', 'script', '--dies', '7', '--finestra', '30'];
      const sortida = [];
      const inicis = [];
      console.log = (s) => sortida.push(s);
      globalThis.fetch = async (url, opts) => ({
        ok: true,
        json: async () => {
          if (String(url).includes('/cerca/')) return { articles: [
            { u: '/recent/', t: 'Recent' }, { u: '/mes/', t: 'Mensual' }, { u: '/antic/', t: 'Antic' },
          ] };
          const { query, variables } = JSON.parse(opts.body);
          inicis.push(variables.s.slice(0, 10));
          const dades = [
            { count: 4, sum: { visits: 0 }, dimensions: { date: dia(1), requestPath: '/recent/' } },
            { count: 8, sum: { visits: 0 }, dimensions: { date: dia(15), requestPath: '/mes/' } },
          ].filter((f) => f.dimensions.date >= variables.s.slice(0, 10) && f.dimensions.date <= variables.e.slice(0, 10))
            .map((f) => query === Q_LLOC ? { ...f, dimensions: { date: f.dimensions.date } } : f);
          return { data: { viewer: { accounts: [{ dades }] } } };
        },
      });
      await main();
      assert.equal(inicis[0], dia(29));
      const informe = sortida.find((s) => s.startsWith('#'));
      assert.match(informe, /Recent/);
      assert.doesNotMatch(informe, /Mensual/);
      assert.match(await readFile('estadistiques/articles-total.csv', 'utf8'), /Mensual/);
      assert.match(await readFile('estadistiques/articles-diari.csv', 'utf8'), new RegExp(dia(100)));
      assert.ok(!(await readdir('estadistiques')).some((s) => s.endsWith('.tmp')));
    });
    await t.test('límit de files: subdivideix i rebutja un dia saturat', async () => {
      let crides = 0;
      globalThis.fetch = async () => ({
        ok: true, json: async () => ({ data: { viewer: { accounts: [
          { dades: ++crides === 1 ? Array(10000).fill({}) : [] },
        ] } } }),
      });
      assert.deepEqual(await baixaDades(Q_LLOC, new Date('2026-01-01'), new Date('2026-01-02')), []);
      assert.equal(crides, 3);
      crides = 0;
      await assert.rejects(baixaDades(Q_LLOC, new Date('2026-01-01'), new Date('2026-01-01')), /Límit/);
    });
    await t.test('un error preparant temporals conserva els originals', async () => {
      await writeFile('original.csv', 'original');
      await assert.rejects(desaFitxers([['original.csv', 'nou'], ['absent/altre.csv', 'nou']]));
      assert.equal(await readFile('original.csv', 'utf8'), 'original');
      assert.ok(!(await readdir('.')).some((s) => s.endsWith('.tmp')));
    });
  } finally {
    process.chdir(cwd);
    process.argv = argv;
    globalThis.fetch = fetchOriginal;
    console.log = log;
    if (token === undefined) delete process.env.CF_TOKEN;
    else process.env.CF_TOKEN = token;
    await rm(dir, { recursive: true, force: true });
  }
});

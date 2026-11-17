import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, baixaDades, Q_LLOC, llegeixFitxer, desaFitxers, validaFiles } from './estadistiques.mjs';

test('integritat de les estadístiques', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'papersvells-integritat-'));
  const cwd = process.cwd();
  const argv = process.argv;
  const fetchOriginal = globalThis.fetch;
  const token = process.env.CF_TOKEN;
  process.chdir(dir);
  process.env.CF_TOKEN = 'test';
  await mkdir('estadistiques');
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
    await t.test('dates, mètriques i duplicats invàlids', () => {
      const fila = { data: '2026-01-01', pageviews: 1, visites: 0 };
      assert.throws(() => validaFiles([{ ...fila, data: '2026-02-30' }], false));
      assert.throws(() => validaFiles([{ ...fila, pageviews: -1 }], false));
      assert.throws(() => validaFiles([fila, fila], false));
    });
    await t.test('límit de files: subdivideix i rebutja un dia saturat', async () => {
      let crides = 0;
      globalThis.fetch = async () => ({
        ok: true, json: async () => ({ data: { viewer: { accounts: [
          { dades: ++crides === 1 ? Array(10000).fill({}) : [] },
        ] } } }),
      });
      assert.deepEqual(await baixaDades(Q_LLOC, new Date('2026-01-01'), new Date('2026-01-02')), { files: [], protegits: [] });
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
    if (token === undefined) delete process.env.CF_TOKEN;
    else process.env.CF_TOKEN = token;
    await rm(dir, { recursive: true, force: true });
  }
});

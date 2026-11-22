'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../config');
const { customGames, placeCustom } = require('../pcgames');
const paths = require('../paths');
const { gameFromFile } = require('../scanner');
const covers = require('../covers');

const systems = [{ id: 'n64', name: 'Nintendo 64', emulatorName: 'RetroArch' }];
const shelves = [{ id: 'n64', kind: 'console', name: 'Nintendo 64', games: [] }];
const exe = { id: 'custom-harkinian', source: 'custom', title: 'Ship of Harkinian', exe: 'C:\\Games\\soh.exe', args: '--fullscreen', shelf: 'n64' };
const other = { id: 'custom-script', source: 'custom', title: 'Old launcher', exe: 'C:\\Games\\old-launcher.bat', shelf: 'n64' };
const placed = placeCustom(shelves, [exe, other], systems, game => ({ kind: 'steam', ...game }));
const game = shelves[0].games.find(item => item.id === exe.id);
assert.equal(game.kind, 'rom');
assert.equal(game.directExe, true);
assert.equal(game.file, exe.exe);
assert.equal(game.args, exe.args);
assert.equal(game.source, 'custom');
assert.equal(shelves[0].games.find(item => item.id === other.id).kind, 'steam');
assert.equal(placed.onCustom.length, 0);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'boxshelf-console-exe-'));
async function testFileBackedCoverage() {
try {
  const file = path.join(temp, 'Ported Game.exe');
  const defaultFile = path.join(temp, 'Custom Game.exe');
  const coverDir = path.join(temp, 'covers');
  const cover = path.join(coverDir, 'Ported Game.jpg');
  fs.writeFileSync(file, 'game executable');
  fs.writeFileSync(defaultFile, 'custom executable');
  fs.mkdirSync(coverDir);
  fs.writeFileSync(cover, 'saved console cover');
  const scanned = gameFromFile({ id: 'n64' }, { romDirs: [], artDir: '' }, file, 'Ported Game');
  assert.equal(scanned.kind, 'rom');
  assert.equal(scanned.ext, 'exe');
  assert.equal(scanned.title, 'Ported Game');
  assert.equal(scanned.sizeBytes, Buffer.byteLength('game executable'));
  assert.equal(scanned.file, file);
  assert.equal(scanned.art.front, cover);
  assert.deepEqual(paths.assignedExeArtDirs({ n64: { romDirs: [], artDir: '' } }, [
    { exe: file, shelf: 'n64' }, { exe: defaultFile, shelf: 'custom' }, { exe: file, shelf: 'unknown' }
  ]), [coverDir]);
  const coverage = await covers.coverage([{ def: systems[0], cfg: { romDirs: [], artDir: '' } }],
    { scanGames: async () => [scanned] });
  assert.equal(coverage[0].total, 1);
  assert.equal(coverage[0].front, 1);

  const saved = config.defaults();
  saved.pc.custom = [
    { id: 'harkinian', title: 'Ship of Harkinian', exe: file, args: '--fullscreen', shelf: 'n64' },
    { id: 'default', title: 'Custom Game', exe: defaultFile, args: '', shelf: 'custom' }
  ];
  const normalized = config.normalize(saved);
  assert.equal(normalized.pc.custom[0].shelf, 'n64');
  assert.equal(normalized.pc.custom[0].args, '--fullscreen');
  assert.equal(normalized.pc.custom[1].shelf, undefined);
  const imported = customGames(normalized.pc.custom);
  assert.equal(imported[0].shelf, 'n64');
  const assignedShelves = [{ id: 'n64', kind: 'console', name: 'Nintendo 64', games: [] }];
  const placed = placeCustom(assignedShelves, imported, systems, item => ({ kind: 'steam', ...item }));
  assert.equal(assignedShelves[0].games[0].directExe, true);
  assert.equal(assignedShelves[0].games[0].file, file);
  assert.equal(placed.onCustom[0].title, 'Custom Game');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
}

testFileBackedCoverage().then(() => console.log('console executable assignment, metadata, and coverage passed'))
  .catch(error => { console.error(error); process.exitCode = 1; });

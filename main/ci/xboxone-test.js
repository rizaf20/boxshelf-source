'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../config');
const manuals = require('../manuals');
const { placeCustom } = require('../pcgames');
const { LAUNCHBOX } = require('../covers');
const { CONSOLES } = require('../systems');
const { forget, scanSystemAsync } = require('../scanner');
const paths = require('../paths');

const system = CONSOLES.find(item => item.id === 'xone');
assert.ok(system, 'Xbox One should be available on Windows');
assert.equal(system.runnerName, 'Azimuth');
assert.equal(system.directGameExe, true);
assert.equal(system.requiresEmulator, false);
assert.equal(system.gameFile, 'azimuth.exe');
assert.equal(system.gameFolderMarker, true);
assert.deepEqual(system.extensions, []);
assert.equal(config.defaults().systems.xone.emulator, '');
assert.equal(config.defaults().systems.xone.gameArgs, '');
assert.equal(LAUNCHBOX.xone, 'Microsoft Xbox One');
assert.equal(manuals.foreignPlatform('xone', 'Halo (Xbox One)'), false);
assert.equal(manuals.foreignPlatform('xone', 'Halo (Xbox 360)'), true);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'boxshelf-xbox-one-'));
async function testFolderScanningAndArtwork() {
  try {
    const gamesDir = path.join(temp, 'Games');
    const artDir = path.join(temp, 'Art');
    const gameDir = path.join(gamesDir, 'Halo 2');
    const otherGameDir = path.join(gamesDir, 'Halo 3');
    fs.mkdirSync(path.join(gameDir, 'data'), { recursive: true });
    fs.mkdirSync(otherGameDir, { recursive: true });
    fs.mkdirSync(artDir);
    const marker = path.join(gameDir, 'azimuth.exe');
    fs.writeFileSync(marker, 'game executable');
    fs.writeFileSync(path.join(gameDir, 'data', 'azimuth.exe'), 'nested marker');
    fs.writeFileSync(path.join(otherGameDir, 'AzImUtH.ExE'), 'game executable');
    fs.writeFileSync(path.join(gamesDir, 'utility.exe'), 'not a game');
    const cover = path.join(artDir, 'Halo 2.png');
    fs.writeFileSync(cover, 'cover image');

    assert.equal(paths.artBase(marker), 'Halo 2');
    const scanned = await scanSystemAsync(system, { romDirs: [gamesDir], artDir }, true);
    assert.equal(scanned.length, 2, 'one game per folder marker; nested and unrelated executables are ignored');
    const halo2 = scanned.find(game => game.title === 'Halo 2');
    assert.ok(halo2);
    assert.equal(halo2.file, marker);
    assert.equal(halo2.ext, '');
    assert.equal(halo2.directGame, true);
    assert.equal(halo2.art.front, cover);
    assert.ok(scanned.some(game => game.title === 'Halo 3'));

    const shelf = { id: 'xone', kind: 'console', name: 'Xbox One', games: [halo2] };
    placeCustom([shelf], [{ id: 'halo2', source: 'custom', title: 'Halo 2', exe: marker, shelf: 'xone' }],
      [system], game => ({ kind: 'steam', ...game }));
    assert.equal(shelf.games.length, 1, 'assigning a scanned marker executable does not duplicate its shelf entry');
  } finally {
    forget();
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

testFolderScanningAndArtwork()
  .then(() => console.log('Xbox One folder discovery, direct-game metadata, and artwork passed'))
  .catch(error => { console.error(error); process.exitCode = 1; });

'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const covers = require('../pccovers');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'boxshelf-pc-back-cover-'));
async function main() {
  try {
    const frontFile = path.join(temp, 'front.png');
    const backFile = path.join(temp, 'back.webp');
    fs.writeFileSync(frontFile, 'front image');
    fs.writeFileSync(backFile, 'back image');
    covers.init({
      dataDir: temp,
      fileUrl: file => `file://${file}`,
      steamCover: () => null,
      steamgrid: { enabled: () => false },
      log: () => {}
    });

    await covers.own('steam-123', frontFile);
    await covers.ownBack('steam-123', backFile);
    assert.equal(fs.readFileSync(covers.cover('steam-123'), 'utf8'), 'front image');
    assert.equal(fs.readFileSync(covers.back('steam-123'), 'utf8'), 'back image');
    assert.equal((await covers.options({ id: 'steam-123', title: 'Test game' })).back, true);

    covers.resetBack('steam-123');
    assert.equal(covers.back('steam-123'), null);
    assert.equal(fs.readFileSync(covers.cover('steam-123'), 'utf8'), 'front image');

    await covers.ownBack('steam-123', backFile);
    covers.reset('steam-123');
    assert.equal(covers.cover('steam-123'), null);
    assert.equal(fs.readFileSync(covers.back('steam-123'), 'utf8'), 'back image');
    console.log('PC custom back covers stay independent from automatic and custom fronts');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

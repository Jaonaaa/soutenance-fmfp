import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {chromium} from 'playwright';

const videoDir = path.dirname(fileURLToPath(import.meta.url));
const sceneDir = path.join(videoDir, 'scenes', 'transitions');
const outputDir = path.join(videoDir, 'out', 'transitions');
const cards = [
  ['01-orientation-depot.html', '01-orientation-depot.png'],
  ['02-depot-evaluation.html', '02-depot-evaluation.png'],
];

fs.mkdirSync(outputDir, {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const context = await browser.newContext({
    viewport: {width: 1600, height: 900},
    deviceScaleFactor: 1,
    locale: 'fr-FR',
  });
  const page = await context.newPage();
  for (const [html, png] of cards) {
    const source = path.join(sceneDir, html);
    await page.goto(pathToFileURL(source).href, {waitUntil: 'load'});
    await page.evaluate(() => document.fonts.ready);
    const virgilLoaded = await page.evaluate(() => document.fonts.check('68px Virgil'));
    if (!virgilLoaded) throw new Error(`Virgil font did not load for ${html}`);
    const output = path.join(outputDir, png);
    await page.screenshot({path: output, animations: 'disabled'});
    console.log(`${output} · 1600×900 · Virgil loaded`);
  }
  await context.close();
} finally {
  await browser.close();
}

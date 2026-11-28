import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
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
execFileSync('ffmpeg', [
  '-v', 'error', '-ss', '19', '-i', path.join(videoDir, 'out/01-orienter-essai.mp4'),
  '-frames:v', '1', '-y', path.join(outputDir, '01-guichet-frame.png'),
]);
execFileSync('ffmpeg', [
  '-v', 'error', '-ss', '73', '-i', path.join(videoDir, 'out/02-deposer.mp4'),
  '-frames:v', '1', '-y', path.join(outputDir, '02-conseil-frame.png'),
]);
execFileSync('ffmpeg', [
  '-v', 'error', '-ss', '58.45', '-i', path.join(videoDir, 'out/02-deposer.mp4'),
  '-frames:v', '1', '-y', path.join(outputDir, '02-conseil-input.png'),
]);
execFileSync('ffmpeg', [
  '-v', 'error', '-ss', '101.9', '-i', path.join(videoDir, 'out/02-deposer.mp4'),
  '-frames:v', '1', '-y', path.join(outputDir, '02-cv-frame.png'),
]);
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
  await page.goto(pathToFileURL(path.join(sceneDir, '01-conditions.html')).href, {waitUntil: 'load'});
  await page.locator('img').evaluate((image) => image.decode());
  await page.screenshot({path: path.join(outputDir, '01-conditions.png')});
  await page.goto(pathToFileURL(path.join(sceneDir, '02-conseil.html')).href, {waitUntil: 'load'});
  await page.locator('img').evaluate((image) => image.decode());
  const adviceFrame = path.join(outputDir, '02-conseil.png');
  await page.screenshot({path: adviceFrame});
  const zoomClip = (frame, output, frames, zoom, verticalAnchor) => {
    execFileSync('ffmpeg', [
      '-v', 'error', '-i', frame,
      '-vf', `scale=3200:1800,zoompan=z='${zoom}':x='(iw-iw/zoom)*0.98':y='(ih-ih/zoom)*${verticalAnchor}':d=${frames}:s=1600x900:fps=30`,
      '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-y', path.join(outputDir, output),
    ]);
  };

  const inputFrame = path.join(outputDir, '02-conseil-question.png');
  await page.goto(pathToFileURL(path.join(sceneDir, '02-conseil.html')).href + '?view=input#input');
  await page.locator('img').evaluate((image) => image.decode());
  await page.screenshot({path: inputFrame});
  zoomClip(inputFrame, '02-conseil-question.mp4', 123, '1+0.25*min(1,on/30)', '0.88');
  const sendFrame = path.join(outputDir, '02-conseil-envoi.png');
  await page.goto(pathToFileURL(path.join(sceneDir, '02-conseil.html')).href + '?view=send#send');
  await page.locator('img').evaluate((image) => image.decode());
  await page.screenshot({path: sendFrame});
  zoomClip(sendFrame, '02-conseil-envoi.mp4', 15, '1.25', '0.88');
  zoomClip(adviceFrame, '02-conseil-zoom.mp4', 273, '1+(0.25+0.40*min(1,on/20))*min(1,(272-on)/20)', '(0.88-0.45*min(1,on/20))');
  await page.goto(pathToFileURL(path.join(sceneDir, '02-cv-ancre.html')).href);
  await page.locator('img').evaluate((image) => image.decode());
  await page.screenshot({path: path.join(outputDir, '02-cv-ancre.png')});
  await context.close();
} finally {
  await browser.close();
}

import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {startRec,waitReady} from '../lib.mjs';

const sceneDir=path.dirname(fileURLToPath(import.meta.url));
const videoDir=path.resolve(sceneDir,'..');
const outputDir=path.join(videoDir,'out');
const pagePath=path.join(sceneDir,'04-conclusion.html');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1600,height:900},locale:'fr-FR'});
const page=await context.newPage();
await page.goto(pathToFileURL(pagePath).href);
await waitReady(page);
await page.waitForSelector('[data-scene="conclusion"]');

const stop=await startRec(page,'out/rec-04');
const startedAt=Date.now();
const events=[{k:'conclusion_card_visible',t:0}];
// encode.sh holds the duplicated final frame; a 4 s capture produces a 5 s clip.
await page.waitForTimeout(4000);
const frameCount=await stop();
const captureSeconds=Number(((Date.now()-startedAt)/1000).toFixed(2));
events.push({k:'conclusion_capture_stopped',t:captureSeconds});
fs.mkdirSync(outputDir,{recursive:true});
fs.writeFileSync(path.join(outputDir,'04.events.json'),JSON.stringify({
  scene:'04-conclusion',
  captureSeconds,
  encodedTargetSeconds:5,
  frames:frameCount,
  events,
},null,2)+'\n');
console.log(JSON.stringify({frames:frameCount,events}));
await context.close();
await browser.close();

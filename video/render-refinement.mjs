import {chromium} from 'playwright';
import fs from 'node:fs';
const text=JSON.parse(fs.readFileSync('video/scenes/transitions/reformulation-pertinence.json','utf8')).text;
const fontData = (file) => fs.readFileSync(new URL(`../../fmfp/assets/fmfp_assets/fonts/${file}`, import.meta.url)).toString('base64');
const openSans = `
 <style>
 @font-face{font-family:'Open Sans';src:url(data:font/woff;base64,${fontData('OpenSans-Regular-webfont.woff')}) format('woff');font-style:normal;font-weight:400}
 @font-face{font-family:'Open Sans';src:url(data:font/woff;base64,${fontData('OpenSans-Semibold-webfont.woff')}) format('woff');font-style:normal;font-weight:600}
 @font-face{font-family:'Open Sans';src:url(data:font/woff;base64,${fontData('OpenSans-Bold-webfont.woff')}) format('woff');font-style:normal;font-weight:700}
 </style>`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 for(const [name,width,height,heading,color,line] of [
  ['proposal',312,517,false,'#ffffff',21],
  ['rubric',819,76,false,'#ffffff',23,'field'],
  ['rubric-scrolled',819,76,false,'#ffffff',23,'plain'],
  ['editor',658,266,true,'#ffffff',21],
  ['saved',301,349,false,'#ffffff',20],
 ]) {
  const fieldClass=name==='rubric'?'field':name==='rubric-scrolled'?'plain':'';
  await page.setContent(`${openSans}<style>body{margin:0}div{box-sizing:border-box;font:13px/${line}px 'Open Sans',sans-serif;color:#18232f;width:${width}px;height:${height}px;padding:10px;background:${color}}div.field{border:3px solid #39835c;border-radius:10px;padding:8px 4px;background:#fff}div.plain{border:0;padding:11px 7px;background:#fff}strong{display:block;margin-bottom:15px;font-size:13px}</style><div class="${fieldClass}"></div>`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('div').evaluate((el,{text,heading})=>{
   if(heading){const title=document.createElement('strong');title.textContent='Pertinence';el.append(title);}
   el.append(document.createTextNode(text));
  },{text,heading});
  await page.locator('div').screenshot({path:'video/out/transitions/refinement-'+name+'.png'});
 }
 await page.setContent(`${openSans}<style>
 *{box-sizing:border-box}body{margin:0;font:13px/1.7 'Open Sans',sans-serif;color:#1b2533}
 main{position:relative;width:440px;max-height:78vh;overflow:auto;padding:16px 18px;background:#fff;border:1px solid #b9cbe5;border-radius:9px;box-shadow:0 16px 38px rgba(16,46,90,.24)}
 h1{margin:0;padding-bottom:12px;border-bottom:1px solid #edf1f6;font-size:12px;line-height:1.4;letter-spacing:.7px;color:#19428b}
 .ask{display:grid;gap:6px;margin-top:14px}label{font-size:12.5px;line-height:1.5;font-weight:650;color:#1b2533}
 .instruction{min-height:54px;padding:9px 11px;border:1px solid #c9d6e8;border-radius:9px;background:#fbfcfe;font-size:12.5px;line-height:1.5;color:#1b2533}
 section{margin-top:14px;padding:12px;border:1px solid #bfe0cb;border-radius:10px;background:linear-gradient(180deg,#f1faf4 0%,#fff 100%)}
 header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;color:#1f6b41;font-size:12px;font-weight:700;letter-spacing:.02em;text-transform:uppercase}header span{color:#5b8a6c;font-size:10.5px;font-weight:600;text-transform:none;letter-spacing:0}
 .answer{min-height:120px;padding:10px 11px;border:1px solid #cfe6d7;border-radius:7px;background:#fff;font-size:13px;line-height:1.6;color:#1b2533}
 small{display:block;margin:8px 2px 0;color:#6b7585;font-size:11px;line-height:1.4}
 footer{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid #edf1f6}
 button{min-height:34px;padding:0 14px;border:1px solid #dfe3e8;border-radius:9px;background:#fff;color:#3b485a;font:600 12px 'Open Sans',sans-serif}
 .apply{border-color:#2e8b57;background:#2e8b57;color:#fff}
 </style><main><h1>REFORMULER · PERTINENCE</h1>
 <div class="ask"><label>Votre demande</label><div class="instruction">En deux phrases, conserve le lien avec la sécurité et les finitions. N’ajoute aucun chiffre absent du dossier.</div></div>
 <section><header><span class="proposal-title">✓ PROPOSITION</span><span>modifiable</span></header><div class="answer"></div></section>
 <small>Relisez la proposition avant de l’appliquer. Vous pouvez préciser votre demande et reformuler.</small>
 <footer><button>Annuler</button><button class="apply">✓ Appliquer à la rubrique</button></footer></main>`);
 await page.locator('.answer').evaluate((el,text)=>el.textContent=text,text);
 await page.evaluate(() => document.fonts.ready);
 await page.locator('main').screenshot({path:'video/out/transitions/refinement-panel.png'});
} finally {await browser.close()}

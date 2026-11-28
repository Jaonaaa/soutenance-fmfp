import {chromium} from 'playwright';
import fs from 'node:fs';
const text=JSON.parse(fs.readFileSync('video/scenes/transitions/reformulation-pertinence.json','utf8')).text;
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
  await page.setContent('<style>body{margin:0}div{box-sizing:border-box;font:13px/'+line+'px Arial,sans-serif;color:#18232f;width:'+width+'px;height:'+height+'px;padding:10px;background:'+color+'}div.field{border:3px solid #39835c;border-radius:10px;padding:8px 4px;background:#fff}div.plain{border:0;padding:11px 7px;background:#fff}strong{display:block;margin-bottom:15px;font-size:13px}</style><div class="'+fieldClass+'"></div>');
  await page.locator('div').evaluate((el,{text,heading})=>{
   if(heading){const title=document.createElement('strong');title.textContent='Pertinence';el.append(title);}
   el.append(document.createTextNode(text));
  },{text,heading});
  await page.locator('div').screenshot({path:'video/out/transitions/refinement-'+name+'.png'});
 }
 await page.setContent(`<style>
 *{box-sizing:border-box}body{margin:0;font:13px/1.5 Arial,sans-serif;color:#26364a}
 main{position:relative;width:380px;height:640px;padding:20px;background:white;border:1px solid #cad4df;border-radius:9px;box-shadow:0 9px 20px #19334f22}
 h1{margin:0 0 17px;font-size:12px;letter-spacing:1px;color:#2e5484}
 label{display:block;font-weight:700;margin-bottom:6px} .instruction{border:1px solid #b8c8dc;border-radius:6px;padding:10px;margin-bottom:18px;background:#fafcff}
 section{padding:12px;background:#f0faf4;border:1px solid #c4dfcf;border-radius:9px}
 header{color:#2b6b4a;font-weight:700;font-size:12px;margin-bottom:10px} header span{float:right;font-size:10px}
 p{margin:0;background:white;border:1px solid #d0dfd8;padding:11px;border-radius:6px;line-height:21px}
 small{display:block;margin-top:14px;color:#637285}
 footer{position:absolute;bottom:14px;left:20px;right:20px;display:flex;justify-content:flex-end;gap:8px}
 button{padding:9px 13px;border:1px solid #dce2e8;border-radius:7px;background:white;font-weight:700;color:#3b4857}
 .apply{background:#26784e;color:white;border-color:#26784e}
 </style><main><h1>REFORMULER · PERTINENCE</h1>
 <label>Votre demande</label><div class="instruction">En deux phrases, conserve le lien avec la sécurité et les finitions. N’ajoute aucun chiffre absent du dossier.</div>
 <section><header>✓ PROPOSITION <span>modifiable</span></header><p></p></section>
 <small>Relisez la proposition avant de l’appliquer. Vous pouvez préciser votre demande et reformuler.</small>
 <footer><button>Annuler</button><button class="apply">✓ Appliquer à la rubrique</button></footer></main>`);
 await page.locator('p').innerText();
 await page.locator('p').evaluate((el,text)=>el.textContent=text,text);
 await page.locator('main').screenshot({path:'video/out/transitions/refinement-panel.png'});
} finally {await browser.close()}

import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 for(const state of ['neutral','analysis','evidence']) {
  await page.setContent(`<style>
 *{box-sizing:border-box}body{margin:0;font:12px/1.5 Arial,sans-serif;color:#334155}
 main{width:1206px;height:245px;background:#f4f7f9;border-radius:12px;padding:12px}
 .label{color:#6b7280;font-size:11px;margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid #e0e5eb}
 .columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}
 section{height:175px;padding:13px;background:#fff;border:1px solid #dce4ed;border-radius:11px}
 p{margin:0 0 12px}.reference{padding:10px;background:#f2f5fa;border-radius:7px;font-size:11px}
 h2{margin:0 0 6px;color:#657185;font-size:10px;letter-spacing:1px}
 h3{font-size:12px;margin:0 0 8px;color:#24446b}
 button{padding:6px 10px;border:1px solid #c8d7e8;background:#f8fbff;color:#244a7c;border-radius:5px;font-size:11px}
 .analysis{padding:5px;margin:-5px}
 .evidence{padding:5px;margin:-5px -5px 8px}
 .active{outline:3px solid ${state==='analysis'?'#2d5aa6':'#278651'};outline-offset:2px}
 </style><main><p class="label">Oui / non</p><div class="columns">
 <section><p class="reference">Repère historique compatible · médiane 1 sur 8 évaluations. À confirmer avec les éléments du dossier.</p>
 <div class="analysis ${state==='analysis'?'active':''}"><h2>ANALYSE</h2><p>Les éléments transmis ne permettent pas d’établir une réponse fiable pour ce critère.</p></div></section>
 <section><div class="evidence ${state==='evidence'?'active':''}"><h3>Données contrôlées pour ce critère</h3><p>Constats · 1 module de formation consulté · 3 extraits documentaires sélectionnés pour ce critère.</p></div>
 <button>▤ Voir les preuves</button></section></div></main>`);
  await page.locator('main').screenshot({path:'video/out/transitions/evaluation-'+state+'.png'});
 }
}finally{await browser.close()}

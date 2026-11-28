import {chromium} from 'playwright';
import fs from 'node:fs';
import {CURSOR,click,type,startRec,waitReady} from '../lib.mjs';

const args=process.env.DEMO_LOCAL_LOOPBACK
  ? ['--host-resolver-rules=MAP plateforme-fmfp.local 127.0.0.1'] : [];
const b=await chromium.launch({channel:'chrome',headless:true,args});
const c=await b.newContext({viewport:{width:1600,height:900},locale:'fr-FR',storageState:process.env.STATE||'.state/ent.json'});
await c.addInitScript(CURSOR);
const p=await c.newPage();
await p.goto('http://plateforme-fmfp.local/entreprises/appel_projet');
if(new URL(p.url()).pathname==='/connexion') throw new Error('La session entreprise a expiré.');
await waitReady(p);

const stop=await startRec(p,'out/rec-01');
const T0=Date.now();
const ev=[];
const mark=(k,selector=null,box=null)=>ev.push({
  k,t:(Date.now()-T0)/1000,wall:Date.now(),
  ...(selector?{selector}:{}),
  ...(box?{box:{x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height)}}:{}),
});
const pause=ms=>p.waitForTimeout(ms);

const halo=async(selector,key,color='blue',hold=1600)=>{
  const target=p.locator(selector).first();
  if(await target.count()===0) throw new Error(`Missing highlight target: ${selector}`);
  await target.evaluate(el=>el.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'}));
  await pause(650);
  const box=await target.boundingBox();
  if(!box) throw new Error(`Highlight target is not visible: ${selector}`);
  const palette={
    blue:{stroke:'#2D5AA6',glow:'rgba(45,90,166,.16)',pulse:'rgba(45,90,166,.24)'},
    green:{stroke:'#23834D',glow:'rgba(35,131,77,.16)',pulse:'rgba(35,131,77,.24)'},
    amber:{stroke:'#D78A21',glow:'rgba(215,138,33,.16)',pulse:'rgba(215,138,33,.24)'},
  };
  const {stroke,glow,pulse}=palette[color]||palette.blue;
  await p.evaluate(({rect,stroke,glow,pulse})=>{
    document.getElementById('__demo_scene_halo')?.remove();
    const node=document.createElement('div');
    node.id='__demo_scene_halo';
    node.setAttribute('aria-hidden','true');
    node.style.cssText=[
      'position:fixed','z-index:2147483000','pointer-events:none','box-sizing:border-box',
      `left:${Math.max(2,rect.x-6)}px`,`top:${Math.max(2,rect.y-5)}px`,
      `width:${Math.max(12,rect.width+12)}px`,`height:${Math.max(12,rect.height+10)}px`,
      `border:3px solid ${stroke}`,'border-radius:12px',
      `background:${glow.replace('.16', '.055')}`,
      `box-shadow:0 0 0 6px ${glow},0 0 24px ${pulse}`,
      'animation:demoSceneHalo 1s ease-in-out 2'
    ].join(';');
    document.getElementById('__demo_scene_halo_style')?.remove();
    const style=document.createElement('style');
    style.id='__demo_scene_halo_style';
    style.textContent=`@keyframes demoSceneHalo{50%{box-shadow:0 0 0 10px ${pulse},0 0 30px ${pulse}}}`;
    document.head.appendChild(style);
    document.body.appendChild(node);
  },{rect:{x:box.x,y:box.y,width:box.width,height:box.height},stroke,glow,pulse});
  mark(key,selector,box);
  await pause(hold);
  await p.evaluate(()=>document.getElementById('__demo_scene_halo')?.remove());
};

const compressLoadingInFrameList=(directory,events,keepSeconds=1.15)=>{
  const loading=events.find(event=>event.k==='loading_started');
  const result=events.find(event=>event.k==='result_ready');
  if(!loading||!result) throw new Error('Loading markers are missing from the orientation take.');
  const cutStart=loading.t+keepSeconds;
  const cutEnd=result.t;
  if(cutEnd<=cutStart) return 0;

  const listPath=`${directory}/list.txt`;
  const lines=fs.readFileSync(listPath,'utf8').trim().split(/\r?\n/);
  const entries=[];
  let timeline=0;
  for(let index=0;index+1<lines.length;index+=2) {
    const fileMatch=lines[index].match(/^file '(.+)'$/);
    const durationMatch=lines[index+1].match(/^duration ([\d.]+)$/);
    if(!fileMatch||!durationMatch) throw new Error('Unexpected screencast concat list format.');
    const duration=Number(durationMatch[1]);
    const start=timeline;
    const end=start+duration;
    timeline=end;
    if(start>=cutStart&&start<cutEnd) continue;
    entries.push({file:fileMatch[1],duration:start<cutStart&&end>cutStart?cutStart-start:duration});
  }
  if(entries.length<2) throw new Error('Too few frames remain after trimming the wait.');
  const output=[];
  for(const entry of entries) output.push(`file '${entry.file}'`,`duration ${Math.max(.001,entry.duration).toFixed(4)}`);
  output.push(`file '${entries.at(-1).file}'`);
  fs.writeFileSync(listPath,output.join('\n'));

  const removed=cutEnd-cutStart;
  for(const event of events) {
    event.original_t=event.t;
    if(event.t>=result.t) event.t=Math.max(loading.t+keepSeconds,event.t-removed);
  }
  return Number(removed.toFixed(2));
};

await pause(500);
mark('page_ready');
await click(p,'.ml-float-trigger',800);
await p.waitForSelector('#enterpriseSuggestV2.is-open',{timeout:5000});
const resizeResult=await p.evaluate(()=>{
  const root=document.getElementById('enterpriseSuggestV2');
  if(!root?.FmfpAiAssistant) return false;
  root.FmfpAiAssistant.resize(740,820);
  return true;
});
if(!resizeResult) throw new Error('Could not enlarge the FMFP advisor panel.');
await p.addStyleTag({content:`
  .sb-org .name,.sb-org .role,.sb-org .avatar,#topUserBtn > .nm,#topUserBtn > .avatar {
    filter:blur(7px)!important;
  }
  #enterpriseSuggestV2 .ent-suggest{font-size:14px!important;line-height:1.55!important}
  #enterpriseSuggestV2 .ent-suggest__intro p{font-size:13px!important}
  #enterpriseSuggestV2 .ent-suggest__eyebrow{font-size:12px!important}
  #enterpriseSuggestV2 .ent-suggest__guichet-item{padding:12px 14px!important}
  #enterpriseSuggestV2 .ent-suggest__guichet-title strong{font-size:14px!important}
  #enterpriseSuggestV2 .ent-suggest__guichet-title small{font-size:11px!important}
  #enterpriseSuggestV2 .ent-suggest__guichet-meta,
  #enterpriseSuggestV2 .ent-suggest__guichet-status{font-size:12px!important}
  #enterpriseSuggestV2 .ent-suggest__guichet-badge{font-size:11px!important;padding:4px 8px!important}
  #enterpriseSuggestV2 .ai-assistant__body::-webkit-scrollbar{width:8px}
`});
await pause(450);
mark('assistant_enlarged');

const objective='Former les équipes de production textile aux gestes de sécurité et aux contrôles qualité, pour réduire les accidents et limiter les retours de fabrication.';
mark('objective');
await type(p,'#entSuggestObjective',objective,32);
mark('amount');
await type(p,'#entSuggestAmount','12000000',70);
mark('submit');
await click(p,'#btnEntSuggest',700);
mark('loading_started');
await p.locator('#entSuggestGuichetsSection .ent-suggest__guichet-item.is-recommended')
  .waitFor({state:'visible',timeout:90000});
await p.waitForFunction(()=>{
  const loading=document.getElementById('entSuggestLoading');
  return !loading||loading.hidden;
},null,{timeout:10000});
await pause(300);
mark('result_ready');

// Give the provisional recommendation a brief read, then scroll inside the
// enlarged assistant to the actual recommended guichet and its open call.
await halo('#entSuggestGuichet','provisional_orientation','blue',1400);
const recommended=p.locator('#entSuggestGuichetsSection .ent-suggest__guichet-item.is-recommended').first();
const recommendedText=(await recommended.innerText()).replace(/\s+/g,' ').trim();
await halo('#entSuggestGuichetsSection .ent-suggest__guichet-item.is-recommended','recommended_guichet','green',3600);
const conditionsButton='#entSuggestGuichetsSection .is-recommended .ent-suggest__conditions-button';
await halo(conditionsButton,'conditions_button','blue',650);
await click(p,conditionsButton,450);
const conditions=p.locator('#entSuggestConditionsList');
await conditions.locator('li').first().waitFor({state:'visible',timeout:5000});
const conditionItems=await conditions.locator('li').allInnerTexts();
mark('conditions_open','#entSuggestConditionsList',await conditions.boundingBox());
await pause(5200);
mark('end');

const frameCount=await stop();
const trimmedLoadingSeconds=compressLoadingInFrameList('out/rec-01',ev,1.15);
fs.mkdirSync('out',{recursive:true});
fs.writeFileSync('out/01.events.json',JSON.stringify({
  events:ev,
  frames:frameCount,
  trimmedLoadingSeconds,
  objective,
  recommendedGuichet:recommendedText,
  conditions:conditionItems,
},null,2)+'\n');
console.log(JSON.stringify({events:ev,frames:frameCount,trimmedLoadingSeconds,recommendedGuichet:recommendedText}));
await c.close();
await b.close();

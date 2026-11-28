import {chromium} from 'playwright';
import {smoothScrollTo,CURSOR,click,glide,type,startRec,waitReady} from '../lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const formUrl=process.env.ENT_FORM_URL;
if(!formUrl) throw new Error('ENT_FORM_URL must point to the existing BEMA draft form.');
if(!new URL(formUrl).pathname.endsWith('/22778')) {
  throw new Error('ENT_FORM_URL must target the existing BEMA draft 22778.');
}

const BASE='http://plateforme-fmfp.local';
const MASK=`
  .sb-org .name,.sb-org .role,.sb-org .avatar,
  #topUserBtn > .nm,#topUserBtn > .avatar,.top-user-menu-org-info,.top-user-menu-org-avatar,
  #attlist_320 .att-name,#attlist_320 .att-size,
  #attlist_322 .att-name,#attlist_322 .att-size,
  #attlist_323 .att-name,#attlist_323 .att-size,
  input[readonly],textarea[readonly],.fm-ro,.sc-val {
    filter:blur(7px)!important;
    user-select:none!important;
  }
  #ent-toast-container{display:none!important}
  #back-top{display:none!important}
`;
const wrongCvFile=process.env.DEMO_TRAINER_CV_WRONG;
const correctCvFile=process.env.DEMO_TRAINER_CV_CORRECT;
const annualPlanFile=process.env.DEMO_ANNUAL_PLAN;
const fundingLetterFile=process.env.DEMO_FUNDING_LETTER;
if(!wrongCvFile || !fs.existsSync(wrongCvFile)) {
  throw new Error('Set DEMO_TRAINER_CV_WRONG to the local nonconforming demo CV.');
}
if(!correctCvFile || !fs.existsSync(correctCvFile)) {
  throw new Error('Set DEMO_TRAINER_CV_CORRECT to the clearly marked local demo CV that passes the FMFP structure check.');
}
if(!annualPlanFile || !fs.existsSync(annualPlanFile)) {
  throw new Error('Set DEMO_ANNUAL_PLAN to the clearly marked fictional annual plan for this local demo.');
}
if(!fundingLetterFile || !fs.existsSync(fundingLetterFile)) {
  throw new Error('Set DEMO_FUNDING_LETTER to the clearly marked fictional funding request letter for this local demo.');
}
if(path.basename(wrongCvFile)===path.basename(correctCvFile)) {
  throw new Error('The incorrect and corrected CV files must have different filenames.');
}
const knownDemoCvNames=new Set([path.basename(wrongCvFile),path.basename(correctCvFile)]);
const resetLegacyCv=process.env.DEMO_TRAINER_CV_RESET_LEGACY==='1';
const isConfiguredDemoFilename=(filename,configured)=>{
  if(filename===configured) return true;
  const base=path.basename(configured,path.extname(configured));
  const extension=path.extname(configured);
  const suffix=filename.slice(base.length,-extension.length);
  return filename.startsWith(base)&&filename.endsWith(extension)&&/^[ _-]?\d/.test(suffix);
};
const isKnownDemoCvName=filename=>Array.from(knownDemoCvNames)
  .some(configured=>isConfiguredDemoFilename(filename,configured));
const requiredDemoDocuments=[
  {id:'320',file:annualPlanFile,label:'annual_plan'},
  {id:'322',file:fundingLetterFile,label:'funding_letter'},
];

const b=await chromium.launch({channel:'chrome',headless:true});
const c=await b.newContext({viewport:{width:1600,height:900},locale:'fr-FR',storageState:process.env.STATE||'.state/ent.json'});
await c.addInitScript(CURSOR);
await c.addInitScript(css=>{
  let observer;
  const install=()=>{
    if(!document.documentElement || document.getElementById('__fmfp_privacy_mask')) return;
    const style=document.createElement('style');
    style.id='__fmfp_privacy_mask';
    style.textContent=css;
    (document.head||document.documentElement).appendChild(style);
    observer?.disconnect();
  };
  observer=new MutationObserver(install);
  observer.observe(document,{childList:true,subtree:true});
  install();
},MASK);

const p=await c.newPage();
const first=new URL(formUrl);
first.searchParams.set('section','1');
await p.goto(first.href);
await waitReady(p);
await p.waitForSelector('#formulaireFMFP');
await p.addStyleTag({content:MASK});
if(await p.locator('#formulaireFMFP').count()===0) {
  throw new Error('Draft is not editable. It may already have been submitted.');
}

// Reset only CV attachments used by this demo so each take begins with the
// same missing-CV state. Unknown files are left untouched and stop the take.
await p.goto(`${BASE}/formulaire/soumission/annexes_section1/22778`);
await waitReady(p);
await p.addStyleTag({content:MASK});
const existingCvRows=p.locator('#attlist_323 .attachment-item');
const existingCvCount=await existingCvRows.count();
if(resetLegacyCv&&existingCvCount>1) {
  throw new Error('Demo CV reset is allowed only when at most one CV is attached to the demo draft.');
}
for(let index=0;index<existingCvCount;index++) {
  const row=existingCvRows.first();
  const filename=(await row.locator('.att-name').innerText()).trim();
  if(!isKnownDemoCvName(filename)) {
    throw new Error('The demo draft contains an unconfigured CV; refusing to remove it.');
  }
  const dbId=await row.getAttribute('data-db-id');
  if(!dbId) throw new Error('Could not identify the configured demo CV attachment for reset.');
  await click(p,`#attlist_323 .btn-att-delete[data-db-id="${dbId}"]`,120);
  await p.waitForSelector('#modalGenerateConfirm',{state:'visible',timeout:5000});
  await click(p,'#modalGenerateConfirm button:has-text("Supprimer")',120);
}
let demoDocumentsAdded=false;
for(const document of requiredDemoDocuments) {
  const rows=p.locator(`#attlist_${document.id} .attachment-item`);
  const count=await rows.count();
  if(count>1) throw new Error(`The demo draft contains multiple files for ${document.label}; refusing to change them.`);
  if(count===1) {
    const filename=(await rows.first().locator('.att-name').innerText()).trim();
    if(!isConfiguredDemoFilename(filename,path.basename(document.file))) {
      throw new Error(`The demo draft contains an unconfigured file for ${document.label}; refusing to replace it.`);
    }
    continue;
  }
  await p.locator(`#file_input_${document.id}`).setInputFiles(document.file);
  await p.waitForFunction(id=>{
    const card=document.querySelector(`#card_${id}`);
    return card?.classList.contains('is-complete')&&
      !!card.querySelector('.attachment-item.is-new');
  },document.id,{timeout:10000});
  demoDocumentsAdded=true;
}
if(existingCvCount||demoDocumentsAdded) {
  await click(p,'#btnSubmit',140);
  const missingDocsPrompt=p.locator('#modalGenerateConfirm');
  await missingDocsPrompt.waitFor({state:'visible',timeout:3000}).catch(()=>{});
  if(!await missingDocsPrompt.isVisible().catch(()=>false)) {
    throw new Error('Expected the local missing-CV confirmation while saving the staged annexes.');
  }
  const annexNavigation=p.waitForNavigation({waitUntil:'domcontentloaded',timeout:30000});
  await click(p,'#modalGenerateConfirm button:has-text("Enregistrer et continuer")',120);
  const annexResponse=await annexNavigation;
  if(annexResponse&&annexResponse.status()>=400) {
    throw new Error(`Could not save the staged annexes: HTTP ${annexResponse.status()}`);
  }
  await p.goto(`${BASE}/formulaire/soumission/annexes_section1/22778`);
  await waitReady(p);
  await p.waitForSelector('#annexesForm',{timeout:15000});
  await p.waitForFunction(()=>{
    const plan=document.querySelector('#attlist_320 .attachment-item:not(.is-new)');
    const letter=document.querySelector('#attlist_322 .attachment-item:not(.is-new)');
    return plan&&letter&&!document.querySelector('#attlist_323 .attachment-item');
  },null,{timeout:15000});
  await p.addStyleTag({content:MASK});
}
const configUrl=`${BASE}/appel_a_projet/soumettre_requete/create_soumettre_requete/1?soumettre_appel_projet=13847`;
await p.goto(configUrl);
await waitReady(p);
await p.waitForSelector('#sr_gate_intitule');
await p.addStyleTag({content:MASK});
const selectedConfig=await p.evaluate(()=>({
  call:document.querySelector('#appel_a_projet')?.value,
  projectType:document.querySelector('#type_projet')?.value,
  sector:document.querySelector('#secteur_entreprise')?.value,
  title:document.querySelector('#sr_gate_intitule')?.value,
}));
if(selectedConfig.call!=='13847'||selectedConfig.projectType!=='48'||
  selectedConfig.sector!=='Textile, Habillement, Accessoire'||selectedConfig.title) {
  throw new Error('The project setup screen no longer matches the RIE39 textile demo.');
}

const stop=await startRec(p,'out/rec-02');
const T0=Date.now();
const ev=[];
const mark=(k,selector=null,box=null)=>ev.push({
  k,t:(Date.now()-T0)/1000,
  ...(selector?{selector}:{}),
  ...(box?{box:{x:Math.round(box.x),y:Math.round(box.y),width:Math.round(box.width),height:Math.round(box.height)}}:{}),
});
const pause=ms=>p.waitForTimeout(ms);
const mainWheelPoint=async()=>{
  const box=await p.locator('.main').boundingBox();
  if(!box) throw new Error('The enterprise layout content scroller .main is not visible.');
  return {
    x:Math.min(box.x+box.width-18,1588),
    y:Math.round(box.y+box.height*.52),
  };
};
const pageScrollTop=async()=>p.evaluate(()=>document.scrollingElement?.scrollTop||0);
const route=async(path,key,selector)=>{
  await p.goto(`${BASE}${path}`);
  await waitReady(p);
  await p.addStyleTag({content:MASK});
  if(selector) await p.waitForSelector(selector,{state:'attached',timeout:15000});
  mark(key,selector);
  await pause(230);
};
const waitForSubmissionAudit=async key=>{
  await p.waitForFunction(()=>{
    const panel=document.querySelector('#submissionAuditPanel');
    const results=document.querySelector('#submissionAuditResults');
    return panel&&results&&!results.hasAttribute('aria-busy')&&
      (results.querySelector('.submission-audit__summary')||results.querySelector('.submission-audit__error'));
  },null,{timeout:90000});
  const error=p.locator('#submissionAuditResults .submission-audit__error');
  if(await error.count()) throw new Error((await error.innerText()).replace(/\s+/g,' ').trim());
  const summary=(await p.locator('#submissionAuditResults .submission-audit__summary').innerText())
    .replace(/\s+/g,' ').trim();
  const categories=(await p.locator('#submissionAuditResults .submission-audit__categories').innerText().catch(()=>' '))
    .replace(/\s+/g,' ').trim();
  const text=(await p.locator('#submissionAuditResults').innerText()).replace(/\s+/g,' ').trim();
  mark(key,'#submissionAuditPanel',await p.locator('#submissionAuditPanel').boundingBox());
  return {summary,categories,text};
};
const scrollDownThroughAudit=async key=>{
  const panel=p.locator('#submissionAuditPanel');
  if(await panel.count()===0) throw new Error('The inline submission audit is missing from the synthesis page.');
  const box=await panel.boundingBox();
  const pageTopBefore=await pageScrollTop();
  const {x,y}=await mainWheelPoint();
  await glide(p,x,y,320);
  mark(`${key}_scroll_start`,'#submissionAuditPanel',box);
  for(let step=0;step<7;step++) {
    await p.mouse.wheel(0,100);
    await pause(170);
  }
  await pause(220);
  mark(`${key}_scroll_end`,'#submissionAuditPanel',await panel.boundingBox());
  const positions=await p.locator('.main').evaluate(node=>({main:Math.round(node.scrollTop)}));
  const pageTopAfter=await pageScrollTop();
  if(Math.abs(pageTopAfter-pageTopBefore)>1) {
    throw new Error('Audit scrolling escaped the .main content area and moved the page shell.');
  }
  Object.assign(ev.at(-1),{scrollContainer:'.main',mainScrollTop:positions.main,pageScrollTop:Math.round(pageTopAfter)});
  const after=await panel.boundingBox();
  if(after) await glide(p,after.x+Math.min(after.width-12,after.width*.75),after.y+Math.min(after.height-12,after.height*.55),220);
};
const halo=async(selector,key,color='blue',hold=350)=>{
  const target=p.locator(selector).last();
  await smoothScrollTo(target);
  const box=await target.boundingBox();
  if(!box) {mark(key,selector);return;}
  const colors={blue:'#2D5AA6',red:'#D94A42',green:'#25804A',amber:'#E59A27'};
  const stroke=colors[color]||colors.blue;
  await p.evaluate(({rect,stroke})=>{
    document.getElementById('__demo_halo')?.remove();
    const halo=document.createElement('div');
    halo.id='__demo_halo';
    halo.setAttribute('aria-hidden','true');
    halo.style.cssText=[
      'position:fixed',`left:${Math.max(2,rect.x-7)}px`,`top:${Math.max(2,rect.y-6)}px`,
      `width:${Math.max(12,rect.width+14)}px`,`height:${Math.max(12,rect.height+12)}px`,
      'border:3px solid '+stroke,'border-radius:9px','background:rgba(255,255,255,.035)',
      'box-shadow:0 0 0 5px '+stroke+'33,0 0 20px '+stroke+'77',
      'z-index:2147483646','pointer-events:none','animation:__demoPulse .9s ease-in-out infinite alternate'
    ].join(';');
    const style=document.getElementById('__demo_halo_style')||document.createElement('style');
    style.id='__demo_halo_style';
    style.textContent='@keyframes __demoPulse{from{filter:brightness(1);opacity:.82}to{filter:brightness(1.2);opacity:1}}';
    document.head.appendChild(style);
    document.body.appendChild(halo);
  },{rect:box,stroke});
  mark(key,selector,box);
  await pause(hold);
  await p.evaluate(()=>document.getElementById('__demo_halo')?.remove());
};
const scrollElementToY=async(selector,targetTop,key)=>{
  if(selector.includes('retombees_attendues')) {
    await p.evaluate(()=>{
      if(!document.getElementById('__demo_scroll_tail')) {
        const tail=document.createElement('div');
        tail.id='__demo_scroll_tail';
        tail.setAttribute('aria-hidden','true');
        tail.style.cssText='height:220px;pointer-events:none;background:#f4f6f9';
        const scroller=document.querySelector('.main');
        if(!scroller) throw new Error('The enterprise layout content scroller .main is missing.');
        scroller.appendChild(tail);
      }
    });
  }
  const target=p.locator(selector).first();
  await smoothScrollTo(target);
  let box=await target.boundingBox();
  if(!box) {mark(key,selector);return;}
  let delta=box.y-targetTop;
  if(Math.abs(delta)<35) {mark(key,selector,box);return;}
  mark(`${key}_start`,selector,box);
  // Move off focused fields and nested cards so their own scroll handling
  // cannot swallow the wheel event. Return the cursor to the target afterward.
  const pageTopBefore=await pageScrollTop();
  const {x:wheelX,y:wheelY}=await mainWheelPoint();
  await p.mouse.move(wheelX,wheelY);
  p.__pos={x:wheelX,y:wheelY};
  for(let pass=0;pass<3;pass++) {
    delta=box.y-targetTop;
    if(Math.abs(delta)<35) break;
    const steps=Math.max(1,Math.ceil(Math.abs(delta)/45));
    for(let step=0;step<steps;step++) {
      await p.mouse.wheel(0,delta/steps);
      await pause(80);
    }
    await pause(180);
    box=await target.boundingBox();
    if(!box) break;
  }
  if(box) await glide(p,box.x+Math.min(box.width-12,box.width*.78),box.y+Math.min(box.height-12,box.height*.7),260);
  mark(`${key}_end`,selector,box);
  const positions=await p.locator('.main').evaluate(node=>({main:Math.round(node.scrollTop)}));
  const pageTopAfter=await pageScrollTop();
  if(Math.abs(pageTopAfter-pageTopBefore)>1) {
    throw new Error(`${key} escaped the .main content area and moved the page shell.`);
  }
  Object.assign(ev.at(-1),{scrollContainer:'.main',mainScrollTop:positions.main,pageScrollTop:Math.round(pageTopAfter)});
};
const clearDemoScrollTail=async()=>p.evaluate(()=>{
  document.getElementById('__demo_scroll_tail')?.remove();
});
const fill=async(selector,value,key,color='blue')=>{
  const field=p.locator(selector).first();
  if(await field.count()===0) throw new Error(`Missing field ${selector}`);
  await smoothScrollTo(field);
  const standout=new Set([
    'title','training_start','training_end','training_need','beneficiary_objective',
    'behavior_objective','module_title','cdc_objectifs_apprentissage','beneficiary_count',
    'budget_total','corrected_expected_impacts',
  ]);
  await field.fill(value);
  if(standout.has(key)) {
    if(key==='corrected_expected_impacts') {
      await scrollElementToY(selector,360,'scroll_to_corrected_expected_impacts');
    }
    const hold={title:1800,training_start:1350,training_end:1350,training_need:2400,
      beneficiary_objective:2100,behavior_objective:3000,module_title:1900,
      cdc_objectifs_apprentissage:2300,cdc_criteres_mesure:3400,
      beneficiary_count:3200,budget_total:3400,corrected_expected_impacts:3900};
    await halo(selector,key,color,hold[key]||1100);
  } else {
    mark(key,selector,await field.boundingBox());
  }
};
const askAssistant=async(question,key)=>{
  const launcher=p.locator('#aiAgentLauncher');
  if(await launcher.count()) {
    if(await launcher.getAttribute('aria-expanded')!=='true') await click(p,'#aiAgentLauncher',120);
  } else {
    const guidance=p.locator('#srAiGuidance');
    if(await guidance.count()&&!(await guidance.evaluate(node=>node.open))) {
      await click(p,'#srAiGuidance > summary',260);
    }
    await p.waitForSelector('#aiAgentPanel',{state:'visible',timeout:10000})
      .catch(()=>{throw new Error('The applicant dossier assistant is not visible on this page.');});
  }
  await p.waitForFunction(()=>{
    const form=document.querySelector('#aiAgentForm');
    return form&&form.getAttribute('aria-busy')!=='true'&&!document.querySelector('#aiAgentLog .ai-agent__typing');
  },null,{timeout:15000});
  const log=p.locator('#aiAgentLog');
  const previousReplies=await log.locator('.ai-agent__msg.chat-msg.is-in').count();
  const lastSavedReply=log.locator('.ai-agent__msg.chat-msg.is-in').last();
  if(previousReplies) {
    const savedText=(await lastSavedReply.innerText()).replace(/\s+/g,' ').trim();
    if(/9 contrôles sur 10/i.test(savedText)&&/sécurité/i.test(savedText)&&/finitions/i.test(savedText)) {
      await halo('#aiAgentLog .ai-agent__msg.chat-msg.is-in .chat-bubble',key,'green',7600);
      mark(`${key}_reused_saved_reply`);
      return savedText;
    }
  }
  await p.locator('#aiAgentInput').fill(question);
  await halo('#aiAgentInput',`${key}_question`,'blue',550);
  await click(p,'#aiAgentForm button[type="submit"]',120);
  await p.waitForFunction(previous=>{
    const log=document.querySelector('#aiAgentLog');
    const form=document.querySelector('#aiAgentForm');
    const replies=log?.querySelectorAll('.ai-agent__msg.chat-msg.is-in').length||0;
    return (replies>previous&&form?.getAttribute('aria-busy')==='false')||
      !!log?.querySelector('.ai-agent__chat-error');
  },previousReplies,{timeout:90000});
  const error=log.locator('.ai-agent__chat-error').last();
  if(await error.count()) throw new Error(`Dossier assistant could not answer: ${(await error.innerText()).trim()}`);
  const reply=log.locator('.ai-agent__msg.chat-msg.is-in').last();
  const text=(await reply.innerText()).replace(/\s+/g,' ').trim();
  if(text.length<30) throw new Error('The dossier assistant returned an empty or incomplete answer.');
  await halo('#aiAgentLog .ai-agent__msg.chat-msg.is-in .chat-bubble',key,'green',7600);
  mark(`${key}_received`);
  return text;
};
const ensureChecked=async(selector,key)=>{
  const field=p.locator(selector).first();
  if(await field.count()===0) throw new Error(`Missing checkbox ${selector}`);
  const label=field.locator('xpath=ancestor::label[1]');
  const target=await label.count()?label:field;
  const box=await target.boundingBox();
  if(!await field.isChecked()) {
    if(box) {
      const x=box.x+box.width*.5,y=box.y+box.height*.5;
      await glide(p,x,y,220);
      await p.mouse.click(x,y);
    } else {
      await field.check({force:true});
    }
  }
  mark(key,selector,box);
};
const saveWizardStep=async(nextStep)=>{
  const selector=nextStep===6?'#btnSubmit':'#btnNext';
  const button=p.locator(selector);
  await smoothScrollTo(button);
  const box=await button.boundingBox();
  if(box) await glide(p,box.x+box.width*.5,box.y+box.height*.5,180);
  mark('save_section_'+(nextStep-1),selector,box);
  const saved=p.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/formulaire_demande_RIE/'),{timeout:20000});
  await button.click();
  const response=await saved;
  if(nextStep===6) {
    if(response.status()!==303) throw new Error(`Could not save form section 5: HTTP ${response.status()}`);
    await p.waitForURL('**/cdc_section1/22778',{timeout:15000});
    await waitReady(p);
    await p.addStyleTag({content:MASK});
  } else {
    if(!response.ok()) throw new Error(`Could not save form section ${nextStep-1}: HTTP ${response.status()}`);
    const result=await response.json().catch(()=>({}));
    if(!result.formulaire_id) throw new Error(`Form section ${nextStep-1} was not acknowledged by the application.`);
    await p.waitForFunction(n=>document.querySelector('.fm-step.is-active')?.dataset.step===String(n),nextStep,{timeout:15000});
  }
  await clearDemoScrollTail();
  await pause(230);
};
mark('continuity_setup_screen','#sr_gate_intitule',await p.locator('#sr_gate_intitule').boundingBox());
await halo('button.ss-trigger:has-text("RIE39")','continuity_call_rie39','green',1150);
await halo('span.detail-val:has-text("Requête individuelle")','continuity_project_type','blue',750);
await halo('span.detail-val:has-text("Textile, Habillement, Accessoire")','continuity_sector','blue',950);
const matchingTitle='Sécurité et qualité en atelier textile';
await type(p,'#sr_gate_intitule',matchingTitle,38);
if(await p.locator('#sr_gate_intitule').inputValue()!==matchingTitle) {
  throw new Error('The setup title does not match the prepared textile draft.');
}
await halo('#sr_gate_intitule','continuity_title_matches_draft','green',1200);
mark('continuity_setup_complete','#sr_gate_intitule',await p.locator('#sr_gate_intitule').boundingBox());
// Do not click “Démarrer”: switch to the already prepared draft used for the demo.
await route(`${first.pathname}${first.search}`,'prepared_draft_continuity','#formulaireFMFP');
await pause(350);
mark('draft_open');
const dateOffset=days=>{
  const d=new Date();d.setDate(d.getDate()+days);
  while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()+1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// 1/5 — porteur et période.
await fill('#intitule_projet','Sécurité et qualité en atelier textile','title');
await fill('[name="date_debut"]',dateOffset(30),'training_start');
await fill('[name="date_fin"]',dateOffset(35),'training_end');
await saveWizardStep(2);
mark('demande_partie_1_saved');

// 2/5 — une retombée volontairement trop vague, à faire relire par l'assistant.
const problem='[name="problematique[]"][value="formulaire_cont_socioeco_non_maitrise_technique"]';
await ensureChecked(problem,'training_need_selected');
await fill('[name="formulaire_cont_socioeco_description_reponse_bref"]',
  'Les changements de série augmentent les incidents de sécurité et les défauts de finition. Les équipes ont besoin de méthodes communes.',
  'training_need');
const impacts=p.locator('[name="formulaire_cont_socioeco_retombees_attendues"]');
await impacts.fill('Les équipes seront mieux formées à la sécurité et à la qualité.');
await scrollElementToY('[name="formulaire_cont_socioeco_retombees_attendues"]',360,'scroll_to_vague_expected_impacts');
await halo('[name="formulaire_cont_socioeco_retombees_attendues"]','vague_expected_impacts','red',1900);
mark('first_check_issue_setup');
await saveWizardStep(3);
mark('demande_partie_2_saved_with_vague_expected_impacts');

// 3/5 — objectifs techniques et comportementaux reliés au besoin.
await fill('[name="formulaire_obj_projet_benef_compet_tech"]',
  'Appliquer les consignes de sécurité, repérer les risques et contrôler la qualité des finitions textiles.',
  'beneficiary_objective');
await fill('[name="formulaire_obj_projet_benef_comport"]',
  'Signaler les risques, respecter les consignes et communiquer les écarts de qualité à l’équipe.',
  'behavior_objective');
await saveWizardStep(4);
mark('objectives_saved');

// 4/5 — formation externe en presentiel et attestation.
await ensureChecked('[name="type_externe"][value="presentiel"]','training_type_presentiel');
await ensureChecked('[name="modalite_reconnaissance[]"][value="formulaire_libelle_champs_modalite_reconnaissance_attestation"]','recognition_attestation');
await halo('label.chk.radio:has(input[name="type_externe"][value="presentiel"])','training_type','blue',2200);
await saveWizardStep(5);
mark('training_type_saved');

// 5/5 — 12 personnes sur le site d'Analamanga.
await p.locator('[name="region_nom[]"]').first().selectOption('1');
await fill('[name="region_nb[]"]','12','beneficiary_count');
await saveWizardStep(6);
mark('workplace_and_beneficiaries_saved');

// CDC — un module, son detail et des repartitions coherentes (12 personnes).
await route('/formulaire/soumission/cdc_section1/22778','cdc_modules','#modulesList');
const moduleInput=p.locator('#newModuleInput');
if(await p.locator('#modulesList .module-input').count()===0) {
  await fill('#newModuleInput','Prévention des risques et contrôle qualité textile','module_title');
  await click(p,'#btnAddModule',160);
} else {
  await p.locator('#modulesList .module-input').first().fill('Prévention des risques et contrôle qualité textile');
}
await halo('#modulesList','module_added','green',1500);
await click(p,'#btnSubmit',160);
await p.waitForURL('**/cdc_section2/22778',{timeout:15000});
await waitReady(p);
await p.addStyleTag({content:MASK});
mark('cdc_module_saved');

const firstCdcName=await p.locator('textarea[name^="cdc["]').first().getAttribute('name');
if(!firstCdcName) throw new Error('The CDC module detail form did not load.');
const moduleId=firstCdcName.match(/^cdc\[(\d+)\]/)?.[1];
if(!moduleId) throw new Error('Could not read the CDC module id.');
const cdcFields={
  postes_participants:'Operateurs de production textile',
  objectifs_apprentissage:'Appliquer les gestes sûrs, utiliser les EPI et contrôler les finitions.',
  criteres_mesure:'Mise en situation : au moins 9 contrôles sur 10 sont correctement appliqués.',
  duree_theorie:'8',
  duree_pratique:'8',
  duree_par_jour:'4 heures par jour pendant 4 jours',
  repartition_groupes:'1 groupe de 12 participants',
  nom_formateur:'Formateur Demo (profil fictif)',
  organisme_formation:'Centre de formation Demo (fictif)',
  references_formateur:'Profil fictif pour la démonstration locale.',
  supports_materiels:'EPI, fiches de contrôle, échantillons textiles et projecteur.',
  lieu_execution:'Atelier de formation à Antananarivo.',
};
for(const [field,value] of Object.entries(cdcFields)) {
  await fill(`[name="cdc[${moduleId}][${field}]"]`,value,`cdc_${field}`);
}
for(const field of ['niveau_competence','categorie_prestataire']) {
  const select=p.locator(`[name="cdc[${moduleId}][${field}]"]`);
  const options=await select.locator('option').evaluateAll(items=>items.map(x=>x.value).filter(Boolean));
  if(!options.length) throw new Error(`No available option for ${field}.`);
  await smoothScrollTo(select);
  await select.selectOption(options[0]);
  mark(`cdc_${field}_selected`,`[name="cdc[${moduleId}][${field}]"]`,await select.boundingBox());
}
await click(p,'#btnSubmit',160);
await waitReady(p);
await p.addStyleTag({content:MASK});
mark('cdc_details_saved');

await route('/formulaire/soumission/cdc_section3/22778','beneficiary_distribution','#formSection3');
for(const [field,value] of Object.entries({op_h:'4',op_f:'8',jeunes_h:'2',jeunes_f:'4'})) {
  await fill(`[name="projet[0][${field}]"]`,value,`project_${field}`);
  await fill(`[name="module[${moduleId}][0][${field}]"]`,value,`module_${field}`);
}
await click(p,'#btnSubmit',160);
await waitReady(p);
await p.addStyleTag({content:MASK});
mark('beneficiary_distribution_saved');

// Budget — un honoraire et des fournitures, contributions visibles et calculees.
await route('/formulaire/soumission/budget_section1/22778','budget_detail','#formBudget1');
if(await p.locator('tr.tr-data[data-section="st1"]').count()===0) {
  await click(p,'.btn-type[data-section="st1"][data-type="honoraire"]',170);
}
let row= p.locator('tr.tr-data[data-section="st1"]').first();
let rowId=await row.getAttribute('data-row');
await row.locator(`[name="budget[st1][${rowId}][unite]"]`).selectOption('Heure');
await fill(`[name="budget[st1][${rowId}][qte]"]`,'16','budget_hours');
await fill(`[name="budget[st1][${rowId}][pu]"]`,'50000','budget_hourly_rate');
await fill(`[name="budget[st1][${rowId}][justif]"]`,'Animation des 16 heures du module de démonstration.','budget_fee_justification');
await fill(`[name="budget[st1][${rowId}][c1]"]`,'80000','company_contribution');
await fill(`[name="budget[st1][${rowId}][c2]"]`,'0','partner_contribution');
if(await p.locator('tr.tr-data[data-section="st2"]').count()===0) {
  await click(p,'.btn-type[data-section="st2"][data-type="fournitures"]',140);
}
row=p.locator('tr.tr-data[data-section="st2"]').first();
rowId=await row.getAttribute('data-row');
await fill(`[name="budget[st2][${rowId}][unite]"]`,'Kit','materials_unit');
await fill(`[name="budget[st2][${rowId}][qte]"]`,'12','materials_quantity');
await fill(`[name="budget[st2][${rowId}][pu]"]`,'5000','materials_unit_price');
await fill(`[name="budget[st2][${rowId}][justif]"]`,'Fiches de contrôle et supports pour les exercices pratiques.','materials_justification');
await fill(`[name="budget[st2][${rowId}][c1]"]`,'6000','materials_company_contribution');
await fill(`[name="budget[st2][${rowId}][c2]"]`,'0','materials_partner_contribution');
await halo('#grand_total','budget_total','green',2500);
await click(p,'#btnSubmit',160);
await waitReady(p);
await p.addStyleTag({content:MASK});
mark('budget_saved');

await route('/formulaire/soumission/budget_section2/22778','budget_fund_share','body');
await route('/formulaire/soumission/budget_section3/22778','budget_summary','body');
await route('/formulaire/soumission/annexes_section1/22778','annexes','#annexesForm');

// Le dossier est déjà enregistré : demander un retour conversationnel ancré
// dans les informations saisies, avant de montrer les contrôles de soumission.
await route('/formulaire/soumission/synthese/22778','assistant_review','#blockingAlert');
const firstBlockers=(await p.locator('#blockingAlert').innerText()).replace(/\s+/g,' ').trim();
const aiReviewReply=await askAssistant(
  'Peux-tu relire mon dossier avant le dépôt et me signaler les points qui pourraient entraîner une réserve ?',
  'assistant_feedback_on_expected_impacts'
);

// Appliquer manuellement une cible mesurable, puis vérifier l'état réel de la rubrique.
await route('/formulaire/soumission/formulaire_demande_RIE/13847/22778?section=2','apply_assistant_feedback','#formulaireFMFP');
await halo('[name="formulaire_cont_socioeco_retombees_attendues"]','vague_field_to_correct','red',1400);
await fill('[name="formulaire_cont_socioeco_retombees_attendues"]',
  'Cible de démonstration : au moins 9 contrôles de sécurité et de qualité sur 10 appliqués correctement après la formation.',
  'corrected_expected_impacts','green');
await click(p,'#btnNext',180);
await p.waitForFunction(()=>document.querySelector('.fm-step.is-active')?.dataset.step==='3',null,{timeout:15000});
await clearDemoScrollTail();
mark('correction_saved');

// Recontrôle natif après correction : l'assistant conseille, la plateforme
// recalcule ensuite l'état de complétude du dossier.
await route('/formulaire/soumission/synthese/22778','recheck_after_fix','#blockingAlert');
const secondBlockers=(await p.locator('#blockingAlert').innerText()).replace(/\s+/g,' ').trim();
const issueStillPresent=/contexte socio/i.test(secondBlockers);
await halo('.parties-status-grid .partie-status-item:first-child','recheck_result','green',2400);
mark(issueStillPresent?'recheck_still_flags_issue':'recheck_issue_cleared');

// Le contrôle de synthèse est maintenant rendu directement dans la page. Il se
// lance à l'ouverture de la synthèse ; on montre les constats sans ouvrir la
// confirmation de soumission.
await route('/formulaire/soumission/synthese/22778','final_submission_check','#blockingAlert');
const submitButton=p.locator('#btnSoumettre');
const firstSubmitBlocked=await submitButton.isDisabled();
mark(firstSubmitBlocked?'initial_submit_blocked':'initial_submit_available', '#btnSoumettre',await submitButton.boundingBox());
const firstAudit=await waitForSubmissionAudit('initial_submission_audit_completed');
const firstAuditSummary=firstAudit.summary;
const firstAuditCounts=firstAudit.categories;
await scrollDownThroughAudit('initial_submission_audit');
await halo('#submissionAuditResults .submission-audit__categories','initial_submission_audit_categories','amber',1200);
const auditFinding=p.locator('#submissionAuditResults .submission-audit__finding--blocking').first();
if(await auditFinding.count()) {
  await halo('#submissionAuditResults .submission-audit__finding--blocking','initial_submission_audit_blocker','red',1300);
} else {
  await halo('#submissionAuditResults .submission-audit__summary','initial_submission_audit_result','amber',1300);
}
await pause(450);

// Ajouter le CV volontairement non conforme et montrer son contrôle.
await route('/formulaire/soumission/annexes_section1/22778','cv_annex_form','#annexesForm');
await halo('#card_323','cv_wrong_card','blue',700);
await p.locator('#file_input_323').setInputFiles(wrongCvFile);
await p.waitForFunction(()=>{
  const button=document.querySelector('#attlist_323 .btn-cv-check-upload');
  return button&&!button.disabled;
},null,{timeout:90000});
await p.waitForFunction(()=>{
  const result=document.querySelector('.cv-check-result:not([hidden])');
  return result&&!result.classList.contains('is-loading');
},null,{timeout:90000});
const wrongCvResult=p.locator('.cv-check-result:not([hidden])').last();
const wrongCvCheckText=(await wrongCvResult.innerText()).replace(/\s+/g,' ').trim();
const wrongCvCheckState=await wrongCvResult.evaluate(node=>
  ['is-ok','is-warning','is-error'].find(name=>node.classList.contains(name))||'unknown'
);
if(wrongCvCheckState!=='is-error') {
  throw new Error('The configured first CV did not reproduce the expected nonconforming check.');
}
mark('wrong_cv_check_completed');
await scrollElementToY('#card_323',130,'scroll_to_wrong_cv_card');
await halo('.cv-check-result:not([hidden])','wrong_cv_check_result','red',2300);
await p.keyboard.press('Escape');
await p.waitForFunction(()=>!document.querySelector('.cv-check-result:not([hidden])'),null,{timeout:5000});
await click(p,'#btnSubmit',160);
const wrongCvMissingDocsPrompt=p.locator('#modalGenerateConfirm');
await wrongCvMissingDocsPrompt.waitFor({state:'visible',timeout:3000}).catch(()=>{});
if(await wrongCvMissingDocsPrompt.isVisible().catch(()=>false)) {
  mark('other_required_annexes_still_missing');
  await click(p,'#modalGenerateConfirm button:has-text("Enregistrer et continuer")',120);
}
await p.waitForURL('**/synthese/22778',{timeout:20000});
await waitReady(p);
await p.addStyleTag({content:MASK});
mark('wrong_cv_saved');

// Vérifier brièvement l'état global avec le mauvais CV. Le résultat se met à
// jour directement dans la synthèse ; le retour aux annexes ferme cet écran.
await route('/formulaire/soumission/synthese/22778','wrong_cv_submission_check','#blockingAlert');
const wrongCvAudit=await waitForSubmissionAudit('wrong_cv_audit_completed');
const wrongCvAuditSummary=wrongCvAudit.summary;
const wrongCvAuditCounts=wrongCvAudit.categories;
await halo('#submissionAuditResults .submission-audit__categories','wrong_cv_audit_categories','amber',1100);
if(await p.locator('#submissionAuditResults .submission-audit__finding--blocking').count()) {
  await halo('#submissionAuditResults .submission-audit__finding--blocking','wrong_cv_audit_cv_blocker','red',1200);
}
await pause(450);
mark('wrong_cv_audit_observed');

await route('/formulaire/soumission/annexes_section1/22778','replace_wrong_cv','#annexesForm');
const wrongRow=p.locator('#attlist_323 .attachment-item').first();
if(await p.locator('#attlist_323 .attachment-item').count()!==1) {
  throw new Error('Expected exactly one CV attachment to replace in the demo draft.');
}
const currentCvName=(await wrongRow.locator('.att-name').innerText()).trim();
const wrongCvBase=path.basename(wrongCvFile,path.extname(wrongCvFile));
if(!currentCvName.startsWith(wrongCvBase)||!currentCvName.endsWith(path.extname(wrongCvFile))) {
  throw new Error('The attached CV is not the configured nonconforming demo file.');
}
const wrongDbId=await wrongRow.getAttribute('data-db-id');
await click(p,`#attlist_323 .btn-att-delete[data-db-id="${wrongDbId}"]`,120);
await p.waitForSelector('#modalGenerateConfirm',{state:'visible',timeout:5000});
await click(p,'#modalGenerateConfirm button:has-text("Supprimer")',120);
mark('wrong_cv_removed');

await halo('#card_323','correct_cv_card','blue',700);
await p.locator('#file_input_323').setInputFiles(correctCvFile);
await p.waitForFunction(()=>{
  const button=document.querySelector('#attlist_323 .btn-cv-check-upload');
  return button&&!button.disabled;
},null,{timeout:90000});
await p.waitForFunction(()=>{
  const result=document.querySelector('.cv-check-result:not([hidden])');
  return result&&!result.classList.contains('is-loading');
},null,{timeout:90000});
const correctCvResult=p.locator('.cv-check-result:not([hidden])').last();
const correctCvCheckText=(await correctCvResult.innerText()).replace(/\s+/g,' ').trim();
const correctCvCheckState=await correctCvResult.evaluate(node=>
  ['is-ok','is-warning','is-error'].find(name=>node.classList.contains(name))||'unknown'
);
if(correctCvCheckState!=='is-ok') {
  throw new Error('The marked demo CV did not pass the built-in structure check.');
}
mark('correct_cv_check_completed');
await halo('.cv-check-result:not([hidden])','correct_cv_check_result','green',2700);
await p.keyboard.press('Escape');
await p.waitForFunction(()=>!document.querySelector('.cv-check-result:not([hidden])'),null,{timeout:5000});
await click(p,'#btnSubmit',160);
const correctCvMissingDocsPrompt=p.locator('#modalGenerateConfirm');
await correctCvMissingDocsPrompt.waitFor({state:'visible',timeout:3000}).catch(()=>{});
if(await correctCvMissingDocsPrompt.isVisible().catch(()=>false)) {
  await click(p,'#modalGenerateConfirm button:has-text("Enregistrer et continuer")',120);
}
await p.waitForURL('**/synthese/22778',{timeout:20000});
await p.waitForSelector('#blockingAlert',{state:'attached',timeout:10000});
await p.addStyleTag({content:MASK});
mark('correct_cv_saved');

// Montrer les trois pièces obligatoires réunies avant de revenir au contrôle.
await route('/formulaire/soumission/annexes_section1/22778','all_required_annexes','#annexesForm');
for(const document of [
  {id:'320',label:'annual_plan'},
  {id:'322',label:'funding_letter'},
  {id:'323',label:'trainer_cv'},
]) {
  const card=p.locator(`#card_${document.id}`);
  const count=await card.locator('.attachment-item').count();
  const complete=await card.evaluate(node=>node.classList.contains('is-complete'));
  if(count!==1||!complete) {
    throw new Error(`The required ${document.label} annex is not present and complete.`);
  }
  if(document.id==='323') {
    await scrollElementToY('#card_323',230,'scroll_down_to_cv_card');
  }
  await halo(`#card_${document.id}`,'required_annex_'+document.label,'green',document.id==='323'?1450:800);
}
mark('all_required_annexes_verified');

// Audit final : les trois pièces passent le contrôle et le dossier reste non soumis.
await route('/formulaire/soumission/synthese/22778','return_to_final_submission_check','#blockingAlert');
const finalSubmitBlocked=await p.locator('#btnSoumettre').isDisabled();
mark(finalSubmitBlocked?'final_submit_blocked':'final_submit_available','#btnSoumettre',await p.locator('#btnSoumettre').boundingBox());
const finalAudit=await waitForSubmissionAudit('final_submission_audit_completed');
const finalAuditSummary=finalAudit.summary;
const finalAuditCounts=finalAudit.categories;
const finalAuditText=finalAudit.text;
const finalCvBlockers=await p.locator('#submissionAuditResults .submission-audit__finding--blocking')
  .filter({hasText:/CV du Formateur|CV 1/i}).count();
if(finalCvBlockers) throw new Error('The final submission audit still flags the corrected CV.');
if(finalAuditSummary!=='Dossier cohérent'||/Contrôle partiel/i.test(finalAuditText)) {
  throw new Error(`The final audit is not fully clear: ${finalAuditText}`);
}
if(await p.locator('#submissionAuditResults .submission-audit__finding').count()) {
  throw new Error('The final submission audit still contains findings.');
}
await halo('#submissionAuditResults .submission-audit__summary','final_submission_audit_clean','green',2100);
mark('end_at_updated_submission_audit');

const frames=await stop();
const concatList='out/rec-02/list.txt';
const concatLines=fs.readFileSync(concatList,'utf8').trimEnd().split('\n');
let rawVideoElapsed=0;
const compressedAuditWaits=[];
for(let index=0;index<concatLines.length-1;index+=2) {
  const durationLine=concatLines[index+1];
  const duration=Number(durationLine?.replace(/^duration\s+/,'')||0);
  const start=rawVideoElapsed;
  if(duration>20) {
    const kept=0.9;
    compressedAuditWaits.push({start,removed:duration-kept});
    concatLines[index+1]=`duration ${kept.toFixed(4)}`;
  }
  rawVideoElapsed+=duration;
}
if(compressedAuditWaits.length) {
  fs.writeFileSync(concatList,concatLines.join('\n')+'\n');
  for(const event of ev) {
    const removed=compressedAuditWaits.reduce((total,wait)=>total+(event.t>wait.start?wait.removed:0),0);
    event.t=Math.max(0,event.t-removed);
  }
}
const journal={
  events:ev,frames,
  compressedAuditWaitSeconds:compressedAuditWaits.reduce((total,wait)=>total+wait.removed,0),
  aiReviewReply,
  firstBlockers,
  recheckIssueStillPresent:issueStillPresent,
  recheckBlockers:secondBlockers,
  initialSubmissionAuditSummary:firstAuditSummary,
  initialSubmissionAuditCounts:firstAuditCounts,
  wrongCvCheckState,
  wrongCvCheckText,
  wrongCvAuditSummary,
  wrongCvAuditCounts,
  correctCvCheckState,
  correctCvCheckText,
  allRequiredAnnexesVerified:true,
  finalCvBlockers,
  finalSubmissionAuditSummary:finalAuditSummary,
  finalSubmissionAuditText:finalAuditText,
  finalSubmissionAuditCounts:finalAuditCounts,
  finalSubmitBlocked,
  trainerCvAttached:true,
};
fs.mkdirSync('out',{recursive:true});
fs.writeFileSync('out/02.events.json',JSON.stringify(journal,null,2)+'\n');
console.log(JSON.stringify(journal));
await c.close();
await b.close();

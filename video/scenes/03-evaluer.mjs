import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import {smoothScrollTo,CURSOR,click,glide,startRec,type,waitReady} from '../lib.mjs';

const baseUrl=process.env.DEMO_BASE_URL||'http://plateforme-fmfp.local';
const fixturePath=process.env.DEMO_EVALUATOR_FIXTURE||'.state/evaluator-fixture.json';
if(!fs.existsSync(fixturePath)) throw new Error(`Missing reusable local evaluator fixture: ${fixturePath}`);
const fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
const formId=Number(process.env.DEMO_EVAL_FORM_ID||fixture.formId);
if(!Number.isSafeInteger(formId)||formId<1||formId!==Number(fixture.formId)) {
  throw new Error(`Use the reusable local evaluator fixture recorded in ${fixturePath}.`);
}
if(fixture.company!=='BEMA'||fixture.projectTitle!=='Sécurité et qualité en atelier textile') {
  throw new Error(`Unexpected dossier in reusable evaluator fixture: ${fixturePath}`);
}
const state=process.env.STATE||'.state/adm.json';
if(!fs.existsSync(state)) throw new Error(`Missing evaluator session state: ${state}. Run login.mjs adm first.`);

const browser=await chromium.launch({
  channel:'chrome',headless:true,
  args:['--host-resolver-rules=MAP plateforme-fmfp.local 127.0.0.1'],
});
const context=await browser.newContext({
  viewport:{width:1600,height:900},locale:'fr-FR',storageState:state,
});
await context.addInitScript(CURSOR);
const page=await context.newPage();
await page.goto(`${baseUrl}/evaluation/saisie/saisie_evaluation/${formId}`);
await waitReady(page);
await page.waitForSelector('#fmfpOpenEvaluationAiWorkspace',{timeout:20000});
// This dedicated test dossier is reused on every recording. Remove its old
// evaluator-side chat session so the captured conversation starts cleanly.
const resetChat=await page.evaluate(async()=>{
  const root=document.querySelector('[data-ai-agent-chat]');
  if(!root) throw new Error('Evaluator assistant is unavailable on this dossier.');
  const body=new URLSearchParams();
  body.append(root.dataset.csrfName,root.dataset.csrfValue);
  body.append('formulaire_id',root.dataset.formulaire);
  body.append('role',root.dataset.role);
  const response=await fetch(`${root.dataset.base}/close`,{
    method:'POST',credentials:'same-origin',
    headers:{'X-Requested-With':'XMLHttpRequest','X-CSRF-Token':root.dataset.csrfValue},body,
  });
  const payload=await response.json().catch(()=>null);
  const formId=root.dataset.formulaire;
  const role=root.dataset.role;
  const prefixes=[`fmfp.ai.agent.history.v3:${formId}:${role}`,`fmfp.ai.agent.history.v1:${formId}:${role}:`];
  for(let index=localStorage.length-1;index>=0;index--){
    const key=localStorage.key(index);
    if(prefixes.some(prefix=>key===prefix||key.startsWith(prefix))) localStorage.removeItem(key);
  }
  return {ok:response.ok,payload};
});
if(!resetChat.ok||!resetChat.payload?.ok) throw new Error('Could not reset the evaluator chat for a clean reusable-fixture capture.');
const initialEvaluationComment=await page.evaluate(async id=>{
  const body=new URLSearchParams({formulaire_id:String(id)});
  const response=await fetch('/evaluation/saisie/ajax_get_commentaire',{
    method:'POST',credentials:'same-origin',headers:{'X-Requested-With':'XMLHttpRequest'},body,
  });
  if(!response.ok) throw new Error('Could not snapshot the evaluator comment before capture.');
  const payload=await response.json();
  if(!payload?.formulaire_evaluation_id) throw new Error('The reusable evaluator fixture needs its empty evaluation record so the comment can be restored after capture.');
  return {
    evaluationId:Number(payload.formulaire_evaluation_id),
    proposition:payload.formulaire_evaluation_proposition==null?'':String(payload.formulaire_evaluation_proposition),
  };
},formId);
await page.addStyleTag({content:`
  .sb-org .name,.sb-org .role,.sb-org .avatar,
  #topUserBtn > .nm,#topUserBtn > .avatar,.top-user-menu-org-info,.top-user-menu-org-avatar {
    filter:blur(7px)!important;user-select:none!important;
  }
  #toast-container,#ent-toast-container,.toast-container,.toast,.toast-message,
  .ent-toast,[role="alert"].toast,[role="alert"].ent-toast{display:none!important}
`});

const stop=await startRec(page,'out/rec-03');
const startedAt=Date.now();
const events=[];
let commentSaveAttempted=false;
let commentRestoredAfterCapture=false;
let commentRestoreError=null;
const mark=async(k,selector,targetOverride)=>{
  let box=null;
  const target=targetOverride||(typeof selector==='string'?page.locator(selector).first():selector);
  if(target){
    if(await target.count()){
      const rect=await target.boundingBox();
      if(rect) box={x:Math.round(rect.x),y:Math.round(rect.y),width:Math.round(rect.width),height:Math.round(rect.height)};
    }
  }
  events.push({k,t:Number(((Date.now()-startedAt)/1000).toFixed(2)),...(selector?{selector:typeof selector==='string'?selector:`<${k}>`}:{}),...(box?{box}:{})});
};
const pause=ms=>page.waitForTimeout(ms);
const highlight=async(selector,k,color='blue',hold=1400)=>{
  const target=typeof selector==='string'?page.locator(selector).first():selector;
  await smoothScrollTo(target);
  const rect=await target.boundingBox();
  if(!rect) throw new Error(`Cannot highlight off-screen target: ${selector}`);
  await glide(page,rect.x+Math.min(rect.width*.55,rect.width-2),rect.y+Math.min(rect.height*.5,rect.height-2),420);
  const stroke=color==='green'?'#23834D':color==='amber'?'#D78A21':color==='violet'?'#7353B8':'#2D5AA6';
  const glow=color==='green'?'rgba(35,131,77,.20)':color==='amber'?'rgba(215,138,33,.22)':color==='violet'?'rgba(115,83,184,.21)':'rgba(45,90,166,.21)';
  const before=await target.evaluate(el=>Object.fromEntries(['outline','outline-offset','box-shadow'].map(name=>[name,{value:el.style.getPropertyValue(name),priority:el.style.getPropertyPriority(name)}])));
  await target.evaluate((el,{stroke,glow})=>{
    el.style.setProperty('outline',`3px solid ${stroke}`,'important');
    el.style.setProperty('outline-offset','4px','important');
    el.style.setProperty('box-shadow',`0 0 0 7px ${glow}, 0 0 24px ${glow}`,'important');
  },{stroke,glow});
  await mark(k,typeof selector==='string'?selector:`<${k}>`,target);
  await pause(hold);
  if(await target.count()) await target.evaluate((el,styleBefore)=>{
    Object.entries(styleBefore).forEach(([name,saved])=>{
      if(saved.value) el.style.setProperty(name,saved.value,saved.priority);
      else el.style.removeProperty(name);
    });
  },before);
};
const selectTool=async(tool)=>{
  const inOverview=await page.locator('#fmfpAiWorkspaceOverview').isVisible().catch(()=>false);
  const selector=inOverview
    ? `#fmfpAiWorkspaceOverview [data-workspace-open="${tool}"]`
    : `#fmfpEvaluationAiWorkspace .fmfp-ai-workspace__nav button[data-workspace-open="${tool}"]`;
  await click(page,selector,450);
  const switched=await page.waitForFunction(selected=>{
    const workspace=document.querySelector('#fmfpEvaluationAiWorkspace');
    return workspace&&workspace.dataset.tool===selected;
  },tool,{timeout:1500}).then(()=>true).catch(()=>false);
  if(!switched){
    // If the pointer action did not switch tools, activate the same UI button
    // once through its click handler before recording a misleading blank state.
    await page.locator(selector).evaluate(button=>button.click());
    await page.waitForFunction(selected=>{
      const workspace=document.querySelector('#fmfpEvaluationAiWorkspace');
      return workspace&&workspace.dataset.tool===selected;
    },tool,{timeout:5000}).catch(()=>{throw new Error(`The evaluator workspace did not switch to ${tool}.`)});
  }
  const launch=page.locator('#fmfpAiWorkspaceToolStartButton');
  if(await launch.isVisible().catch(()=>false)){
    await mark(`${tool}_ready`, '#fmfpAiWorkspaceToolStart');
    await click(page,'#fmfpAiWorkspaceToolStartButton',450);
  }
};
const waitForVisible=async(selector,label,timeout=45000)=>{
  await page.waitForFunction(sel=>{
    const el=document.querySelector(sel);
    return !!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>0;
  },selector,{timeout}).catch(()=>{throw new Error(`Timed out waiting for ${label} (${selector}).`)});
};
const compressWait=(fromKey,toKey,keepSeconds=1.2)=>{
  const from=events.find(event=>event.k===fromKey);
  const to=events.find(event=>event.k===toKey);
  if(!from||!to||to.t<=from.t+keepSeconds) return 0;
  const cutStart=from.t+keepSeconds;
  const cutEnd=to.t;
  const lines=fs.readFileSync('out/rec-03/list.txt','utf8').trim().split(/\r?\n/);
  const entries=[];
  let timeline=0;
  for(let i=0;i+1<lines.length;i+=2){
    const file=lines[i].match(/^file '(.+)'$/)?.[1];
    const duration=Number(lines[i+1].match(/^duration ([\d.]+)$/)?.[1]);
    if(!file||!Number.isFinite(duration)) throw new Error('Unexpected screencast frame list format.');
    const start=timeline;
    const end=start+duration;
    timeline=end;
    if(start>=cutStart&&start<cutEnd) continue;
    entries.push({file,duration:start<cutStart&&end>cutStart?cutStart-start:duration});
  }
  if(entries.length<2) throw new Error(`Too few frames remain after trimming ${fromKey} wait.`);
  const output=[];
  for(const entry of entries) output.push(`file '${entry.file}'`,`duration ${Math.max(.001,entry.duration).toFixed(4)}`);
  output.push(`file '${entries.at(-1).file}'`);
  fs.writeFileSync('out/rec-03/list.txt',output.join('\n'));
  const removed=Number((cutEnd-cutStart).toFixed(2));
  for(const event of events){
    event.original_t=event.t;
    if(event.t>=to.t) event.t=Number(Math.max(from.t+keepSeconds,event.t-removed).toFixed(2));
  }
  return removed;
};

try {
  await pause(500);
  await mark('evaluator_dossier_ready','.page-hd');
  await highlight('.page-hd__title','evaluator_dossier_open','blue',900);
  await highlight('#fmfpOpenEvaluationAiWorkspace','open_ai_workspace','blue',800);
  await click(page,'#fmfpOpenEvaluationAiWorkspace',500);
  await page.waitForSelector('#fmfpEvaluationAiWorkspace[open]',{timeout:5000});
  await mark('ai_tools_overview','#fmfpAiWorkspaceOverview');
  await highlight('#fmfpAiWorkspaceOverview [data-workspace-open="analysis"]','overview_analysis','blue',750);
  await highlight('#fmfpAiWorkspaceOverview [data-workspace-open="coherence"]','overview_coherence','amber',750);
  await highlight('#fmfpAiWorkspaceOverview [data-workspace-open="comparisons"]','overview_comparisons','violet',750);
  await highlight('#fmfpAiWorkspaceOverview [data-workspace-open="appreciation"]','overview_appreciation','green',750);
  await highlight('#fmfpAiWorkspaceOverview [data-workspace-open="chat"]','overview_chat','blue',750);

  await selectTool('analysis');
  await waitForVisible('#mlAnalysisResult','dossier analysis');
  await page.waitForFunction(()=>{
    const score=document.querySelector('#mlScore');
    return score&&score.textContent.trim()&&score.textContent.trim()!=='-';
  },null,{timeout:45000});
  await mark('analysis_result_ready','#mlAnalysisResult');
  await highlight('#mlScoreResult .air-score-summary__metric--final','indicative_score','blue',2100);
  await click(page,'#mlScoreResult [data-score-detail-trigger="scores"]',420);
  await waitForVisible('#mlScoreDetailsModal','score detail modal',10000);
  await highlight('#mlScoreDetailsModal .air-score-details-modal__section--model .air-score-details-modal__scoreline','historical_model_prediction','blue',1700);
  await highlight('#mlScoreDetailsModal .air-score-details-modal__section--rules .air-score-details-modal__scoreline','fmfp_rules_adjustment','amber',1700);
  await highlight('#mlScoreDetailsModal .air-score-details-modal__evaluation-score','human_grid_score_remains_separate','green',1700);
  await click(page,'#mlScoreDetailsClose',350);
  await highlight('#mlEvaluationRecommendationsCount','fifteen_criteria_reviewed','blue',1700);
  await highlight('#mlEvaluationStepsList','four_rubric_sections','amber',1700);
  const annualPlanRow=page.locator('#mlEvaluationRecommendationsList .air-evaluation__item')
    .filter({hasText:'plan de formation annuel'}).first();
  if(!await annualPlanRow.count()) throw new Error('The annual-plan criterion is missing from the evaluator analysis.');
  await annualPlanRow.evaluate(el=>el.setAttribute('data-demo-evaluation-row','annual-plan'));
  const annualPlanSelector='#mlEvaluationRecommendationsList [data-demo-evaluation-row="annual-plan"]';
  await highlight(`${annualPlanSelector} .air-evaluation__answer`,'criterion_to_confirm','amber',1900);
  await click(page,`${annualPlanSelector} .air-evaluation__details > summary`,450);
  await page.waitForSelector(`${annualPlanSelector} .air-evaluation__details[open]`,{timeout:5000});
  await highlight(`${annualPlanSelector} .air-evaluation__comment`,'criterion_reasoning','blue',1800);
  await highlight(`${annualPlanSelector} .air-evaluation__evidence`,'criterion_source_trace','green',1800);
  await click(page,`${annualPlanSelector} .air-evaluation__evidence-button`,420);
  await waitForVisible('#mlEvidenceModal','criterion evidence details',10000);
  const evidenceSources=page.locator('#mlEvidenceSources .air-evidence-modal__source');
  if(await evidenceSources.count()) await highlight(evidenceSources.first(),'source_document_excerpt','green',2300);
  else await highlight('#mlEvidenceModal .air-evidence-modal__body','source_evidence_panel','green',1900);
  await highlight('#mlEvidenceModal .air-evidence-modal__footer','evidence_requires_human_confirmation','amber',1600);
  await click(page,'#mlEvidenceModal [data-evidence-close="true"]',350);
  await page.locator('#mlEvidenceSupport').evaluate(el=>{el.open=true});
  const sourcePlanRows=page.locator('#mlInspectionPlanList > li');
  if(await sourcePlanRows.count()){
    await highlight(sourcePlanRows.nth(0),'criteria_linked_to_control_data','blue',1600);
    if(await sourcePlanRows.count()>1) await highlight(sourcePlanRows.nth(1),'sources_used_across_dossier','amber',1800);
  }
  await highlight('#mlCoverage','grid_coverage_without_entries','green',1700);

  await selectTool('coherence');
  await waitForVisible('#fmfpModuleCoherenceResult','project coherence');
  await mark('coherence_result_ready','#fmfpModuleCoherenceResult');
  await highlight('#fmfpModuleCoherenceResult .fmfp-coherence-summary','coherence_summary','green',1900);
  const moduleRow=page.locator('#fmfpModuleCoherenceResult .fmfp-coherence-module-row').first();
  await highlight(moduleRow,'module_cross_check','amber',1800);
  await click(page,'#fmfpModuleCoherenceResult .fmfp-coherence-module-row',420);
  await page.waitForSelector('#fmfpModuleDetailsDialog[open]',{timeout:8000});
  await highlight('#fmfpModuleDetailsTitle','module_details_open','blue',1500);
  const moduleFacts=page.locator('#fmfpModuleDetailsBody .fmfp-module-detail-field');
  for(let i=0;i<Math.min(await moduleFacts.count(),3);i++) await highlight(moduleFacts.nth(i),`module_fact_${i+1}`,'amber',1400);
  await click(page,'#fmfpModuleDetailsClose',350);

  await selectTool('comparisons');
  await waitForVisible('#fmfpComparisonDrawer','comparable dossiers');
  await page.waitForSelector('#fmfpSimilarResults .similar-list-heading',{timeout:45000});
  await page.waitForFunction(()=>{
    const status=document.querySelector('#fmfpComparisonStatus');
    return status&&status.textContent.trim()&&!/recherche|chargement/i.test(status.textContent);
  },null,{timeout:45000}).catch(()=>{});
  await mark('comparables_result_ready','#fmfpComparisonDrawer');
  await highlight('#fmfpSimilarResults .similar-list-heading','previous_dossiers_found','blue',1700);
  const semanticMatch=page.locator('#fmfpSimilarResults .similar-list-signals .is-ai-match').first();
  if(await semanticMatch.count()) await highlight(semanticMatch,'semantic_ai_match_signal','violet',1800);
  const semanticReason=page.locator('#fmfpSimilarResults .similar-ai-evidence').first();
  if(await semanticReason.count()) await highlight(semanticReason,'why_the_ai_matched_the_previous','violet',2200);
  const textComparison='#fmfpSimilarResults .sc-project-disclosure';
  await click(page,`${textComparison} > summary`,420);
  const lexicalScore=page.locator(`${textComparison} .sc-proximity`).first();
  if(await lexicalScore.count()) await highlight(lexicalScore,'lexical_similarity_is_separate','blue',1700);
  const trainingComparison='#fmfpSimilarResults .sc-calendar-disclosure';
  await highlight(`${trainingComparison} > summary`,'training_volume_difference','amber',1900);
  await click(page,`${trainingComparison} > summary`,420);
  const trainingSides=page.locator(`${trainingComparison} .sc-training-side`);
  if(await trainingSides.count()){
    await highlight(trainingSides.nth(0),'current_training_plan_details','blue',1700);
    if(await trainingSides.count()>1) await highlight(trainingSides.nth(1),'previous_training_plan_details','amber',1700);
  }
  const methodSummary=page.locator('#fmfpSimilarResults .similar-method > summary').first();
  if(await methodSummary.count()){
    await click(page,'#fmfpSimilarResults .similar-method > summary',350);
    await highlight('#fmfpSimilarResults .similar-method','comparison_method_and_limits','green',1900);
  }

  await selectTool('chat');
  const chatRoot=page.locator('#mlModeDossier [data-ai-agent-chat]').first();
  await chatRoot.waitFor({state:'visible',timeout:15000});
  const chatInput=chatRoot.locator('textarea:not([hidden]),input[type="text"]:not([hidden])').first();
  await chatInput.fill('Quels éléments du dossier étayent la pertinence du projet, et quels points dois-je vérifier avant de renseigner la grille ?');
  await mark('contextual_question_filled');
  await click(page,'#mlModeDossier [data-ai-send],#mlModeDossier button[type="submit"]',450);
  await mark('contextual_question_sent');
  await page.waitForFunction(root=>{
    const el=document.querySelector(root);
    return !!el&&el.innerText.trim().length>180;
  },'#mlModeDossier [data-ai-agent-chat]',{timeout:45000});
  await mark('contextual_answer_ready','#mlModeDossier [data-ai-agent-chat]');
  const questionBubble=chatRoot.locator('.chat-msg.is-out .chat-bubble').last();
  const answerBubble=chatRoot.locator('.chat-msg.is-in .chat-bubble').last();
  await highlight(questionBubble,'evaluator_question_context','blue',1700);
  await highlight(answerBubble,'dossier_grounded_ai_answer','green',4000);

  await selectTool('appreciation');
  await waitForVisible('#mlEvaluatorDraft','AI appreciation draft',45000);
  await mark('appreciation_draft_ready','#mlEvaluatorDraft');
  await highlight('#mlEvaluatorDraft .air-draft__head','five_part_editable_draft','blue',1800);
  const refineButton=page.locator('#mlEvaluatorDraftSections .air-draft__section').first().locator('[data-ml-draft-assist="embellir"]');
  await highlight(refineButton,'draft_refinement_action','amber',1600);
  await click(page,'#mlEvaluatorDraftSections .air-draft__section:first-child [data-ml-draft-assist="embellir"]',420);
  await waitForVisible('#mlEvaluatorAssistAsk','custom_refinement_request',8000);
  await type(page,'#mlEvaluatorAssistInstruction','En deux phrases, conserve le lien avec la sécurité et les finitions. N’ajoute aucun chiffre absent du dossier.',28);
  await highlight('#mlEvaluatorAssistInstruction','human_instruction_for_ai','blue',1300);
  await mark('draft_refinement_started','#mlEvaluatorAssistRun');
  await click(page,'#mlEvaluatorAssistRun',420);
  await page.waitForFunction(()=>{
    const result=document.querySelector('#mlEvaluatorAssistResult');
    const suggestion=document.querySelector('#mlEvaluatorAssistText');
    const apply=document.querySelector('#mlEvaluatorAssistApply');
    return !!result&&!result.hidden&&result.classList.contains('has-result')
      &&!!suggestion&&suggestion.value.trim().length>40&&!!apply&&!apply.disabled;
  },null,{timeout:45000});
  await mark('draft_refinement_result_ready','#mlEvaluatorAssistResult');
  await highlight('#mlEvaluatorAssistResult .air-draft__assist-proposal','editable_ai_rewrite','green',2600);
  await highlight('#mlEvaluatorAssistStatus','review_before_applying','amber',1700);
  const revisedRubric=await page.locator('#mlEvaluatorAssistText').inputValue();
  await highlight('#mlEvaluatorAssistApply','apply_ai_rewrite_to_rubric','green',1500);
  await click(page,'#mlEvaluatorAssistApply',400);
  const firstRubric=page.locator('#mlEvaluatorDraftSections .air-draft__section').first();
  await page.waitForFunction(expected=>{
    const text=document.querySelector('#mlEvaluatorDraftSections .air-draft__section .air-draft__section-text');
    const normalize=value=>String(value||'').replace(/\s+/g,' ').trim();
    return !!text&&normalize(text.innerText)===normalize(expected);
  },revisedRubric,{timeout:8000});
  await highlight(firstRubric.locator('.air-draft__section-text'),'revised_rubric_applied','green',1900);

  await highlight('#mlEvaluatorDraftInsert','use_draft_as_evaluator_appreciation','blue',1500);
  await click(page,'#mlEvaluatorDraftInsert',450);
  if(await page.locator('#modalDraftReplace.is-open').count()){
    await mark('replace_existing_appreciation','#modalDraftReplace');
    await click(page,'#modalDraftReplaceConfirm',350);
  }
  await waitForVisible('#modalCommentaire','evaluator appreciation editor',10000);
  await page.waitForFunction(()=>{
    const editor=window.FmfpRichEditor?.get('modalCommentaireText')
      ||document.querySelector('#modalCommentaireText')?.value||'';
    return editor.replace(/<[^>]*>/g,' ').trim().length>120;
  },null,{timeout:10000});
  const richEditor=page.locator('#cke_modalCommentaireText');
  const commentEditor=await richEditor.count()?richEditor:page.locator('#modalCommentaireText');
  await highlight(commentEditor,'ai_draft_inserted_as_comment','green',2400);
  await highlight('#modalCommentaireSave','save_evaluator_comment_without_sending','amber',1500);
  commentSaveAttempted=true;
  await click(page,'#modalCommentaireSave',450);
  await page.waitForFunction(()=>{
    const modal=document.querySelector('#modalCommentaire');
    const comment=document.querySelector('#es-appreciation blockquote');
    return !!modal&&!modal.classList.contains('is-open')&&!!comment&&comment.innerText.trim().length>120;
  },null,{timeout:15000});
  // The appreciation is saved for the take, but no score or decision is set.
  await page.evaluate(()=>window.FmfpEvaluationAiWorkspace?.close());
  await page.waitForFunction(()=>!document.querySelector('#fmfpEvaluationAiWorkspace')?.open,null,{timeout:5000});
  await page.mouse.move(720,730);
  await page.mouse.wheel(0,180);
  await pause(650);
  await mark('evaluator_comment_saved','#es-appreciation blockquote');
  await mark('empty_rating_grid_with_saved_comment','#type_critere');
  await highlight('#es-appreciation blockquote > p:first-child','comment_visible_beside_empty_grid','green',3000);
  await pause(3500);
} finally {
  const frames=await stop();
  const compressedWaitSeconds=[];
  if(events.some(event=>event.k==='analysis_result_ready')){
    compressedWaitSeconds.push({section:'analysis',seconds:compressWait('analysis_ready','analysis_result_ready')});
  }
  if(events.some(event=>event.k==='comparables_result_ready')){
    compressedWaitSeconds.push({section:'comparables',seconds:compressWait('comparisons_ready','comparables_result_ready')});
  }
  if(events.some(event=>event.k==='contextual_answer_ready')){
    compressedWaitSeconds.push({section:'chat',seconds:compressWait('contextual_question_sent','contextual_answer_ready',1.8)});
  }
  if(events.some(event=>event.k==='draft_refinement_result_ready')){
    compressedWaitSeconds.push({section:'draft_refinement',seconds:compressWait('draft_refinement_started','draft_refinement_result_ready',1.5)});
  }
  const captureSeconds=Number(((Date.now()-startedAt)/1000).toFixed(2));
  if(commentSaveAttempted){
    try{
      const restore=await page.evaluate(async({formId,proposition})=>{
        const body=new URLSearchParams({
          formulaire_id:String(formId),proposition,type:'proposition',
        });
        const response=await fetch('/evaluation/saisie/ajax_save_commentaire',{
          method:'POST',credentials:'same-origin',headers:{'X-Requested-With':'XMLHttpRequest'},body,
        });
        const payload=await response.json().catch(()=>null);
        if(!response.ok||payload?.statut!=='success') return {ok:false,reason:'restore request failed'};
        const verifyResponse=await fetch('/evaluation/saisie/ajax_get_commentaire',{
          method:'POST',credentials:'same-origin',headers:{'X-Requested-With':'XMLHttpRequest'},
          body:new URLSearchParams({formulaire_id:String(formId)}),
        });
        const current=await verifyResponse.json().catch(()=>null);
        return {
          ok:verifyResponse.ok&&String(current?.formulaire_evaluation_proposition??'')===proposition,
          reason:verifyResponse.ok?'restored value verified':'verification request failed',
        };
      },{formId,proposition:initialEvaluationComment.proposition});
      commentRestoredAfterCapture=restore.ok;
      if(!restore.ok) commentRestoreError=restore.reason;
    }catch(error){
      commentRestoreError=error instanceof Error?error.message:String(error);
    }
  }else{
    commentRestoredAfterCapture=true;
  }
  fs.mkdirSync('out',{recursive:true});
  fs.writeFileSync('out/03.events.json',JSON.stringify({
    scene:'03-evaluer',formId,captureSeconds,encodedCaptureSeconds:Number((captureSeconds-compressedWaitSeconds.reduce((sum,item)=>sum+item.seconds,0)).toFixed(2)),compressedWaitSeconds,commentSaveAttempted,commentRestoredAfterCapture,frames,events,
  },null,2)+'\n');
  console.log(JSON.stringify({scene:'03-evaluer',formId,captureSeconds,frames,commentSaveAttempted,commentRestoredAfterCapture,events}));
  await context.close();
  await browser.close();
  if(commentRestoreError) throw new Error(`The video was captured, but the evaluator comment could not be restored: ${commentRestoreError}`);
}

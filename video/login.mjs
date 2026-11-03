// usage: ENT_CNAPS=9Z2026 ENT_CODE=... node login.mjs ent   |   ADM_USER=admin ADM_PASS=... node login.mjs adm
// Saves a Playwright storage state in .state/ (gitignored). Credentials come from env vars only.
import {chromium} from 'playwright'; import fs from 'node:fs';
const who=process.argv[2]; const E=process.env;
const b=await chromium.launch({channel:'chrome',headless:true});
const c=await b.newContext({viewport:{width:1600,height:900},locale:'fr-FR'}); const p=await c.newPage();
if(who==='ent'){await p.goto('http://plateforme-fmfp.local/connexion?a_c=1');await p.fill('#cx_cnaps',E.ENT_CNAPS);await p.fill('#cx_code',E.ENT_CODE);}
else{await p.goto('http://plateforme-fmfp.local/auth?ad=1');await p.fill('#matricule',E.ADM_USER);await p.fill('#ax_password',E.ADM_PASS);}
await p.click('#btnConnexion'); await p.waitForTimeout(4000); console.log(p.url());
fs.mkdirSync('.state',{recursive:true}); await c.storageState({path:`.state/${who}.json`}); await b.close();

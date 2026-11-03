export const CURSOR=`(()=>{if(window.__cur)return;const d=document.createElement('div');d.id='__cur';d.style.cssText='position:fixed;z-index:2147483647;left:0;top:0;width:26px;height:26px;pointer-events:none;transition:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';d.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7 19 3-8 8-3z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';document.documentElement.appendChild(d);window.__cur=d;window.addEventListener('mousemove',e=>{d.style.transform="translate("+e.clientX+"px,"+e.clientY+"px)"},true);const st=document.createElement('style');st.textContent='*{cursor:none!important}';document.head.appendChild(st);})()`;
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
export async function glide(p,x,y,ms=700){const s=p.__pos||{x:100,y:100};const n=Math.max(8,Math.round(ms/16));for(let i=1;i<=n;i++){const t=ease(i/n);await p.mouse.move(s.x+(x-s.x)*t,s.y+(y-s.y)*t);await p.waitForTimeout(ms/n)}p.__pos={x,y}}
export async function moveTo(p,sel,ms=700,dx=.5,dy=.5){const el=p.locator(sel).first();await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();await glide(p,b.x+b.width*dx,b.y+b.height*dy,ms);return b}
export async function click(p,sel,ms=700){await moveTo(p,sel,ms);await p.waitForTimeout(150);await p.mouse.down();await p.waitForTimeout(80);await p.mouse.up();await p.waitForTimeout(250)}
export async function type(p,sel,text,delay=38){await click(p,sel,600);await p.keyboard.type(text,{delay})}
import fs from 'node:fs';
export async function startRec(page,dir,{w=1600,h=900}={}){
  fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
  const cdp=await page.context().newCDPSession(page);const frames=[];let n=0;
  cdp.on('Page.screencastFrame',async f=>{const name=`f${String(n++).padStart(6,'0')}.jpg`;fs.writeFileSync(`${dir}/${name}`,Buffer.from(f.data,'base64'));frames.push({name,t:f.metadata.timestamp,wall:Date.now()});try{await cdp.send('Page.screencastFrameAck',{sessionId:f.sessionId})}catch{}});
  await cdp.send('Page.startScreencast',{format:'jpeg',quality:92,maxWidth:w,maxHeight:h,everyNthFrame:1});
  return async()=>{const stopWall=Date.now();await cdp.send('Page.stopScreencast');const lines=[];for(let i=0;i<frames.length;i++){const last=i===frames.length-1;const raw=last?(stopWall-frames[i].wall)/1000:frames[i+1].t-frames[i].t;const d=last?raw/2:raw;lines.push(`file '${frames[i].name}'\nduration ${Math.max(d,last?0.5:0.001).toFixed(4)}`)}lines.push(`file '${frames.at(-1).name}'`);fs.writeFileSync(`${dir}/list.txt`,lines.join('\n'));return frames.length}
}
export async function waitReady(p){await p.waitForLoadState('networkidle');await p.waitForFunction(()=>{const o=document.getElementById('ent-page-overlay');return !o||getComputedStyle(o).opacity<0.05||getComputedStyle(o).display==='none'},null,{timeout:20000}).catch(()=>{});await p.waitForTimeout(400)}

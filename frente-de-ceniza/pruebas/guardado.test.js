// Pruebas A–J del sistema de guardado con un navegador real que se cierra y se vuelve a abrir (perfil persistente en disco).
const { chromium } = require('playwright'); const path=require('path'), fs=require('fs'), {execSync}=require('child_process');
const DIR=path.join(__dirname,'perfil'); const URL0='http://localhost:8080/?q=baja&test';
const res=[]; const ok=(id,cond,info)=>{ res.push(`${cond?'PASA':'FALLA'}  ${id}  ${info||''}`); console.log(res[res.length-1]); };
async function open(){ const ctx=await chromium.launchPersistentContext(DIR,{viewport:{width:480,height:270},args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  await ctx.route('https://cdn.jsdelivr.net/**', async r=>{ const u=new URL(r.request().url()); const m=u.pathname.match(/^\/npm\/(three|peerjs)@[^/]+\/(.*)$/); const f=m&&path.join(process.env.NODE_MODULES_DIR||path.join(__dirname,'node_modules'),m[1],m[2]); if(f&&fs.existsSync(f)) return r.fulfill({path:f,contentType:'text/javascript'}); return r.abort(); });
  await ctx.route(/polyhaven|threejs\.org/, r=>r.abort());
  const p=ctx.pages()[0]||await ctx.newPage(); p.on('pageerror',e=>console.log('PAGEERROR',e.message));
  await p.goto(URL0); await p.waitForFunction(()=>!document.getElementById('bSolo').disabled,null,{timeout:300000}); return {ctx,p}; }
const ev=(p,f,a)=>p.evaluate(f,a);
(async()=>{
  // ---------- A y B: completar misión 1, cerrar, abrir
  let {ctx,p}=await open();
  console.log('aviso inicial:', await p.textContent('#slotInfo'));
  await p.click('#bSolo'); await p.waitForFunction(()=>window.__g.state()==='playing'&&window.__g.MIS.on,null,{timeout:120000});
  ok('arranque', await ev(p,()=>window.__g.MIS.i===0&&!!window.__g.SAVE.data.checkpoint), 'misión 1 empezó y guardó el punto de control de inicio');
  await ev(p,()=>window.__g.completeMission());
  const afterA=await ev(p,()=>{ const d=window.__g.SAVE.data; return {c:d.campaign.completed, u:d.campaign.unlocked, rpg:d.weapons.unlocked.includes('rpg'), seq:d.seq}; });
  await ctx.close();
  ({ctx,p}=await open());
  const A=await ev(p,()=>{ const d=window.__g.SAVE.data; return {c:d.campaign.completed[0], u:d.campaign.unlocked, rpg:d.weapons.unlocked.includes('rpg'), txt:document.querySelector('#misList').innerText}; });
  ok('A  misión completada tras cerrar', A.c && /COMPLETADA/.test(A.txt), JSON.stringify({antes:afterA.c[0],despues:A.c}));
  ok('B  misión desbloqueada tras cerrar', A.u>=1 && !(await p.$eval('#misList button:nth-child(2)',b=>b.disabled)), `desbloqueada hasta índice ${A.u}, RPG desbloqueado: ${A.rpg}`);
  // ---------- C y G: checkpoint dentro de la misión 2, cierre brusco, CONTINUAR
  await p.click('#misList button:nth-child(2)'); await p.waitForFunction(()=>window.__g.state()==='playing'&&window.__g.MIS.i===1,null,{timeout:120000});
  const ids=await ev(p,()=>[...window.__g.MIS.objs.values()].filter(o=>o.type==='cache').map(o=>o.id));
  for(const id of ids.slice(0,2)){ await ev(p,id=>{ const g=window.__g, o=g.MIS.objs.get(id); g.player.pos.set(o.pos.x+2.5,o.pos.y,o.pos.z); g.actObj(id,'h'); },id); await p.waitForFunction(n=>(window.__g.SAVE.data.checkpoint||{}).label===`EXPLOSIVO ${n}/3 COLOCADO`,ids.indexOf(id)+1,{timeout:60000}); }
  const cpBefore=await ev(p,()=>{ const d=window.__g.SAVE.data.checkpoint; return {label:d.label, mi:d.mi, x:d.player.x, z:d.player.z, planted:d.v.planted}; });
  console.log('checkpoint guardado:', cpBefore);
  // ---------- D: "apagado" brusco: matar el proceso del navegador sin cerrar la página
  try{ execSync(`pkill -9 -f "${DIR}"`); }catch(e){}
  await new Promise(r=>setTimeout(r,1500)); try{ await ctx.close(); }catch(e){}
  ({ctx,p}=await open());
  const cont=await p.isVisible('#bContinue'), ci=await p.textContent('#contInfo');
  await p.click('#bContinue'); await p.waitForFunction(()=>window.__g.state()==='playing'&&window.__g.MIS.on,null,{timeout:120000}); await p.waitForTimeout(800);
  const C=await ev(p,()=>{ const g=window.__g; return {mi:g.MIS.i, planted:g.MIS.v.planted, caches:[...g.MIS.objs.values()].filter(o=>o.type==='cache').map(o=>o.state), x:g.player.pos.x, z:g.player.pos.z, aliados:[...g.npcs.values()].filter(n=>n.ally).length}; });
  ok('C  checkpoint recuperado tras cerrar en plena misión', C.mi===1&&C.planted===2&&C.caches.filter(s=>s===1).length===2, JSON.stringify(C));
  ok('D  progreso tras apagado brusco (proceso matado)', cont&&C.mi===1, `botón CONTINUAR visible: ${cont} · "${ci}"`);
  ok('G  CONTINUAR carga la partida correcta', C.mi===cpBefore.mi&&Math.abs(C.x-cpBefore.x)<1.5&&Math.abs(C.z-cpBefore.z)<1.5, `misión ${C.mi+1}, posición (${C.x.toFixed(1)},${C.z.toFixed(1)}) vs guardada (${cpBefore.x},${cpBefore.z})`);
  // ---------- I: relaciones
  await ev(p,()=>{ window.__g.relEvent('VEGA','savedByYou'); });
  const vBefore=await ev(p,()=>JSON.stringify(window.__g.SAVE.data.squad.VEGA));
  // ---------- J: una pestaña vieja no pisa una más nueva
  const p2=await ctx.newPage(); await p2.goto(URL0); await p2.waitForFunction(()=>!document.getElementById('bSolo').disabled,null,{timeout:300000});
  const stt=q=>q.evaluate(()=>({slot:window.__g.SAVE.slot,base:window.__g.SAVE.baseSeq,locked:window.__g.SAVE.locked,top:window.__g.SAVE.readLocal(window.__g.SAVE.slot).list.map(x=>x.src+':'+x.data.seq+':'+x.data.stats.kills).join(' ')}));
  console.log('antes J  p:',JSON.stringify(await stt(p)),' p2:',JSON.stringify(await stt(p2)));
  const w2=await ev(p2,()=>{ window.__g.SAVE.data.stats.kills=777; return window.__g.SAVE.commit('pestaña2'); });
  console.log('tras p2 p:',JSON.stringify(await stt(p)),' p2:',JSON.stringify(await stt(p2)));
  const w1=await ev(p,()=>{ window.__g.SAVE.data.stats.kills=1; return window.__g.SAVE.commit('pestaña1'); });
  console.log('tras p  p:',JSON.stringify(await stt(p)));
  const stored=await ev(p2,()=>{ const r=window.__g.SAVE.readLocal(1).list[0]; return {kills:r.data.stats.kills, seq:r.data.seq}; });
  const winner=w2&&!w1?777:(!w2&&w1?1:null);
  ok('J  la partida vieja no sobrescribe la nueva', winner!==null&&stored.kills===winner, `pestaña nueva guardó: ${w2} · pestaña vieja guardó: ${w1} · guardado vigente: ${JSON.stringify(stored)} (solo una puede ganar y la que estaba atrasada fue rechazada)`);
  globalThis.WIN=winner;
  await p2.close();
  await ctx.close();
  ({ctx,p}=await open());
  const vAfter=await ev(p,()=>JSON.stringify(window.__g.SAVE.data.squad.VEGA));
  ok('I  relaciones con compañeros se conservan', vAfter===vBefore&&JSON.parse(vAfter).savedByYou>=1, vAfter);
  // ---------- H: varias partidas independientes
  await p.click('[data-slot="3"]'); await p.waitForTimeout(500);
  const s3empty=await ev(p,()=>window.__g.SAVE.data===null);
  await p.click('#bSolo'); await p.waitForFunction(()=>window.__g.state()==='playing'&&window.__g.MIS.on,null,{timeout:120000});
  await ev(p,()=>{ window.__g.SAVE.data.stats.kills=33; window.__g.SAVE.commit('h'); });
  await ctx.close(); ({ctx,p}=await open());
  const H=await ev(p,async()=>{ const g=window.__g; const out={}; for(const n of [1,3]){ await g.selectSlot(n); const d=g.SAVE.data; out[n]={done:d.campaign.completed.filter(Boolean).length, kills:d.stats.kills, cp:d.checkpoint&&d.checkpoint.mi}; } return out; });
  ok('H  partidas independientes', s3empty&&H[1].done===1&&H[3].done===0&&H[3].kills===33&&H[1].kills===globalThis.WIN, JSON.stringify(H));
  // ---------- F: guardado interrumpido / corrupción
  const F=await ev(p,async()=>{ const g=window.__g; await g.selectSlot(1); const seq=g.SAVE.data.seq; const k=n=>`oz_s1_${n}`;
    const newest=['A','B'].find(x=>{ const r=g.LS.get(k(x)); return r&&JSON.parse(r).seq===seq; });
    const good=g.LS.get(k(newest));
    g.LS.set(k('tmp'),good.slice(0,good.length/2)); g.LS.set(k(newest),good.slice(0,good.length-40)+'}'); // escritura cortada a medias
    await g.selectSlot(1); const r1={seq:g.SAVE.data&&g.SAVE.data.seq, aviso:g.SAVE.notice};
    g.LS.set(k('A'),'basura'); g.LS.set(k('B'),'{"f":"OZSAVE","body":"{}","sum":1}'); g.LS.del(k('bak'));
    await g.selectSlot(1); const r2={seq:g.SAVE.data&&g.SAVE.data.seq, aviso:g.SAVE.notice};
    const before=g.LS.get(k(['A','B'].find(x=>{ const r=g.LS.get(k(x)); try{ return JSON.parse(r).seq===g.SAVE.data.seq; }catch(e){ return false; } })||'A'));
    g.SAVE.data.campaign.unlocked=99; const wrote=g.SAVE.commit('dañado'); g.SAVE.data.campaign.unlocked=1;
    return {seq,r1,r2,rechazado:wrote===false}; });
  ok('F  recuperación tras guardado interrumpido', F.r1.seq===F.seq&&F.r2.seq===F.seq&&F.rechazado, JSON.stringify(F));
  // ---------- E: compatibilidad de versiones (actualizar el juego)
  const E=await ev(p,async()=>{ const g=window.__g;
    const v1={app:'operacion-zero',v:1,seq:5,savedAt:Date.now()-1e6,campaign:{completed:[true,true,false,false],unlocked:2,current:2},stats:{kills:120,deaths:4},settings:{name:'VIEJO'}};
    const body=JSON.stringify(v1); const crc=g.unwrapSave; // usa la misma función de suma del juego
    const raw=g.wrapSave(v1); g.LS.set('oz_s2_A',raw); g.LS.del('oz_s2_B');
    await g.selectSlot(2); const d=g.SAVE.data; const mig={v:d.v,done:d.campaign.completed,unlocked:d.campaign.unlocked,kills:d.stats.kills,rpg:d.weapons.unlocked.includes('rpg'),squad:Object.keys(d.squad)};
    const fut=JSON.parse(g.wrapSave(Object.assign(g.defaultSave(),{v:99,seq:50}))); const futRaw=JSON.stringify(fut); g.LS.set('oz_s2_B',futRaw);
    await g.selectSlot(2); const locked=g.SAVE.locked; const w=g.SAVE.commit('intento'); const intact=g.LS.get('oz_s2_B')===futRaw;
    return {mig,locked,escribio:w,futuroIntacto:intact,aviso:g.SAVE.notice}; });
  ok('E  datos de versión anterior migrados', E.mig.v===2&&E.mig.done[0]&&E.mig.done[1]&&E.mig.kills===120&&E.mig.rpg, JSON.stringify(E.mig));
  ok('E2 guardado de versión más nueva protegido', E.locked&&E.escribio===false&&E.futuroIntacto, E.aviso);
  await ctx.close();
  fs.writeFileSync(path.join(__dirname,'resultado_guardado.txt'),res.join('\n')+'\n');
})().catch(e=>{ console.log('ERROR', e); process.exit(1); });

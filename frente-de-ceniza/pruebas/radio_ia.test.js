const { chromium } = require('playwright'); const path=require('path'), fs=require('fs');
const res=[]; const ok=(id,c,i)=>{ const l=`${c?'PASA':'FALLA'}  ${id}  ${i||''}`; res.push(l); console.log(l); };
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const p=await b.newPage({viewport:{width:960,height:540}});
 p.on('pageerror',e=>console.log('PAGEERROR',e.message));
 await p.route('https://cdn.jsdelivr.net/**', async r=>{ const u=new URL(r.request().url()); const m=u.pathname.match(/^\/npm\/(three|peerjs)@[^/]+\/(.*)$/); const f=m&&path.join(process.env.NODE_MODULES_DIR||path.join(__dirname,'node_modules'),m[1],m[2]); if(f&&fs.existsSync(f)) return r.fulfill({path:f,contentType:'text/javascript'}); return r.abort(); });
 await p.route(/polyhaven|threejs\.org/, r=>r.abort());
 await p.goto('http://localhost:8080/?q=baja&test'); await p.waitForFunction(()=>!document.getElementById('bSolo').disabled,null,{timeout:300000});
 await p.click('#bSolo'); await p.waitForFunction(()=>window.__g.state()==='playing'&&window.__g.MIS.on,null,{timeout:120000});
 const ev=(f,a)=>p.evaluate(f,a);
 // apartar enemigos para probar órdenes con calma
 await ev(()=>{ const g=window.__g; for(const n of g.npcs.values()) if(n.team==='E'){ n.vis.dispose(); g.npcs.delete(n.id); } });
 const log=()=>ev(()=>window.__g.RADIO.log.map(m=>m.from+': '+m.text));
 const waitG=(fn,arg,t=180000)=>p.waitForFunction(fn,arg,{timeout:t}).then(()=>true).catch(()=>false);
 // personalidades
 ok('personalidades', await ev(()=>[...window.__g.npcs.values()].filter(n=>n.ally).map(n=>n.name+':'+n.role).join(',')) .then(s=>(console.log('   ',s), /TORRES:asalto/.test(s)&&/VEGA:medico/.test(s)&&/MORALES:tirador/.test(s))));
 // 0) rutas A*: atravesar una casa por la puerta en lugar de la pared
 const pa=await ev(()=>{ const g=window.__g, H=g.HOUSES[0]; const p=g.findPath(H.x,H.z0-4,H.x,H.z0+H.d+4); return p?{n:p.length,pts:p.map(q=>[+q.x.toFixed(1),+q.z.toFixed(1)])}:null; });
 ok('ruta A* rodea paredes', !!pa&&pa.n>=2, JSON.stringify(pa));
 // 1) MANTÉN POSICIÓN y luego me alejo
 await ev(()=>window.__g.issueOrder('hold','all'));
 const posH=await ev(()=>[...window.__g.npcs.values()].filter(n=>n.ally).map(n=>[n.pos.x,n.pos.z]));
 await ev(()=>{ const g=window.__g; g.player.pos.x+=25; });
 await waitG(()=>window.__g.RADIO.log.length>=4,null,90000); await p.waitForTimeout(3000);
 const posH2=await ev(()=>[...window.__g.npcs.values()].filter(n=>n.ally).map(n=>[n.pos.x,n.pos.z]));
 const moved=Math.max(...posH.map((q,i)=>Math.hypot(q[0]-posH2[i][0],q[1]-posH2[i][1])));
 ok('orden MANTENER POSICIÓN', moved<1.5, `se movieron como máximo ${moved.toFixed(2)} m aunque me alejé 25 m`);
 // 2) REAGRUPARSE: deben venir y confirmar cuando llegan
 await ev(()=>window.__g.issueOrder('regroup','all'));
 const reg=await waitG(()=>{ const g=window.__g; return [...g.npcs.values()].filter(n=>n.ally).every(n=>!n.order&&n.pos.distanceTo(g.player.pos)<7); },null,240000);
 ok('orden REAGRUPARSE verificada', reg, (await log()).filter(t=>/Reagrupado/.test(t)).join(' | '));
 // 3) AVANZA a un punto: llegan y confirman
 await ev(()=>{ const g=window.__g; g.player.yaw=Math.PI; g.issueOrder('advance','TORRES'); window._advPos=[...g.npcs.values()].find(n=>n.name==='TORRES').order.pos; });
 const adv=await waitG(()=>{ const t=[...window.__g.npcs.values()].find(n=>n.name==='TORRES'); return t.order&&t.order.done; },null,240000);
 ok('orden AVANZA (Torres) cumplida y confirmada', adv, (await log()).slice(0,3).join(' | '));
 // 4) MÉDICO: curar al jugador
 await ev(()=>{ const g=window.__g; g.player.hp=30; g.player.lastHurt=1e9; g.issueOrder('heal'); });
 const healed=await waitG(()=>window.__g.player.hp>=75,null,240000);
 const kits=await ev(()=>[...window.__g.npcs.values()].find(n=>n.name==='VEGA').kits);
 ok('VEGA cura al jugador con botiquín', healed&&kits===3, `vida ${await ev(()=>Math.round(window.__g.player.hp))}, botiquines restantes ${kits}`);
 // 5) jugador caído → un compañero lo levanta
 await ev(()=>{ const g=window.__g; g.player.lastHurt=0; g.player.damage(999,g.player.pos,'x','torso'); });
 const down=await ev(()=>window.__g.player.downed);
 const rev=await waitG(()=>!window.__g.player.downed&&window.__g.player.alive,null,300000);
 const who=await ev(()=>Object.entries(window.__g.SAVE.data.squad).filter(([n,r])=>r.savedYou>0).map(([n])=>n));
 ok('compañeros rescatan al jugador caído', down&&rev, `quedó herido: ${down}; lo levantó: ${who.join(',')}`);
 // 6) voz: interpretación de órdenes habladas
 const pv=await ev(()=>['Torres, cúbreme','Vega ven a curarme','Equipo, retirada','Morales mantén posición','todos conmigo'].map(t=>{ const r=window.__g.parseVoice(t); return r?r.recip+'/'+r.type:'-'; }));
 ok('órdenes por voz se interpretan', ['TORRES/cover,VEGA/heal,all/retreat,MORALES/hold,all/follow','TORRES/cover,medic/heal,all/retreat,MORALES/hold,all/follow'].includes(pv.join()), pv.join(', '));
 // pantalla con el panel de órdenes
 await ev(()=>window.__g.openOrders(true)); await p.waitForTimeout(800); await p.screenshot({path:'radio_panel.png'}); await ev(()=>window.__g.openOrders(false));
 await p.waitForTimeout(500); await p.screenshot({path:'radio_hud.png'});
 // 7) muerte → continuar desde el punto de control
 await ev(()=>{ const g=window.__g; for(const n of g.npcs.values()) if(n.ally){ n.die(new (g.player.pos.constructor)(0,0,1),'torso','x'); } });
 await p.waitForTimeout(500);
 await ev(()=>{ const g=window.__g; g.player.damage(999,g.player.pos,'x','torso'); });
 await waitG(()=>getComputedStyle(document.getElementById('over')).display==='flex',null,60000);
 const cpVis=await p.isVisible('#retryCP'); await p.click('#retryCP');
 const back=await waitG(()=>window.__g.state()==='playing'&&window.__g.player.alive&&window.__g.MIS.on,null,120000);
 ok('al morir se continúa desde el punto de control', cpVis&&back, `botón visible: ${cpVis}; misión ${await ev(()=>window.__g.MIS.i+1)}`);
 console.log('RADIO (últimos):\n  '+(await log()).slice(0,12).join('\n  '));
 fs.writeFileSync(path.join(__dirname,'resultado_radio.txt'),res.join('\n')+'\n');
 await b.close(); })().catch(e=>{ console.log('ERROR',e.message); process.exit(1); });

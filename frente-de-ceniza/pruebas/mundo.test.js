const { chromium, devices } = require('playwright'); const path=require('path'), fs=require('fs');
const res=[]; const ok=(id,c,i)=>{ const l=`${c?'PASA':'FALLA'}  ${id}  ${i||''}`; res.push(l); console.log(l); };
const route=async ctx=>{ await ctx.route('https://cdn.jsdelivr.net/**', async r=>{ const u=new URL(r.request().url()); const m=u.pathname.match(/^\/npm\/(three|peerjs)@[^/]+\/(.*)$/); const f=m&&path.join(process.env.NODE_MODULES_DIR||path.join(__dirname,'node_modules'),m[1],m[2]); if(f&&fs.existsSync(f)) return r.fulfill({path:f,contentType:'text/javascript'}); return r.abort(); }); await ctx.route(/polyhaven|threejs\.org/, r=>r.abort()); };
(async()=>{ const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:1280,height:720}}); await route(ctx); const p=await ctx.newPage(); p.on('pageerror',e=>console.log('PAGEERROR',e.message));
 await p.goto('http://localhost:8080/?q=media&test&map=nieve'); await p.waitForFunction(()=>window.__g&&!document.getElementById('bSolo').disabled,null,{timeout:400000});
 await p.waitForTimeout(2000); await p.screenshot({path:'menu_pc.png'});
 const ev=(f,a)=>p.evaluate(f,a); const waitG=(fn,a,t=200000)=>p.waitForFunction(fn,a,{timeout:t}).then(()=>true).catch(()=>false);
 await ev(()=>{ document.querySelector('.mi[data-tab=maps]').click(); document.querySelector('[data-mode="coop"]').click(); document.getElementById('bSolo').click(); });
 await waitG(()=>window.__g.state()==='playing');
 await ev(()=>{ const g=window.__g; for(const n of g.npcs.values()) if(n.team==='E'){ n.vis.dispose(); g.npcs.delete(n.id); } });
 // buscar un punto al pie de una ladera muy empinada mirando hacia arriba
 const spot=await ev(()=>{ const g=window.__g; for(let k=0;k<4000;k++){ const x=-90+Math.random()*180, z=-90+Math.random()*180; const h=g.heightAt(x,z); for(let a=0;a<6.28;a+=0.4){ const fx=-Math.sin(a), fz=-Math.cos(a); const h1=g.heightAt(x+fx*1.5,z+fz*1.5), h3=g.heightAt(x+fx*4,z+fz*4); if((h1-h)/1.5>1.1&&(h3-h)/4>1.0&&g.heightAt(x-fx,z-fz)-h<0.5&&Math.abs(g.heightAt(x+0.5,z)-g.heightAt(x-0.5,z))<0.6&&Math.abs(g.heightAt(x,z+0.5)-g.heightAt(x,z-0.5))<0.6) return {x,z,yaw:a,h}; } } return null; });
 console.log('pie de ladera:', JSON.stringify(spot));
 const place=()=>ev(s=>{ const g=window.__g; g.player.pos.set(s.x,s.h,s.z); g.player.yaw=s.yaw; g.player.pitch=0.3; g.player.vel.set(0,0,0); g.player.stamina=100; g.player.onGround=true; },spot);
 await place(); await p.keyboard.down('KeyW'); await p.waitForTimeout(4000); const y1=await ev(()=>window.__g.player.pos.y); await p.keyboard.up('KeyW');
 ok('sin escalar, la pendiente empinada frena al jugador', y1-spot.h<0.8, `subió ${(y1-spot.h).toFixed(2)} m caminando contra la pared`);
 await place(); await p.keyboard.down('KeyW'); await p.keyboard.down('Space'); await waitG(h=>window.__g.player.pos.y-h>1.5,spot.h,300000); const y2=await ev(()=>({y:window.__g.player.pos.y,st:window.__g.player.stamina})); await p.keyboard.up('Space'); await p.keyboard.up('KeyW');
 ok('manteniendo Espacio se escala gastando fuerza', y2.y-spot.h>1.2&&y2.st<100, `subió ${(y2.y-spot.h).toFixed(2)} m, fuerza ${Math.round(y2.st)}`);
 await p.screenshot({path:'escalada.png'});
 // ruta A* evita celdas empinadas
 const nav=await ev(()=>{ const g=window.__g; let blocked=0,total=0; for(let z=0;z<192;z+=3) for(let x=0;x<192;x+=3){ total++; if(g.NAV.g[z*192+x]) blocked++; } return {blocked,total}; });
 ok('la navegación marca laderas como no transitables', nav.blocked>nav.total*0.05, JSON.stringify(nav));
 // aviso con dirección
 const cs=await ev(()=>{ const g=window.__g; g.player.pos.set(0,0,0); g.player.yaw=0; return [g.clockStr({x:0,z:-40}),g.clockStr({x:30,z:0}),g.clockStr({x:0,z:25}),g.clockStr({x:-20,z:-20})]; });
 ok('avisos de dirección tipo reloj', cs[0].startsWith('a las doce')&&cs[1].startsWith('a las tres')&&cs[2].startsWith('a las seis')&&/^a las (diez|once)/.test(cs[3]), cs.join(' | '));
 // visibilidad del entorno
 const vis=await ev(()=>{ const g=window.__g; g.ENV.clima='fijo'; g.setWeather('ventisca',true); return g.WX.vis; }); await p.waitForTimeout(1500);
 const vis2=await ev(()=>window.__g.WX.vis);
 ok('el clima reduce la visibilidad de los NPC', vis2<0.5, `visibilidad con ventisca ${vis2.toFixed(2)}`);
 // misiones desde otro mapa → cambia a la zona y empieza la misión
 await ev(()=>{ window.__g.state(); }); await p.evaluate(()=>window.__g.playMission(0));
 await p.waitForURL(/map=zona/,{timeout:60000}).catch(()=>{}); await p.waitForFunction(()=>window.__g&&window.__g.MAP_ID==='zona',null,{timeout:400000}).catch(()=>{});
 const mz=await waitG(()=>window.__g.state()==='playing'&&window.__g.MIS.on&&window.__g.MIS.i===0,null,300000);
 ok('pedir una misión desde la nieve carga la zona y empieza la misión', mz, await ev(()=>window.__g.MAP_ID+' · misión '+(window.__g.MIS.i+1)));
 await ctx.close();
 // menú en teléfono
 const pc=await b.newContext({...devices['iPhone 13 landscape']}); await route(pc); const q=await pc.newPage(); q.on('pageerror',e=>console.log('PAGEERROR móvil',e.message));
 await q.goto('http://localhost:8080/?test&q=baja&map=selva'); await q.waitForFunction(()=>window.__g&&!document.getElementById('bSolo').disabled,null,{timeout:400000});
 console.log('perfil móvil:', await q.textContent('#devProfile'));
 await q.waitForTimeout(1500); await q.screenshot({path:'menu_movil.png',timeout:180000});
 await q.evaluate(()=>document.querySelector('.mi[data-tab=settings]').click()); await q.waitForTimeout(500); await q.screenshot({path:'menu_movil_ajustes.png',timeout:180000});
 await pc.close(); await b.close();
 fs.writeFileSync(path.join(__dirname,'resultado_mundo.txt'),res.join('\n')+'\n');
})().catch(e=>{ console.log('ERROR',e.message); process.exit(1); });

/* =====================================================================
   LA CIUDAD: mundo abierto. Caminas con el control, el GPS te lleva a la
   misión (súper, disco, hospital…), y puedes platicar con la gente.
   ===================================================================== */
const TS=40,BS=10,GRID=4,MAPN=GRID*BS+2;
const BLD=[];
function addB(id,name,em,places,bx,by,slot,color){const ox=2+bx*BS,oy=2+by*BS;let r,door;
  if(slot==="full"){r={x:ox,y:oy,w:8,h:8};door={x:ox+4,y:oy+8.5}}
  else if(slot==="top"){r={x:ox+.05,y:oy+.05,w:7.9,h:3.95};door={x:ox+4,y:oy-.45}}
  else{r={x:ox+.05,y:oy+4,w:7.9,h:3.95};door={x:ox+4,y:oy+8.45}}
  BLD.push({id,name,em,places,r,door,open:slot==="full",color,bx,by})}
addB("casa","Tu casa","🏠",["casa","cuarto","cocina"],0,0,"top","#E8A87C");
addB("porche","Casa de Grandma Rose","🏡",["porche","barrio"],0,0,"bottom","#C38BD9");
addB("tiendita","La Tiendita","🏪",["tiendita"],1,0,"top","#FFC857");
addB("cafe","El Café","☕",["cafe"],1,0,"bottom","#B88B65");
addB("super","Supermercado","🛒",["super","caja"],2,0,"top","#4CAF50");
addB("pizzeria","Pizzería de Tony","🍕",["pizzeria","comida"],2,0,"bottom","#E5484D");
addB("parque","El Parque","🌳",["parque"],3,0,"full","#6CC56C");
addB("banco","El Banco","🏦",["banco"],0,1,"top","#5B8DEF");
addB("ropa","Tienda de Ropa","👕",["tienda_ropa"],0,1,"bottom","#FF7EB3");
addB("oficina","La Oficina","💼",["oficina"],1,1,"top","#7E8AA2");
addB("restaurante","Restaurante Bella Notte","🍽️",["restaurante","cita"],1,1,"bottom","#9E3B5F");
addB("obra","La Obra","🏗️",["obra"],2,1,"full","#C9A050");
addB("gym","El Gym","🏋️",["gym"],3,1,"top","#3D4451");
addB("jake","Casa de Jake","🎮",["videojuegos"],3,1,"bottom","#7C4DFF");
addB("policia","Policía","🚓",["policia"],0,2,"top","#1D2554");
addB("hospital","Hospital","🏥",["hospital","doctor"],0,2,"bottom","#EDEDED");
addB("bar","Bar de Ray","🍺",["bar"],1,2,"top","#6B3A2C");
addB("antro","La Disco","🪩",["antro","fiesta"],1,2,"bottom","#3B1466");
addB("callejon","El Callejón","🌃",["calle_noche"],2,2,"top","#2E2E3A");
addB("hotel","Hotel","🏨",["hotel"],2,2,"bottom","#F5B400");
addB("cancha","La Cancha","⚽",["cancha"],3,2,"full","#3F9E4D");
addB("playa","La Playa","🏖️",["playa"],0,3,"full","#F3DDA4");
addB("estadio","El Estadio","🏟️",["estadio"],1,3,"full","#2E7D32");
addB("aeropuerto","Aeropuerto","✈️",["aeropuerto","avion"],2,3,"full","#BCC6D1");
addB("estacionamiento","Estacionamiento","🚗",["coche"],3,3,"full","#8D959E");
const B=Object.fromEntries(BLD.map(b=>[b.id,b]));
const placeBld=p=>BLD.find(b=>b.places.includes(p))||(p==="telefono"?null:B.casa);
/* dónde vive cada quien */
const HOME={rose:"porche",joe:"porche",tommy:"parque",max:"parque",marcus:"gym",jake:"jake",carlos:"casa",emily:"cafe",chloe:"antro",jasmine:"oficina",sofia:"oficina",
  linda:"oficina",mike:"obra",karen:"super",destiny:"super",ray:"bar",tony:"pizzeria",davis:"policia",brad:"cancha",nina:"aeropuerto"};

/* ---------- mapa de casillas para caminar ---------- */
const solid=(x,y)=>{if(x<0||y<0||x>=MAPN||y>=MAPN)return true;for(const b of BLD){if(b.open)continue;const r=b.r;if(x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h)return true}return false};
const WALK=[];for(let y=0;y<MAPN;y++){WALK[y]=[];for(let x=0;x<MAPN;x++)WALK[y][x]=[[.5,.5],[.2,.2],[.8,.2],[.2,.8],[.8,.8]].every(([a,b])=>!solid(x+a,y+b))}
function nearWalk(x,y){x=Math.floor(x);y=Math.floor(y);for(let r=0;r<4;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const a=x+dx,b=y+dy;if(WALK[b]&&WALK[b][a])return [a,b]}return [x,y]}
function route(sx,sy,tx,ty){[sx,sy]=nearWalk(sx,sy);tx=Math.max(0,Math.min(MAPN-1,Math.floor(tx)));ty=Math.max(0,Math.min(MAPN-1,Math.floor(ty)));
  if(!WALK[ty]||!WALK[ty][tx])return null;const prev=new Map(),q=[[sx,sy]],k=(x,y)=>y*MAPN+x;prev.set(k(sx,sy),null);
  while(q.length){const [x,y]=q.shift();if(x===tx&&y===ty)break;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=MAPN||ny>=MAPN||!WALK[ny][nx]||prev.has(k(nx,ny)))continue;prev.set(k(nx,ny),[x,y]);q.push([nx,ny])}}
  if(!prev.has(k(tx,ty)))return null;const path=[];let c=[tx,ty];while(c){path.unshift({x:c[0]+.5,y:c[1]+.5});c=prev.get(k(c[0],c[1]))}return path}

/* ---------- sprites (los mismos dibujos de los personajes) ---------- */
const SPR={};
function sprite(id,emo){const key=id+"|"+(emo||"happy");if(SPR[key])return SPR[key];const c=CH(id);let svg=personSVG(c);
  const parts="b-n b-a b-s b-u e-n e-c e-w m-n m-s m-l m-f m-o blush tears".split(" "),on=(EMOS[emo||"happy"]||EMOS.happy).split(" ");
  const css=parts.filter(x=>!on.includes(x)).map(x=>"."+x).join(",")+"{display:none}";
  svg=svg.replace("<svg ",`<svg xmlns="http://www.w3.org/2000/svg" `).replace(/>/,`><style>${css}</style>`);
  const im=new Image();im.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);SPR[key]=im;return im}

/* ---------- estado de la ciudad ---------- */
const Z=0.62;
const CITY={on:false,raf:0,last:0,px:11,py:6,vx:0,vy:0,face:1,moving:false,joy:{x:0,y:0},keys:{},npcs:[],cars:[],t:0,route:null,routeAt:0,target:null,cool:0,near:null,callAt:0,auto:false};
function cityTarget(){const m=nextMission();if(!m)return null;const b=placeBld(m.place);return {m,b,phone:!b}}
function initNPCs(){CITY.npcs=Object.entries(HOME).map(([id,h])=>{const b=B[h];const d=b.door;return {id,x:d.x+(Math.random()-.5)*2,y:d.y+(b.open?-2:0)+(Math.random()-.5),hx:d.x,hy:d.y+(b.open?-2:0),tx:d.x,ty:d.y,wait:Math.random()*3,face:1}}).filter(n=>WALK[Math.floor(n.y)]&&WALK[Math.floor(n.y)][Math.floor(n.x)]||(n.x=n.hx,n.y=n.hy,true))}
function initCars(){CITY.cars=[];const em=["🚗","🚕","🚙","🛻","🚌","🚓"];for(let i=0;i<10;i++){const horiz=i%2===0,lane=BS*(1+Math.floor(Math.random()*(GRID-1)));
  CITY.cars.push({h:horiz,x:horiz?Math.random()*MAPN:lane+(i%4<2?.5:1.5),y:horiz?lane+(i%4<2?.5:1.5):Math.random()*MAPN,d:(i%4<2?-1:1),v:2.5+Math.random()*2,em:em[i%em.length]})}}

/* ---------- pantalla ---------- */
function renderCiudad(app){
  $("#tabs").style.display="none";
  app.innerHTML=`<div id="city"><canvas id="cv"></canvas>
   <div class="hud top"><div class="obj" id="obj"></div><div class="hstats"><span class="pill p-flame">🔥${streak()}</span><span class="pill p-xp">⚡${DB.xp}</span><button class="menub" id="menub" aria-label="Menú">☰</button></div></div>
   <canvas id="mini" width="220" height="220"></canvas>
   <div class="joy" id="joy"><div class="knob" id="knob"></div></div>
   <button class="act" id="act" hidden></button>
   <div class="call" id="call" hidden></div>
   ${!KO?`<div class="cityv"><button class="vbtn" id="cvb">🎙️ ${koState==="loading"?"Descargando voces…":"Activar voces humanas"}</button></div>`:""}</div>`;
  const vb=$("#cvb");if(vb)vb.onclick=()=>{unlockAudio();vb.textContent="🎙️ Descargando voces… (90 MB)";koLoad().then(()=>{vb.remove();toast("¡Voces humanas activadas!");say("Hey Stanley! I sound way better now, right?","emily","flirty")}).catch(()=>{vb.textContent="🎙️ No se pudo: se usa la voz del teléfono"})};
  const cv=$("#cv");CITY.cv=cv;CITY.ctx=cv.getContext("2d");
  const fit=()=>{const dpr=Math.min(2,window.devicePixelRatio||1);cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;cv.style.width=innerWidth+"px";cv.style.height=innerHeight+"px";CITY.dpr=dpr};
  fit();window.onresize=fit;
  if(!CITY.npcs.length)initNPCs();if(!CITY.cars.length)initCars();
  if(DB.pos){CITY.px=DB.pos.x;CITY.py=DB.pos.y}
  bindJoy();$("#menub").onclick=()=>{go("mundos")};
  CITY.actKey=null;CITY.on=true;CITY.last=performance.now();CITY.cool=performance.now()+1200;CITY.callAt=0;cancelAnimationFrame(CITY.raf);CITY.raf=requestAnimationFrame(cityLoop);
  CITY.armed=true;const T0=cityTarget();if(T0&&T0.b&&Math.hypot(T0.b.door.x-CITY.px,T0.b.door.y-CITY.py)<1.8)CITY.armed=false;
  setObjective(true)}
function stopCity(){CITY.on=false;cancelAnimationFrame(CITY.raf);DB.pos={x:CITY.px,y:CITY.py};save()}
function setObjective(announce){const T=cityTarget();CITY.target=T;CITY.route=null;CITY.callAt=0;const o=$("#obj");if(!o)return;
  if(!T){o.innerHTML=`<b>🏆 ¡Terminaste las 100 misiones!</b><small>Pasea y platica con tu gente.</small>`;return}
  const W=WORLDS[T.m.w-1];
  o.innerHTML=`<span class="cap">Mundo ${T.m.w} · ${esc(W.t)} · misión ${T.m.o}</span><b>${T.phone?"📞 Espera una llamada… camina un poco":"🎯 Ve a: "+esc(T.b.name)+" "+T.b.em}</b><small id="dist"></small>`;
  if(announce){o.classList.remove("pop");void o.offsetWidth;o.classList.add("pop")}}
function bindJoy(){const j=$("#joy"),k=$("#knob");let id=null,cx=0,cy=0;const R=48;
  const mv=(x,y)=>{let dx=x-cx,dy=y-cy;const d=Math.hypot(dx,dy);if(d>R){dx=dx/d*R;dy=dy/d*R}k.style.transform=`translate(${dx}px,${dy}px)`;CITY.joy={x:dx/R,y:dy/R}};
  j.onpointerdown=e=>{id=e.pointerId;try{j.setPointerCapture(id)}catch(x){}const r=j.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;mv(e.clientX,e.clientY);unlockAudio()};
  j.onpointermove=e=>{if(e.pointerId===id)mv(e.clientX,e.clientY)};
  j.onpointerup=j.onpointercancel=e=>{if(e.pointerId!==id)return;id=null;k.style.transform="";CITY.joy={x:0,y:0}};
  window.onkeydown=e=>{CITY.keys[e.key.toLowerCase()]=true};window.onkeyup=e=>{CITY.keys[e.key.toLowerCase()]=false}}

/* ---------- el ciclo del juego ---------- */
function cityLoop(now){if(!CITY.on)return;const dt=Math.min(.05,(now-CITY.last)/1000);CITY.last=now;CITY.t+=dt;
  let ix=CITY.joy.x,iy=CITY.joy.y;const K=CITY.keys;if(K.arrowleft||K.a)ix=-1;if(K.arrowright||K.d)ix=1;if(K.arrowup||K.w)iy=-1;if(K.arrowdown||K.s)iy=1;
  if(CITY.auto&&CITY.route&&CITY.route.length>1){let nx=CITY.route[1];if(Math.hypot(nx.x-CITY.px,nx.y-CITY.py)<.2&&CITY.route[2])nx=CITY.route[2];const dx=nx.x-CITY.px,dy=nx.y-CITY.py,d=Math.hypot(dx,dy)||1;ix=dx/d;iy=dy/d}
  if(CITY.auto&&CITY.target&&!CITY.target.phone&&CITY.route&&CITY.route.length<=2){const d=CITY.target.b.door,dx=d.x-CITY.px,dy=d.y-CITY.py,n=Math.hypot(dx,dy)||1;ix=dx/n;iy=dy/n}
  const mag=Math.min(1,Math.hypot(ix,iy)),sp=4.4*mag;CITY.moving=mag>.15;
  if(CITY.moving){const d=Math.hypot(ix,iy)||1,vx=ix/d*sp*dt,vy=iy/d*sp*dt;const rr=.15;
    if(!solid(CITY.px+vx+Math.sign(vx)*rr,CITY.py))CITY.px+=vx;if(!solid(CITY.px,CITY.py+vy+Math.sign(vy)*rr))CITY.py+=vy;if(Math.abs(ix)>.2)CITY.face=ix<0?-1:1}
  /* gente y carros */
  CITY.npcs.forEach(n=>{if(n.wait>0){n.wait-=dt;return}const dx=n.tx-n.x,dy=n.ty-n.y,d=Math.hypot(dx,dy);
    if(d<.1){n.wait=1.5+Math.random()*3;for(let i=0;i<8;i++){const tx=n.hx+(Math.random()-.5)*5,ty=n.hy+(Math.random()-.5)*3;if(!solid(tx,ty)){n.tx=tx;n.ty=ty;break}}return}
    const s=Math.min(d,1.3*dt);n.x+=dx/d*s;n.y+=dy/d*s;if(Math.abs(dx)>.05)n.face=dx<0?-1:1});
  CITY.cars.forEach(c=>{if(c.h){c.x+=c.d*c.v*dt;if(c.x<-2)c.x=MAPN+2;if(c.x>MAPN+2)c.x=-2}else{c.y+=c.d*c.v*dt;if(c.y<-2)c.y=MAPN+2;if(c.y>MAPN+2)c.y=-2}});
  /* misión y GPS */
  const T=CITY.target;
  if(T&&!T.phone){if(!CITY.route||now-CITY.routeAt>600){CITY.route=route(CITY.px,CITY.py,T.b.door.x,T.b.door.y);CITY.routeAt=now}
    const dd=Math.hypot(T.b.door.x-CITY.px,T.b.door.y-CITY.py),de=$("#dist");if(de)de.textContent=Math.round(dd*5)+" m";
    if(dd>1.8)CITY.armed=true;
    if(dd<1.1&&CITY.armed&&now>CITY.cool){CITY.cool=now+4000;CITY.armed=false;enterMission(T.m)}}
  if(T&&T.phone){if(!CITY.callAt)CITY.callAt=now+3500;if(now>CITY.callAt&&$("#call").hidden)ringCall(T.m)}
  /* gente cerca: botón para platicar */
  let near=null,nd=1.5;CITY.npcs.forEach(n=>{const d=Math.hypot(n.x-CITY.px,n.y-CITY.py);if(d<nd){nd=d;near=n}});
  const atM=T&&!T.phone&&Math.hypot(T.b.door.x-CITY.px,T.b.door.y-CITY.py)<1.4?T.m:null,key=atM?"m:"+atM.id:near?"n:"+near.id:"";
  if(key!==CITY.actKey){CITY.actKey=key;CITY.near=atM?null:near;const a=$("#act");if(a){
    if(atM){a.hidden=false;a.innerHTML=`🎬 Empezar: ${esc(atM.t)}`;a.onclick=()=>{unlockAudio();CITY.actKey="";enterMission(atM)}}
    else if(near){a.hidden=false;a.innerHTML=`💬 Platicar con ${esc(CH(near.id).name)}`;a.onclick=()=>{unlockAudio();CITY.actKey="";freeChat(near.id)}}else a.hidden=true}}
  drawCity();drawMini();CITY.raf=requestAnimationFrame(cityLoop)}
function enterMission(m){CITY.joy={x:0,y:0};CITY.keys={};stopCity();playFrom(m,true)}
function ringCall(m){const c=$("#call");const who=m.cast.find(id=>!CH(id).dog)||m.cast[0],ch=CH(who);c.hidden=false;
  c.innerHTML=`<div class="callp">${personHTML(who,64)}</div><div style="flex:1;min-width:0"><b>📞 ${esc(ch.name)}</b><small>te está llamando…</small></div><button class="btn small" id="ans">Contestar</button>`;
  c.querySelector(".p").classList.add("e-happy");sfx("fun");setTimeout(()=>{if(!c.hidden)sfx("fun")},900);
  c.querySelector("#ans").onclick=()=>{unlockAudio();c.hidden=true;enterMission(m)}}

/* ---------- dibujo ---------- */
function drawCity(){const ctx=CITY.ctx,cv=CITY.cv,dpr=CITY.dpr,SW=cv.width/dpr,SH=cv.height/dpr,W=SW/Z,H=SH/Z;
  const camx=Math.max(0,Math.min(MAPN*TS-W,CITY.px*TS-W/2)),camy=Math.max(0,Math.min(MAPN*TS-H,CITY.py*TS-H/2));
  ctx.setTransform(dpr*Z,0,0,dpr*Z,0,0);ctx.fillStyle="#7DBE6A";ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(-camx,-camy);
  const X=x=>x*TS,vis=(x,y,w,h)=>X(x+w)>camx-40&&X(x)<camx+W+40&&X(y+h)>camy-40&&X(y)<camy+H+40;
  /* calles */
  ctx.fillStyle="#5A5F6B";for(let i=0;i<=GRID;i++){ctx.fillRect(0,X(i*BS),X(MAPN),X(2));ctx.fillRect(X(i*BS),0,X(2),X(MAPN))}
  ctx.strokeStyle="rgba(255,214,10,.8)";ctx.lineWidth=2;ctx.setLineDash([14,12]);for(let i=0;i<=GRID;i++){ctx.beginPath();ctx.moveTo(0,X(i*BS+1));ctx.lineTo(X(MAPN),X(i*BS+1));ctx.stroke();ctx.beginPath();ctx.moveTo(X(i*BS+1),0);ctx.lineTo(X(i*BS+1),X(MAPN));ctx.stroke()}ctx.setLineDash([]);
  /* banquetas */
  ctx.fillStyle="#C9CCD3";for(let by=0;by<GRID;by++)for(let bx=0;bx<GRID;bx++){const ox=X(2+bx*BS),oy=X(2+by*BS);ctx.fillRect(ox,oy,X(8),8);ctx.fillRect(ox,oy+X(8)-8,X(8),8);ctx.fillRect(ox,oy,8,X(8));ctx.fillRect(ox+X(8)-8,oy,8,X(8))}
  /* árboles de adorno en los huecos */
  ctx.font="26px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#000";
  for(let by=0;by<GRID;by++)for(let bx=0;bx<GRID;bx++){if(BLD.some(b=>b.bx===bx&&b.by===by&&b.open))continue;const ox=2+bx*BS,oy=2+by*BS;if(vis(ox,oy,8,8)){ctx.fillText("🌳",X(ox+.5),X(oy+4.1));ctx.fillText("🌳",X(ox+7.5),X(oy+4.1))}}
  /* edificios y lugares abiertos */
  BLD.forEach(b=>{const r=b.r;if(!vis(r.x,r.y,r.w,r.h))return;const x=X(r.x),y=X(r.y),w=X(r.w),h=X(r.h);
    if(b.open){openPlace(ctx,b,x,y,w,h);return}
    ctx.fillStyle="rgba(0,0,0,.25)";ctx.fillRect(x+6,y+8,w,h);ctx.fillStyle=b.color;ctx.fillRect(x,y,w,h);
    ctx.fillStyle="rgba(255,255,255,.18)";ctx.fillRect(x,y,w,10);ctx.strokeStyle="rgba(0,0,0,.25)";ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
    ctx.fillStyle="#000";ctx.font="54px sans-serif";ctx.fillText(b.em,x+w/2,y+h/2-6);label(ctx,b.name,x+w/2,y+h-12);
    const dx=X(b.door.x),dy=b.door.y<r.y?y:y+h;ctx.fillStyle="#3A2A1A";ctx.fillRect(dx-14,dy-(b.door.y<r.y?0:6),28,6)});
  /* GPS */
  const T=CITY.target;
  if(T&&!T.phone&&CITY.route){ctx.strokeStyle="rgba(124,77,255,.85)";ctx.lineWidth=8;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();CITY.route.forEach((p,i)=>i?ctx.lineTo(X(p.x),X(p.y)):ctx.moveTo(X(p.x),X(p.y)));ctx.stroke()}
  if(T&&!T.phone){const mx=X(T.b.door.x),my=X(T.b.door.y),pul=1+Math.sin(CITY.t*5)*.15;ctx.fillStyle="rgba(255,214,10,.35)";ctx.beginPath();ctx.ellipse(mx,my,34*pul,18*pul,0,0,7);ctx.fill();
    ctx.strokeStyle="#FFD60A";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#000";ctx.font="30px sans-serif";ctx.fillText("⬇️",mx,my-34+Math.sin(CITY.t*6)*5)}
  /* carros */
  ctx.fillStyle="#000";CITY.cars.forEach(c=>{if(!vis(c.x-1,c.y-1,2,2))return;ctx.save();ctx.translate(X(c.x),X(c.y));if(c.h){if(c.d>0)ctx.scale(-1,1)}else{ctx.rotate(c.d>0?-Math.PI/2:Math.PI/2)}ctx.font="34px sans-serif";ctx.fillText(c.em,0,0);ctx.restore()});
  /* gente y tú, ordenados por profundidad */
  const ppl=CITY.npcs.map(n=>({id:n.id,x:n.x,y:n.y,face:n.face,mv:n.wait<=0})).concat([{id:"stanley",x:CITY.px,y:CITY.py,face:CITY.face,mv:CITY.moving,me:true}]).sort((a,b)=>a.y-b.y);
  ppl.forEach(p=>{if(!vis(p.x-1,p.y-2,2,3))return;const c=CH(p.id),s=p.me?92:c.age<13||c.dog?64:80,bob=p.mv?Math.abs(Math.sin(CITY.t*10))*4:0,x=X(p.x),y=X(p.y);
    ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(x,y,s*.32,s*.1,0,0,7);ctx.fill();
    const im=sprite(p.id,p.me?"happy":CITY.near&&CITY.near.id===p.id?"laugh":"happy");if(im.complete){ctx.save();ctx.translate(x,y-bob);if(p.face<0)ctx.scale(-1,1);ctx.drawImage(im,-s/2,-s*1.15,s,s*1.15);ctx.restore()}
    if(!p.me)label(ctx,DB.met[p.id]?c.name:"¿?",x,y+16,p.id===(CITY.near&&CITY.near.id))});
  ctx.restore();
  /* noche: en los mundos de antro y amor */
  ctx.setTransform(dpr*Z,0,0,dpr*Z,0,0);
  if(T&&[5,6].includes(T.m.w)){ctx.fillStyle="rgba(8,6,40,.55)";ctx.fillRect(0,0,W,H);ctx.globalCompositeOperation="lighter";
    const glow=(gx,gy,r,c)=>{const g=ctx.createRadialGradient(gx,gy,0,gx,gy,r);g.addColorStop(0,c);g.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=g;ctx.fillRect(gx-r,gy-r,r*2,r*2)};
    glow(CITY.px*TS-camx,CITY.py*TS-camy-20,150,"rgba(255,220,150,.35)");BLD.forEach(b=>glow(X(b.door.x)-camx,X(b.door.y)-camy,90,b.id==="antro"?"rgba(255,0,200,.4)":"rgba(255,200,80,.18)"));ctx.globalCompositeOperation="source-over"}
  /* flecha si la misión está fuera de pantalla */
  if(T&&!T.phone){const tx=X(T.b.door.x)-camx,ty=X(T.b.door.y)-camy;if(tx<20/Z||ty<120/Z||tx>W-20/Z||ty>H-140/Z){const cx=W/2,cy=H/2,a=Math.atan2(ty-cy,tx-cx),r=Math.min(W,H)/2-56;
    ctx.save();ctx.translate(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.rotate(a);ctx.scale(1/Z,1/Z);ctx.fillStyle="#FFD60A";ctx.strokeStyle="#000";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-10,-13);ctx.lineTo(-4,0);ctx.lineTo(-10,13);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}}}
function label(ctx,t,x,y,hi){ctx.font="800 12px -apple-system,Inter,sans-serif";const w=ctx.measureText(t).width+12;ctx.fillStyle=hi?"#7C4DFF":"rgba(0,0,0,.6)";ctx.beginPath();ctx.roundRect?ctx.roundRect(x-w/2,y-9,w,18,9):ctx.rect(x-w/2,y-9,w,18);ctx.fill();ctx.fillStyle="#fff";ctx.fillText(t,x,y+.5)}
function openPlace(ctx,b,x,y,w,h){const t=CITY.t;const em=(e,ex,ey)=>{ctx.fillStyle="#000";ctx.fillText(e,ex,ey)};
  const fill=(c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};
  if(b.id==="parque"){fill("#6CC56C");ctx.fillStyle="#5EC8F0";ctx.beginPath();ctx.ellipse(x+w*.65,y+h*.35,w*.18,h*.12,0,0,7);ctx.fill();ctx.font="30px sans-serif";[["🌳",.15,.2],["🌲",.3,.7],["🌳",.8,.75],["🌸",.5,.5],["🛝",.2,.45],["⛲",.45,.2],["🦆",.66,.35]].forEach(([e,a,c])=>em(e,x+w*a,y+h*c))}
  else if(b.id==="playa"){fill("#F3DDA4");ctx.fillStyle="#3BA7E0";ctx.fillRect(x,y+h*.55,w,h*.45);ctx.strokeStyle="rgba(255,255,255,.6)";ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.beginPath();for(let k=0;k<=w;k+=10)ctx.lineTo(x+k,y+h*.6+i*24+Math.sin(k/18+t*2+i)*4);ctx.stroke()}
    ctx.font="30px sans-serif";[["🌴",.12,.2],["🌴",.85,.25],["⛱️",.45,.35],["🏐",.65,.42],["⛵",.7,.8]].forEach(([e,a,c])=>em(e,x+w*a,y+h*c))}
  else if(b.id==="estadio"||b.id==="cancha"){fill(b.id==="estadio"?"#555":"#3F9E4D");if(b.id==="estadio"){ctx.fillStyle="#2E7D32";ctx.fillRect(x+30,y+30,w-60,h-60)}ctx.strokeStyle="#fff";ctx.lineWidth=3;const m=b.id==="estadio"?40:16;ctx.strokeRect(x+m,y+m,w-2*m,h-2*m);ctx.beginPath();ctx.moveTo(x+w/2,y+m);ctx.lineTo(x+w/2,y+h-m);ctx.stroke();ctx.beginPath();ctx.arc(x+w/2,y+h/2,30,0,7);ctx.stroke();
    ctx.fillStyle="#000";ctx.font="26px sans-serif";ctx.fillText("⚽",x+w/2+Math.sin(t)*60,y+h/2+Math.cos(t*1.3)*30);if(b.id==="estadio"){ctx.fillStyle="#000";ctx.font="18px sans-serif";for(let i=0;i<14;i++)ctx.fillText("👥",x+18+i*((w-36)/13),y+14)}}
  else if(b.id==="aeropuerto"){fill("#BCC6D1");ctx.fillStyle="#444";ctx.fillRect(x+20,y+h*.45,w-40,50);ctx.strokeStyle="#fff";ctx.setLineDash([16,12]);ctx.beginPath();ctx.moveTo(x+30,y+h*.45+25);ctx.lineTo(x+w-30,y+h*.45+25);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#000";ctx.font="40px sans-serif";ctx.fillText("✈️",x+((t*40)%(w-40))+20,y+h*.45+25);ctx.font="30px sans-serif";ctx.fillText("🛫",x+w*.2,y+h*.2);ctx.fillText("🧳",x+w*.8,y+h*.2)}
  else if(b.id==="obra"){fill("#C9A050");ctx.font="34px sans-serif";[["🏗️",.3,.3],["🚜",.7,.6],["🧱",.2,.75],["🚧",.8,.2],["⛏️",.5,.55]].forEach(([e,a,c])=>em(e,x+w*a,y+h*c))}
  else if(b.id==="estacionamiento"){fill("#8D959E");ctx.strokeStyle="#fff";ctx.lineWidth=2;for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(x+i*w/6,y+10);ctx.lineTo(x+i*w/6,y+h*.4);ctx.stroke()}ctx.font="30px sans-serif";ctx.fillStyle="#000";[["🚗",.08],["🚙",.42],["🚕",.75]].forEach(([e,a])=>ctx.fillText(e,x+w*a+18,y+h*.25));ctx.fillText("🛻",x+w*.5,y+h*.7);label(ctx,"Tu carro",x+w*.5,y+h*.7+26)}
  label(ctx,b.name+" "+b.em,x+w/2,y+h-14)}
function drawMini(){const m=$("#mini");if(!m)return;const c=m.getContext("2d"),s=m.width/MAPN;c.clearRect(0,0,m.width,m.height);c.fillStyle="rgba(20,24,40,.85)";c.fillRect(0,0,m.width,m.height);
  c.fillStyle="#666";for(let i=0;i<=GRID;i++){c.fillRect(0,i*BS*s,m.width,2*s);c.fillRect(i*BS*s,0,2*s,m.height)}
  BLD.forEach(b=>{c.fillStyle=b.open?"#4E9E4E":b.color;c.fillRect(b.r.x*s,b.r.y*s,b.r.w*s,b.r.h*s)});
  const T=CITY.target;if(T&&!T.phone){c.fillStyle="#FFD60A";c.beginPath();c.arc(T.b.door.x*s,T.b.door.y*s,7+Math.sin(CITY.t*5)*2,0,7);c.fill()}
  c.fillStyle="#3557FF";c.strokeStyle="#fff";c.lineWidth=2;c.beginPath();c.arc(CITY.px*s,CITY.py*s,6,0,7);c.fill();c.stroke()}

/* ---------- platicar con la gente de la ciudad ---------- */
const GREET={first:[["Hi! I don't think we've met. I'm {n}.","¡Hola! Creo que no nos conocemos. Soy {n}."]],
  again:[["Hey Stanley! What's up?","¡Hola Stanley! ¿Qué onda?"],["Oh hey, it's you! How you doin'?","¡Ah, eres tú! ¿Cómo estás?"],["Look who it is! What's good?","¡Mira quién es! ¿Qué hay?"]],
  bye:[["Alright, gotta go. See ya!","Bueno, me tengo que ir. ¡Nos vemos!"],["Catch you later, Stanley!","¡Ahí nos vemos, Stanley!"]]};
async function freeChat(id){stopCity();const c=CH(id),bld=B[HOME[id]]||B.casa,place=bld.places[0];
  const m={id:"chat_"+id,w:0,o:0,t:"Platicando con "+c.name,place,cast:[id],steps:[],mems:[],n:"",ys:0};running=true;const t=++token;
  try{openSess(m);$("#stt").textContent="Plática libre";meet(true);setPhase("💬 "+c.name);
    const mem=(DB.mem[id]||[])[0],met=DB.met[id];
    let g=c.dog?["Woof! Woof!","(Max te trae una pelota babeada.)"]:!met?pick(GREET.first):mem&&Math.random()<.6?[`Hey Stanley! ${mem.en}`,`¡Hola Stanley! ${mem.es}`]:pick(GREET.again);
    g=[g[0].replace("{n}",c.name),g[1].replace("{n}",c.name)];if(window.W3D&&W3D.calling){W3D.calling=false;g=pick([["Hello? Oh hey, Stanley! What's up?","¿Bueno? ¡Ah, hola Stanley! ¿Qué onda?"],["Hey you! I was literally just thinking about you.","¡Hola! Justo estaba pensando en ti."],["Yo! What's good? You never call me!","¡Qué onda! ¡Nunca me llamas!"]])}
    bubble(id,g[0],g[1]);await say(g[0],id,c.dog?"happy":mem?"laugh":"happy");guard(t);
    const card=$("#scard");card.hidden=false;card.innerHTML=`<div class="who">💬 Dile lo que quieras<em>Plática libre</em></div><div class="body"><div class="es">Salúdalo, échale un piropo, pregúntale algo, dile «I don't remember»… Va a reaccionar como persona.</div></div><div class="draw">🗣️</div>`;
    for(let k=0;k<3;k++){const r=await listen(null,{wait:2600});guard(t);if(r.cmd==="repeat"||r.cmd==="slow"){await say(g[0],id);continue}if(r.cmd==="help"){feedback("fun","Prueba: «What's up?», «You look great today», «I don't remember».");k--;continue}
      const said=(r.text||"").trim();if(!said){k--;continue}bubble("stanley",said);await wait(400);
      const it=intentOf(said);let rx=await aiReaction(id,said,{en:""},null);guard(t);if(!rx)rx=reaction(id,it==="other"&&k===0?"greet":it,null);
      if(it==="compliment"||it==="flirt"||it==="love")relAdd(id,2);if(it==="insult")relAdd(id,-2);addXP(3);
      bubble(id,rx.en,rx.es);await say(rx.en,id,rx.emo);guard(t);setEmo(id,"neutral")}
    const b=pick(GREET.bye);bubble(id,b[0],b[1]);await say(b[0],id,"happy");guard(t);DB.met[id]=(DB.met[id]||0)+(met?0:1);save();await wait(700)}
  catch(e){if(e!==CANCEL)console.error(e)}finally{if(t===token)endSess()}}

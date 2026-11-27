/* =====================================================================
   HABLA CON EMILY 3D: ciudad en 3D tipo mundo abierto.
   Caminas, corres, brincas, te agachas, te subes a los carros y manejas,
   chambeas de taxista o de policía, y la gente de la ciudad te habla.
   Usa el motor de conversación de index.html (misiones, voz, micrófono).
   ===================================================================== */
import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {DRACOLoader} from './vendor/DRACOLoader.js';
import * as SkeletonUtils from './vendor/SkeletonUtils.js';
import {Sky} from './vendor/Sky.js';

const BASE=new URL('.',import.meta.url).href;
const P=72,RH=8,NC=6,SIDE=4,CITYW=P*NC;            // tamaño de cuadra, media calle, cuadras, banqueta
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,rnd=(a,b)=>a+Math.random()*(b-a);
const angLerp=(a,b,t)=>{let d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*t};
const Hm=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};

const W3D=window.W3D={on:false,ready:false,manual:false,input:{x:0,y:0},look:{x:0,y:0}};
const S={yaw:Math.PI,pitch:-.12,fp:false,crouch:false,run:false,vy:0,y:0,onGround:true,inCar:null,grab:null,locked:false,night:0,nightT:0,
  target:null,role:null,job:null,t:0,keys:{},routeAt:0,said:{},near:null,last:0,raf:0,bumpAt:0,ringAt:0,carStill:0};

/* ---------------- renderer, escena, luz ---------------- */
let renderer,scene,camera,sun,hemi,sky,pmrem,envRT,clock;
const SOLIDS=[],NPCS=[],CARS=[],LOTS={},MAT={};
function initRenderer(){
  renderer=new THREE.WebGLRenderer({antialias:(window.devicePixelRatio||1)<2,powerPreference:'high-performance',preserveDrawingBuffer:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.82;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.className='c3d';renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();try{W3D.leave()}catch(_){}toast3('El 3D se reinició');setTimeout(()=>location.reload(),900)});
  scene=new THREE.Scene();scene.fog=new THREE.Fog(0xbfd2e6,60,330);
  camera=new THREE.PerspectiveCamera(62,1,.1,1200);
  hemi=new THREE.HemisphereLight(0xdfeeff,0x6b5a48,.55);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xfff1dc,2.6);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  const sc=sun.shadow.camera;sc.left=-45;sc.right=45;sc.top=45;sc.bottom=-45;sc.near=1;sc.far=260;sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;
  scene.add(sun,sun.target);
  sky=new Sky();sky.scale.setScalar(4000);scene.add(sky);
  const u=sky.material.uniforms;u.turbidity.value=6;u.rayleigh.value=1.6;u.mieCoefficient.value=.004;u.mieDirectionalG.value=.82;
  pmrem=new THREE.PMREMGenerator(renderer);clock=new THREE.Clock();
  setTime(0,true);
}
const SUNV=new THREE.Vector3();
function setTime(n,now){S.nightT=n;if(now)S.night=n;applyTime()}
function applyTime(){const n=S.night,u=sky.material.uniforms;
  const el=lerp(38,-4,n),az=lerp(200,250,n);SUNV.setFromSphericalCoords(1,THREE.MathUtils.degToRad(90-el),THREE.MathUtils.degToRad(az));u.sunPosition.value.copy(SUNV);
  u.rayleigh.value=lerp(1.6,.4,n);u.turbidity.value=lerp(6,10,n);
  sun.intensity=lerp(2.6,.05,n);sun.color.setHSL(lerp(.1,.62,n),lerp(.5,.3,n),lerp(.92,.7,n));
  hemi.intensity=lerp(.55,.12,n);hemi.color.setHSL(lerp(.58,.65,n),.4,lerp(.92,.4,n));
  renderer.toneMappingExposure=lerp(.82,1.25,n);
  scene.fog.color.setHSL(lerp(.58,.66,n),lerp(.35,.4,n),lerp(.82,.07,n));scene.fog.near=lerp(60,25,n);scene.fog.far=lerp(330,220,n);
  if(MAT.win)MAT.win.forEach(m=>m.emissiveIntensity=lerp(0,1.25,n));
  if(MAT.store)MAT.store.forEach(m=>m.emissiveIntensity=lerp(0,.55,n));if(MAT.glow)MAT.glow.forEach(m=>m.emissiveIntensity=lerp(.35,2.2,n));
  if(MAT.lampPool)MAT.lampPool.opacity=lerp(0,.55,n);
  if(!applyTime.env||Math.abs(applyTime.env-n)>.08||n===0||n===1){applyTime.env=n+1e-6;
    if(n!==S.nightT&&!(n===0||n===1))return;const tmp=applyTime.tmp||(applyTime.tmp=new THREE.Scene());const s2=applyTime.s2||(applyTime.s2=new Sky());s2.scale.setScalar(1000);Object.keys(u).forEach(k=>s2.material.uniforms[k].value=u[k].value.clone?u[k].value.clone():u[k].value);tmp.add(s2);
    if(envRT)envRT.dispose();envRT=pmrem.fromScene(tmp,.02);scene.environment=envRT.texture;scene.environmentIntensity=lerp(.9,.25,n)}}

/* ---------------- texturas hechas a mano (canvas) ---------------- */
function cnv(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c}
function tex(c,rx,ry,srgb=true){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx||1,ry||1);t.anisotropy=8;if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t}
function noise(g,w,h,a,base){const id=g.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){const n=(Math.random()-.5)*a;d[i]+=n;d[i+1]+=n;d[i+2]+=n}g.putImageData(id,0,0)}
function groundTex(){const N=1024,k=N/P;return cnv(N,N,(g)=>{
  g.fillStyle='#3a3c40';g.fillRect(0,0,N,N);noise(g,N,N,26);
  for(let i=0;i<260;i++){g.fillStyle=`rgba(${Math.random()<.5?20:70},${Math.random()<.5?20:70},${Math.random()<.5?24:74},.12)`;g.beginPath();g.ellipse(Math.random()*N,Math.random()*N,rnd(4,30),rnd(3,16),Math.random()*3,0,7);g.fill()}
  g.fillStyle='#e8c33a';const dash=(x0,y0,x1,y1)=>{g.fillRect(x0,y0,x1-x0,y1-y0)};
  for(let s=RH+10;s<P-RH-6;s+=6){dash(s*k,-.12*k,(s+3)*k,.12*k);dash(s*k,N-.12*k,(s+3)*k,N+.12*k);dash(-.12*k,s*k,.12*k,(s+3)*k);dash(N-.12*k,s*k,N+.12*k,(s+3)*k)}
  g.fillStyle='rgba(235,235,235,.85)';
  for(let s=-RH+1;s<RH-1;s+=1.4){const a=(s+.0)*k;[[RH+1,RH+4]].forEach(([u0,u1])=>{
    g.fillRect(u0*k,a+0,(u1-u0)*k,.7*k);g.fillRect(N-u1*k,a+0,(u1-u0)*k,.7*k);g.fillRect(a,u0*k,.7*k,(u1-u0)*k);g.fillRect(a,N-u1*k,.7*k,(u1-u0)*k);
    g.fillRect(u0*k,N+a,(u1-u0)*k,.7*k);g.fillRect(N-u1*k,N+a,(u1-u0)*k,.7*k);g.fillRect(N+a,u0*k,.7*k,(u1-u0)*k);g.fillRect(N+a,N-u1*k,.7*k,(u1-u0)*k)})}
  g.fillStyle='rgba(235,235,235,.6)';g.fillRect(RH*k-.25*k,0,.18*k,N);g.fillRect(N-RH*k+.07*k,0,.18*k,N);g.fillRect(0,RH*k-.25*k,N,.18*k);g.fillRect(0,N-RH*k+.07*k,N,.18*k)})}
function concreteTex(){return cnv(256,256,(g,w,h)=>{g.fillStyle='#a9a69f';g.fillRect(0,0,w,h);noise(g,w,h,22);g.strokeStyle='rgba(60,60,60,.35)';g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,h);g.stroke();g.beginPath();g.moveTo(0,i*64);g.lineTo(w,i*64);g.stroke()}})}
function grassTex(){return cnv(256,256,(g,w,h)=>{g.fillStyle='#4f7a34';g.fillRect(0,0,w,h);for(let i=0;i<5000;i++){g.fillStyle=`hsl(${rnd(80,110)},${rnd(35,55)}%,${rnd(22,40)}%)`;g.fillRect(Math.random()*w,Math.random()*h,1.5,rnd(2,5))}})}
function sandTex(){return cnv(256,256,(g,w,h)=>{g.fillStyle='#d9c08c';g.fillRect(0,0,w,h);noise(g,w,h,30)})}
const FAC=[{n:'glass',bg:'#2b3a4a',win:'#6f9cc4',frame:'#1d2630',metal:.55,rough:.25,cols:4,rows:8},{n:'office',bg:'#9a9890',win:'#2f3a44',frame:'#7d7b74',metal:.1,rough:.8,cols:4,rows:8},
  {n:'brick',bg:'#8a4433',win:'#2c3136',frame:'#d9d2c4',metal:0,rough:.9,cols:4,rows:8,brick:true},{n:'beige',bg:'#cdbb9b',win:'#33404a',frame:'#efe6d4',metal:0,rough:.85,cols:4,rows:8}];
function facadeMats(f,tint){const W=256,H=512,cw=W/f.cols,rh=H/f.rows,lit=[];
  const col=cnv(W,H,(g)=>{g.fillStyle=tint||f.bg;g.fillRect(0,0,W,H);
    if(f.brick){g.fillStyle='rgba(40,15,10,.25)';for(let y=0;y<H;y+=6)for(let x=(y/6)%2?0:6;x<W;x+=12)g.fillRect(x,y,11,1)}noise(g,W,H,18);
    for(let r=0;r<f.rows;r++)for(let c=0;c<f.cols;c++){const x=c*cw+cw*.16,y=r*rh+rh*.18,w=cw*.68,h=rh*.6;g.fillStyle=f.frame;g.fillRect(x-3,y-3,w+6,h+6);
      const gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,f.win);gr.addColorStop(1,'#0e141a');g.fillStyle=gr;g.fillRect(x,y,w,h);
      g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x,y,w*.35,h);lit.push([x,y,w,h,Math.random()<.42])}});
  const em=cnv(W,H,(g)=>{g.fillStyle='#000';g.fillRect(0,0,W,H);lit.forEach(([x,y,w,h,on])=>{if(on){g.fillStyle=`hsl(${rnd(35,50)},80%,${rnd(55,72)}%)`;g.fillRect(x,y,w,h)}})});
  const m=new THREE.MeshStandardMaterial({map:tex(col),emissiveMap:tex(em),emissive:0xffffff,emissiveIntensity:0,metalness:f.metal,roughness:f.rough});
  (MAT.win=MAT.win||[]).push(m);return m}
function boxUV(geo,w,h,d,tw,th){const uv=geo.attributes.uv;for(let f=0;f<6;f++){const fw=f<2?d:w,fh=f===2||f===3?d:h;for(let i=0;i<4;i++){const k=f*4+i;uv.setXY(k,uv.getX(k)*fw/tw,uv.getY(k)*fh/th)}}uv.needsUpdate=true;return geo}

/* ---------------- la ciudad ---------------- */
const lotOf=(bx,by,slot)=>{const ci=bx+1,cj=by+1,x0=ci*P+RH+SIDE,z0=cj*P+RH+SIDE,s=P-2*RH-2*SIDE;
  if(slot==='full')return {x0,z0,x1:x0+s,z1:z0+s,door:{x:x0+s/2,z:z0+s-5},face:0,open:true};
  if(slot==='top')return {x0:x0+2,z0:z0+1,x1:x0+s-2,z1:z0+s/2-2,door:{x:x0+s/2,z:z0-1.6},face:Math.PI};
  return {x0:x0+2,z0:z0+s/2+2,x1:x0+s-2,z1:z0+s-1,door:{x:x0+s/2,z:z0+s+1.6},face:0}};
const LH={casa:9,porche:8,tiendita:7,cafe:8,super:10,pizzeria:8,banco:22,ropa:12,oficina:58,restaurante:10,gym:12,jake:14,policia:16,hospital:34,bar:9,antro:13,callejon:26,hotel:64};
const SIGN={casa:'HOME',porche:"ROSE'S",tiendita:'CORNER STORE',cafe:'COFFEE',super:'SUPERMARKET',pizzeria:"TONY'S PIZZA",banco:'BANK',ropa:'FASHION',oficina:'OFFICES',restaurante:'BELLA NOTTE',
  gym:'IRON GYM',jake:'GAME ROOM',policia:'POLICE',hospital:'HOSPITAL',bar:"RAY'S BAR",antro:'CLUB NEON',callejon:'APARTMENTS',hotel:'HOTEL',parque:'PARK',obra:'CONSTRUCTION',cancha:'SOCCER',playa:'BEACH',estadio:'STADIUM',aeropuerto:'AIRPORT',estacionamiento:'PARKING'};
function signMat(text,color,neon){const c=cnv(512,96,(g,w,h)=>{g.fillStyle=neon?'#0b0b12':'#111';g.fillRect(0,0,w,h);g.font='900 58px -apple-system,Helvetica,Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';
    g.shadowColor=color;g.shadowBlur=neon?22:8;g.fillStyle=neon?color:'#fff';g.fillText(text,w/2,h/2+3)});
  const m=new THREE.MeshStandardMaterial({map:tex(c),emissiveMap:tex(c),emissive:0xffffff,emissiveIntensity:.35,roughness:.5});(MAT.glow=MAT.glow||[]).push(m);return m}
function storeMat(color){const c=cnv(512,128,(g,w,h)=>{g.fillStyle=color;g.fillRect(0,0,w,h);noise(g,w,h,14);for(let i=0;i<5;i++){if(i===2){g.fillStyle='#1b1d20';g.fillRect(i*102+20,26,62,102);g.fillStyle='rgba(255,230,170,.55)';g.fillRect(i*102+26,32,50,96);continue}
  const gr=g.createLinearGradient(0,20,0,128);gr.addColorStop(0,'#bcd6e8');gr.addColorStop(1,'#33475a');g.fillStyle=gr;g.fillRect(i*102+8,22,86,90);g.fillStyle='rgba(255,255,255,.25)';g.fillRect(i*102+8,22,22,90)}});
  const e=cnv(512,128,(g,w,h)=>{g.fillStyle='#000';g.fillRect(0,0,w,h);g.fillStyle='#ffd9a0';for(let i=0;i<5;i++)g.fillRect(i*102+8,22,86,104)});
  const m=new THREE.MeshStandardMaterial({map:tex(c),emissiveMap:tex(e),emissive:0xffb070,emissiveIntensity:0,roughness:.35,metalness:.2});(MAT.store=MAT.store||[]).push(m);return m}
function addSolid(x0,z0,x1,z1,h){SOLIDS.push({x0,z0,x1,z1,h:h||10})}
function building(x0,z0,x1,z1,h,mat,roof){const w=x1-x0,d=z1-z0,geo=boxUV(new THREE.BoxGeometry(w,h,d),w,h,d,12,28);
  const mesh=new THREE.Mesh(geo,[mat,mat,roof,roof,mat,mat]);mesh.position.set((x0+x1)/2,h/2,(z0+z1)/2);mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);addSolid(x0,z0,x1,z1,h);return mesh}
let TREEG,TREEM,TRUNKG,TRUNKM;
const TREES=[],LAMPS=[];
function treeAt(x,z,s){TREES.push([x,z,s||rnd(.8,1.3)])}
function buildCity(){
  const gt=tex(groundTex(),NC+2,NC+2);gt.offset.set(0,0);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(P*(NC+2),P*(NC+2)),new THREE.MeshStandardMaterial({map:gt,roughness:.92,metalness:0}));
  ground.rotation.x=-Math.PI/2;ground.position.set(P*NC/2,0,P*NC/2);ground.receiveShadow=true;scene.add(ground);
  // repeat must line up with road centers at k*P
  gt.repeat.set(NC+2,NC+2);gt.offset.set(0,0);
  const far=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000),new THREE.MeshStandardMaterial({map:tex(grassTex(),600,600),roughness:1}));far.rotation.x=-Math.PI/2;far.position.y=-.05;scene.add(far);
  const concrete=tex(concreteTex(),1,1),side=new THREE.MeshStandardMaterial({map:concrete,roughness:.95});
  const roofM=new THREE.MeshStandardMaterial({color:0x55575c,roughness:.95});
  FAC.forEach(f=>MAT[f.n]=facadeMats(f));
  MAT.grass=new THREE.MeshStandardMaterial({map:tex(grassTex(),10,10),roughness:1});MAT.sand=new THREE.MeshStandardMaterial({map:tex(sandTex(),10,10),roughness:1});
  for(let ci=0;ci<NC;ci++)for(let cj=0;cj<NC;cj++){const x0=ci*P+RH,z0=cj*P+RH,s=P-2*RH;
    const g=new THREE.BoxGeometry(s,.16,s);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*s/4,uv.getY(i)*s/4);
    const sw=new THREE.Mesh(g,side);sw.position.set(x0+s/2,.08,z0+s/2);sw.receiveShadow=true;scene.add(sw);
    [[x0+2,z0+2],[x0+s-2,z0+2],[x0+2,z0+s-2],[x0+s-2,z0+s-2]].forEach(([x,z])=>LAMPS.push([x,z]));
    for(let k=8;k<s-6;k+=14){treeAt(x0+1.6,z0+k);treeAt(x0+s-1.6,z0+k+7)}
    const inner=!(ci===0||cj===0||ci===NC-1||cj===NC-1);
    if(!inner){const r=Hm(ci+'_'+cj),n=1+r%3;const ix0=x0+SIDE,iz0=z0+SIDE,is=s-2*SIDE;
      for(let k=0;k<n;k++){const f=FAC[(r+k)%FAC.length],w=is/n;const h=f.n==='glass'?rnd(55,120):rnd(24,60);building(ix0+k*w+1,iz0+1,ix0+(k+1)*w-1,iz0+is-1,h,MAT[f.n],roofM)}}}
  // los lugares de las misiones
  (typeof BLD!=='undefined'?BLD:[]).forEach(b=>{const slot=b.open?'full':(b.r.y-(2+b.by*BSZ())<1?'top':'bottom');const L=lotOf(b.bx,b.by,slot);L.b=b;LOTS[b.id]=L;
    if(!L.open){const h=LH[b.id]||12,f=b.id==='hotel'||b.id==='oficina'||b.id==='banco'?FAC[0]:b.id==='hospital'||b.id==='policia'?FAC[1]:['casa','porche','jake','bar','callejon'].includes(b.id)?FAC[2]:FAC[3];
      const m=facadeMats(f,['casa','porche','jake','tiendita','cafe','pizzeria','gym','antro','ropa','restaurante','super'].includes(b.id)?shade(b.color):null);
      building(L.x0,L.z0,L.x1,L.z1,h,m,roofM);
      const front=L.face===0?L.z1:L.z0,dir=L.face===0?1:-1,w=L.x1-L.x0;
      const st=new THREE.Mesh(new THREE.BoxGeometry(w-2,4.4,.6),storeMat(shade(b.color,.75)));st.position.set((L.x0+L.x1)/2,2.2,front+dir*.3);st.rotation.y=L.face;st.castShadow=true;scene.add(st);
      const neon=['antro','bar','callejon','hotel','pizzeria','cafe'].includes(b.id);
      const sg=new THREE.Mesh(new THREE.BoxGeometry(Math.min(w-4,14),2.2,.35),signMat(SIGN[b.id]||b.name.toUpperCase(),neon?(b.id==='antro'?'#ff3df0':'#ffb648'):'#fff',neon));
      sg.position.set((L.x0+L.x1)/2,5.6,front+dir*.5);sg.rotation.y=L.face;scene.add(sg);
      const aw=new THREE.Mesh(new THREE.BoxGeometry(w-1,.18,2.2),new THREE.MeshStandardMaterial({color:new THREE.Color(b.color).multiplyScalar(.8),roughness:.7}));aw.position.set((L.x0+L.x1)/2,4.55,front+dir*1.1);aw.castShadow=true;scene.add(aw);
      if(b.id==='hospital'){const cr=new THREE.MeshStandardMaterial({color:0xff2a2a,emissive:0xff2020,emissiveIntensity:.6});MAT.glow.push(cr);[[6,1.6],[1.6,6]].forEach(([a,c])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a,c,.4),cr);m.position.set((L.x0+L.x1)/2,h-5,front+dir*.25);scene.add(m)})}
      if(b.id==='antro'){const nm=new THREE.MeshStandardMaterial({color:0x6a00ff,emissive:0xb000ff,emissiveIntensity:.5});MAT.glow.push(nm);const m=new THREE.Mesh(new THREE.BoxGeometry(w-1,.3,.3),nm);m.position.set((L.x0+L.x1)/2,h-.4,front+dir*.2);scene.add(m)}}
    else openLot(b.id,L)});
  // árboles y postes (instanciados para que corra fluido en el iPhone)
  const tg=new THREE.IcosahedronGeometry(2.1,1),tm=new THREE.MeshStandardMaterial({color:0x3f6b2c,roughness:.9,flatShading:true}),
        kg=new THREE.CylinderGeometry(.16,.24,3,6),km=new THREE.MeshStandardMaterial({color:0x5a4030,roughness:1});
  const ti=new THREE.InstancedMesh(tg,tm,TREES.length),ki=new THREE.InstancedMesh(kg,km,TREES.length),M4=new THREE.Matrix4(),Q=new THREE.Quaternion(),V=new THREE.Vector3();
  TREES.forEach(([x,z,s],i)=>{ki.setMatrixAt(i,M4.compose(V.set(x,1.5*s+.15,z),Q.identity(),new THREE.Vector3(s,s,s)));
    Q.setFromEuler(new THREE.Euler(rnd(0,1),rnd(0,6),0));ti.setMatrixAt(i,M4.compose(V.set(x,3.6*s+.15,z),Q,new THREE.Vector3(s*rnd(.9,1.2),s*rnd(.95,1.3),s*rnd(.9,1.2))));
    ti.setColorAt(i,new THREE.Color().setHSL(rnd(.22,.3),rnd(.35,.55),rnd(.2,.32)))});
  ti.castShadow=ki.castShadow=true;scene.add(ti,ki);
  const pg=new THREE.CylinderGeometry(.08,.11,6,6),pm=new THREE.MeshStandardMaterial({color:0x2c2f33,metalness:.6,roughness:.4}),
        hg=new THREE.BoxGeometry(.5,.18,1.1),hm=new THREE.MeshStandardMaterial({color:0xfff3c4,emissive:0xffe2a0,emissiveIntensity:.3});MAT.glow.push(hm);
  const pi=new THREE.InstancedMesh(pg,pm,LAMPS.length),hi=new THREE.InstancedMesh(hg,hm,LAMPS.length);
  MAT.lampPool=new THREE.MeshBasicMaterial({color:0xffd59a,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
  const li=new THREE.InstancedMesh(new THREE.CircleGeometry(5,20),MAT.lampPool,LAMPS.length);
  LAMPS.forEach(([x,z],i)=>{pi.setMatrixAt(i,M4.compose(V.set(x,3.15,z),Q.identity(),new THREE.Vector3(1,1,1)));hi.setMatrixAt(i,M4.compose(V.set(x,6.1,z),Q.identity(),new THREE.Vector3(1,1,1)));
    li.setMatrixAt(i,M4.compose(V.set(x,.2,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,0)),new THREE.Vector3(1,1,1)))});
  pi.castShadow=true;scene.add(pi,hi,li);
  // marcador de misión (como el cilindro amarillo)
  const mk=new THREE.Group();const cyl=new THREE.Mesh(new THREE.CylinderGeometry(1.3,1.3,2.2,32,1,true),new THREE.MeshBasicMaterial({color:0xffd23a,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));cyl.position.y=1.1;
  const ar=new THREE.Mesh(new THREE.ConeGeometry(.5,1,4),new THREE.MeshStandardMaterial({color:0xffd23a,emissive:0xffb000,emissiveIntensity:.8}));ar.rotation.x=Math.PI;ar.position.y=3.4;mk.add(cyl,ar);mk.userData.ar=ar;
  scene.add(mk);W3D.marker=mk;
  const rib=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0xc94dff,transparent:true,opacity:.8,depthWrite:false}));rib.renderOrder=2;scene.add(rib);W3D.ribbon=rib;
}
const BSZ=()=>typeof BS!=='undefined'?BS:10;
function shade(hex,k){const c=new THREE.Color(hex);if(k)c.multiplyScalar(k);else c.lerp(new THREE.Color(0x9a9a9a),.35);return '#'+c.getHexString()}
function openLot(id,L){const w=L.x1-L.x0,d=L.z1-L.z0,cx=(L.x0+L.x1)/2,cz=(L.z0+L.z1)/2;
  const flat=(mat,y=.17)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(cx,y,cz);m.receiveShadow=true;scene.add(m);return m};
  if(id==='parque'){flat(MAT.grass);for(let i=0;i<22;i++)treeAt(rnd(L.x0+3,L.x1-3),rnd(L.z0+3,L.z1-8));
    const pond=new THREE.Mesh(new THREE.CircleGeometry(6,32),new THREE.MeshStandardMaterial({color:0x2d6b8a,metalness:.3,roughness:.08}));pond.rotation.x=-Math.PI/2;pond.position.set(cx-8,.19,cz-6);scene.add(pond)}
  else if(id==='cancha'){const c=cnv(512,512,(g,W,H)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#3f8f3a':'#479c41';g.fillRect(0,i*H/8,W,H/8)}g.strokeStyle='#fff';g.lineWidth=6;g.strokeRect(20,20,W-40,H-40);g.beginPath();g.moveTo(20,H/2);g.lineTo(W-20,H/2);g.stroke();g.beginPath();g.arc(W/2,H/2,60,0,7);g.stroke();g.strokeRect(W/2-90,20,180,80);g.strokeRect(W/2-90,H-100,180,80)});
    flat(new THREE.MeshStandardMaterial({map:tex(c),roughness:.95}));const gm=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.4});
    [L.z0+3,L.z1-3].forEach(z=>{[-3.6,3.6].forEach(dx=>{const p=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,2.4),gm);p.position.set(cx+dx,1.2,z);p.castShadow=true;scene.add(p)});const t=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,7.2),gm);t.rotation.z=Math.PI/2;t.position.set(cx,2.4,z);scene.add(t)})}
  else if(id==='playa'){flat(MAT.sand);const sea=new THREE.Mesh(new THREE.PlaneGeometry(w,d*.45),new THREE.MeshStandardMaterial({color:0x1f6f99,metalness:.2,roughness:.05,transparent:true,opacity:.92}));sea.rotation.x=-Math.PI/2;sea.position.set(cx,.22,L.z0+d*.22);scene.add(sea);W3D.sea=sea;
    for(let i=0;i<6;i++){const u=new THREE.Mesh(new THREE.ConeGeometry(1.4,.8,12),new THREE.MeshStandardMaterial({color:[0xff5a5a,0x3d8bff,0xffd23a][i%3]}));u.position.set(L.x0+5+i*7,2.6,cz+6);const st=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,2.6),new THREE.MeshStandardMaterial({color:0xeeeeee}));st.position.set(u.position.x,1.3,u.position.z);u.castShadow=true;scene.add(u,st)}}
  else if(id==='estadio'){flat(MAT.grass);const st=new THREE.Mesh(new THREE.CylinderGeometry(19,21,15,40,1,true),new THREE.MeshStandardMaterial({color:0xd8dde3,roughness:.6,side:THREE.DoubleSide}));st.position.set(cx,7.5,cz-3);st.castShadow=true;scene.add(st);addSolid(cx-20,cz-24,cx+20,cz+17,15);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(20,.7,8,40),signMat('STADIUM','#3df',true));rim.rotation.x=Math.PI/2;rim.position.set(cx,15,cz-3);scene.add(rim)}
  else if(id==='aeropuerto'){const c=cnv(256,512,(g,W,H)=>{g.fillStyle='#4a4d52';g.fillRect(0,0,W,H);noise(g,W,H,16);g.fillStyle='#fff';for(let y=10;y<H;y+=40)g.fillRect(W/2-3,y,6,22)});
    const rw=new THREE.Mesh(new THREE.PlaneGeometry(12,d),new THREE.MeshStandardMaterial({map:tex(c),roughness:.9}));rw.rotation.x=-Math.PI/2;rw.position.set(L.x0+8,.18,cz);scene.add(rw);
    building(L.x0+18,L.z0+6,L.x1-2,L.z0+24,11,MAT.glass,new THREE.MeshStandardMaterial({color:0x777777}));const tw=new THREE.Mesh(new THREE.CylinderGeometry(1.6,2,22,12),new THREE.MeshStandardMaterial({color:0xdddddd}));tw.position.set(L.x1-6,11,L.z0+30);scene.add(tw);addSolid(L.x1-8,L.z0+28,L.x1-4,L.z0+32,22)}
  else if(id==='obra'){flat(MAT.sand,.18);const sm=new THREE.MeshStandardMaterial({color:0x9a9a9a,roughness:.9}),ym=new THREE.MeshStandardMaterial({color:0xf2b705,roughness:.5,metalness:.3});
    building(L.x0+4,L.z0+4,L.x0+22,L.z0+20,14,sm,sm);const mast=new THREE.Mesh(new THREE.BoxGeometry(1.4,34,1.4),ym);mast.position.set(L.x1-8,17,L.z0+8);mast.castShadow=true;const jib=new THREE.Mesh(new THREE.BoxGeometry(30,1.2,1.2),ym);jib.position.set(L.x1-14,33,L.z0+8);jib.castShadow=true;scene.add(mast,jib);addSolid(L.x1-9,L.z0+7,L.x1-7,L.z0+9,34)}
  else if(id==='estacionamiento'){const c=cnv(256,256,(g,W,H)=>{g.fillStyle='#45484c';g.fillRect(0,0,W,H);noise(g,W,H,16);g.fillStyle='#eee';for(let x=0;x<W;x+=32){g.fillRect(x,0,3,90);g.fillRect(x,H-90,3,90)}});flat(new THREE.MeshStandardMaterial({map:tex(c,2,2),roughness:.9}))}
}

/* ---------------- personas ---------------- */
const loader=new GLTFLoader(),draco=new DRACOLoader();draco.setDecoderPath(BASE+'vendor/draco/');loader.setDRACOLoader(draco);
const MODELS={};let CLIPS={};
function hipsBone(root){let h=null;root.traverse(o=>{if(!h&&o.isBone&&/Hips$/.test(o.name))h=o});return h}
function hipsY(root){const h=hipsBone(root);return h?h.position.y:1}
/* pasa una animación de un modelo a otro (los dos son Mixamo, pero el «papá» de la cadera puede estar girado o escalado distinto) */
function retarget(clip,srcRoot,root,noHips){const bones=new Set();root.traverse(o=>{if(o.isBone)bones.add(o.name)});
  srcRoot.updateMatrixWorld(true);root.updateMatrixWorld(true);const hs=hipsBone(srcRoot),ht=hipsBone(root);
  const Ps=new THREE.Quaternion(),Pt=new THREE.Quaternion();hs.parent.getWorldQuaternion(Ps);ht.parent.getWorldQuaternion(Pt);
  const Ms=hs.parent.matrixWorld.clone(),Mt=ht.parent.matrixWorld.clone(),iMt=Mt.clone().invert();
  const ws=new THREE.Vector3().setFromMatrixPosition(hs.matrixWorld),wt=new THREE.Vector3().setFromMatrixPosition(ht.matrixWorld);
  const bs=new THREE.Box3().setFromObject(srcRoot),bt=new THREE.Box3().setFromObject(root);const k=(bt.max.y-bt.min.y)/((bs.max.y-bs.min.y)||1);
  /* qt = Pt⁻¹·Ps·qs·Hs⁻¹·Ps⁻¹·Pt·Ht  (mismo giro en el mundo, respetando la pose de descanso de cada cadera) */
  const L=Pt.clone().invert().multiply(Ps),Rr=hs.quaternion.clone().invert().multiply(Ps.clone().invert()).multiply(Pt).multiply(ht.quaternion),q=new THREE.Quaternion(),v=new THREE.Vector3();
  const tr=clip.tracks.filter(t=>bones.has(t.name.split('.')[0])).map(t=>{const hip=/Hips\.(quaternion|position)$/.test(t.name);
    if(hip&&noHips)return null;
    if(/Hips\.quaternion$/.test(t.name)){const c=t.clone();for(let i=0;i<c.values.length;i+=4){q.fromArray(c.values,i);q.premultiply(L).multiply(Rr);q.toArray(c.values,i)}return c}
    if(/Hips\.position$/.test(t.name)){const c=t.clone();for(let i=0;i<c.values.length;i+=3){v.fromArray(c.values,i).applyMatrix4(Ms).multiplyScalar(k).applyMatrix4(iMt);v.toArray(c.values,i)}return c}
    if(/\.position$/.test(t.name)||/\.scale$/.test(t.name))return null;return t}).filter(Boolean);
  return new THREE.AnimationClip(clip.name,clip.duration,tr,clip.blendMode)}
async function loadModels(onp){const files=[['xbot','Xbot.glb'],['m','Soldier.glb'],['f','Michelle.glb'],['car','ferrari.glb']];let done=0;
  await Promise.all(files.map(async([k,f])=>{const g=await loader.loadAsync(BASE+'modelos/'+f,e=>{});MODELS[k]=g;done++;onp(done/files.length)}));
  const xb=MODELS.xbot;const add=new Set(['agree','headShake','sad_pose','sneak_pose']);
  ['m','f'].forEach(k=>{const root=MODELS[k].scene;CLIPS[k]={};
    const skm=o=>{let r=null;o.traverse(x=>{if(!r&&x.isSkinnedMesh)r=x});return r};
    const rt=(c0)=>{if(k==='m')return retarget(c0,xb.scene,root,add.has(c0.name));
      const tm=skm(root),sm=skm(xb.scene);const snap=[];[root,xb.scene].forEach(r=>r.traverse(o=>snap.push([o,o.position.clone(),o.quaternion.clone(),o.scale.clone()])));const c=SkeletonUtils.retargetClip(tm,sm,c0,{hip:'mixamorigHips',fps:24});c.name=c0.name;snap.forEach(([o,p,q,sc])=>{o.position.copy(p);o.quaternion.copy(q);o.scale.copy(sc)});root.updateMatrixWorld(true);xb.scene.updateMatrixWorld(true);
      c.tracks=c.tracks.filter(t=>!/\.(position|scale)$/.test(t.name));return c};
    xb.animations.forEach(c0=>{let c=rt(c0);if(add.has(c.name)){THREE.AnimationUtils.makeClipAdditive(c);if(c.name.endsWith('_pose'))c=THREE.AnimationUtils.subclip(c,c.name,2,3,30)}CLIPS[k][c.name]=c});
    if(k==='m')MODELS.m.animations.forEach(c=>{const n={Idle:'idle',Walk:'walk',Run:'run'}[c.name];if(n){const cc=c.clone();cc.name=n;cc.tracks=cc.tracks.filter(t=>!/\.(position|scale)$/.test(t.name)||/Hips\.position$/.test(t.name));CLIPS.m[n]=cc}});
    const sam=MODELS.f.animations.find(a=>a.name==='SambaDance');if(sam)CLIPS[k].dance=k==='f'?sam:retarget(sam,MODELS.f.scene,root)});
  ['m','f'].forEach(k=>{const r=MODELS[k].scene;r.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(r);MODELS[k].h=b.max.y-b.min.y||1.8})}
function nameTag(text,color){const c=cnv(256,64,(g,w,h)=>{g.font='800 30px -apple-system,Helvetica,Arial,sans-serif';const tw=g.measureText(text).width+28;g.fillStyle='rgba(10,12,20,.72)';
  g.beginPath();g.roundRect?g.roundRect((w-tw)/2,8,tw,48,24):g.rect((w-tw)/2,8,tw,48);g.fill();g.fillStyle=color||'#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,33)});
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex(c),depthTest:false,transparent:true}));s.scale.set(1.1,.275,1);s.renderOrder=5;return s}
function emojiSprite(){const c=document.createElement('canvas');c.width=c.height=128;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));
  s.scale.set(.36,.36,1);s.visible=false;s.renderOrder=6;s.userData.set=e=>{const g=c.getContext('2d');g.clearRect(0,0,128,128);g.font='96px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(e,64,70);t.needsUpdate=true};return s}
function makeDog(){const g=new THREE.Group(),m=new THREE.MeshStandardMaterial({color:0xd9a14e,roughness:.85}),dk=new THREE.MeshStandardMaterial({color:0x3a2a1a});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.55,6,12),m);body.rotation.z=Math.PI/2;body.position.y=.5;
  const head=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12),m);head.position.set(.48,.72,0);const snout=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,.14),m);snout.position.set(.66,.67,0);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.04,8,6),dk);nose.position.set(.76,.7,0);
  const ears=[-1,1].map(s=>{const e=new THREE.Mesh(new THREE.BoxGeometry(.08,.18,.1),m);e.position.set(.44,.74,s*.17);e.rotation.x=s*.4;return e});
  const legs=[[.28,.12],[.28,-.12],[-.28,.12],[-.28,-.12]].map(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.42,8),m);l.position.set(x,.21,z);l.geometry.translate(0,-.0,0);return l});
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(.03,.05,.4,6),m);tail.position.set(-.48,.66,0);tail.rotation.z=-1;
  g.add(body,head,snout,nose,...ears,...legs,tail);g.traverse(o=>{if(o.isMesh)o.castShadow=true});
  const inner=new THREE.Group();inner.add(g);g.rotation.y=-Math.PI/2;inner.userData={legs,tail,head};return inner}
function makePerson(id,opt){opt=opt||{};const c=CH(id),dog=!!c.dog,g=new THREE.Group();let mixer=null,acts={},kind=c.gender==='f'?'f':'m';const skOf=o=>{let r=null;o.traverse(x=>{if(!r&&x.isSkinnedMesh)r=x});return r};
  if(dog){g.add(makeDog())}
  else{const src=MODELS[kind];const m=SkeletonUtils.clone(src.scene);
    const H=c.age<13?1.25:id==='marcus'?1.97:id==='davis'?1.88:c.age>70?1.62:kind==='f'?1.66:1.8;m.scale.multiplyScalar(H/src.h);
    const tint=new THREE.Color(c.shirt||'#888');
    m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.frustumCulled=false;o.material=o.material.clone();
      if(!/visor/i.test(o.name))o.material.color.lerp(tint,kind==='f'?.16:.3);if(/visor/i.test(o.name)){o.material.color.set(0x222);o.material.metalness=.9;o.material.roughness=.15}
      if(o.material.envMapIntensity!==undefined)o.material.envMapIntensity=.8}});
    m.rotation.y=kind==='m'?Math.PI:0;g.add(m);mixer=new THREE.AnimationMixer(kind==='f'?skOf(m):m);
    Object.entries(CLIPS[kind]).forEach(([n,cl])=>{const a=mixer.clipAction(cl);if(cl.blendMode===THREE.AdditiveAnimationBlendMode){a.setEffectiveWeight(0);a.play()}acts[n]=a});
    ['idle','walk','run'].forEach(n=>{if(acts[n]){acts[n].play();acts[n].setEffectiveWeight(n==='idle'?1:0)}});if(acts.dance){acts.dance.play();acts.dance.setEffectiveWeight(0)}
    g.userData.h=H}
  const H=dog?.9:g.userData.h;
  const tag=nameTag(id==='stanley'?'Tú':c.name,id==='stanley'?'#9fd0ff':'#fff');tag.position.y=H+.32;g.add(tag);
  const emo=emojiSprite();emo.position.y=H+.62;g.add(emo);
  scene.add(g);
  const P0={id,c,g,mixer,acts,dog,H,tag,emo,base:'idle',w:{idle:1,walk:0,run:0,dance:0},add:{},speed:0,talk:0,emoT:0,face:0,state:'idle',tx:0,tz:0,wait:rnd(1,4),home:null,follow:false,bounce:0};
  return P0}
function animate(p,dt){if(p.dog){const u=p.g.children[0].userData,t=S.t*10;const sp=Math.min(1,p.speed/2);u.legs.forEach((l,i)=>l.rotation.z=Math.sin(t+(i%2?Math.PI:0))*.6*sp);u.tail.rotation.x=Math.sin(S.t*(p.talk?18:8))*.5;u.head.position.y=.72+Math.sin(S.t*3)*.01+(p.talk?Math.abs(Math.sin(S.t*14))*.03:0);return}
  const want={idle:0,walk:0,run:0,dance:0};const s=p.speed;
  if(p.base==='dance')want.dance=1;else if(s>3.2)want.run=1;else if(s>.25){want.walk=1}else want.idle=1;
  for(const k in want){p.w[k]=lerp(p.w[k]||0,want[k],Math.min(1,dt*7));if(p.acts[k])p.acts[k].setEffectiveWeight(p.w[k])}
  if(p.acts.walk)p.acts.walk.timeScale=clamp(s/1.5,.6,1.6);if(p.acts.run)p.acts.run.timeScale=clamp(s/5,.7,1.4);
  for(const k of ['agree','headShake','sad_pose','sneak_pose']){const a=p.acts[k];if(!a)continue;const tw=p.add[k]||0;a._w=lerp(a._w||0,tw,Math.min(1,dt*6));a.setEffectiveWeight(a._w)}
  p.mixer.update(dt*(p.air?.4:1))}
function gesture(p,kind,secs){if(!p||p.dog){if(p)p.bounce=.6;return}const a=p.acts[kind];if(!a)return;if(kind==='agree'||kind==='headShake'){a.reset();a.play()}p.add[kind]=1;clearTimeout(p['_g'+kind]);p['_g'+kind]=setTimeout(()=>p.add[kind]=0,(secs||1.6)*1000)}
const EM={laugh:'😂',flirty:'😘',angry:'💢',sad:'💧',cry:'😭',surprised:'❗',scared:'😱',bored:'🥱',happy:'😄'};
function showEmo(p,e){if(!p||!EM[e])return;p.emo.userData.set(EM[e]);p.emo.visible=true;p.emoT=2.4}

/* ---------------- carros ---------------- */
function makeCar(kind,color){const src=MODELS.car.scene.children[0]||MODELS.car.scene;const car=src.clone(true);const g=new THREE.Group();g.add(car);car.rotation.y+=Math.PI;
  const body=new THREE.MeshStandardMaterial({color:color||0xaa0000,metalness:.75,roughness:.22,envMapIntensity:1.4});
  const glass=new THREE.MeshStandardMaterial({color:0x111418,metalness:.6,roughness:.05,transparent:true,opacity:.6});
  car.traverse(o=>{if(o.isMesh){o.castShadow=true;if(o.material&&o.material.isMeshPhysicalMaterial){const m=o.material;o.material=new THREE.MeshStandardMaterial({color:m.color,map:m.map,metalness:m.metalness,roughness:m.roughness,transparent:m.transparent,opacity:m.opacity,emissive:m.emissive,emissiveMap:m.emissiveMap,name:m.name})}if(o.name==='body'||o.material&&o.material.name==='Body_Color')o.material=body;else if(o.name==='glass')o.material=glass}});
  const ao=new THREE.Mesh(new THREE.PlaneGeometry(.655*4,1.3*4),new THREE.MeshBasicMaterial({map:W3D.aoTex,blending:THREE.MultiplyBlending,toneMapped:false,transparent:true,premultipliedAlpha:true}));ao.rotation.x=-Math.PI/2;ao.renderOrder=2;ao.position.y=.02;g.add(ao);
  const wheels=['wheel_fl','wheel_fr','wheel_rl','wheel_rr'].map(n=>car.getObjectByName(n)).filter(Boolean);
  if(kind==='taxi'){const s=new THREE.Mesh(new THREE.BoxGeometry(.9,.28,.32),signMat('TAXI','#ffcc00',true));s.position.set(0,1.28,-.2);g.add(s)}
  if(kind==='police'){const lb=new THREE.Group();const r=new THREE.MeshStandardMaterial({color:0xff0000,emissive:0xff0000,emissiveIntensity:0}),b=new THREE.MeshStandardMaterial({color:0x0044ff,emissive:0x2266ff,emissiveIntensity:0});
    const m1=new THREE.Mesh(new THREE.BoxGeometry(.5,.14,.25),r),m2=new THREE.Mesh(new THREE.BoxGeometry(.5,.14,.25),b);m1.position.x=-.27;m2.position.x=.27;lb.add(m1,m2);lb.position.set(0,1.22,-.2);g.add(lb);g.userData.siren=[r,b]}
  scene.add(g);return {g,wheels,kind,v:0,h:0,steer:0,ai:false,dir:0,lane:0,player:false}}
function carAt(c,x,z,h){c.g.position.set(x,0,z);c.h=h;c.g.rotation.y=h}

/* ---------------- tráfico ---------------- */
const DIRS=[[1,0],[0,1],[-1,0],[0,-1]];
function laneOf(d,road){const off=3;return d===0?road*P+off:d===2?road*P-off:d===1?road*P-off:road*P+off}
function spawnTraffic(n){const cols=[0x1d3b6b,0xe5e5e5,0x111111,0x8a8f96,0x7a0d0d,0x0f5132,0xc9a227,0x3b1466];
  for(let i=0;i<n;i++){const c=makeCar(i===3?'taxi':'normal',i===3?0xffc400:cols[i%cols.length]);c.ai=true;c.dir=i%4;const road=1+((i*3)%(NC-1));
    c.lane=road;const along=rnd(P,P*(NC-1));const d=DIRS[c.dir];if(d[0])carAt(c,along,laneOf(c.dir,road),Math.atan2(d[0],d[1]));else carAt(c,laneOf(c.dir,road),along,Math.atan2(d[0],d[1]));
    c.v=rnd(8,11);c.vmax=c.v;CARS.push(c)}}
function aiCar(c,dt){const d=DIRS[c.dir],p=c.g.position;let block=false;
  const look=(x,z)=>{const dx=x-p.x,dz=z-p.z,a=dx*d[0]+dz*d[1],l=Math.abs(dx*d[1]-dz*d[0]);return a>0&&a<9&&l<2.2};
  if(look(PL.pos.x,PL.pos.z))block=true;for(const o of CARS)if(o!==c&&look(o.g.position.x,o.g.position.z)&&!(o.ai&&o.dir%2!==c.dir%2&&CARS.indexOf(o)<CARS.indexOf(c)))block=true;c.blockT=block?(c.blockT||0)+dt:0;if(c.blockT>6){c.blockT=0;c.dir=(c.dir+2)%4;const D=DIRS[c.dir];if(D[0])p.z=laneOf(c.dir,Math.round(p.z/P));else p.x=laneOf(c.dir,Math.round(p.x/P));block=false}for(const n of NPCS)if(look(n.g.position.x,n.g.position.z))block=true;
  c.v=lerp(c.v,block?0:c.vmax,dt*(block?4:1));if(block&&c.v<1&&S.t-(c.honk||0)>5&&p.distanceTo(PL.pos)<12){c.honk=S.t;horn()}
  const ax=d[0]?'x':'z',prev=p[ax];p.x+=d[0]*c.v*dt;p.z+=d[1]*c.v*dt;
  const crossed=Math.floor(prev/P)!==Math.floor(p[ax]/P)||(d[0]+d[1]<0&&Math.floor((prev)/P)!==Math.floor(p[ax]/P));
  if(crossed){const node=Math.round(p[ax]/P);const atEdge=node<=0||node>=NC;let opts=[c.dir];if(Math.random()<.4||atEdge)opts=[(c.dir+1)%4,(c.dir+3)%4];opts=opts.filter(o=>{const D=DIRS[o],q=Math.round((D[0]?p.x:p.z)/P)+(D[0]||D[1]);return !(o!==c.dir&&(q<0||q>NC))||true});
    const nd=opts[Math.floor(Math.random()*opts.length)];if(nd!==c.dir){const cross=node;const nr=cross;// el nuevo camino es la calle que cruzamos
      c.dir=nd;const D=DIRS[nd];if(D[0]){p.x=Math.round(p.x/P)*P+D[0]*4;c.lane=node;p.z=laneOf(nd,node)}else{p.z=Math.round(p.z/P)*P+D[1]*4;c.lane=node;p.x=laneOf(nd,node)}}}
  if(p.x<-20||p.x>CITYW+20||p.z<-20||p.z>CITYW+20){c.dir=(c.dir+2)%4;const D=DIRS[c.dir];if(D[0])p.z=laneOf(c.dir,Math.round(p.z/P));else p.x=laneOf(c.dir,Math.round(p.x/P));p.x=clamp(p.x,-19,CITYW+19);p.z=clamp(p.z,-19,CITYW+19)}
  const th=Math.atan2(DIRS[c.dir][0],DIRS[c.dir][1]);c.h=angLerp(c.h,th,Math.min(1,dt*6));c.g.rotation.y=c.h;c.wheels.forEach(w=>w.rotation.x+=c.v*dt/.34)}

/* ---------------- jugador ---------------- */
const PL={pos:new THREE.Vector3(),p:null,head:1.62};
function collide(pos,r){for(const b of SOLIDS){const cx=clamp(pos.x,b.x0,b.x1),cz=clamp(pos.z,b.z0,b.z1),dx=pos.x-cx,dz=pos.z-cz,d2=dx*dx+dz*dz;
  if(d2<r*r){if(d2>1e-6){const d=Math.sqrt(d2);pos.x=cx+dx/d*r;pos.z=cz+dz/d*r}else{const m=[pos.x-b.x0,b.x1-pos.x,pos.z-b.z0,b.z1-pos.z],i=m.indexOf(Math.min(...m));if(i===0)pos.x=b.x0-r;else if(i===1)pos.x=b.x1+r;else if(i===2)pos.z=b.z0-r;else pos.z=b.z1+r}return true}}
  pos.x=clamp(pos.x,-30,CITYW+30);pos.z=clamp(pos.z,-30,CITYW+30);return false}
const onBlock=(x,z)=>{const u=((x%P)+P)%P,v=((z%P)+P)%P;return u>RH&&u<P-RH&&v>RH&&v<P-RH};
const groundY=(x,z)=>onBlock(x,z)?.16:0;

function movePlayer(dt){const p=PL.p,inp=W3D.input,k=S.keys;let ix=inp.x+(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),iy=inp.y+(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0);
  if(S.locked){ix=iy=0}
  const mag=Math.min(1,Math.hypot(ix,iy));const run=(S.run||k.ShiftLeft||mag>.72)&&!S.crouch;const sprint=S.run&&mag>.72&&!S.crouch;
  const sp=mag<.05?0:S.crouch?1.5*Math.max(.5,mag):sprint?8.6:run?6.4:2.3*Math.max(.5,mag/.72);S.fov=lerp(S.fov||62,sp>6?72:62,Math.min(1,dt*4));if(Math.abs(camera.fov-S.fov)>.1){camera.fov=S.fov;camera.updateProjectionMatrix()}
  const fx=-Math.sin(S.yaw),fz=-Math.cos(S.yaw),rx=Math.cos(S.yaw),rz=-Math.sin(S.yaw);
  let vx=(fx*iy+rx*ix),vz=(fz*iy+rz*ix);const l=Math.hypot(vx,vz)||1;vx/=l;vz/=l;
  if(sp>0){PL.pos.x+=vx*sp*dt;PL.pos.z+=vz*sp*dt;p.face=angLerp(p.face,Math.atan2(vx,vz),Math.min(1,dt*12))}
  /* la cámara se acomoda sola detrás de ti cuando caminas (si no estás mirando con el dedo) */
  if(sp>0&&!S.fp&&!S.locked&&S.t-(S.lookAt||-9)>1.2&&Math.abs(ix)>.15){S.yaw=angLerp(S.yaw,p.face+Math.PI,Math.min(1,dt*1.1*Math.abs(ix)))}
  collide(PL.pos,.35);
  const gy=groundY(PL.pos.x,PL.pos.z);S.vy-=18*dt;S.y+=S.vy*dt;if(S.y<=gy){S.y=gy;S.vy=0;S.onGround=true}else S.onGround=S.y-gy<.02;
  PL.pos.y=S.y;p.speed=lerp(p.speed,sp,Math.min(1,dt*10));p.air=!S.onGround;p.add.sneak_pose=S.crouch?1:0;
  p.g.position.copy(PL.pos);p.g.rotation.y=p.face;
  PL.head=lerp(PL.head,S.crouch?1.05:1.62,Math.min(1,dt*10));
  if(S.grab){const n=S.grab,bx=PL.pos.x-Math.sin(p.face)*1.1+Math.cos(p.face)*.5,bz=PL.pos.z-Math.cos(p.face)*1.1-Math.sin(p.face)*.5;walkTo(n,bx,bz,dt,Math.max(2,sp*1.05),.25)}}
function jump(){if(S.inCar||S.locked)return;if(S.onGround){S.vy=6.2;S.onGround=false;sfx3('jump')}}
function crouch(){if(S.inCar)return;S.crouch=!S.crouch;UI.btn('crouch',S.crouch)}

function driveCar(c,dt){const inp=W3D.input,k=S.keys;let t=inp.y+(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),st=inp.x+(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0);
  if(S.locked){t=0;st=0}t=clamp(t,-1,1);st=clamp(st,-1,1);
  const max=c.kind==='police'?28:24;if(t>0)c.v+=(c.v<0?16:9)*t*dt;else if(t<0)c.v+=(c.v>0?18:7)*t*dt;else c.v*=Math.pow(.55,dt);
  if(k.Space)c.v*=Math.pow(.1,dt);c.v=clamp(c.v,-7,max);
  c.steer=lerp(c.steer,st,Math.min(1,dt*6));const turn=c.steer*clamp(Math.abs(c.v)/6,0,1)*(1.35-Math.min(.75,Math.abs(c.v)/40))*Math.sign(c.v);
  c.h-=turn*dt;const p=c.g.position,ox=p.x,oz=p.z;p.x+=Math.sin(c.h)*c.v*dt;p.z+=Math.cos(c.h)*c.v*dt;
  const tmp=new THREE.Vector3(p.x,0,p.z);if(collide(tmp,1.4)){p.x=tmp.x;p.z=tmp.z;if(Math.abs(c.v)>6){bump();UI.shake()}c.v*=-.25}
  for(const o of CARS){if(o===c)continue;const d=o.g.position.distanceTo(p),d0=Math.hypot(o.g.position.x-ox,o.g.position.z-oz);if(d<3.4&&d<d0){p.x=ox;p.z=oz;if(Math.abs(c.v)>5){bump();UI.shake();carYell(o)}c.v*=-.3;o.v=0}}
  for(const n of NPCS){if(n===S.grab)continue;const d=Math.hypot(n.g.position.x-p.x,n.g.position.z-p.z);if(d<2.2&&Math.abs(c.v)>2){const ax=n.g.position.x-p.x,az=n.g.position.z-p.z,l=Math.hypot(ax,az)||1;n.g.position.x+=ax/l*1.6;n.g.position.z+=az/l*1.6;nearMiss(n);c.v*=.5}}
  c.g.rotation.y=c.h;c.wheels.forEach(w=>w.rotation.x+=c.v*dt/.34);
  if(c.g.userData.siren){const on=c.sirenOn;const ph=Math.floor(S.t*6)%2;c.g.userData.siren[0].emissiveIntensity=on&&ph?3:0;c.g.userData.siren[1].emissiveIntensity=on&&!ph?3:0}
  PL.pos.set(p.x,0,p.z);engine(c.v)}

/* ---------------- gente: andar, mirar, reaccionar ---------------- */
function walkTo(n,x,z,dt,sp,stop){const p=n.g.position,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<(stop||.3)){n.speed=lerp(n.speed,0,dt*8);return true}
  const v=Math.min(sp,d*3);p.x+=dx/d*v*dt;p.z+=dz/d*v*dt;const t=new THREE.Vector3(p.x,0,p.z);collide(t,.3);p.x=t.x;p.z=t.z;p.y=groundY(p.x,p.z);
  n.face=angLerp(n.face,Math.atan2(dx,dz),Math.min(1,dt*8));n.g.rotation.y=n.face;n.speed=lerp(n.speed,v,dt*8);return false}
function npcAI(n,dt){if(n===S.grab)return;if(n.mood&&!n.conv){fightAI(n,dt);return}const p=n.g.position,dp=Math.hypot(p.x-PL.pos.x,p.z-PL.pos.z);
  if(n.conv){n.speed=lerp(n.speed,0,dt*8);const a=Math.atan2(n.conv.x-p.x,n.conv.z-p.z);n.face=angLerp(n.face,a,dt*6);n.g.rotation.y=n.face;return}
  if(n.goTo){if(walkTo(n,n.goTo.x,n.goTo.z,dt,n.goTo.run?4.5:1.6)){const f=n.goTo.done;n.goTo=null;if(f)f()}return}
  if(dp<3.2&&!S.inCar){n.speed=lerp(n.speed,0,dt*8);n.face=angLerp(n.face,Math.atan2(PL.pos.x-p.x,PL.pos.z-p.z),dt*5);n.g.rotation.y=n.face;
    if(!S.said[n.id]&&!S.locked&&!speakingNow()&&n!==S.cop&&!S.wanted){S.said[n.id]=S.t;greet(n)}return}
  if(n.ped){const L=n.ped;n.lt+=dt*(n.spd||1.25)/L.len;const q=perim(L,n.lt%1);walkTo(n,q.x,q.z,dt,(n.spd||1.4)+.1,.05);return}
  if(n.stand){n.speed=lerp(n.speed,0,dt*6);if(Math.random()<dt*.15)gesture(n,Math.random()<.7?'agree':'headShake',1.2);return}
  n.wait-=dt;if(n.wait<=0){if(n.state==='idle'){const h=n.home||{x:p.x,z:p.z};n.tx=h.x+rnd(-5,5);n.tz=h.z+rnd(-1.2,1.2);n.state='walk'}else{n.state='idle';n.wait=rnd(3,9)}}
  if(n.state==='walk'){if(walkTo(n,n.tx,n.tz,dt,1.2)){n.state='idle';n.wait=rnd(3,9)}}else n.speed=lerp(n.speed,0,dt*6)}
function perim(L,t){const w=L.x1-L.x0,d=L.z1-L.z0,per=2*(w+d);let s=t*per;if(s<w)return {x:L.x0+s,z:L.z0};s-=w;if(s<d)return {x:L.x1,z:L.z0+s};s-=d;if(s<w)return {x:L.x1-s,z:L.z1};s-=w;return {x:L.x0,z:L.z1-s}}

/* lo que dicen cuando haces cosas fuera del guion */
const OFF={
 grab:{f_hi:[["Ooh, where are you taking me, handsome?","Uy, ¿a dónde me llevas, guapo?","flirty"],["Okay, okay! Lead the way, babe.","¡Ok, ok! Tú mandas, bebé.","laugh"]],
   f_lo:[["Uh, excuse me? Let go of my arm!","¿Perdón? ¡Suéltame el brazo!","angry"],["Whoa, dude. Personal space!","Oye, ¡mi espacio personal!","surprised"]],
   m:[["Bro, what are you doing? Fine, I'm coming!","¿Qué haces, bro? ¡Ya, ya voy!","laugh"],["Yo, chill! Where we going?","¡Tranquilo! ¿A dónde vamos?","surprised"]],
   old:[["Oh my, slow down, sweetie! My hip!","¡Ay, más despacio, mijo! ¡Mi cadera!","surprised"],["Let go, son! I can walk on my own!","¡Suéltame, hijo! ¡Puedo caminar solo!","angry"]],
   kid:[["Are we going to the park? Yay!","¿Vamos al parque? ¡Sí!","happy"]],dog:[["Woof! Woof!","(Max mueve la cola y te sigue)","happy"]],
   karen:[["Excuse me?! Get your hands off me! I'm calling the cops!","¡¿Perdón?! ¡Quítame las manos! ¡Voy a llamar a la policía!","angry"]]},
 drop:[["Okay... that was weird.","Ok… eso estuvo raro.","bored"],["So we just stop here? Cool.","¿Y aquí nos quedamos? Bueno.","laugh"]],
 hug:{f_hi:[["Aww, come here! You give the best hugs.","¡Aww, ven! Abrazas bien rico.","flirty"]],f_lo:[["Uh... okay. That's a little much.","Eh… ok. Eso es demasiado.","surprised"]],m:[["Ha! Bring it in, bro!","¡Ja! ¡Ven pa' acá, bro!","laugh"]],old:[["Oh, you sweet boy!","¡Ay, qué niño tan lindo!","happy"]],kid:[["Ew, gross! Just kidding.","¡Guácala! Es broma.","laugh"]],dog:[["Arf!","(Max te lame toda la cara)","happy"]],karen:[["Don't touch me!","¡No me toques!","angry"]]},
 push:{f_hi:[["Hey! What's your problem?","¡Oye! ¿Qué te pasa?","angry"]],f_lo:[["Don't you dare push me, jerk!","¡Ni se te ocurra empujarme, pendejo!","angry"]],m:[["Yo, you wanna go? Don't push me, man!","¿Quieres pleito? ¡No me empujes!","angry"],["Bro, what the hell?","Bro, ¿qué demonios?","angry"]],
   old:[["Kids these days! No respect!","¡Los jóvenes de hoy! ¡Cero respeto!","angry"]],kid:[["Hey! I'm telling my mom!","¡Oye! ¡Le voy a decir a mi mamá!","cry"]],dog:[["Grrr... woof!","(Max te gruñe)","angry"]],karen:[["That's assault! I want your manager!","¡Eso es agresión! ¡Quiero a tu gerente!","angry"]]},
 bump:[["Hey! Watch where you're going!","¡Oye! ¡Fíjate por dónde vas!","angry"],["Whoa! Are you crazy?","¡Wow! ¿Estás loco?","scared"],["Dude, slow down!","¡Bájale, güey!","angry"]],
 car:[["Yo, learn how to drive, man!","¡Aprende a manejar, hombre!","angry"],["Are you kidding me?!","¡¿Es en serio?!","angry"]]};
function who4(n){const c=n.c,r=(DB.rel&&DB.rel[n.id])||0;if(n.id==='karen')return 'karen';if(n.dog)return 'dog';if(c.age<13)return 'kid';if(c.age>65)return 'old';if(c.gender==='f')return r>=4||['emily','chloe','nina','jasmine'].includes(n.id)?'f_hi':'f_lo';return 'm'}
const pick3=a=>a[Math.floor(Math.random()*a.length)];
async function line(n,l,rel){if(!l)return;const [en,es,emo]=l;sub(n.id,en,es);showEmo(n,emo);if(emo==='angry')gesture(n,'headShake');else if(emo==='laugh'||emo==='happy'||emo==='flirty')gesture(n,'agree');else if(emo==='cry'||emo==='sad')gesture(n,'sad_pose',3);
  if(rel)relAdd(n.id,rel);try{await say(en,n.id,emo)}catch(e){}setTimeout(()=>{if(UI.subWho===n.id)sub(null)},1800)}
const speakingNow=()=>typeof speaking!=='undefined'&&speaking;
function greet(n){if(n.dog)return line(n,["Woof! Woof!","(Max te saluda moviendo la cola)","happy"]);const met=DB.met&&DB.met[n.id],mem=DB.mem&&(DB.mem[n.id]||[])[0];
  const l=mem&&Math.random()<.5?["Hey Stanley! "+mem.en,"¡Hola Stanley! "+mem.es,"laugh"]:met?pick3([["Yo, Stanley! What's good?","¡Qué onda, Stanley!","happy"],["Hey you! Long time no see.","¡Hey! ¡Cuánto tiempo!","happy"],["Look who it is!","¡Mira nada más quién es!","laugh"]]):pick3([["Hey there. You new around here?","Hola. ¿Eres nuevo por aquí?","neutral"],["Hi! I'm "+n.c.name+". Nice to meet you.","¡Hola! Soy "+n.c.name+". Mucho gusto.","happy"]]);
  line(n,l)}
function offScript(kind){const n=S.near;if(!n)return;const w=who4(n),T=OFF[kind];
  if(kind==='grab'){if(S.grab){const g=S.grab;S.grab=null;g.home={x:g.g.position.x,z:g.g.position.z};line(g,pick3(OFF.drop));UI.ctx();return}
    const l=pick3(T[w]||T.m);if(w==='karen'||(w==='f_lo'&&Math.random()<.5)||(w==='old'&&Math.random()<.5)){line(n,l,-1);n.goTo={x:n.g.position.x+rnd(-4,4),z:n.g.position.z+rnd(-4,4),run:true};return}
    S.grab=n;line(n,l,1);UI.ctx();return}
  const l=pick3(T[w]||T.m);line(n,l,kind==='hug'?(w==='f_lo'||w==='karen'?-1:2):-2);
  if(kind==='push'){const a=n.g.position,dx=a.x-PL.pos.x,dz=a.z-PL.pos.z,d=Math.hypot(dx,dz)||1;n.goTo={x:a.x+dx/d*1.6,z:a.z+dz/d*1.6,run:true};UI.shake()}
  if(kind==='hug')n.bounce=.5}
/* ---------------- números de teléfono y contactos ---------------- */
const NUM={yes:{f_hi:[["Okay, gimme your phone. Text me tonight, okay?","Ok, dame tu cel. Mándame mensaje en la noche, ¿va?","flirty"],["Took you long enough! Here, put it in.","¡Ya te habías tardado! Ten, guárdalo.","laugh"]],
   f_lo:[["Hmm... okay, fine. But don't be weird about it.","Mmm… bueno, va. Pero no te pongas raro.","neutral"]],m:[["Bet. Here, lemme put it in your phone.","Va. Dame, te lo guardo en tu cel.","happy"],["For sure, bro. Hit me up anytime.","Claro, bro. Échame un grito cuando quieras.","happy"]],
   old:[["Oh, how nice! Write it down, sweetie. Call me for pie.","¡Ay, qué lindo! Anótalo, mijo. Llámame para el pay.","happy"]],kid:[["My mom's number! Call her if you wanna play soccer.","¡El número de mi mamá! Llámala si quieres jugar fut.","happy"]]},
 no:{f_lo:[["Ha! Nice try. Maybe buy me a coffee first.","¡Ja! Buen intento. Invítame un café primero.","laugh"],["Uh, I don't even know you, dude.","Ni te conozco, güey.","bored"]],karen:[["Absolutely not. Do I look like I give my number to strangers?","Para nada. ¿Tengo cara de darle mi número a extraños?","angry"]],
   m:[["Nah, man. We just met. Talk to me first.","Nel. Apenas nos conocemos. Platícame primero.","neutral"]],f_hi:[["Not yet, cutie. Make me laugh first.","Todavía no, guapo. Hazme reír primero.","flirty"]],kid:[["I'm not allowed to talk to strangers!","¡No me dejan hablar con extraños!","scared"]],old:[["Oh, I don't remember my own number, honey!","¡Ay, ni me acuerdo de mi número, mijo!","laugh"]]},
 have:[["You already have it, silly!","¡Ya lo tienes, tontito!","laugh"]],dog:[["Woof?","(Max no tiene teléfono, pero te lame la mano)","happy"]]};
function askNumber(n){if(!n)return;DB.contacts=DB.contacts||{};if(n.dog)return line(n,NUM.dog[0]);if(DB.contacts[n.id])return line(n,pick3(NUM.have));
  const w=who4(n),r=(DB.rel&&DB.rel[n.id])||0,met=(DB.met&&DB.met[n.id])||0;
  const chance={f_hi:.75,m:.85,old:.95,kid:.6,f_lo:.3,karen:0}[w]+r*.08+met*.1;
  if(Math.random()<chance){DB.contacts[n.id]={at:Date.now()};DB.met[n.id]=(DB.met[n.id]||0)+1;relAdd(n.id,1);try{save()}catch(e){}line(n,pick3(NUM.yes[w]||NUM.yes.m));setTimeout(()=>toast3('📱 Guardaste el número de '+n.c.name+'. Búscalo en Contactos.'),900)}
  else{line(n,pick3(NUM.no[w]||NUM.no.m));setTimeout(()=>toast3('💡 Platica más con '+n.c.name+' o échale un piropo y vuelve a pedírselo.'),1200)}
  UI.ctx()}
function phoneCall(id){if(S.busy||typeof freeChat!=='function')return;UI.phone(false);S.busy=true;S.locked=true;const fx=-Math.sin(S.yaw),fz=-Math.cos(S.yaw);S.conv={pos:new THREE.Vector3(PL.pos.x-fx*1.6,5.2,PL.pos.z-fz*1.6),look:new THREE.Vector3(PL.pos.x+fx*1.2,-1.2,PL.pos.z+fz*1.2)};W3D.calling=true;PL.p.face=S.yaw;PL.p.g.visible=true;UI.hud(false);
  W3D.after=()=>{S.busy=false;S.locked=false;S.conv=null;UI.hud(true)};freeChat(id)}
function meetUp(id){const n=NPCS.find(x=>x.id===id);UI.phone(false);if(!n){toast3('No contesta. Intenta más tarde.');return}
  n.hidden=false;n.ped=null;const along=Math.abs(PL.pos.x-Math.round(PL.pos.x/P)*P)<Math.abs(PL.pos.z-Math.round(PL.pos.z/P)*P);
  const sx=along?PL.pos.x:PL.pos.x+24,sz=along?PL.pos.z+24:PL.pos.z;const q=new THREE.Vector3(sx,0,sz);collide(q,.4);n.g.position.set(q.x,groundY(q.x,q.z),q.z);
  n.goTo={x:PL.pos.x+1,z:PL.pos.z+1,run:false,done:()=>{n.home={x:n.g.position.x,z:n.g.position.z};line(n,pick3([["Hey! Here I am. So what's the plan?","¡Hey! Aquí estoy. ¿Cuál es el plan?","happy"],["What's up? You called?","¿Qué onda? ¿Me llamaste?","happy"],["Okay, I'm here. This better be good!","Ya llegué. ¡Más te vale que valga la pena!","laugh"]]))}};
  const l=pick3([["On my way! Give me two minutes.","¡Voy para allá! Dame dos minutos.","happy"],["Okay, okay, I'm coming. Don't move!","Ok, ok, ya voy. ¡No te muevas!","laugh"]]);sub(id,l[0],l[1]);try{say(l[0],id,'happy')}catch(e){}
  setTimeout(()=>{if(UI.subWho===id)sub(null)},2600);toast3('📍 '+n.c.name+' viene para acá')}
/* ---------------- pleitos (estilo juego de calle, sin sangre) ---------------- */
const FIGHT={hit:{m:[["Ow! What the hell, man?!","¡Au! ¿Qué te pasa, güey?","angry"],["Oh, you wanna go? Let's go!","¿Quieres pleito? ¡Órale!","angry"],["You just made a big mistake, bro.","Acabas de cometer un gran error, bro.","angry"]],
   f_hi:[["Ow! Are you serious right now?!","¡Au! ¿Es en serio?","cry"],["Don't you ever touch me again!","¡No me vuelvas a tocar!","angry"]],f_lo:[["Help! This guy's crazy!","¡Ayuda! ¡Este tipo está loco!","scared"],["Somebody call the cops!","¡Alguien llame a la policía!","scared"]],
   old:[["Help! Police! He hit an old lady!","¡Auxilio! ¡Policía! ¡Le pegó a una viejita!","scared"],["You hoodlum! I'm calling 911!","¡Vándalo! ¡Voy a llamar al 911!","angry"]],karen:[["That's it! I'm suing you AND calling the police!","¡Ya estuvo! ¡Te voy a demandar Y llamar a la policía!","angry"]]},
 taunt:[["Come on! Is that all you got?","¡Ándale! ¿Es todo lo que tienes?","angry"],["Take that!","¡Toma!","angry"],["You hit like my grandma!","¡Pegas como mi abuela!","laugh"],["Stay down, man!","¡Quédate abajo!","angry"],["You picked the wrong guy!","¡Te metiste con el equivocado!","angry"]],
 give:[["Okay, okay! I give up! Chill!","¡Ya, ya! ¡Me rindo! ¡Tranquilo!","scared"],["Alright, you win, man. Damn.","Ya, tú ganas. Chale.","sad"],["I'm out! You're crazy, bro!","¡Me largo! ¡Estás loco, bro!","scared"]],
 cop:[["Freeze! Hands where I can see 'em!","¡Alto! ¡Las manos donde las vea!","angry"]],copEnd:[["You're lucky I'm in a good mood. Here's your ticket. Keep your hands to yourself.","Tienes suerte de que ando de buenas. Ahí está tu multa. Las manos quietas.","angry"]]};
function fighter(n){const w=who4(n);if(w==='m')return ['brad','marcus','carlos','mike','extrano','jake','tony','ray'].includes(n.id)||Math.random()<.6;return false}
function punch(n){if(!n||S.locked||S.inCar||n.dog||n.c.age<13)return;if(S.t-(S.punchAt||-9)<.45)return;S.punchAt=S.t;PL.p.face=Math.atan2(n.g.position.x-PL.pos.x,n.g.position.z-PL.pos.z);
  const d=Math.hypot(n.g.position.x-PL.pos.x,n.g.position.z-PL.pos.z);whoosh();if(d>1.9){PL.pos.x+=Math.sin(PL.p.face)*.4;PL.pos.z+=Math.cos(PL.p.face)*.4;return}
  thump();UI.shake();n.hits=(n.hits||0)+1;showEmo(n,'angry');n.emo.userData.set('💥');const a=n.g.position,dx=a.x-PL.pos.x,dz=a.z-PL.pos.z,l=Math.hypot(dx,dz)||1;a.x+=dx/l*.7;a.z+=dz/l*.7;n.bounce=.35;
  relAdd(n.id,-3);S.wanted=Math.min(3,(S.wanted||0)+1);S.wantedAt=S.t;n.ped=null;n.stand=false;n.state='idle';n.goTo=null;
  if(n.hits>=3&&n.mood==='fight'){n.mood='flee';n.moodT=8;line(n,pick3(FIGHT.give));addXP&&addXP(2);return}
  if(!n.mood){n.mood=fighter(n)?'fight':'flee';n.moodT=n.mood==='fight'?14:8;const w=who4(n);line(n,pick3(FIGHT.hit[w]||FIGHT.hit.m))}
  else if(Math.random()<.4)line(n,pick3(n.mood==='fight'?FIGHT.taunt:(FIGHT.hit[who4(n)]||FIGHT.hit.f_lo)));
  if(S.wanted>=2)callCops()}
function fightAI(n,dt){const p=n.g.position,dx=PL.pos.x-p.x,dz=PL.pos.z-p.z,d=Math.hypot(dx,dz);n.moodT-=dt;
  if(n.moodT<=0||d>30||S.locked){n.mood=null;n.hits=0;n.home={x:p.x,z:p.z};return}
  if(n.mood==='flee'){const t=new THREE.Vector3(p.x-dx/(d||1)*6,0,p.z-dz/(d||1)*6);walkTo(n,t.x,t.z,dt,4.8,.1);return}
  if(S.inCar){n.speed=lerp(n.speed,0,dt*6);return}
  if(d>1.25){walkTo(n,PL.pos.x,PL.pos.z,dt,4.2,1.1);return}
  n.speed=lerp(n.speed,0,dt*8);n.face=angLerp(n.face,Math.atan2(dx,dz),dt*8);n.g.rotation.y=n.face;
  if(S.t-(n.atk||0)>1.35){n.atk=S.t;n.lunge=.25;whoosh();if(Math.random()<.75){thump();hurt(11);if(Math.random()<.35)line(n,pick3(FIGHT.taunt))}}}
function hurt(k){S.hp=Math.max(0,(S.hp==null?100:S.hp)-k);S.hpAt=S.t;UI.shake();const f=$3('#w3hurt');if(f){f.classList.remove('on');void f.offsetWidth;f.classList.add('on')}
  if(S.hp<=0)knockout()}
function knockout(){if(S.ko)return;S.ko=true;S.locked=true;const o=$3('#w3ko2');if(o){o.hidden=false}
  NPCS.forEach(n=>{if(n.mood){n.mood=null;n.hits=0;n.home={x:n.g.position.x,z:n.g.position.z}}});S.wanted=0;
  setTimeout(()=>{const L=LOTS.hospital||LOTS.casa;PL.pos.set(L.door.x,0,L.door.z+(L.face===0?2.5:-2.5));S.y=0;S.hp=100;S.ko=false;S.locked=false;if(o)o.hidden=true;
    if(typeof DB!=='undefined'){DB.xp=Math.max(0,DB.xp-25);try{save()}catch(e){}}const doc=["You're lucky, man. Just some bruises. That'll be twenty-five bucks.","Tuviste suerte. Sólo unos moretones. Son veinticinco dólares."];
    sub('doctor',doc[0],doc[1]);try{say(doc[0],'doctor','neutral')}catch(e){}setTimeout(()=>{if(UI.subWho==='doctor')sub(null)},4500);toast3('🏥 Te noquearon. Amaneciste en el hospital (−25 ⭐)')},2600)}
function callCops(){if(S.cop)return;const n=NPCS.find(x=>x.id==='davis');if(!n)return;S.cop=n;n.mood=null;n.ped=null;n.stand=false;n.hidden=false;
  const q=new THREE.Vector3(PL.pos.x+20,0,PL.pos.z);collide(q,.4);n.g.position.set(q.x,0,q.z);toast3('🚨 ¡Alguien llamó a la policía!');
  const go=()=>{n.goTo={x:PL.pos.x+1,z:PL.pos.z+1,run:true,done:()=>{if(Math.hypot(PL.pos.x-n.g.position.x,PL.pos.z-n.g.position.z)>3){go();return}
    line(n,FIGHT.cop[0]);setTimeout(()=>{line(n,FIGHT.copEnd[0]);if(typeof DB!=='undefined'){DB.xp=Math.max(0,DB.xp-15);try{save()}catch(e){}}S.wanted=0;S.cop=null;
      NPCS.forEach(x=>{if(x.mood){x.mood=null;x.hits=0;x.home={x:x.g.position.x,z:x.g.position.z}}});n.home={x:n.g.position.x,z:n.g.position.z};toast3('🚓 Multa por pleito (−15 ⭐)')},2600)}}};go()}
function whoosh(){const a=ac3();if(!a)return;const t=a.currentTime,n=a.createBufferSource(),b=a.createBuffer(1,a.sampleRate*.18,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const f=a.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(600,t);f.frequency.exponentialRampToValueAtTime(2400,t+.15);const g=a.createGain();g.gain.value=.12;n.buffer=b;n.connect(f).connect(g).connect(a.destination);n.start(t)}
function thump(){const a=ac3();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(50,t+.18);g.gain.setValueAtTime(.5,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.25)}
/* la ciudad platica sola: la gente dice cosas al pasar (también es práctica de oído) */
const AMB=[["I swear, this traffic is killing me.","Te juro que este tráfico me está matando."],["Yo, did you see the game last night? Crazy!","¿Viste el partido de anoche? ¡Una locura!"],["Girl, I'm not even playing, he ghosted me again.","Amiga, no es broma, me volvió a dejar en visto."],
 ["I'm starving. You wanna grab some tacos?","Me muero de hambre. ¿Vamos por unos tacos?"],["Nah, I gotta work tomorrow. I'm beat.","Nel, mañana trabajo. Estoy muerto."],["Hold on, my mom's calling me.","Espérate, me está marcando mi mamá."],["Bro, that's so sus.","Bro, eso está bien sospechoso."],
 ["Lemme call you back, I'm driving.","Te marco luego, voy manejando."],["It's gonna rain later, I'm telling you.","Va a llover al rato, te lo digo."],["Whatever, dude. It's up to you.","Lo que sea, güey. Tú decides."],["No way! Shut up! For real?","¡No manches! ¿En serio?"],
 ["I'm so done with this week.","Ya no aguanto esta semana."],["Excuse me, do you know where the bank is?","Disculpa, ¿sabes dónde está el banco?"],["Hey, nice kicks, man!","¡Qué buenos tenis, hombre!"],["Ugh, I'm late again. My boss is gonna kill me.","Ay, otra vez llego tarde. Mi jefe me va a matar."],
 ["You coming to the party tonight?","¿Vas a ir a la fiesta hoy en la noche?"],["I dunno, man. Maybe.","No sé, güey. A lo mejor."],["Dude, gimme a second.","Güey, dame un segundo."],["Whaddya mean you lost the keys?!","¿Cómo que perdiste las llaves?"],["Lowkey, I miss her.","La neta, la extraño tantito."]];
function ambient(dt){if(S.locked||S.busy||speakingNow()||S.t<(S.ambAt||8))return;S.ambAt=S.t+rnd(9,16);
  const c=NPCS.filter(n=>!n.dog&&!n.mood&&!n.conv&&n!==S.grab&&n.g.visible&&n.c.age>=13&&Math.hypot(n.g.position.x-PL.pos.x,n.g.position.z-PL.pos.z)<13);if(!c.length)return;
  const n=pick3(c),l=pick3(AMB);sub(n.id,l[0],l[1]);showEmo(n,'happy');n.emo.userData.set('💬');gesture(n,'agree',1.4);try{say(l[0],n.id,'neutral')}catch(e){}setTimeout(()=>{if(UI.subWho===n.id)sub(null)},3200)}
function nearMiss(n){if(S.t-(n.yell||0)<4)return;n.yell=S.t;showEmo(n,'angry');line(n,pick3(OFF.bump),-1)}
function carYell(o){if(S.t-(o.yell||0)<4)return;o.yell=S.t;const l=pick3(OFF.car);sub('extrano',l[0],l[1]);try{say(l[0],'extrano','angry')}catch(e){}}

/* ---------------- sonido ---------------- */
let AC=null,eng=null;const ac3=()=>{try{AC=AC||(typeof ac!=='undefined'&&ac)||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}return AC};
function horn(){const a=ac3();if(!a)return;const t=a.currentTime;[392,494].forEach(f=>{const o=a.createOscillator(),g=a.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.45);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.5)})}
function bump(){const a=ac3();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(40,t+.25);g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+.3);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.32)}
function sfx3(k){if(typeof sfx==='function'&&k==='ok')sfx('ok')}
function engine(v){const a=ac3();if(!a)return;if(!eng){const o=a.createOscillator(),f=a.createBiquadFilter(),g=a.createGain();o.type='sawtooth';f.type='lowpass';f.frequency.value=380;g.gain.value=0;o.connect(f).connect(g).connect(a.destination);o.start();eng={o,g}}
  eng.o.frequency.value=38+Math.abs(v)*4.2;eng.g.gain.value=S.inCar&&!S.locked?.018+Math.min(.03,Math.abs(v)/900):0}

/* ---------------- cámara ---------------- */
const CAMT=new THREE.Vector3(),CAMP=new THREE.Vector3();
function updateCamera(dt){const sm=Math.min(1,dt*10);
  if(S.conv){const c=S.conv;CAMP.lerp(c.pos,Math.min(1,dt*3));CAMT.lerp(c.look,Math.min(1,dt*3));camera.position.copy(CAMP);camera.lookAt(CAMT);return}
  if(S.inCar){const c=S.inCar,p=c.g.position;if(S.fp){CAMP.set(p.x+Math.sin(c.h)*-.1-Math.cos(c.h)*.38,1.08,p.z+Math.cos(c.h)*-.1+Math.sin(c.h)*.38);camera.position.copy(CAMP);
      CAMT.set(CAMP.x+Math.sin(c.h)*10,1.0+S.pitch*4,CAMP.z+Math.cos(c.h)*10);camera.lookAt(CAMT);PL.p.g.visible=false;return}
    let back=7.2;const yaw=c.h+Math.PI+(S.freeYaw||0);for(let k=1.5;k<=7.2;k+=.5){const qx=p.x+Math.sin(yaw)*k,qz=p.z+Math.cos(yaw)*k;if(SOLIDS.some(b=>qx>b.x0-.3&&qx<b.x1+.3&&qz>b.z0-.3&&qz<b.z1+.3&&2.9<b.h)){back=Math.max(2.5,k-.5);break}}const want=new THREE.Vector3(p.x+Math.sin(yaw)*back,2.9,p.z+Math.cos(yaw)*back);CAMP.lerp(want,Math.min(1,dt*5));camera.position.copy(CAMP);CAMT.lerp(new THREE.Vector3(p.x,1.1,p.z),sm);camera.lookAt(CAMT);return}
  const p=PL.pos,h=PL.head;
  if(S.fp){camera.position.set(p.x-Math.sin(S.yaw)*.12,p.y+h,p.z-Math.cos(S.yaw)*.12);const d=new THREE.Vector3(-Math.sin(S.yaw)*Math.cos(S.pitch),Math.sin(S.pitch),-Math.cos(S.yaw)*Math.cos(S.pitch));
    camera.lookAt(camera.position.clone().add(d));PL.p.g.visible=false;return}
  PL.p.g.visible=true;let dist=3.6;const piv=new THREE.Vector3(p.x+Math.cos(S.yaw)*.45,p.y+h-.05,p.z-Math.sin(S.yaw)*.45);
  const dir=new THREE.Vector3(Math.sin(S.yaw)*Math.cos(S.pitch),-Math.sin(S.pitch)+.18,Math.cos(S.yaw)*Math.cos(S.pitch)).normalize();
  for(let k=.5;k<=dist;k+=.25){const q=piv.clone().addScaledVector(dir,k);if(SOLIDS.some(b=>q.x>b.x0-.2&&q.x<b.x1+.2&&q.z>b.z0-.2&&q.z<b.z1+.2&&q.y<b.h)){dist=Math.max(.6,k-.3);break}}
  const want=piv.clone().addScaledVector(dir,dist);want.y=Math.max(want.y,.4);camera.position.lerp(want,Math.min(1,dt*14));
  CAMT.copy(piv).add(new THREE.Vector3(-Math.sin(S.yaw)*2,0,-Math.cos(S.yaw)*2));camera.lookAt(CAMT)}

/* ---------------- misiones, GPS, chambas ---------------- */
const placeLot=p=>{const b=typeof placeBld==='function'?placeBld(p):null;return b?LOTS[b.id]:null};
/* ================= MISIONES DE LA CIUDAD (estilo GTA) ================= */
function parseGTA(txt){const L=[];let cur=null,sc=null,lastY=null;(txt||[]).join("\n").split("\n").forEach(raw=>{const r=raw.trim();if(!r||r.startsWith("//"))return;const f=r.split("|").map(x=>x.trim());
  if(f[0].startsWith("#")){cur={id:f[0].slice(1),t:f[1],pay:+f[2]||0,giver:f[3],brief:f[4]||"",obj:[]};L.push(cur);sc=null;return}
  if(!cur)return;
  if(f[0]==="O"){const o={k:f[1]};if(o.k==="talk"){o.place=f[2];o.cast=(f[3]||"").split(",").map(x=>x.trim()).filter(Boolean);o.txt=f[4]||"Platica";o.steps=[];sc=o}
    else{sc=null;if(o.k==="goto"||o.k==="drop"){o.place=f[2];o.txt=f[3]}else if(o.k==="pickup"){o.who=f[2];o.txt=f[3]}else if(o.k==="money"){o.amt=+f[2]||0;o.txt=f[3]}else o.txt=f[2]||""}cur.obj.push(o);return}
  if(!sc)return;
  if(f[0]==="N")sc.steps.push({k:"N",who:f[1],emo:f[2]||"neutral",en:f[3],es:f[4]||""});
  else if(f[0]==="Y"){lastY={k:"Y",en:f[1],es:f[2]||"",pr:f[3]||"",em:f[4]||"💬",alts:[],m:cur.id};sc.steps.push(lastY)}
  else if(f[0]==="A"&&lastY)lastY.alts.push(f[1]);else if(f[0]==="L"&&lastY)lastY.norm=f[1]});return L.filter(m=>m.obj.length)}
const gtaDone=id=>!!(DB.gta&&DB.gta.done&&DB.gta.done[id]);
function gtaNext(){const L=W3D.GTA||[];return L.find(m=>!gtaDone(m.id))||null}
function gtaOpen(m){const L=W3D.GTA||[],i=L.indexOf(m);return i<=0||gtaDone(L[i-1].id)||gtaDone(m.id)}
function lotFor(pl){return LOTS[pl]||placeLot(pl)||LOTS.casa}
function banner(big,small,color){const b=$3('#w3ban');if(!b)return;b.innerHTML=`<b style="color:${color||'#ffd23a'}">${escH(big)}</b>${small?`<small>${escH(small)}</small>`:''}`;b.hidden=false;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');clearTimeout(banner.t);banner.t=setTimeout(()=>b.hidden=true,3600)}
function gtaStart(m){if(!m)return;cancelJob();S.forced=null;S.gm={m,i:-1,giverStage:true};setTarget()}
function gtaBegin(){const G=S.gm;G.giverStage=false;G.i=0;banner(G.m.t.toUpperCase(),G.m.brief);gtaObj()}
function gtaObj(){const G=S.gm;if(!G)return;const o=G.m.obj[G.i];if(!o){gtaEnd();return}
  if(o.k==="money"){DB.money=(DB.money||0)+o.amt;try{save()}catch(e){}toast3((o.amt<0?'💸 ':'💵 ')+(o.txt||((o.amt<0?'-':'+')+'$'+Math.abs(o.amt))));G.i++;gtaObj();return}
  if(o.k==="end"){gtaEnd(o.txt);return}
  if(o.k==="pickup"){let n=NPCS.find(x=>x.id===o.who&&!x.ped);if(!n){n=makePerson(o.who);n.temp=true;n.keep=true;NPCS.push(n);const L=lotFor((typeof HOME!=='undefined'&&HOME[o.who])||'casa');n.g.position.set(L.door.x+1.5,.16,L.door.z);n.home={x:L.door.x+1.5,z:L.door.z}}
    n.hidden=false;G.n=n}
  setTarget()}
function gtaTarget(){const G=S.gm,o=G.m.obj[G.i];
  if(G.giverStage){const L=lotFor((typeof HOME!=='undefined'&&HOME[G.m.giver])||'casa');S.target={gta:true,giver:true,x:L.door.x,z:L.door.z,L};UI.obj(`🅼 <b>${escH(G.m.t)}</b> · ve con ${escH(CH(G.m.giver).name||G.m.giver)} (marca amarilla)`);return}
  if(!o){S.target=null;return}
  const pre=`🎯 <b>${escH(G.m.t)}</b> · `;
  if(o.k==="talk"||o.k==="goto"||o.k==="drop"){const L=lotFor(o.place);S.target={gta:true,o,x:L.door.x,z:L.door.z,L};UI.obj(pre+escH(o.txt||'Ve a '+L.b.name));return}
  if(o.k==="pickup"&&G.n){const p=G.n.g.position;S.target={gta:true,o,x:p.x,z:p.z,follow:G.n};UI.obj(pre+escH(o.txt||'Recoge a '+G.n.c.name));return}
  if(o.k==="car"){S.target={gta:true,o};UI.obj(pre+escH(o.txt||'Súbete a un carro'));return}
  S.target=null}
function gtaTick(dt){const G=S.gm;if(!G||S.busy)return;const T=S.target;if(!T)return;if(T.follow){T.x=T.follow.g.position.x;T.z=T.follow.g.position.z}
  const d=T.x!==undefined?Math.hypot(PL.pos.x-T.x,PL.pos.z-T.z):999,carStop=S.inCar&&Math.abs(S.inCar.v)<2.5,here=S.inCar?(d<10&&carStop):d<3;
  if(G.giverStage){if(here){if(S.inCar)act('exit');gtaBegin()}return}
  const o=G.m.obj[G.i];if(!o)return;
  if(o.k==="car"){if(S.inCar){G.i++;gtaObj()}return}
  if(!here)return;
  if(o.k==="goto"){G.i++;gtaObj();return}
  if(o.k==="pickup"){const n=G.n;if(S.inCar){n.hidden=true;S.grabCar=n}else{S.grab=n}line(n,pick3([["Hey! Let's go!","¡Hey! ¡Vámonos!","happy"],["Finally! What took you so long?","¡Por fin! ¿Por qué tardaste tanto?","laugh"],["Alright, I'm ready. Let's roll.","Listo, ya estoy. Vámonos.","happy"]]));G.i++;gtaObj();return}
  if(o.k==="drop"){const n=G.n;if(n){S.grab=null;if(S.grabCar===n)S.grabCar=null;n.hidden=false;n.g.position.set(T.x+1.4,.16,T.z);n.home={x:T.x+1.4,z:T.z};line(n,["Thanks for the ride!","¡Gracias por el aventón!","happy"])}G.n=null;G.i++;gtaObj();return}
  if(o.k==="talk"){if(G.talking)return;if(S.inCar){act('exit')}G.talking=true;const sc={id:G.m.id+'_'+G.i,t:G.m.t,place:o.place,cast:o.cast,steps:o.steps,label:o.txt};
    if(typeof playScene!=='function')return;
    startMission(sc,o.cast,()=>playScene(sc).then(ok=>{setTimeout(()=>{G.talking=false;if(!S.gm)return;if(ok){G.i++;gtaObj()}else{toast3('Regresa a la marca para intentarlo otra vez');setTarget()}},50)}));if(!S.busy)G.talking=false}}
function gtaEnd(txt){const G=S.gm;S.gm=null;DB.gta=DB.gta||{done:{}};DB.gta.done=DB.gta.done||{};DB.gta.done[G.m.id]=1;DB.money=(DB.money||0)+G.m.pay;if(typeof addXP==='function')addXP(60);try{save()}catch(e){}
  banner('MISIÓN SUPERADA',`+$${G.m.pay}${txt?' · '+txt:''}`,'#ffd23a');if(typeof confetti==='function')confetti();if(typeof sfx==='function')sfx('win');if(G.n){S.grab=null;G.n.hidden=false}setTimeout(setTarget,2500)}
function setTarget(){if(S.job){S.target=S.job.target;UI.obj(S.job.label);return}
  if(!S.gm&&!S.forced&&W3D.GTA&&W3D.GTA.length){const nx=gtaNext();if(nx)S.gm={m:nx,i:-1,giverStage:true}}
  if(S.gm){gtaTarget();return}
  if(S.forced&&(DB.ms[S.forced.id]||{}).stars>0)S.forced=null;const m=S.forced||(typeof nextMission==='function'?nextMission():null);if(!m){S.target=null;UI.obj('🏆 ¡Terminaste todas las misiones! Pasea por la ciudad.');return}
  if(m.place==='telefono'){S.target={m,phone:true};UI.obj(`📱 Espera la llamada: «${m.t}»`);S.ringAt=S.t+5;return}
  if(m.place==='coche'){S.target={m,car:true};UI.obj(`🚗 Súbete a un carro: «${m.t}»`);return}
  const L=placeLot(m.place)||LOTS.casa;S.target={m,L,x:L.door.x,z:L.door.z};UI.obj(`🎯 ${m.t} · ${L.b.em} ${L.b.name}`);
  const night=['bar','antro','fiesta','calle_noche','estadio'].includes(m.place);S.nightT=night?1:0}
function routePts(ax,az,bx,bz){const sn=v=>Math.round(v/P)*P;const pts=[[ax,az]];const onX=Math.abs(az-sn(az))<Math.abs(ax-sn(ax));
  if(onX){pts.push([ax,sn(az)]);pts.push([sn(bx),sn(az)])}else{pts.push([sn(ax),az]);pts.push([sn(ax),sn(bz)])}
  pts.push([sn(bx),sn(bz)]);const bOnX=Math.abs(bz-sn(bz))<Math.abs(bx-sn(bx));pts.push(bOnX?[bx,sn(bz)]:[sn(bx),bz]);pts.push([bx,bz]);return pts}
function drawRoute(){const r=W3D.ribbon,T=S.target;if(!T||T.x===undefined||S.locked){r.visible=false;W3D.marker.visible=false;return}
  W3D.marker.visible=true;W3D.marker.position.set(T.x,groundY(T.x,T.z),T.z);
  const pts=routePts(PL.pos.x,PL.pos.z,T.x,T.z),pos=[],idx=[];let k=0;
  for(let i=0;i<pts.length-1;i++){const [x0,z0]=pts[i],[x1,z1]=pts[i+1],dx=x1-x0,dz=z1-z0,l=Math.hypot(dx,dz);if(l<.1)continue;const nx=-dz/l*.55,nz=dx/l*.55,y=.24;
    pos.push(x0+nx,y,z0+nz,x0-nx,y,z0-nz,x1+nx,y,z1+nz,x1-nx,y,z1-nz);idx.push(k,k+1,k+2,k+1,k+3,k+2);k+=4}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);r.geometry.dispose();r.geometry=g;r.visible=true;W3D.route=pts}
function startMission(m,cast,runner){if(S.busy)return;if(typeof canRun==='function'&&!canRun()){toast3('El micrófono todavía no está listo. Intenta otra vez en un momento.');return}S.busy=true;const T=S.target;S.grab=null;if(S.grabCar){S.grabCar.hidden=false;S.grabCar=null}
  const L=T&&T.L;const cx=L?L.door.x:PL.pos.x,cz=L?L.door.z:PL.pos.z;
  if(L){PL.pos.set(cx,groundY(cx,cz),cz)}
  const fwd=L?(L.face===0?1:-1):1;const ids=(cast||m.cast).filter(id=>id!=='stanley');
  ids.forEach((id,i)=>{let n=S.job&&S.job.n&&S.job.n.id===id?S.job.n:NPCS.find(x=>x.id===id&&!x.ped);if(!n){n=makePerson(id);n.temp=true;NPCS.push(n)}if(!n.temp)n._back=n.g.position.clone();n.hidden=false;
    const off=(i-(ids.length-1)/2)*1.25;let x=PL.pos.x+off,z=PL.pos.z-fwd*(-2.1);if(S.inCar){const h=S.inCar.h;x=S.inCar.g.position.x-Math.cos(h)*2.4+Math.sin(h)*off;z=S.inCar.g.position.z+Math.sin(h)*2.4+Math.cos(h)*off}n.g.position.set(x,groundY(x,z),z);n.conv=PL.pos.clone();n.goTo=null});
  // Stanley mira hacia la puerta, la gente queda frente a él
  const look=new THREE.Vector3(PL.pos.x,0,PL.pos.z+fwd*2.1);PL.p.face=Math.atan2(look.x-PL.pos.x,look.z-PL.pos.z);S.yaw=PL.p.face+Math.PI;
  frameConv(ids);S.locked=true;UI.hud(false);
  W3D.after=()=>{S.busy=false;S.locked=false;S.conv=null;NPCS.forEach(n=>{n.conv=null;if(n._back){n.g.position.copy(n._back);n._back=null}});
    for(let i=NPCS.length-1;i>=0;i--)if(NPCS[i].temp&&!NPCS[i].keep){scene.remove(NPCS[i].g);NPCS.splice(i,1)}UI.hud(true);setTarget()};
  if(typeof koGen==='function'&&typeof KO!=='undefined'&&KO)(async()=>{for(const st of m.steps.slice(0,8)){if(st.k==='N'){const c=CH(st.who);if(c.voice&&c.voice!=='dog')for(const t of (typeof splitSay==='function'?splitSay(st.en):[st.en]))await koGen(t,c).catch(()=>{})}}})();
  if(runner)runner(m);else if(typeof playFrom==='function')playFrom(m,true)}
function frameConv(ids){const ns=ids.map(id=>NPCS.find(n=>n.id===id)).filter(Boolean);const c=new THREE.Vector3();ns.forEach(n=>c.add(n.g.position));if(ns.length)c.divideScalar(ns.length);else c.set(PL.pos.x-Math.sin(S.yaw)*2,0,PL.pos.z-Math.cos(S.yaw)*2);
  const dx=c.x-PL.pos.x,dz=c.z-PL.pos.z,l=Math.hypot(dx,dz)||1,ux=dx/l,uz=dz/l;
  /* la tarjeta y el micrófono tapan la mitad de abajo: la cámara mira un poco abajo para que la persona quede arriba */
  const D=S.fp?2.4:3.3;const pos=new THREE.Vector3(c.x-ux*D+(S.fp?0:-uz*.7),S.fp?PL.pos.y+1.5:1.55,c.z-uz*D+(S.fp?0:ux*.7));
  const look=new THREE.Vector3(c.x,ns[0]&&ns[0].dog?-.1:.45,c.z);
  S.conv={pos,look};if(!S.convInit){CAMP.copy(camera.position);CAMT.copy(look)}PL.p.g.visible=!S.fp&&!S.inCar}
function checkMission(dt){const T=S.target;if(!T||S.busy||S.locked)return;if(T.gta){gtaTick(dt);return}
  if(T.phone&&S.t>S.ringAt&&S.ringAt>0){S.ringAt=0;UI.ring(T.m)}
  
  if(S.job&&S.job.tick)S.job.tick(dt)}

/* chambas: taxista y policía */
function lotsList(){return Object.values(LOTS).filter(L=>!L.open||L.b.id==='parque')}
function cancelJob(){const J=S.job;S.job=null;if(J&&J.n){J.n.hidden=false;J.n.keep=false;if(J.n.temp){scene.remove(J.n.g);const i=NPCS.indexOf(J.n);if(i>=0)NPCS.splice(i,1)}}}
function chamba(kind){if(S.busy)return;cancelJob();const list=(W3D.CHAMBAS||[]).filter(m=>m.id.startsWith(kind==='taxi'?'taxi':'poli'));if(!list.length){toast3('Todavía no hay viajes. ¡Pronto!');return}
  const m=list.slice().sort((a,b)=>((DB.ms[a.id]||{}).tries||0)-((DB.ms[b.id]||{}).tries||0))[0];
  let car=CARS.find(c=>c.kind===(kind==='taxi'?'taxi':'police')&&!c.ai)||null;
  if(!car){car=makeCar(kind==='taxi'?'taxi':'police',kind==='taxi'?0xffc400:0xf4f4f4);CARS.push(car);const rx=Math.round(PL.pos.x/P)*P,rz=Math.round(PL.pos.z/P)*P;if(Math.abs(PL.pos.x-rx)<Math.abs(PL.pos.z-rz))carAt(car,rx-3,PL.pos.z+6,0);else carAt(car,PL.pos.x+6,rz+3,Math.PI/2)}
  if(kind==='police')car.sirenOn=true;
  const L=pick3(lotsList().filter(x=>Math.hypot(x.door.x-PL.pos.x,x.door.z-PL.pos.z)>60))||lotsList()[0];
  const pass=m.cast.filter(id=>id!=='stanley'&&id!=='davis');const civ=pass[0]||'extrano';
  let n=NPCS.find(x=>x.id===civ&&!x.ped);if(!n){n=makePerson(civ);n.temp=true;NPCS.push(n)}else n._home0=n.home;n.keep=true;n.g.position.set(L.door.x+1.5,.16,L.door.z);n.home={x:L.door.x+1.5,z:L.door.z};
  let dav=null;if(kind==='police'){dav=NPCS.find(x=>x.id==='davis');}
  S.job={kind,m,car,n,stage:0,target:{x:L.door.x,z:L.door.z,L},label:kind==='taxi'?`🚕 Recoge a ${n.c.name} en ${L.b.name}`:`🚓 Llamada: problema en ${L.b.name}. Súbete a la patrulla.`,
    tick(dt){const J=S.job;if(!J)return;const near=Math.hypot(PL.pos.x-J.target.x,PL.pos.z-J.target.z);
      if(J.stage===0&&near<(S.inCar?9:3)&&(!S.inCar||Math.abs(S.inCar.v)<2)){
        if(J.kind==='taxi'&&S.inCar!==J.car){UI.obj('🚕 Vuelve con el taxi para recogerlo');return}
        J.stage=1;if(S.inCar)S.inCar.v=0;const tries0=(DB.ms[J.m.id]||{}).tries||0;S.target={m:J.m,L:J.target.L,x:J.target.x,z:J.target.z};
        const cast=J.m.cast;if(J.kind==='police'&&cast.includes('davis')&&!NPCS.find(x=>x.id==='davis')){}
        W3D.afterJob=()=>{const r=DB.ms[J.m.id]||{};if((r.tries||0)<=tries0||!(r.stars>0)){J.stage=0;S.target=J.target;UI.obj(J.label);return}
          if(J.kind==='taxi'){const DEST={taxi01:'casa',taxi02:'ropa',taxi03:'antro',taxi04:'restaurante',taxi05:'hotel',taxi06:'aeropuerto'};const D=LOTS[DEST[J.m.id]]||pick3(lotsList().filter(x=>x!==J.target.L&&Math.hypot(x.door.x-PL.pos.x,x.door.z-PL.pos.z)>80))||lotsList()[1];J.n.hidden=true;J.stage=2;J.target={x:D.door.x,z:D.door.z,L:D};S.target=J.target;UI.obj(`🚕 Lleva a ${J.n.c.name} a ${D.b.name}`)}
          else endJob('🚓 ¡Caso cerrado, oficial! +40 XP',40)};
        startMission(J.m);return}
      if(J.stage===2&&near<9&&S.inCar&&Math.abs(S.inCar.v)<2){J.n.g.position.set(J.target.x+2,.16,J.target.z);J.n.hidden=false;J.n.home={x:J.target.x+2,z:J.target.z};line(J.n,["Thanks, man! Keep the change.","¡Gracias! Quédate con el cambio.","happy"]);endJob('🚕 ¡Viaje completado! +40 XP · propina 💵',40)}}};
  S.target=S.job.target;UI.obj(S.job.label);UI.phone(false)}
function endJob(msg,xp){const J=S.job;S.job=null;if(xp&&typeof addXP==='function'){addXP(xp);save()}toast3(msg);if(typeof confetti==='function')confetti();if(J&&J.n){J.n.keep=false;J.n.hidden=false}setTarget()}

/* ---------------- interfaz (HUD) ---------------- */
const $3=s=>document.querySelector(s);
function toast3(t){if(typeof toast==='function')toast(t)}
const UI={subWho:null,
  build(app){app.innerHTML=`<div class="w3d" id="w3d"><div class="w3load" id="w3load"><div class="lg"><b>HABLA</b><span>con Emily</span></div><div class="lbar"><u id="w3pct"></u></div><small id="w3msg">Cargando la ciudad…</small></div>
   <div class="w3hud" id="w3hud" hidden>
    <div class="w3top"><canvas id="w3mini" width="220" height="220"></canvas><div class="w3obj" id="w3obj"></div><div class="w3stat" id="w3stat"></div><div class="w3hp" id="w3hp"><u id="w3hpb"></u></div></div>
    <div class="w3arrow" id="w3arrow"><b>➤</b><span id="w3dist"></span></div>
    <div class="w3sub" id="w3sub" hidden></div><button class="w3ko" id="w3ko" hidden></button>
    <div class="w3joy" id="w3joy"><div class="w3knob" id="w3knob"></div></div>
    <div class="w3btns"><button id="b-jump" aria-label="Brincar">⤒<small>Brincar</small></button><button id="b-crouch" aria-label="Agacharse">⤓<small>Agachar</small></button><button id="b-run" aria-label="Correr">🏃<small>Correr</small></button><button id="b-cam" aria-label="Cámara">👁<small>1ª/3ª</small></button></div>
    <button class="w3phone" id="b-phone" aria-label="Teléfono">📱</button>
    <div class="w3ctx" id="w3ctx"></div>
   </div><div class="w3hurt" id="w3hurt"></div><div class="w3ban" id="w3ban" hidden></div><div class="w3ko2" id="w3ko2" hidden><b>😵 NOQUEADO</b><small>Te llevan al hospital…</small></div><div class="w3ph" id="w3ph" hidden></div><div class="w3ring" id="w3ring" hidden></div></div>`;
    const host=$3('#w3d');host.prepend(renderer.domElement);bindControls(host);const ko=$3('#w3ko');if(ko)ko.onclick=()=>{unlock();if(typeof koLoad==='function')koLoad().catch(()=>{})}},
  hud(on){const h=$3('#w3hud');if(h)h.hidden=!on;if(!on){W3D.input.x=W3D.input.y=0;const k=$3('#w3knob');if(k)k.style.transform=''}},
  obj(t){const o=$3('#w3obj');if(o)o.innerHTML=t},
  btn(id,on){const b=$3('#b-'+id);if(b)b.classList.toggle('on',!!on)},
  shake(){const h=$3('#w3d');if(!h)return;h.classList.remove('shake');void h.offsetWidth;h.classList.add('shake')},
  sub(who,en,es){const s=$3('#w3sub');if(!s)return;UI.subWho=who;if(!who){s.hidden=true;return}s.hidden=false;const c=CH(who);
    s.innerHTML=`<b>${escH(c.name||who)}</b> ${wordsHTML(en,who)}${es?`<small>${escH(es)}</small>`:''}`},
  ctx(){const c=$3('#w3ctx');if(!c)return;let h='';
    if(S.locked){c.innerHTML='';return}
    const T=S.target;
    if(S.inCar&&T&&T.car&&!S.job&&Math.abs(S.inCar.v)<1)h+=`<button class="big" data-a="startcar">🎬 Empezar: ${escH(T.m.t)}</button>`;
    if(S.inCar){h+=`<button data-a="exit">🚪 Bajar del carro</button>`;if(S.inCar.kind==='police')h+=`<button data-a="siren">🚨 Sirena</button>`}
    else{if(T&&T.x!==undefined&&!S.job&&!T.gta&&Math.hypot(PL.pos.x-T.x,PL.pos.z-T.z)<3)h+=`<button class="big" data-a="start">🎬 Empezar: ${escH(T.m.t)}</button>`;
      const car=nearCar();if(car)h+=`<button data-a="enter">🚗 Subirte${car.kind==='taxi'?' al taxi':car.kind==='police'?' a la patrulla':''}</button>`;
      const n=S.near;if(n){h+=`<div class="w3who">${escH(n.c.name)}</div><div class="w3row"><button data-a="talk">💬<small>Platicar</small></button><button data-a="grab">${S.grab===n?'✋<small>Soltar</small>':'🤝<small>Del brazo</small>'}</button><button data-a="hug">🤗<small>Abrazar</small></button><button data-a="push">😤<small>Empujar</small></button>${n.dog||n.c.age<13?"":`<button data-a="hit">👊<small>Pegar</small></button>`}<button data-a="num">📱<small>${DB.contacts&&DB.contacts[n.id]?"Agendado":"Su número"}</small></button></div>`}
      else if(S.grab)h+=`<button data-a="grab">✋ Soltar a ${escH(S.grab.c.name)}</button>`}
    if(c._h!==h){c._h=h;c.innerHTML=h;c.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlock();c._h='';act(b.dataset.a)}))}},
  ctxMission(m){const c=$3('#w3ctx');c._h='';c.innerHTML=`<button class="big" data-a="startcar">🎬 Empezar: ${escH(m.t)}</button>`;c.querySelector('button').onclick=()=>{c.innerHTML='';startMission(m)}},
  ring(m){const r=$3('#w3ring');const who=m.cast.find(id=>!CH(id).dog)||m.cast[0];r.hidden=false;r.innerHTML=`<div class="rc"><span class="cap">📱 Llamada entrante</span><b>${escH(CH(who).name)}</b><small>${escH(m.t)}</small><div class="rr"><button class="no">✕</button><button class="yes">📞</button></div></div>`;
    try{for(let i=0;i<3;i++)setTimeout(()=>{if(!r.hidden&&typeof sfx==='function')sfx('combo')},i*900)}catch(e){}
    r.querySelector('.yes').onclick=()=>{unlock();r.hidden=true;S.target={m};startMission(m,[])};r.querySelector('.no').onclick=()=>{r.hidden=true;S.ringAt=S.t+20}},
  gtaList(){const p=$3('#w3ph .scr');if(!p)return;const L=W3D.GTA||[];
    p.innerHTML=`<div class="phbar"><button class="pback" data-b="1">‹ Inicio</button><span>💵 $${DB.money||0}</span></div><div class="pt"><b>🎯 Misiones</b><small>Ve, habla, maneja, compra. Cada una te paga.</small></div>
      <div class="plist">${L.map(m=>{const d=gtaDone(m.id),o=gtaOpen(m);return `<button data-g="${m.id}" class="${o?'':'lk'}"><i>${d?'✅':o?'🅼':'🔒'}</i><span><b>${escH(m.t)}</b><small>${escH(m.brief)}</small></span><em>$${m.pay}</em></button>`}).join('')||'<p>Pronto…</p>'}</div>`;
    p.querySelector('[data-b]').onclick=()=>UI.phone(true);p.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>{const m=L.find(x=>x.id===b.dataset.g);if(!gtaOpen(m)){toast3('🔒 Primero termina la anterior');return}gtaStart(m);UI.phone(false);toast3('🅼 '+m.t)})},
  curso(w){const p=$3('#w3ph .scr');if(!p)return;const ms=typeof MISSIONS!=='undefined'?MISSIONS:[];const W=typeof WORLDS!=='undefined'?WORLDS:[];
    const st=id=>(DB.ms[id]||{}).stars||0,open=m=>typeof msOpen==='function'?msOpen(m):true;
    if(!w){p.innerHTML=`<div class="phbar"><button class="pback" data-b="1">‹ Inicio</button><span></span></div><div class="pt"><b>📚 Tu curso</b><small>8 niveles, de fácil a difícil. Cada nivel repasa lo de antes.</small></div>
      <div class="plist">${W.map(x=>{const L=ms.filter(m=>m.w===x.n),d=L.filter(m=>st(m.id)>0).length,lock=L.length&&!open(L[0]);return `<button data-w="${x.n}" class="${lock?'lk':''}"><i>${lock?'🔒':x.em}</i><span><b>Nivel ${x.n} · ${escH(x.t)}</b><small>${escH(x.d)}</small><u><s style="width:${L.length?Math.round(d/L.length*100):0}%"></s></u></span><em>${d}/${L.length}</em></button>`}).join('')}</div>`;
      p.querySelector('[data-b]').onclick=()=>UI.phone(true);p.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>UI.curso(+b.dataset.w));return}
    const X=W.find(x=>x.n===w)||{t:''},L=ms.filter(m=>m.w===w);
    p.innerHTML=`<div class="phbar"><button class="pback" data-b="1">‹ Curso</button><span></span></div><div class="pt"><b>${escH(X.em||'')} Nivel ${w}</b><small>${escH(X.t)}</small></div>
      <div class="plist">${L.map(m=>{const o=open(m),s=st(m.id);return `<button data-m="${m.id}" class="${o?'':'lk'}"><i>${o?(s?'⭐'.repeat(s):'▶️'):'🔒'}</i><span><b>${m.o}. ${escH(m.t)}</b><small>${escH(m.n||'')}</small></span></button>`}).join('')}</div>`;
    p.querySelector('[data-b]').onclick=()=>UI.curso();p.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{const m=ms.find(x=>x.id===b.dataset.m);if(!m)return;if(!open(m)){toast3('🔒 Primero pasa la misión anterior');return}
      cancelJob();S.gm=null;S.forced=m;setTarget();UI.phone(false);toast3('🎯 GPS puesto: '+m.t)})},
  contacts(){const p=$3('#w3ph .scr');if(!p)return;const C=Object.entries(DB.contacts||{});
    p.innerHTML=`<div class="phbar"><button class="pback" data-b="1">‹ Inicio</button><span></span></div><div class="pt"><b>📇 Contactos</b><small>${C.length?'Llámales o queda de verte con ellos.':'Acércate a la gente y toca «📱 Su número».'}</small></div>
      <div class="plist">${C.map(([id])=>{const c=CH(id),r=(DB.rel&&DB.rel[id])||0;return `<div class="ct"><i>${escH((c.name||id)[0])}</i><span><b>${escH(c.name||id)}</b><small>${r>0?'❤️'.repeat(Math.min(5,Math.ceil(r/4))):'🤍'} ${r}</small></span><button data-call="${id}">📞</button><button data-meet="${id}">📍</button></div>`}).join('')}</div>`;
    p.querySelector('[data-b]').onclick=()=>UI.phone(true);p.querySelectorAll('[data-call]').forEach(b=>b.onclick=()=>{unlock();phoneCall(b.dataset.call)});p.querySelectorAll('[data-meet]').forEach(b=>b.onclick=()=>{unlock();meetUp(b.dataset.meet)})},
  phone(on){const p=$3('#w3ph');if(!p)return;if(on===undefined)on=p.hidden;p.hidden=!on;if(!on)return;
    const ms=typeof MISSIONS!=='undefined'?MISSIONS:[];const nx=typeof nextMission==='function'?nextMission():null;
    p.innerHTML=`<div class="scr"><div class="pbar"><span>${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span><span>📶 🔋</span></div>
     <div class="pt">${nx?`<b>Siguiente misión</b><small>${escH(nx.t)}</small>`:'<b>¡Ciudad libre!</b>'}</div>
     <div class="apps">${[['miss','🎯','Misiones'],['taxi','🚕','Taxista'],['poli','🚓','Policía'],['night','🌙','Día/Noche'],['cam','👁','Cámara'],['voz','🔊','Voces'],['cur','📚','Curso'],['con','📇','Contactos'],['pil','🏛️','Pilares'],['gen','👥','Gente'],['yo','🙂','Yo']].map(([k,i,n])=>`<button data-p="${k}"><i>${i}</i><span>${n}</span></button>`).join('')}</div>
     <button class="home" data-p="close"></button></div>`;
    p.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{unlock();const k=b.dataset.p;
      if(k==='close')UI.phone(false);else if(k==='taxi')chamba('taxi');else if(k==='poli')chamba('police');else if(k==='night'){S.nightT=S.nightT>.5?0:1}else if(k==='cam'){toggleCam()}
      else if(k==='voz'){if(typeof koLoad==='function')koLoad().then(()=>toast3('¡Voces humanas listas!')).catch(()=>toast3('No se pudieron bajar las voces'))}
      else if(k==='miss')UI.gtaList();else if(k==='cur')UI.curso();else if(k==='con')UI.contacts();else{UI.phone(false);const v={les:'mundos',pil:'pilares',gen:'gente',yo:'yo'}[k];W3D.leave();go(v)}})}};
function sub(who,en,es){UI.sub(who,en,es)}
const escH=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function wordsHTML(en,who){return String(en).split(/(\s+)/).map(w=>/\S/.test(w)?`<span class="tw" data-who="${who}" data-w="${escH(w.replace(/[^\w'’-]/g,''))}">${escH(w)}</span>`:w).join('')}
function unlock(){try{if(typeof unlockAudio==='function')unlockAudio()}catch(e){}}
function nearCar(){let best=null,bd=3.6;for(const c of CARS){const d=Math.hypot(c.g.position.x-PL.pos.x,c.g.position.z-PL.pos.z);if(d<bd){bd=d;best=c}}return best}
function act(a){if(a==='start'||a==='startcar'){const T=S.target;if(T&&T.m)startMission(T.m)}
  else if(a==='enter'){const c=nearCar();if(!c)return;if(S.grab){S.grab.hidden=true;S.grabCar=S.grab;S.grab=null}c.wasAI=c.wasAI||c.ai;c.ai=false;c.v=0;S.inCar=c;PL.p.g.visible=false;S.crouch=false;UI.btn('crouch',false);UI.ctx()}
  else if(a==='exit'){const c=S.inCar;if(!c)return;S.inCar=null;c.v=0;const x=c.g.position.x+Math.cos(c.h)*-1.8,z=c.g.position.z+Math.sin(c.h)*1.8;PL.pos.set(x,0,z);S.y=groundY(x,z);collide(PL.pos,.35);PL.p.g.visible=!S.fp;S.yaw=c.h+Math.PI;
    if(S.grabCar){const g=S.grabCar;g.hidden=false;g.g.position.set(x+.8,0,z+.8);S.grab=g;S.grabCar=null}if(eng)eng.g.gain.value=0;if(c.wasAI&&!S.job)setTimeout(()=>{if(S.inCar!==c){c.ai=true;c.v=0;const D=DIRS[c.dir],q=c.g.position;if(D[0])q.z=laneOf(c.dir,Math.round(q.z/P));else q.x=laneOf(c.dir,Math.round(q.x/P))}},4000);UI.ctx()}
  else if(a==='siren'&&S.inCar){S.inCar.sirenOn=!S.inCar.sirenOn}
  else if(a==='talk'){const n=S.near;if(!n||typeof freeChat!=='function')return;S.busy=true;n.conv=PL.pos.clone();PL.p.face=Math.atan2(n.g.position.x-PL.pos.x,n.g.position.z-PL.pos.z);frameConv([n.id]);S.locked=true;UI.hud(false);
    W3D.after=()=>{S.busy=false;S.locked=false;S.conv=null;n.conv=null;UI.hud(true)};freeChat(n.id)}
  else if(a==='num')askNumber(S.near);
  else if(a==='hit')punch(S.near);
  else offScript(a)}
function toggleCam(){S.fp=!S.fp;UI.btn('cam',S.fp)}
function bindControls(host){const joy=$3('#w3joy'),knob=$3('#w3knob');let jid=null,jx=0,jy=0;const R=52;
  joy.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlock();jid=e.pointerId;joy.setPointerCapture(jid);const r=joy.getBoundingClientRect();jx=r.left+r.width/2;jy=r.top+r.height/2;mv(e)});
  const mv=e=>{if(e.pointerId!==jid)return;let dx=e.clientX-jx,dy=e.clientY-jy;const l=Math.hypot(dx,dy);if(l>R){dx*=R/l;dy*=R/l}knob.style.transform=`translate(${dx}px,${dy}px)`;W3D.input.x=dx/R;W3D.input.y=-dy/R};
  joy.addEventListener('pointermove',mv);const up=e=>{if(e.pointerId!==jid)return;jid=null;knob.style.transform='';W3D.input.x=W3D.input.y=0};joy.addEventListener('pointerup',up);joy.addEventListener('pointercancel',up);joy.addEventListener('lostpointercapture',e=>{jid=e.pointerId;up(e)});
  /* mirar: arrastra un dedo en cualquier parte libre de la pantalla (funciona junto con el control) */
  const lookBy=(dx,dy)=>{if(S.locked)return;S.lookAt=S.t;if(S.inCar&&!S.fp){S.freeYaw=(S.freeYaw||0)-dx*.008;S.freeAt=S.t}else{S.yaw-=dx*.0085;S.pitch=clamp(S.pitch-dy*.006,-1.1,.9)}};
  const free=t=>!(t.closest&&t.closest('button,.w3joy,.w3ph,.w3ring,.w3ctx,.w3top'));const T={};
  host.addEventListener('touchstart',e=>{for(const t of e.changedTouches)if(free(t.target)){T[t.identifier]={x:t.clientX,y:t.clientY};unlock()}},{passive:true});
  host.addEventListener('touchmove',e=>{let used=false;for(const t of e.changedTouches){const o=T[t.identifier];if(!o)continue;lookBy(t.clientX-o.x,t.clientY-o.y);o.x=t.clientX;o.y=t.clientY;used=true}if(used&&e.cancelable)e.preventDefault()},{passive:false});
  const tend=e=>{for(const t of e.changedTouches)delete T[t.identifier]};host.addEventListener('touchend',tend);host.addEventListener('touchcancel',tend);
  const cv=renderer.domElement;let lid=null,lx=0,ly=0;
  cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;unlock();lid=e.pointerId;lx=e.clientX;ly=e.clientY;cv.setPointerCapture(lid)});
  cv.addEventListener('pointermove',e=>{if(e.pointerId!==lid)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;lookBy(dx,dy)});
  const lu=e=>{if(e.pointerId===lid)lid=null};cv.addEventListener('pointerup',lu);cv.addEventListener('pointercancel',lu);
  const tap=(id,f)=>{const b=$3('#b-'+id);b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();unlock();f()})};
  tap('jump',jump);tap('crouch',crouch);tap('run',()=>{S.run=!S.run;UI.btn('run',S.run)});tap('cam',toggleCam);tap('phone',()=>UI.phone());
  if(!W3D._keys){W3D._keys=true;
    addEventListener('keydown',e=>{if(!W3D.on||/INPUT|TEXTAREA/.test(e.target.tagName))return;S.keys[e.code]=true;if(e.code==='Space'&&!S.inCar){e.preventDefault();jump()}if(e.code==='KeyC')crouch();if(e.code==='KeyQ'&&S.near)punch(S.near);if(e.code==='KeyV')toggleCam();if(e.code==='KeyF')act(S.inCar?'exit':nearCar()?'enter':'talk');if(e.code==='KeyE'){const b=$3('#w3ctx button');if(b)b.click()}});
    addEventListener('keyup',e=>{S.keys[e.code]=false})}}
function drawMini(){const c=$3('#w3mini');if(!c)return;const g=c.getContext('2d'),W=c.width,sc=W/110,cx=PL.pos.x,cz=PL.pos.z;g.clearRect(0,0,W,W);
  g.save();g.beginPath();g.arc(W/2,W/2,W/2,0,7);g.clip();g.fillStyle='rgba(30,36,46,.92)';g.fillRect(0,0,W,W);
  g.translate(W/2,W/2);g.rotate(S.inCar?S.inCar.h+Math.PI:S.yaw);g.scale(sc,sc);g.translate(-cx,-cz);
  g.fillStyle='#596273';for(let k=0;k<=NC;k++){g.fillRect(k*P-RH,-40,RH*2,CITYW+80);g.fillRect(-40,k*P-RH,CITYW+80,RH*2)}
  g.fillStyle='#3b4250';SOLIDS.forEach(b=>g.fillRect(b.x0,b.z0,b.x1-b.x0,b.z1-b.z0));
  Object.values(LOTS).forEach(L=>{if(L.open){g.fillStyle=L.b.id==='playa'?'#cdb57e':'#3c7a3c';g.fillRect(L.x0,L.z0,L.x1-L.x0,L.z1-L.z0)}});
  if(W3D.route){g.strokeStyle='#c94dff';g.lineWidth=3.2;g.beginPath();W3D.route.forEach(([x,z],i)=>i?g.lineTo(x,z):g.moveTo(x,z));g.stroke()}
  NPCS.forEach(n=>{g.fillStyle=n.c.gender==='f'?'#ff7eb3':'#7ec8ff';g.beginPath();g.arc(n.g.position.x,n.g.position.z,1.4,0,7);g.fill()});
  const T=S.target;if(T&&T.x!==undefined){g.fillStyle='#ffd23a';g.beginPath();g.arc(T.x,T.z,3.4,0,7);g.fill()}
  g.restore();g.fillStyle='#fff';g.beginPath();g.moveTo(W/2,W/2-9);g.lineTo(W/2+6,W/2+7);g.lineTo(W/2,W/2+3);g.lineTo(W/2-6,W/2+7);g.closePath();g.fill();
  g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=3;g.beginPath();g.arc(W/2,W/2,W/2-2,0,7);g.stroke()}
function hudTick(){const kp=$3('#w3ko');if(kp&&typeof koState!=='undefined'){const st=koState;kp.hidden=st==='ready'&&!kp._show;kp.textContent=st==='loading'?`🎙️ Bajando voces humanas… ${koPct}%`:st==='error'?'🎙️ Voces humanas: toca para reintentar':'🎙️ Voces humanas listas';if(st==='ready'&&!kp._done){kp._done=1;kp._show=1;setTimeout(()=>{kp._show=0},3000)}}
const T=S.target,a=$3('#w3arrow');if(a){if(T&&T.x!==undefined&&!S.locked){const dx=T.x-PL.pos.x,dz=T.z-PL.pos.z,d=Math.hypot(dx,dz);const fy=S.inCar?S.inCar.h:S.yaw+Math.PI;const ang=Math.atan2(dx,dz)-fy;
    a.hidden=false;a.querySelector('b').style.transform=`rotate(${-ang*180/Math.PI-90}deg)`;$3('#w3dist').textContent=d<1000?Math.round(d)+' m':''}else a.hidden=true}
  const st=$3('#w3stat');if(st&&typeof DB!=='undefined'){const s=typeof streak==='function'?streak():0;const v=S.inCar?Math.round(Math.abs(S.inCar.v)*3.6)+' km/h':'';st.innerHTML=`<span>💵 $${DB.money||0}</span><span>⭐ ${DB.xp}</span><span>🔥 ${s}</span>${S.wanted?`<span class="wan">${'🚨'.repeat(S.wanted)}</span>`:''}${v?`<span>${v}</span>`:''}`}const hb=$3('#w3hpb');if(hb){const h=S.hp==null?100:S.hp;hb.style.width=h+'%';hb.style.background=h>50?'#30d158':h>25?'#ffd23a':'#ff453a'}}

/* ---------------- ciclo principal ---------------- */
function nearestNPC(){let best=null,bd=2.4;for(const n of NPCS){if(!n.g.visible)continue;const d=Math.hypot(n.g.position.x-PL.pos.x,n.g.position.z-PL.pos.z);if(d<bd){bd=d;best=n}}return best}
function frame(dt){S.t+=dt;
  if(Math.abs(S.night-S.nightT)>.001){S.night=lerp(S.night,S.nightT,Math.min(1,dt*.8));if(Math.abs(S.night-S.nightT)<.01)S.night=S.nightT;applyTime()}
  if(S.inCar)driveCar(S.inCar,dt);else movePlayer(dt);
  if(S.freeYaw&&S.t-(S.freeAt||0)>1.5)S.freeYaw=lerp(S.freeYaw,0,dt*3);
  for(const c of CARS)if(c.ai)aiCar(c,dt);
  for(const n of NPCS){npcAI(n,dt);const d=n.g.position.distanceTo(PL.pos),dc=n.g.position.distanceTo(camera.position);n.g.visible=!n.hidden&&(d<(n.ped||n.stand?46:80)||!!n.conv||!!n.mood);const sh=d<30;if(n._sh!==sh){n._sh=sh;n.g.traverse(o=>{if(o.isMesh)o.castShadow=sh})}n.tag.visible=d<14&&dc>2.6&&!S.locked;if(dc<2.2)n.emo.visible=false;
    if(n.bounce>0){n.bounce-=dt;n.g.position.y=groundY(n.g.position.x,n.g.position.z)+Math.abs(Math.sin(n.bounce*14))*.12}
    if(n.emoT>0){n.emoT-=dt;if(n.emoT<=0)n.emo.visible=false}
    if(n.g.visible&&(d<24||(d<46&&((S.fr|0)+n.id.length)%3===0)))animate(n,d<24?dt:dt*3)}
  S.fr=(S.fr|0)+1;
  animate(PL.p,dt);if(PL.p.emoT>0){PL.p.emoT-=dt;if(PL.p.emoT<=0)PL.p.emo.visible=false}PL.p.tag.visible=false;
  {const keep=S.near&&!S.inCar&&!S.locked&&S.near.g.visible&&Math.hypot(S.near.g.position.x-PL.pos.x,S.near.g.position.z-PL.pos.z)<3.3;S.near=S.inCar||S.locked?null:keep?S.near:nearestNPC()}
  if(S.t-S.routeAt>.5){S.routeAt=S.t;drawRoute();UI.ctx();hudTick()}
  if(W3D.marker.visible){W3D.marker.userData.ar.position.y=3.2+Math.sin(S.t*3)*.25;W3D.marker.userData.ar.rotation.y+=dt*2}
  checkMission(dt);ambient(dt);
  if(!S.ko&&(S.hp==null||S.hp<100)&&S.t-(S.hpAt||0)>4)S.hp=Math.min(100,(S.hp==null?100:S.hp)+dt*6);
  if(S.wanted&&S.t-(S.wantedAt||0)>40&&!S.cop)S.wanted=0;
  if(S.punchAt&&S.t-S.punchAt<.3&&PL.p.arm){const k=Math.sin((S.t-S.punchAt)/.3*Math.PI);PL.p.arm.rotation.x-=k*1.1;PL.p.fore.rotation.x-=k*.2}
  for(const n of NPCS)if(n.lunge>0){n.lunge-=dt;const f=n.face;n.g.position.x+=Math.sin(f)*Math.sin(n.lunge*12)*.02;n.g.position.z+=Math.cos(f)*Math.sin(n.lunge*12)*.02}
  updateCamera(dt);
  sun.position.set(PL.pos.x+SUNV.x*120,SUNV.y*120+10,PL.pos.z+SUNV.z*120);sun.target.position.copy(PL.pos);
  drawMini();renderer.render(scene,camera)}
function loop(){if(!W3D.on||W3D.manual)return;S.raf=requestAnimationFrame(loop);if(!renderer.domElement.isConnected){const h=$3('#w3d');if(h){h.prepend(renderer.domElement);resize()}else{W3D.on=false;return}}
  const dt=Math.min(.05,clock.getDelta());frame(dt)}
W3D.step=(dt)=>frame(dt||1/30);
function resize(){const host=renderer.domElement.parentElement;if(!host)return;const w=host.clientWidth||innerWidth,h=host.clientHeight||innerHeight;renderer.setSize(w,h,false);renderer.domElement.style.width=w+'px';renderer.domElement.style.height=h+'px';camera.aspect=w/h;camera.updateProjectionMatrix()}
addEventListener('resize',()=>{if(renderer)resize()});

/* ---------------- arranque ---------------- */
let booting=null;
async function boot(app,onp){initRenderer();await loadModels(onp);
  W3D.aoTex=await new THREE.TextureLoader().loadAsync(BASE+'modelos/ferrari_ao.png');
  buildCity();spawnTraffic(14);
  // la gente del barrio, cada quien en su lugar
  const home=typeof HOME!=='undefined'?HOME:{};
  Object.entries(home).forEach(([id,h])=>{const L=LOTS[h];if(!L)return;const n=makePerson(id);const x=L.door.x+rnd(-4,4),z=L.door.z+(L.open?-3:0);n.g.position.set(x,groundY(x,z),z);n.home={x,z};n.face=L.face;NPCS.push(n);
    if(id==='chloe')n.base='dance'});
  // peatones
  const NF=["Ashley","Brittany","Kayla","Jessica","Megan","Tiffany","Maria","Lupita","Keisha","Amber","Vanessa","Sarah","Daniela","Monique"],NM=["Tyler","Josh","Kevin","DeShawn","Luis","Ryan","Derek","Andre","Kyle","Mateo","Brandon","Chris","Jamal","Diego"];
  const FV=['af_bella','af_heart','af_nicole','af_heart','af_bella','af_nicole'],MV=['am_michael','am_fenrir','am_puck','am_echo','am_eric','am_liam','am_onyx'];
  const SH=['#E5484D','#3557FF','#12A150','#F5B400','#7C4DFF','#FF7EB3','#222','#eee','#0E7490','#9A3412'];
  const NPED=56;if(typeof EXTRAS!=='undefined')for(let i=0;i<NPED;i++){const f=i%2===0,nm=(f?NF:NM)[(Math.floor(i/2)*5)%14]+(i>=28?' '+'JMRTKDSLBC'[i%10]+'.':'');EXTRAS['ped'+i]={name:nm,gender:f?'f':'m',age:20+(i*7)%26,skin:'moreno',voice:(f?FV:MV)[i%(f?6:7)],speed:1,shirt:SH[i%SH.length],fillers:f?["Like,","Oh my God,","Girl,"]:["Bro,","Dude,","Yo,"],es:'Vive en la ciudad'}}
  const ex=Array.from({length:NPED},(_,i)=>typeof EXTRAS!=='undefined'?'ped'+i:'extrano');
  const lots=Object.values(LOTS).filter(L=>!L.open);
  for(let i=0;i<NPED;i++){const n=makePerson(ex[i]);
    if(i%4===3&&lots.length){/* grupitos platicando afuera de los lugares */const L=lots[(i>>2)%lots.length],a=(i%3)*2.1;const x=L.door.x+6+Math.cos(a)*1.1,z=L.door.z+(L.face===0?1.2:-1.2)+Math.sin(a)*.6;n.g.position.set(x,.16,z);n.home={x,z};n.stand=true;n.face=Math.atan2(L.door.x+6-x,L.door.z-z);NPCS.push(n);continue}
    const ci=i%NC,cj=Math.floor(i/NC)%NC;const x0=ci*P+RH+1.6,z0=cj*P+RH+1.6,x1=(ci+1)*P-RH-1.6,z1=(cj+1)*P-RH-1.6;
    n.ped={x0,z0,x1,z1,len:2*(x1-x0+z1-z0)/40};n.lt=Math.random();n.spd=rnd(1.1,1.6);NPCS.push(n)}
  // Stanley
  PL.p=makePerson('stanley');PL.p.g.traverse(o=>{if(o.isBone&&/RightArm$/.test(o.name))PL.p.arm=o;if(o.isBone&&/RightForeArm$/.test(o.name))PL.p.fore=o});const pos=DB.pos3,L=LOTS.casa;if(pos&&isFinite(pos.x)){PL.pos.set(pos.x,0,pos.z);S.yaw=pos.yaw||0}else{PL.pos.set(L.door.x-9,0,L.door.z-3.5);S.yaw=Math.PI*.75}
  // tu carro estacionado
  const mine=makeCar('normal',0x1d4ed8);CARS.push(mine);carAt(mine,L.door.x+8,Math.round(L.door.z/P)*P+3.2,Math.PI/2);
  W3D.CHAMBAS=typeof parseMissions==='function'?parseMissions(window.CHAMBA_TXT||[]):[];W3D.GTA=parseGTA(window.GTA_TXT||[]);
  W3D.ready=true}
W3D.mount=function(app){if(typeof stopCity2D==='function'&&typeof CITY!=='undefined'&&CITY.raf)cancelAnimationFrame(CITY.raf);
  if(W3D.ready&&$3('#w3d')){W3D.resume();return}
  if(!booting){const tmp=document.createElement('div');booting=(async()=>{if(!renderer)initRenderer();})()}
  if(!renderer)initRenderer();UI.build(app);resize();
  if(!W3D.ready){const pct=$3('#w3pct'),msg=$3('#w3msg');
    (W3D._boot=W3D._boot||boot(app,f=>{if(pct)pct.style.width=Math.round(f*100)+'%'})).then(()=>{const l=$3('#w3load');if(l)l.remove();UI.hud(true);W3D.resume()}).catch(e=>{console.error(e);if(msg)msg.textContent='No se pudo cargar el 3D: '+(e.message||e)});return}
  const l=$3('#w3load');if(l)l.remove();UI.hud(true);W3D.resume()};
W3D.resume=function(){const h=$3('#w3d');if(!h)return;if(!renderer.domElement.isConnected)h.prepend(renderer.domElement);resize();W3D.on=true;if(typeof CITY!=='undefined')CITY.on=true;
  if(W3D.after){const f=W3D.after;W3D.after=null;f()}if(W3D.afterJob){const f=W3D.afterJob;W3D.afterJob=null;f()}
  if(!S.target&&!S.job)setTarget();clock.getDelta();cancelAnimationFrame(S.raf);loop()};
W3D.leave=function(){W3D.on=false;if(typeof CITY!=='undefined')CITY.on=false;cancelAnimationFrame(S.raf);if(typeof DB!=='undefined'){DB.pos3={x:PL.pos.x,z:PL.pos.z,yaw:S.yaw};try{save()}catch(e){}}};
W3D.emo=(id,emo)=>{const p=id==='stanley'?PL.p:NPCS.find(n=>n.id===id);if(!p)return;showEmo(p,emo);if(emo==='angry')gesture(p,'headShake');else if(emo==='laugh'||emo==='happy'||emo==='flirty')gesture(p,'agree',1.2);else if(emo==='sad'||emo==='cry')gesture(p,'sad_pose',3);else if(emo==='surprised'||emo==='scared')p.bounce=.4};
W3D.talk=(id,on)=>{const p=id==='stanley'?PL.p:NPCS.find(n=>n.id===id);if(p)p.talk=on?1:0;if(on&&S.conv&&p&&p!==PL.p&&!S.fp){/* mira a quien habla */const ns=NPCS.filter(n=>n.conv);if(ns.length>1){S.conv.look.set(p.g.position.x,.15,p.g.position.z)}}};
W3D.S=S;W3D.PL=PL;W3D.NPCS=NPCS;W3D.CARS=CARS;W3D.LOTS=LOTS;W3D.act=act;W3D.chamba=chamba;W3D.cam=toggleCam;W3D.jump=jump;W3D.crouch=crouch;W3D.offScript=offScript;W3D.setTarget=setTarget;W3D.startMission=startMission;

/* se conecta con el juego: la vista «ciudad» ahora es 3D */
function webglOK(){try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch(e){return false}}
if(webglOK()&&!/[?&]2d\b/.test(location.search)){
  window.stopCity2D=window.stopCity;
  window.renderCiudad=function(app){const t=document.querySelector('#tabs');if(t)t.style.display='none';W3D.mount(app)};
  window.stopCity=function(){if(running||S.busy){/* hay sesión: el 3D sigue vivo detrás */return}W3D.leave()};
  if(typeof CITY!=='undefined'&&CITY.on&&typeof stopCity2D==='function'){try{stopCity2D()}catch(e){}}
  if(typeof view!=='undefined'&&view==='ciudad'&&!running)render();
}

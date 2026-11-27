/* =====================================================================
   LOS PILARES DEL INGLÉS: cada palabra con su color y el Templo
   ===================================================================== */
const TAGS={adj:{n:"Adjetivo",c:"#F5B400",em:"🟨"},noun:{n:"Sustantivo",c:"#3B6FF5",em:"🟦"},verb:{n:"Verbo",c:"#E5484D",em:"🟥"},adv:{n:"Adverbio",c:"#12A150",em:"🟩"},
 pron:{n:"Pronombre",c:"#9B59FF",em:"🟪"},prep:{n:"Preposición",c:"#7F8C9A",em:"⬜"},conj:{n:"Conector",c:"#FF8A00",em:"🟧"},inter:{n:"Muletilla / jerga",c:"#FF3D7F",em:"🩷"},
 det:{n:"Artículo / determinante",c:"#A0A0AA",em:"▫️"},num:{n:"Número",c:"#A0A0AA",em:"🔢"}};
const HAS_P=typeof PALABRAS!=="undefined",HAS_PIL=typeof PILARES!=="undefined";
function tagOf(w){const k=w.toLowerCase().replace(/[’]/g,"'").replace(/^'+|'+$/g,"");if(!k)return null;
  if(HAS_P&&PALABRAS[k])return PALABRAS[k];
  if(/^\d+$/.test(k))return ["num",""];if(/ly$/.test(k))return ["adv",""];if(/(ing|ed)$/.test(k))return ["verb",""];if(/(ful|ous|ive|able|y)$/.test(k))return ["adj",""];return ["noun",""]}
function colorize(en){return en.split(/(\s+)/).map(tok=>{if(/^\s+$/.test(tok))return tok;const m=tok.match(/^([^A-Za-z0-9']*)([A-Za-z0-9'’-]+)([^A-Za-z0-9']*)$/);if(!m)return esc(tok);
  const t=tagOf(m[2]);if(!t)return esc(tok);const tags=t[0].split("+"),c1=(TAGS[tags[0]]||TAGS.noun).c,c2=(TAGS[tags[1]]||TAGS[tags[0]]||TAGS.noun).c;
  const st=tags.length>1?`background-image:linear-gradient(90deg,${c1} 50%,${c2} 50%)`:`background-image:linear-gradient(${c1},${c1})`;
  return `${esc(m[1])}<span class="pw" style="${st};--c:${c1}" data-w="${esc(m[2])}">${esc(m[2])}</span>${esc(m[3])}`}).join("")}
function legendOf(en){const s=new Set();en.split(/\s+/).forEach(w=>{const t=tagOf(w.replace(/[^A-Za-z0-9'’-]/g,""));if(t)t[0].split("+").forEach(x=>{if(TAGS[x]&&!["det","num"].includes(x))s.add(x)})});
  return `<div class="plegend">${["adj","noun","verb","adv","pron","prep","conj","inter"].filter(x=>s.has(x)).map(x=>`<span style="--c:${TAGS[x].c}">${TAGS[x].n}</span>`).join("")}</div>`}
/* tocar una palabra: qué es y qué significa */
document.addEventListener("click",e=>{const w=e.target.closest&&e.target.closest(".pw");if(!w)return;const t=tagOf(w.dataset.w)||["noun",""];
  const names=t[0].split("+").map(x=>(TAGS[x]||TAGS.noun).em+" "+(TAGS[x]||TAGS.noun).n).join(" + ");toast(`${w.dataset.w} → ${names}${t[1]?" · "+t[1]:""}`);
  try{unlockAudio();stopVoice();slowNext=true;say(w.dataset.w,"stanley")}catch(_){}});
/* tocar cualquier palabra que dice tu compañero (o tú) y se escucha con su voz */
document.addEventListener("click",e=>{const w=e.target.closest&&e.target.closest(".tw");if(!w||!w.dataset.w)return;e.stopPropagation();
  w.classList.remove("hit");void w.offsetWidth;w.classList.add("hit");try{unlockAudio();stopVoice();slowNext=true;say(w.dataset.w,w.dataset.who||"emily")}catch(_){}},true);

/* ---------- el Templo ---------- */
const TEMPLE_DEMO={adj:"HAPPY",noun:"STUDENTS",verb:"LEARN",adv:"FAST",pron:"I · YOU",prep:"IN · AT",conj:"AND · BUT",inter:"YO · LIKE"};
function usedWords(tag){const out=new Map();Object.values(DB.items||{}).forEach(it=>{if(!(it.ok>0))return;it.y.en.split(/\s+/).forEach(w=>{const k=w.toLowerCase().replace(/[^a-z0-9'’-]/g,"");const t=tagOf(k);if(t&&t[0].split("+").includes(tag))out.set(k,t[1])})});return [...out.entries()]}
function renderPilares(app){
  const pil=HAS_PIL?PILARES:[];
  app.innerHTML=`<div class="page"><h1 class="large">🏛️ Los pilares</h1>
   <p class="sub">No necesitas mil reglas. Con <b>4 pilares</b> armas casi cualquier frase: <b style="color:${TAGS.adj.c}">adjetivos</b>, <b style="color:${TAGS.noun.c}">sustantivos</b>, <b style="color:${TAGS.verb.c}">verbos</b> y <b style="color:${TAGS.adv.c}">adverbios</b>. Los otros 4 son el pegamento y el sabor nativo.</p>
   <div class="temple"><div class="roof">HAPPY STUDENTS LEARN FAST</div>
     <div class="cols">${["adj","noun","verb","adv"].map((t,i)=>`<button class="col" data-t="${t}" style="--c:${TAGS[t].c};animation-delay:${i*.12}s"><span class="cap2">${TEMPLE_DEMO[t]}</span><span class="shaft"><span class="band">${TAGS[t].n}s</span></span><span class="base"></span></button>`).join("")}</div>
     <div class="steps"><i></i><i></i><i></i></div></div>
   <div class="sec-mini">Y los otros 4 pilares, igual de importantes:</div>
   <div class="cols small">${["pron","prep","conj","inter"].map((t,i)=>`<button class="col" data-t="${t}" style="--c:${TAGS[t].c};animation-delay:${.5+i*.1}s"><span class="cap2">${TEMPLE_DEMO[t]}</span><span class="shaft"><span class="band">${t==="inter"?"Muletillas":TAGS[t].n+(t==="prep"?"es":"s")}</span></span><span class="base"></span></button>`).join("")}</div>
   <div class="card sub" style="font-size:.92rem">💡 En las misiones, lo que dices sale <b>pintado</b> con estos colores. Toca cualquier palabra para ver qué es y qué significa.</div>
   ${typeof NATIVO!=="undefined"?nativoCardHTML():""}${typeof oyeCardHTML==="function"?oyeCardHTML():""}</div>`;
  app.querySelectorAll(".col").forEach(b=>b.onclick=()=>pillarSheet(b.dataset.t));if(typeof bindNativo==="function")bindNativo();if(typeof bindOye==="function")bindOye()}
function pillarSheet(tag){const p=HAS_PIL?PILARES.find(x=>x.tag===tag):null,T=TAGS[tag],used=usedWords(tag);
  sheet(`<div class="pilhead" style="--c:${T.c}"><span class="big">${p?p.em:T.em}</span><div><h3>${esc(p?p.nombre:T.n)}</h3><span class="sub">${esc(p?p.en:"")}</span></div></div>
   ${p?`<p>${esc(p.que)}</p><div class="card" style="display:grid;gap:4px"><span class="cap">🗣️ Así lo hacen los nativos</span><p>${esc(p.truco)}</p></div>
   <div class="card" style="display:grid;gap:4px"><span class="cap">Ejemplo</span><div class="tri"><span class="k">✍️ Se escribe</span><span class="v fo">${esc(formal(p.ejemplo.en))}</span><span class="k">🗣️ Los nativos dicen</span><span class="v en">${colorize(p.ejemplo.en)}</span><span class="k">👄 Se lee</span><span class="v pr">${esc(p.ejemplo.pr)}</span><span class="k">🇲🇽 Significa</span><span class="v es">${esc(p.ejemplo.es)}</span></div>
     <button class="btn small ghost" id="pex">🔊 Escuchar</button></div>
   <span class="cap">Las 20 más usadas</span><div class="pgrid">${p.top.map(w=>`<button class="pword" data-say="${esc(w[0])}" style="--c:${T.c}"><b>${esc(w[0])}</b><small>${esc(w[1])}</small><i>${esc(w[2])}</i></button>`).join("")}</div>`:`<p class="sub">Cargando el contenido de este pilar…</p>`}
   <span class="cap">Las que ya dijiste en tus misiones (${used.length})</span>
   ${used.length?`<div class="chips">${used.slice(0,60).map(([w,es])=>`<span class="chip" style="background:color-mix(in srgb,${T.c} 18%,transparent);color:${T.c}" title="${esc(es)}">${esc(w)}</span>`).join("")}</div>`:`<p class="sub">Todavía ninguna. ¡Juega misiones y se van llenando!</p>`}`,
   el=>{const b=el.querySelector("#pex");if(b)b.onclick=()=>{unlockAudio();say(p.ejemplo.en,"emily","happy")};el.querySelectorAll("[data-say]").forEach(x=>x.onclick=()=>{unlockAudio();say(x.dataset.say,"emily","happy")})})}

/* =====================================================================
   NORMAL → NATIVO: te sale cómo lo diría alguien de libro y tú lo dices como gringo
   ===================================================================== */
const HAS_N=typeof NATIVO!=="undefined";
const NCAT={saludos:"👋 Saludos",despedidas:"✌️ Despedidas",reacciones:"😲 Reacciones",acuerdo_y_desacuerdo:"🤝 Sí y no",emociones:"😤 Emociones",dinero_y_compras:"💵 Dinero",comida_y_bebida:"🍔 Comida",
  trabajo:"💼 Trabajo",fiesta_y_noche:"🪩 Fiesta",amor_y_coqueteo:"💋 Amor",pleitos:"🥊 Pleitos",pedir_favores:"🙏 Favores",opiniones:"🗣️ Opiniones",tiempo_y_planes:"📅 Planes"};
const natY=x=>({en:x.nativo,es:x.es,pr:x.pr,em:x.em,alts:[],norm:x.normal,m:"nativo"});
function nativoCardHTML(){if(!HAS_N)return "";const done=NATIVO.filter(x=>{const it=DB.items[x.nativo.toLowerCase()];return it&&it.box>=2}).length;
  return `<button class="ncard" id="natgo"><div class="nhead"><span>normal</span><span>native</span></div>
    <div class="nrow"><span>I don't care</span><b>whatever</b></div><div class="nrow"><span>wait</span><b>hang on</b></div><div class="nrow"><span>it's fine</span><b>no worries</b></div>
    <div class="nfoot"><b>🔥 Normal → Nativo</b><small>${NATIVO.length} frases · ya dominas ${done}. Te sale la de libro y tú la dices como gringo.</small></div></button>
    <button class="btn ghost" id="natlist">📖 Ver todo el diccionario</button>`}
function bindNativo(){const g=$("#natgo");if(g)g.onclick=()=>playNativo();const l=$("#natlist");if(l)l.onclick=nativoList}
function nativoList(){const by={};NATIVO.forEach(x=>(by[x.cat]=by[x.cat]||[]).push(x));
  sheet(`<h3>📖 Normal → Nativo</h3><p class="sub">Toca una frase para oírla.</p>${Object.entries(by).map(([c,L])=>`<div class="cap">${esc(NCAT[c]||c)}</div><div class="group">${L.map(x=>`<button class="cell" data-say="${esc(x.nativo)}"><span style="font-size:1.4rem">${esc(x.em)}</span><span class="grow"><small style="text-decoration:line-through">${esc(x.normal)}</small><strong>${esc(x.nativo)}</strong><small style="color:var(--emily);font-style:italic">${esc(x.pr)}</small><small>${esc(x.es)}${x.nota?" · "+esc(x.nota):""}</small></span></button>`).join("")}</div>`).join("")}`,
   el=>el.querySelectorAll("[data-say]").forEach(b=>b.onclick=()=>{unlockAudio();say(b.dataset.say,"emily","happy")}))}
function playNativo(cat){if(!canRun()||!HAS_N)return;unlockAudio();running=true;const t=++token;
  const pool=NATIVO.filter(x=>!cat||x.cat===cat).map(x=>({x,it:DB.items[x.nativo.toLowerCase()]})).sort((a,b)=>((a.it?a.it.due:0)-(b.it?b.it.due:0))||Math.random()-.5).slice(0,10).map(o=>o.x);
  const m={id:"nativo",w:0,o:0,t:"Normal → Nativo",place:"cafe",cast:["emily"],steps:[],mems:[],n:"",ys:pool.length};
  (async()=>{openSess(m);$("#stt").textContent="Habla como nativo";meet(true);setPhase("🔥 Normal → Nativo");
    bubble("emily","Okay, I'll say it like a textbook. You say it like a real American!","Yo lo digo como libro. ¡Tú dilo como gringo de verdad!");await say("Okay, I'll say it like a textbook. You say it like a real American!","emily","flirty");guard(t);
    const q=pool.slice();let k=0;while(q.length){const x=q.shift();setProg(k/pool.length);bubble("emily",x.normal,"");await say(x.normal,"emily","bored");guard(t);
      const ok=await youSay(natY(x),"native",t,{npc:{who:"emily",en:x.normal,es:"",emo:"bored"},m});if(!ok)q.push(x);else k++}
    setProg(1);addXP(20);save();confetti();sfx("win");bubble("emily","See? Now you sound like a local!","¿Ves? ¡Ya suenas de aquí!");await say("See? Now you sound like a local!","emily","laugh");await wait(1200)})()
  .catch(e=>{if(e!==CANCEL)console.error(e)}).finally(()=>{if(t===token)endSess()})}

/* =====================================================================
   HABLA CONECTADA: cómo se OYE la frase cuando un nativo habla rápido
   («Do you want to go?» → /joo-wanna-go/, «I don't know» → /arano/)
   ===================================================================== */
const HAS_C=typeof REGLAS!=="undefined";
const RXC=HAS_C?REGLAS.map(([p,o,pr,why])=>[/[\\(]/.test(p)?new RegExp(p,"gi"):new RegExp("\\b"+p.replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/ /g,"\\s+")+"\\b","gi"),o,why]):[];
function seOye(en){if(!HAS_C)return null;let s=String(en).toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9' ]+/g," ").replace(/\s+/g," ").trim();const base=s,why=[];
  for(const [re,o,w] of RXC){re.lastIndex=0;if(re.test(s)){re.lastIndex=0;const b=s;s=s.replace(re,o);if(s!==b&&!why.includes(w))why.push(w)}}
  let out=s.split(/\s+/).join("-").replace(/\b(\w{3,})ing\b/g,"$1in'").replace(/([aeiou])tt?(er|y|le)\b/g,"$1dd$2").replace(/([aeiou])t-([aeiou])/g,"$1d-$2");
  if(out.replace(/-/g," ")===base)return null;return {s:"/"+out+"/",why:why.slice(0,2)}}
function oyeHTML(y){const o=y.oye?{s:y.oye,why:[]}:seOye(y.en);if(!o)return "";
  return `<span class="k">🎧 Así se oye (rápido)</span><span class="v oye" data-say="${esc(y.en)}">${esc(o.s)}${o.why.length?`<small>${o.why.map(esc).join(" · ")}</small>`:""}</span>`}
document.addEventListener("click",e=>{const o=e.target.closest&&e.target.closest(".oye[data-say]");if(!o)return;try{unlockAudio();stopVoice();say(o.dataset.say,"emily","happy")}catch(_){}});
const oyeY=x=>({en:x[0],oye:x[1],pr:x[2],es:x[3],em:x[4],alts:[],m:"oye"});
function oyeCardHTML(){if(!HAS_C)return "";const done=EJEMPLOS.filter(x=>{const it=DB.items[x[0].toLowerCase()];return it&&it.box>=2}).length;
  return `<button class="ncard ocard" id="oyego"><div class="nfoot"><b>🎧 Así se oye</b><small>Cómo suenan las frases cuando un gringo habla rápido. ${EJEMPLOS.length} frases · dominas ${done}.</small></div>
    ${EJEMPLOS.slice(0,4).map(x=>`<div class="orow"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join("")}</button>
    <button class="btn ghost" id="oyelist">📖 Las ${REGLAS.length} reglas de cómo se pegan las palabras</button>`}
function bindOye(){const g=document.getElementById("oyego");if(g)g.onclick=()=>playOye();const l=document.getElementById("oyelist");if(l)l.onclick=oyeList}
function oyeList(){sheet(`<h3>🎧 Cómo se pegan las palabras</h3><p class="sub">Un nativo no dice palabra por palabra: las junta. Toca para oír.</p>
  <div class="group">${EJEMPLOS.map(x=>`<button class="cell" data-say="${esc(x[0])}"><span style="font-size:1.3rem">${esc(x[4])}</span><span class="grow"><strong>${esc(x[0])}</strong><small style="color:#7C4DFF;font-weight:800">${esc(x[1])}</small><small style="color:var(--emily);font-style:italic">${esc(x[2])}</small><small>${esc(x[3])}</small></span></button>`).join("")}</div>
  <div class="cap">Las reglas</div><div class="group">${REGLAS.filter(r=>!/[\\(]/.test(r[0])).map(r=>`<div class="cell"><span class="grow"><strong>${esc(r[0])} → <span style="color:#7C4DFF">${esc(r[1])}</span></strong><small>${esc(r[2])} · ${esc(r[3])}</small></span></div>`).join("")}</div>`,
  el=>el.querySelectorAll("[data-say]").forEach(b=>b.onclick=()=>{unlockAudio();say(b.dataset.say,"emily","happy")}))}
function playOye(){if(!canRun()||!HAS_C)return;unlockAudio();running=true;const t=++token;
  const pool=EJEMPLOS.map(x=>({x,it:DB.items[x[0].toLowerCase()]})).sort((a,b)=>((a.it?a.it.due:0)-(b.it?b.it.due:0))||Math.random()-.5).slice(0,8).map(o=>o.x);
  const m={id:"oye",w:0,o:0,t:"Así se oye",place:"cafe",cast:["emily"],steps:[],mems:[],n:"",ys:pool.length};
  (async()=>{openSess(m);$("#stt").textContent="Habla conectada";meet(true);setPhase("🎧 Así se oye");
    const hi="I'm gonna say it fast, like we really talk. You copy me, okay?";bubble("emily",hi,"Lo voy a decir rápido, como hablamos de verdad. Tú me copias, ¿va?");await say(hi,"emily","flirty");guard(t);
    let k=0;for(const x of pool){setProg(k/pool.length);bubble("emily",x[0],x[3]);await say(x[0],"emily","happy");guard(t);
      await youSay(oyeY(x),"help",t,{npc:{who:"emily",en:x[0],es:x[3],emo:"happy"},m,label:"Cópiale, rapidito y pegado"});k++}
    setProg(1);addXP(20);save();confetti();sfx("win");const bye="Okay, now you sound like you're from here!";bubble("emily",bye,"¡Ya suenas de aquí!");await say(bye,"emily","laugh");await wait(1000)})()
  .catch(e=>{if(e!==CANCEL)console.error(e)}).finally(()=>{if(t===token)endSess()})}

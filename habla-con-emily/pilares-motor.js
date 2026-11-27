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
  const names=t[0].split("+").map(x=>(TAGS[x]||TAGS.noun).em+" "+(TAGS[x]||TAGS.noun).n).join(" + ");toast(`${w.dataset.w} → ${names}${t[1]?" · "+t[1]:""}`)});

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
   <div class="card sub" style="font-size:.92rem">💡 En las misiones, lo que dices sale <b>pintado</b> con estos colores. Toca cualquier palabra para ver qué es y qué significa.</div></div>`;
  app.querySelectorAll(".col").forEach(b=>b.onclick=()=>pillarSheet(b.dataset.t))}
function pillarSheet(tag){const p=HAS_PIL?PILARES.find(x=>x.tag===tag):null,T=TAGS[tag],used=usedWords(tag);
  sheet(`<div class="pilhead" style="--c:${T.c}"><span class="big">${p?p.em:T.em}</span><div><h3>${esc(p?p.nombre:T.n)}</h3><span class="sub">${esc(p?p.en:"")}</span></div></div>
   ${p?`<p>${esc(p.que)}</p><div class="card" style="display:grid;gap:4px"><span class="cap">🗣️ Así lo hacen los nativos</span><p>${esc(p.truco)}</p></div>
   <div class="card" style="display:grid;gap:4px"><span class="cap">Ejemplo</span><div class="tri"><span class="k">✍️ Se escribe</span><span class="v fo">${esc(formal(p.ejemplo.en))}</span><span class="k">🗣️ Los nativos dicen</span><span class="v en">${colorize(p.ejemplo.en)}</span><span class="k">👄 Se lee</span><span class="v pr">${esc(p.ejemplo.pr)}</span><span class="k">🇲🇽 Significa</span><span class="v es">${esc(p.ejemplo.es)}</span></div>
     <button class="btn small ghost" id="pex">🔊 Escuchar</button></div>
   <span class="cap">Las 20 más usadas</span><div class="pgrid">${p.top.map(w=>`<button class="pword" data-say="${esc(w[0])}" style="--c:${T.c}"><b>${esc(w[0])}</b><small>${esc(w[1])}</small><i>${esc(w[2])}</i></button>`).join("")}</div>`:`<p class="sub">Cargando el contenido de este pilar…</p>`}
   <span class="cap">Las que ya dijiste en tus misiones (${used.length})</span>
   ${used.length?`<div class="chips">${used.slice(0,60).map(([w,es])=>`<span class="chip" style="background:color-mix(in srgb,${T.c} 18%,transparent);color:${T.c}" title="${esc(es)}">${esc(w)}</span>`).join("")}</div>`:`<p class="sub">Todavía ninguna. ¡Juega misiones y se van llenando!</p>`}`,
   el=>{const b=el.querySelector("#pex");if(b)b.onclick=()=>{unlockAudio();say(p.ejemplo.en,"emily","happy")};el.querySelectorAll("[data-say]").forEach(x=>x.onclick=()=>{unlockAudio();say(x.dataset.say,"emily","happy")})})}

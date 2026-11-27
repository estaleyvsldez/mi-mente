// Valida los mundos: node tools/validar.js  (desde la carpeta habla-con-emily)
const fs=require("fs"),path=require("path");
const base=path.join(__dirname,"..","mundos");
global.MUNDO_TXT=[];
const pj=fs.readFileSync(path.join(base,"personajes.js"),"utf8");
const {PERSONAJES,EXTRAS}=new Function(pj+";return {PERSONAJES,EXTRAS}")();
const CAST=new Set([...Object.keys(PERSONAJES),...Object.keys(EXTRAS)]);
const PLACES=new Set("barrio porche tiendita super caja casa cocina cuarto oficina obra cafe restaurante pizzeria comida bar antro fiesta parque playa cita coche telefono aeropuerto avion hotel cancha gym videojuegos policia hospital calle_noche tienda_ropa banco doctor estadio".split(" "));
const EMO=new Set("neutral happy laugh flirty angry sad cry surprised bored scared".split(" "));
const files=fs.readdirSync(base).filter(f=>/^w\d+\.js$/.test(f)).sort();
let errs=[],ms=[],ids=new Set(),mems={};
for(const f of files){const before=MUNDO_TXT.length;new Function("MUNDO_TXT",fs.readFileSync(path.join(base,f),"utf8"))(MUNDO_TXT);
  if(MUNDO_TXT.length===before)errs.push(f+": no hizo MUNDO_TXT.push");}
let cur=null;
MUNDO_TXT.join("\n").split("\n").forEach((raw,ln)=>{const r=raw.trim();if(!r||r.startsWith("//"))return;const p=r.split("|");
  const E=m=>errs.push((cur?cur.id:"?")+": "+m+"  ->  "+r.slice(0,90));
  if(p[0].startsWith("#")){cur={id:p[0].slice(1),w:+p[1],o:+p[2],y:0,cast:(p[5]||"").split(",").map(x=>x.trim())};ms.push(cur);
    if(p.length!==7)E("encabezado necesita 7 campos");if(ids.has(cur.id))E("id repetido");ids.add(cur.id);
    if(!/^w\d+m\d\d$/.test(cur.id))E("id debe ser como w1m01");if(!PLACES.has(p[4]))E("lugar inválido: "+p[4]);
    cur.cast.forEach(c=>{if(!CAST.has(c))E("personaje inválido: "+c)});return}
  if(!cur){errs.push("línea antes de un encabezado: "+r);return}
  if(p[0]==="N"){if(p.length!==5)E("N necesita 5 campos");if(!CAST.has(p[1]))E("personaje inválido "+p[1]);else if(!cur.cast.includes(p[1]))E("personaje "+p[1]+" no está en el cast");if(!EMO.has(p[2]))E("emoción inválida "+p[2]);if(p.some(x=>!x.trim()))E("campo vacío")}
  else if(p[0]==="Y"){cur.y++;if(p.length!==5)E("Y necesita 5 campos");if(p.some(x=>!x.trim()))E("campo vacío");if(/[^\x00-\x7F’]/.test(p[1].replace(/[éñ]/g,"")))E("la línea en inglés tiene caracteres raros");if(p[1].split(/\s+/).length>16)E("línea Y muy larga (>16 palabras)")}
  else if(p[0]==="A"){if(p.length!==2)E("A necesita 2 campos")}
  else if(p[0]==="L"){if(p.length!==2||!p[1].trim())E("L necesita 2 campos (la versión normal/de libro)")}
  else if(p[0]==="M"){if(p.length!==5)E("M necesita 5 campos");(mems[p[2]]=mems[p[2]]||[]).push(cur.id)}
  else E("tipo de línea desconocido "+p[0]);
  if(/`|\$\{/.test(r))E("no uses backtick ni ${");});
ms.forEach(m=>{if(m.y<4||m.y>10)errs.push(m.id+": tiene "+m.y+" líneas Y (deben ser 4 a 10)")});
const porMundo={};ms.forEach(m=>porMundo[m.w]=(porMundo[m.w]||0)+1);
console.log("Misiones:",ms.length,"por mundo:",JSON.stringify(porMundo),"líneas Y:",ms.reduce((a,b)=>a+b.y,0));
console.log("Recuerdos plantados:",JSON.stringify(mems));
console.log(errs.length?"ERRORES ("+errs.length+"):\n"+errs.join("\n"):"✅ Sin errores");
process.exitCode=errs.length?1:0;

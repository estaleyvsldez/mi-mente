/* Elenco del juego. Lo usan el motor (dibujo, voz, gestos) y los guionistas (cast de cada misión).
   skin: claro|moreno|cafe|oscuro · hair: short|long|ponytail|curly|bun|bald|buzz|braids|wavy · voice: voz Kokoro · speed: velocidad
   fillers: muletillas que el personaje usa al reaccionar */
const PERSONAJES={
 emily:  {name:"Emily",  es:"La chava que te encanta. Dulce, coqueta, se ríe de todo.", gender:"f",age:25,skin:"claro",hair:"wavy",hairColor:"#6B3E1F",shirt:"#FF3D7F",extra:["earrings"],voice:"af_bella",speed:0.95,fillers:["Oh my God,","Like,","Babe,","Stop it,"]},
 chloe:  {name:"Chloe",  es:"Rubia fiestera, súper coqueta, todo le parece «literally» increíble.", gender:"f",age:24,skin:"claro",hair:"long",hairColor:"#F2D16B",shirt:"#B44CFF",extra:["earrings"],voice:"af_nicole",speed:1,fillers:["Literally,","Oh my God,","Totally,","I'm dead,"]},
 jasmine:{name:"Jasmine",es:"Morena segura de sí, chistosa y sin pelos en la lengua. Tu compañera y amiga.", gender:"f",age:27,skin:"oscuro",hair:"curly",hairColor:"#1E1410",shirt:"#F5B400",extra:["earrings"],voice:"af_heart",speed:1,fillers:["Girl,","Okay, see,","Boy,","Mm-hmm,"]},
 sofia:  {name:"Sofía",  es:"Latina, compañera de la chamba, mezcla español e inglés.", gender:"f",age:28,skin:"moreno",hair:"ponytail",hairColor:"#2A1A12",shirt:"#12A150",extra:[],voice:"af_heart",speed:1.02,fillers:["Ay,","Mira,","Like,","Okay so,"]},
 marcus: {name:"Marcus", es:"Tu mejor compa. Negro, alto, del gym, fan del americano. Leal y desmadroso.", gender:"m",age:30,skin:"oscuro",hair:"buzz",hairColor:"#111",shirt:"#3557FF",extra:["beard"],voice:"am_fenrir",speed:1,fillers:["Bro,","Yo,","No cap,","Bruh,"]},
 jake:   {name:"Jake",   es:"Güero gamer, chistes malos, siempre sin dinero.", gender:"m",age:26,skin:"claro",hair:"short",hairColor:"#C9A35B",shirt:"#7C4DFF",extra:["cap"],voice:"am_puck",speed:1.05,fillers:["Dude,","Bruh,","Lowkey,","Sick,"]},
 carlos: {name:"Carlos", es:"Tu primo mexicoamericano. Spanglish, carnes asadas, «güey» a cada rato.", gender:"m",age:30,skin:"moreno",hair:"short",hairColor:"#1E1410",shirt:"#E5484D",extra:["beard"],voice:"am_michael",speed:1,fillers:["Güey,","Bro,","Órale,","Dude,"]},
 mike:   {name:"Mike",   es:"Compañero de la obra. Tranquilo, buena onda, «buddy».", gender:"m",age:35,skin:"claro",hair:"short",hairColor:"#7A4A2A",shirt:"#FF8A00",extra:["beard","hardhat"],voice:"am_eric",speed:1,fillers:["Man,","Buddy,","Alright,","Listen,"]},
 linda:  {name:"Linda",  es:"La jefa. Estricta pero justa.", gender:"f",age:45,skin:"claro",hair:"bun",hairColor:"#8A6A4A",shirt:"#2B2F55",extra:["glasses"],voice:"af_kore",speed:1,fillers:["Listen,","Alright,","Look,","Okay,"]},
 karen:  {name:"Karen",  es:"La señora que quiere hablar con el gerente. Siempre enojada.", gender:"f",age:50,skin:"claro",hair:"short",hairColor:"#E8C15A",shirt:"#9AA3AD",extra:["sunglasses"],voice:"af_sarah",speed:1.05,fillers:["Excuse me,","Unbelievable,","Seriously,","Listen here,"]},
 destiny:{name:"Destiny",es:"Cajera de 20 años, aburrida, «whatever», mascando chicle.", gender:"f",age:20,skin:"cafe",hair:"braids",hairColor:"#1E1410",shirt:"#FF6B9C",extra:["earrings"],voice:"af_nicole",speed:1.05,fillers:["Like,","Whatever,","Ugh,","I mean,"]},
 rose:   {name:"Grandma Rose",es:"La vecina viejita. Te dice «sweetie», hace pays, cuenta historias de antes.", gender:"f",age:78,skin:"claro",hair:"bun",hairColor:"#DDDDDD",shirt:"#C38BD9",extra:["glasses","wrinkles"],voice:"af_sarah",speed:0.86,fillers:["Oh, sweetie,","Honey,","Well,","Back in my day,"]},
 joe:    {name:"Grandpa Joe",es:"Viejito gruñón del barrio. Se queja de todo pero tiene corazón.", gender:"m",age:80,skin:"moreno",hair:"bald",hairColor:"#DDDDDD",shirt:"#6F6658",extra:["glasses","wrinkles","beard"],voice:"am_onyx",speed:0.86,fillers:["Kids these days,","Hmph,","Listen, son,","Well,"]},
 tommy:  {name:"Tommy",  es:"Niño vecino de 8 años. Pregunta todo, ama el fútbol.", gender:"m",age:8,skin:"cafe",hair:"curly",hairColor:"#2A1A12",shirt:"#30D158",extra:["kid"],voice:"af_sky",speed:1.12,fillers:["Dude,","Whoa,","Cool,","Hey,"]},
 max:    {name:"Max",    es:"El perro del vecino. Golden retriever. Ladra, mueve la cola, roba comida.", gender:"m",age:3,dog:true,voice:"dog",fillers:["Woof!","Arf!"]},
 ray:    {name:"Ray",    es:"El bartender. Negro, cincuentón, chistes de papá, consejos de vida.", gender:"m",age:52,skin:"oscuro",hair:"bald",hairColor:"#111",shirt:"#2C1F2E",extra:["beard"],voice:"am_echo",speed:0.95,fillers:["Son,","Alright now,","Listen,","Ha!"]},
 tony:   {name:"Tony",   es:"Dueño italoamericano de la pizzería. Grita, gesticula, «fuggedaboutit».", gender:"m",age:55,skin:"claro",hair:"short",hairColor:"#333",shirt:"#FFFFFF",extra:["mustache"],voice:"am_liam",speed:1.05,fillers:["Ay,","Listen,","Fuggedaboutit,","Whaddya want,"]},
 davis:  {name:"Officer Davis",es:"Policía. Serio, pero si eres educado, es buena gente.", gender:"m",age:42,skin:"oscuro",hair:"buzz",hairColor:"#111",shirt:"#1D2554",extra:["cap"],voice:"am_echo",speed:1,fillers:["Sir,","Alright,","Okay,","Listen,"]},
 brad:   {name:"Brad",   es:"Güero mamado del gym y de la cancha. Presumido, trash talk.", gender:"m",age:28,skin:"claro",hair:"short",hairColor:"#E8C15A",shirt:"#E5484D",extra:[],voice:"am_puck",speed:1,fillers:["Bro,","Dude,","Ha!","Come on,"]},
 nina:   {name:"Nina",   es:"Azafata y viajera, latina-gringa, muy amable y coqueta a su manera.", gender:"f",age:29,skin:"moreno",hair:"bun",hairColor:"#2A1A12",shirt:"#3557FF",extra:["earrings"],voice:"af_bella",speed:1.02,fillers:["Hon,","Okay,","Sweetie,","So,"]}
};
/* Gente de un solo papel: el guionista puede usar estos ids genéricos */
const EXTRAS={
 cajera:{name:"Cajera",gender:"f",age:35,skin:"moreno",hair:"ponytail",hairColor:"#2A1A12",shirt:"#12A150",extra:[],voice:"af_sarah",speed:1,fillers:["Okay,","So,"]},
 cajero:{name:"Cajero",gender:"m",age:30,skin:"claro",hair:"short",hairColor:"#5A3A2A",shirt:"#12A150",extra:[],voice:"am_eric",speed:1,fillers:["Alright,","So,"]},
 mesera:{name:"Mesera",gender:"f",age:26,skin:"claro",hair:"ponytail",hairColor:"#B5651D",shirt:"#222",extra:[],voice:"af_nicole",speed:1,fillers:["Hon,","Okay,"]},
 mesero:{name:"Mesero",gender:"m",age:28,skin:"cafe",hair:"short",hairColor:"#111",shirt:"#222",extra:[],voice:"am_michael",speed:1,fillers:["Alright,","So,"]},
 doctor:{name:"Doctora",gender:"f",age:40,skin:"oscuro",hair:"bun",hairColor:"#111",shirt:"#FFFFFF",extra:["glasses"],voice:"af_heart",speed:1,fillers:["Okay,","Alright,"]},
 chofer:{name:"Chofer",gender:"m",age:45,skin:"moreno",hair:"short",hairColor:"#333",shirt:"#3557FF",extra:["beard"],voice:"am_michael",speed:1,fillers:["Man,","Alright,"]},
 agente:{name:"Agente",gender:"f",age:33,skin:"claro",hair:"bun",hairColor:"#6B3E1F",shirt:"#1D2554",extra:[],voice:"af_kore",speed:1,fillers:["Okay,","Sir,"]},
 extrano:{name:"Desconocido",gender:"m",age:35,skin:"claro",hair:"short",hairColor:"#333",shirt:"#555",extra:["beard"],voice:"am_onyx",speed:1,fillers:["Yo,","Hey,"]}
};

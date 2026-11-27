/* LAS 8 PREGUNTAS (what, where, when, who, why, how, which, whose)
   Cada ejemplo: [palabra, significado, cómo se escribe completo, cómo lo dice un nativo (contraído), cómo se oye rápido, cómo se lee, español, emojis]
   TRAMPAS: el error típico de un hispano y cómo es bien. */
const PREGUNTAS=[
 ["what","qué / cuál","What is your name?","What's your name?","/whatcher-name/","uáchur néim","¿Cómo te llamas?","🙋‍♂️🏷️"],
 ["what","qué / cuál","What are you doing?","Whatcha doin'?","/whatcha-doin/","uácha dúin","¿Qué haces?","👀❓"],
 ["what","qué / cuál","What do you want to eat?","Whaddya wanna eat?","/whaddya-wanna-eat/","uáreya uána ít","¿Qué quieres comer?","🍔🌮❓"],
 ["where","dónde","Where do you live?","Where d'you live?","/whereja-live/","uéreya lív","¿Dónde vives?","🏠❓"],
 ["where","dónde","Where are you going?","Where ya goin'?","/where-ya-goin/","uér ia góin","¿A dónde vas?","🚶‍♂️➡️❓"],
 ["where","dónde","Where is the bathroom?","Where's the bathroom?","/wheres-the-bathroom/","uérs de bázrum","¿Dónde está el baño?","🚻❓"],
 ["when","cuándo","When is the class?","When's the class?","/whens-the-class/","uéns de klás","¿Cuándo es la clase?","📚⏰"],
 ["when","cuándo","When are you coming?","When ya comin'?","/when-ya-comin/","uén ia kámin","¿Cuándo vienes?","📅❓"],
 ["when","cuándo","When did you get here?","When'd you get here?","/whendja-get-here/","uénya guét jír","¿Cuándo llegaste?","🛬❓"],
 ["who","quién","Who is she?","Who's she?","/whoos-she/","jús shí","¿Quién es ella?","👩❓"],
 ["who","quién","Who is that guy?","Who's that guy?","/whoos-that-guy/","jús dat gái","¿Quién es ese güey?","🧍‍♂️🤨"],
 ["who","quién","Who did you go with?","Who'd you go with?","/whoodja-go-with/","júya góu uíz","¿Con quién fuiste?","👥❓"],
 ["why","por qué","Why are you sad?","Why're you sad?","/whyer-ya-sad/","uáier ia sád","¿Por qué estás triste?","😢❓"],
 ["why","por qué","Why did you do that?","Why'd you do that?","/whyja-do-that/","uáya dú dat","¿Por qué hiciste eso?","🤦‍♂️❓"],
 ["why","por qué","Why not?","Why not?","/why-not/","uái nát","¿Por qué no?","🤷"],
 ["how","cómo","How are you?","How ya doin'?","/how-ya-doin/","jáu ia dúin","¿Cómo estás?","👋🙂"],
 ["how","cómo","How much is it?","How much is it?","/how-muchizit/","jáu máchisit","¿Cuánto cuesta?","💵❓"],
 ["how","cómo","How did you know?","How'd you know?","/howja-know/","jáuya nóu","¿Cómo supiste?","🤯❓"],
 ["which","cuál","Which one do you want?","Which one d'you want?","/which-one-ja-want/","uích uán ya uánt","¿Cuál quieres?","👈👉❓"],
 ["which","cuál","Which way is it?","Which way is it?","/which-way-izit/","uích uéi ísit","¿Para dónde es?","🧭❓"],
 ["whose","de quién","Whose bag is this?","Whose bag's this?","/whose-bags-this/","júz bágs dis","¿De quién es esta bolsa?","👜❓"],
 ["whose","de quién","Whose car is that?","Whose car's that?","/whose-cars-that/","júz kárs dat","¿De quién es ese carro?","🚗❓"]
];
const TRAMPAS=[
 ["You live where?","Where do you live?","Primero la palabra de pregunta, luego do/does, luego tú."],
 ["What you want?","What do you want? (Whaddya want?)","No se te olvide el «do»: suena pegado, pero va."],
 ["Why you are sad?","Why are you sad? (Why're you sad?)","Con «are/is», el verbo va antes de la persona."],
 ["How much cost it?","How much is it?","Para precios: «How much is it?»."],
 ["Who is this bag?","Whose bag is this?","Para dueño se usa «whose», no «who»."],
 ["Where is you going?","Where are you going? (Where ya goin'?)","Con «you» siempre «are»."]
];

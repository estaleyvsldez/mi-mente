/* Chambas (roles) del juego 3D: taxista y policía. Mismo formato que mundos/wN.js.
   Encabezado: #id|0|orden|título|lugar|cast|nota   (id: taxi01… o poli01…; lugar: coche o policia) */
window.CHAMBA_TXT=[];
CHAMBA_TXT.push(`
#taxi01|0|1|El borracho de las 2 a.m.|coche|jake|Con un pasajero borracho: paciencia y frases cortas. «Where to?», «Buckle up», «Don't throw up in my car».
N|jake|laugh|Yooo, taxi! Taxi man! Is this a taxi? It's a taxi!|¡Ooye, taxi! ¡Señor taxi! ¿Esto es un taxi? ¡Es un taxi!
Y|Hey, man. Hop in. Where to?|Qué onda, carnal. Súbete. ¿A dónde?|jéi, mán. jóp ín. uér tú?|🚕👋❓
L|Hello, sir. Please get in. Where do you want to go?
N|jake|happy|Uhh, home. My home. The one with the... the door.|Este, a la casa. Mi casa. La que tiene la... la puerta.
Y|Bro, every house has a door. Gimme an address.|Bro, todas las casas tienen puerta. Dame una dirección.|bróu, évri jáus jas a dór. guími an ádres|🏠🚪🤦‍♂️
L|Sir, all houses have doors. Please tell me the address.
N|jake|laugh|Oh, right! Forty-two Maple Street. I think. Pretty sure. Kinda.|¡Ah, cierto! Calle Maple cuarenta y dos. Creo. Casi seguro. Más o menos.
Y|Alright, Maple Street. Buckle up, dude.|Va, calle Maple. Ponte el cinturón, güey.|ólráit, méipel strít. bákel áp, dúd|🔒🚗😅
L|Okay, Maple Street. Please put on your seat belt.
N|jake|sad|Dude, she ghosted me. Three dates and she ghosted me, man.|Güey, me dejó en visto. Tres citas y me ghosteó, man.
Y|That sucks, bro. Her loss, for real.|Qué mal, bro. Ella se lo pierde, en serio.|dat sáks, bróu. jér lós, for ríl|💔👻🤷‍♂️
A|That sucks, man. It's her loss.
L|I am sorry to hear that. It is her loss.
N|jake|scared|Oh no. Oh no, I don't feel so good.|Ay no. Ay no, no me siento bien.
Y|Whoa, whoa! Don't throw up in my car! Roll the window down!|¡Épale, épale! ¡No vomites en mi carro! ¡Baja la ventana!|uóu, uóu! dóunt zróu áp in mái kár! róul de uíndou dáun!|🤢🚗🪟
L|Please do not vomit in my car. Open the window.
N|jake|happy|Okay, okay. False alarm. I'm good. I'm totally good.|Okey, okey. Falsa alarma. Estoy bien. Estoy perfecto.
Y|Here we are, man. That'll be twelve bucks.|Ya llegamos, carnal. Son doce dólares.|jír uí ár, mán. dárel bi tuélv báks|🏠💵🚕
A|Here we are, man. That'll be twelve dollars.
L|We have arrived. The price is twelve dollars.
N|jake|surprised|Twelve? Bro, I only got ten. Can I pay you in nachos?|¿Doce? Bro, nomás traigo diez. ¿Te puedo pagar en nachos?
Y|Nah, keep your nachos. Ten's fine. Drink some water, dude.|Nel, quédate tus nachos. Con diez está bien. Tómate un agua, güey.|ná, kíp iór náchos. tens fáin. dríngk sam uárer, dúd|🧀🙅‍♂️💧
A|Ten's cool. Go drink some water, man.
L|No, thank you. Ten dollars is okay. Please drink some water.

#taxi02|0|2|Karen y la ruta equivocada|coche|karen|Si un pasajero se queja de la ruta: calma total. «I'm taking the fastest way», «Traffic's crazy, ma'am».
N|karen|angry|Finally! I've been waving for like ten minutes.|¡Por fin! Llevo como diez minutos haciéndote señas.
Y|Sorry about that, ma'am. Where you headed?|Perdón por eso, señora. ¿A dónde va?|sóri abáut dát, mám. uér iú jéded?|🙏🚕❓
L|I apologize, madam. Where are you going?
N|karen|neutral|The mall on Fifth. And don't take the highway, I hate the highway.|Al centro comercial de la Quinta. Y no te vayas por la autopista, odio la autopista.
Y|Got it. Mall on Fifth, no highway.|Entendido. Centro comercial en la Quinta, sin autopista.|gárit. mól on fífz, nóu jáiuei|🛍️🚫🛣️
L|I understand. The mall on Fifth Street, not the highway.
N|karen|angry|Why are you turning here? This is NOT the way. Are you trying to scam me?|¿Por qué das vuelta aquí? ¡Éste NO es el camino! ¿Me quieres estafar?
Y|No scam, ma'am. Main Street's closed. This is the fastest way.|No es estafa, señora. La Main está cerrada. Éste es el camino más rápido.|nóu skám, mám. méin strits klóusd. dis is de fástest uéi|🚧🗺️👍
L|I am not cheating you. Main Street is closed. This road is faster.
N|karen|angry|I'm literally gonna be late. I want your name and your number.|Literal voy a llegar tarde. Quiero tu nombre y tu número.
Y|It's Stanley. It's right there on the dashboard. Knock yourself out.|Es Stanley. Ahí está en el tablero. Haga lo que quiera.|its stánli. its ráit dér on de dáshbord. nák iorsélf áut|🪪😐🤷‍♂️
L|My name is Stanley. It is written on the dashboard. You may report me.
N|karen|surprised|Oh. We're here already? That was... actually fast.|Ah. ¿Ya llegamos? Eso fue... la verdad rápido.
Y|Told you. That'll be fifteen bucks.|Se lo dije. Son quince dólares.|tóuld iú. dárel bi fiftín báks|😏💵⏱️
A|Told you. That'll be fifteen dollars.
L|I told you. The price is fifteen dollars.
N|karen|neutral|Fine. Here's fifteen. Don't expect a tip.|Bueno. Aquí tienes quince. No esperes propina.
Y|No worries. Have a good one, ma'am. Happy shopping.|No pasa nada. Que le vaya bien, señora. Feliz compra.|nóu uóris. jáv a gúd uán, mám. jápi shápin|🛍️👋😇
A|No worries. Have a nice day, ma'am.
L|It is fine. Have a nice day, madam. Enjoy your shopping.
N|karen|bored|Hmph. You're... okay, I guess. For a taxi driver.|Mmm. Eres... aceptable, supongo. Para ser taxista.
Y|I'll take it. That's basically a five-star review from you.|Lo acepto. Eso de usted es prácticamente cinco estrellas.|áil téik it. dáts béisikli a fáiv stár reviú fróm iú|⭐⭐⭐⭐⭐😂
L|Thank you. From you, that is a very good review.

#taxi03|0|3|Chloe en el asiento de atrás|coche|chloe|Con una pasajera coqueta: sigue el juego con humor, sin quitar los ojos del camino. «Eyes on the road», «You're trouble».
N|chloe|happy|Oh my god, hi! Are you free? Like, literally free?|¡Ay, Dios mío, hola! ¿Estás libre? ¿O sea, literal libre?
Y|Yeah, I'm free. Hop in. Where we going?|Sí, estoy libre. Súbete. ¿A dónde vamos?|iéa, áim frí. jóp ín. uér uí góuin?|🚕✅😎
L|Yes, I am available. Please get in. Where do you want to go?
N|chloe|flirty|The Velvet Club downtown. Ooh, your car smells nice. Is that you?|Al Velvet Club del centro. Uy, tu carro huele rico. ¿Eres tú?
Y|Ha, that's just the air freshener, but thanks.|Ja, es nomás el aromatizante, pero gracias.|já, dáts yást di ér fréshener, bat zénks|🌲👃😂
L|No, it is the air freshener. Thank you.
N|chloe|flirty|Hmm, I don't believe you. So, do you, like, do this every night?|Mmm, no te creo. Entonces, ¿haces esto, o sea, todas las noches?
Y|Pretty much. Night shift, baby. Coffee and bad music.|Casi siempre. Turno de noche, nena. Café y música mala.|príri mách. náit shíft, béibi. káfi an bád miúsik|🌙☕🎶
A|Pretty much. Night shift life.
L|Yes, almost every night. I work at night and drink coffee.
N|chloe|laugh|Bad music? Turn it up, let's see how bad it is!|¿Música mala? ¡Súbele, a ver qué tan mala es!
Y|Alright, but no judging. This one's lowkey a banger.|Va, pero no me juzgues. Ésta está bien chida, la neta.|ólráit, bat nóu yáyin. dis uáns lóukei a bánguer|🔊🕺😏
A|Alright, but no judging. This one's low-key a banger.
L|Okay, but please do not judge me. This song is very good.
N|chloe|flirty|Eyes on the road, cutie. You keep looking in the mirror.|Ojos en el camino, guapo. No dejas de mirar el espejo.
Y|My bad. You're kinda distracting, not gonna lie.|Perdón. Me distraes un poco, no te voy a mentir.|mái bád. iór káinda distráktin, nát góna lái|🪞😳🚗
L|I am sorry. To be honest, you distract me.
N|chloe|happy|Aw, stop! Okay, we're here. How much do I owe you?|¡Ay, ya! Okey, ya llegamos. ¿Cuánto te debo?
Y|That'll be eighteen bucks.|Son dieciocho dólares.|dárel bi eitín báks|💵🎟️🚕
A|That'll be eighteen dollars.
L|The price is eighteen dollars.
N|chloe|flirty|Here's twenty-five. Keep the change. And maybe come inside later?|Aquí tienes veinticinco. Quédate el cambio. ¿Y a lo mejor entras al rato?
Y|Damn, thanks! You're trouble, you know that? Have fun in there.|¡Órale, gracias! Eres un peligro, ¿sabías? Diviértete allá adentro.|dám, zénks! iór tróbel, iú nóu dát? jáv fán in dér|💸😏🎉
A|Thanks! You're trouble. Have fun tonight.
L|Thank you very much. You are a lot of trouble. Have a good time.

#taxi04|0|4|Las historias de Grandpa Joe|coche|joe|Con un viejito: paciencia y cariño. «Take your time», «No way, really?» y ayúdale a bajar.
N|joe|bored|Took you long enough. In my day, taxis came in two minutes flat.|Ya era hora. En mis tiempos los taxis llegaban en dos minutos exactos.
Y|Sorry, sir. Traffic's nuts tonight. Where to?|Perdón, señor. El tráfico está loco hoy. ¿A dónde?|sóri, sér. tráfiks náts tunáit. uér tú?|🚗🚗🚗😩
L|I apologize, sir. There is a lot of traffic. Where are you going?
N|joe|neutral|The diner on Oak Street. Best pie in town since nineteen sixty.|A la cafetería de la calle Oak. El mejor pay de la ciudad desde mil novecientos sesenta.
Y|Oak Street diner, got it. Take your time with the seat belt.|La cafetería de Oak, entendido. Con calma con el cinturón.|óuk strít dáiner, gárit. téik iór táim uíz de sít belt|🥧🔒👴
L|I understand. Please do not hurry with the seat belt.
N|joe|happy|You know, I drove a cab myself back in seventy-two. Picked up Elvis once.|¿Sabes? Yo también manejé taxi allá por el setenta y dos. Una vez llevé a Elvis.
Y|No way! Elvis? For real?|¡No manches! ¿Elvis? ¿En serio?|nóu uéi! élvis? for ríl?|🕺🎸😱
L|That is incredible. Elvis? Is that true?
N|joe|laugh|Well, a guy who looked like Elvis. Tipped me a dollar. A whole dollar!|Bueno, un tipo que se parecía a Elvis. Me dio un dólar de propina. ¡Un dólar entero!
Y|Ha! A dollar back then was like fifty bucks now, right?|¡Ja! Un dólar en ese entonces era como cincuenta ahora, ¿no?|já! a dáler bák dén uás láik fífti báks náu, ráit?|💵👴😂
A|Ha! A dollar back then was like fifty dollars now, right?
L|One dollar in that time was like fifty dollars today, correct?
N|joe|angry|Not fifty, kid. Don't exaggerate. Kids today exaggerate everything.|Cincuenta no, chamaco. No exageres. Los jóvenes de hoy exageran todo.
Y|Okay, okay. Like five bucks. My bad, Joe.|Okey, okey. Como cinco dólares. Perdón, Joe.|óukéi, óukéi. láik fáiv báks. mái bád, yóu|🙏😅💵
A|Okay, okay. Like five dollars. My bad, Joe.
L|Okay. Maybe five dollars. I am sorry, Joe.
N|joe|neutral|Here we are. What do I owe you, son?|Aquí es. ¿Cuánto te debo, hijo?
Y|That'll be nine bucks. Lemme get the door for you.|Son nueve dólares. Déjeme ayudarle a bajar.|dárel bi náin báks. lémi guét de dór for iú|💵🤝👴
A|That'll be nine dollars. Lemme get the door for you.
L|The price is nine dollars. Let me help you get out.
N|joe|happy|Here's ten. Keep the change. And get yourself a slice of pie, you look skinny.|Aquí tienes diez. Quédate el cambio. Y cómprate una rebanada de pay, te ves flaco.
Y|Thanks, Joe. You're the best. Enjoy your pie.|Gracias, Joe. Es usted el mejor. Disfrute su pay.|zénks, yóu. iór de bést. enyói iór pái|🥧❤️👋
L|Thank you, Joe. You are very kind. Enjoy your pie.

#taxi05|0|5|El turista perdido|coche|extrano|Con un turista: habla lento y claro. «No problem», «It's like ten minutes from here», «You're gonna love it».
N|extrano|scared|Hello! Sorry, my English is... little. Hotel? Hotel Grand?|¡Hola! Perdón, mi inglés es... poquito. ¿Hotel? ¿Hotel Grand?
Y|No problem, man. The Grand Hotel? Hop in.|No hay problema, señor. ¿El Hotel Grand? Súbase.|nóu práblem, mán. de gránd joutél? jóp ín|🏨🚕👍
L|There is no problem. The Grand Hotel? Please get in.
N|extrano|surprised|Is far? I walk two hours. I am very lost.|¿Está lejos? Caminé dos horas. Estoy muy perdido.
Y|Nah, it's like ten minutes from here. You're good.|Nel, está como a diez minutos de aquí. Ya estás.|ná, its láik ten mínets fróm jír. iór gúd|⏱️🗺️😌
L|No, it is approximately ten minutes from here. Do not worry.
N|extrano|happy|Thank you! Ah, what is good to see in this city?|¡Gracias! Ah, ¿qué es bueno para ver en esta ciudad?
Y|Check out the pier. And grab a taco from the truck on Third.|Vaya al muelle. Y cómase un taco del camión de la Tercera.|chék áut de pír. an gráb a táko fróm de trák on zérd|🌊🌮🚚
A|You gotta see the pier, and try the taco truck on Third.
L|You should visit the pier. Also, eat a taco from the truck on Third Street.
N|extrano|laugh|Taco! Yes! I love taco. In my country, taco is very expensive.|¡Taco! ¡Sí! Me encanta el taco. En mi país el taco es muy caro.
Y|Here they're like two bucks. You're gonna love it, trust me.|Aquí cuestan como dos dólares. Le van a encantar, créame.|jír dér láik tú báks. iór góna láv it, trást mí|🌮💵😋
A|Here they're like two dollars. You're gonna love it, trust me.
L|Here they cost two dollars. You will like them very much.
N|extrano|neutral|Okay, we arrive? How much money?|¿Okey, llegamos? ¿Cuánto dinero?
Y|Yep, this is it. That'll be eleven bucks.|Sí, aquí es. Son once dólares.|iép, dís is ít. dárel bi iléven báks|🏨💵✅
A|Yep, this is it. That'll be eleven dollars.
L|Yes, we are here. The price is eleven dollars.
N|extrano|surprised|Bucks? What is bucks? I have only dollars.|¿Bucks? ¿Qué es bucks? Yo sólo tengo dólares.
Y|Ha, bucks means dollars, man. Same thing.|Ja, bucks quiere decir dólares, señor. Es lo mismo.|já, báks míns dálers, mán. séim zíng|💵🦌😂
L|The word bucks means dollars. It is the same.
N|extrano|happy|Ahh! Okay, here, fifteen bucks! You are good man.|¡Aah! Okey, ¡tome, quince bucks! Usted es buen hombre.
Y|Thanks, man! Welcome to America. Enjoy your trip!|¡Gracias, señor! Bienvenido a Estados Unidos. ¡Disfrute su viaje!|zénks, mán! uélkam tu amérika. enyói iór tríp!|🇺🇸🎒😄
L|Thank you very much. Welcome to the United States. Have a good trip.

#taxi06|0|6|¡Al aeropuerto, rápido!|coche|tony|Con alguien con prisa: «I got you», «Hang on», «We're gonna make it». Rápido pero sin pasarte los altos.
N|tony|angry|Airport! Airport, my friend! My flight leaves in forty minutes! Go, go, go!|¡Al aeropuerto! ¡Al aeropuerto, amigo! ¡Mi vuelo sale en cuarenta minutos! ¡Vámonos!
Y|Whoa, okay! I got you. Hang on, Tony.|¡Órale, va! Yo te llevo. Agárrate, Tony.|uóu, óukéi! ái gát iú. jáng ón, tóuni|✈️🚕💨
L|Okay, I will help you. Please hold on, Tony.
N|tony|angry|Forty minutes, Stanley! My ma's birthday in Jersey. If I miss it, she's gonna kill me!|¡Cuarenta minutos, Stanley! El cumpleaños de mi mamá en Jersey. ¡Si me lo pierdo, me mata!
Y|Relax, man. We're gonna make it. I know a shortcut.|Tranquilo, carnal. Sí llegamos. Me sé un atajo.|riláks, mán. uír góna méik it. ái nóu a shórtkat|🗺️😎⚡
L|Please calm down. We will arrive on time. I know a short road.
N|tony|surprised|A shortcut? Through the parking lot? Are you nuts?|¿Un atajo? ¿Por el estacionamiento? ¿Estás loco?
Y|Trust me, bro. Taxi drivers know all the tricks.|Confía en mí, bro. Los taxistas nos sabemos todos los trucos.|trást mí, bróu. táxi dráivers nóu ól de tríks|🧠🚕😏
L|Please trust me. Taxi drivers know many tricks.
N|tony|angry|Red light! Red light! Ah, fuggedaboutit, just wait, we ain't getting a ticket too.|¡Rojo! ¡Rojo! Ah, olvídalo, espérate, no vamos a sacar una multa también.
Y|I'm not running a red light, Tony. Not today.|No me voy a pasar el rojo, Tony. Hoy no.|áim nát ránin a réd láit, tóuni. nát tudéi|🚦🛑😅
L|I will not drive through the red light, Tony.
N|tony|happy|Terminal B! Look at that! Thirty minutes! You're a genius, kid!|¡Terminal B! ¡Mira nada más! ¡Treinta minutos! ¡Eres un genio, chamaco!
Y|Told you. That'll be thirty-five bucks.|Te dije. Son treinta y cinco dólares.|tóuld iú. dárel bi zérti fáiv báks|✈️💵🏁
A|Told you. That'll be thirty-five dollars.
L|I told you. The price is thirty-five dollars.
N|tony|happy|Here, fifty. Keep it! And next time, free pizza. On the house!|Toma, cincuenta. ¡Quédatelo! Y la próxima, pizza gratis. ¡Invita la casa!
Y|Deal! Tell your mom happy birthday from me.|¡Trato hecho! Dile a tu mamá feliz cumpleaños de mi parte.|díl! tél iór mám jápi bérzdei fróm mí|🍕🎂❤️
A|Bet! Tell your ma happy birthday.
L|I accept. Please tell your mother happy birthday from me.
N|tony|laugh|You got it! Ciao, Stanley!|¡Claro que sí! ¡Chao, Stanley!
Y|Go, go, go! Run, Tony, run!|¡Vete, vete, vete! ¡Corre, Tony, corre!|góu, góu, góu! rán, tóuni, rán!|🏃‍♂️💨✈️
L|Hurry, Tony. Please run.

#poli01|0|7|Tu primera parada|policia|davis,brad|Para parar un carro: «License and registration, please», «Do you know why I pulled you over?». Serio pero educado.
N|davis|neutral|Alright, rookie. Blue car, going way over the limit. Your turn. Go talk to him.|Bueno, novato. Carro azul, muy arriba del límite. Te toca. Ve a hablar con él.
Y|Got it. I'm on it, Davis.|Entendido. Ya voy, Davis.|gárit. áim ón it, déivis|👮‍♂️🚓👍
L|I understand. I will do it, Officer Davis.
N|brad|bored|Ugh. What's the problem, officer? I'm late for the gym.|Uf. ¿Cuál es el problema, oficial? Voy tarde al gym.
Y|Evening, sir. Do you know why I pulled you over?|Buenas noches, señor. ¿Sabe por qué lo detuve?|ívnin, sér. du iú nóu uái ái púld iú óuver?|🚓❓🚗
L|Good evening, sir. Do you know why I stopped your car?
N|brad|laugh|'Cause I look this good? Come on, bro.|¿Porque me veo así de bien? Ándale, bro.
Y|Nope. You were doing sixty in a thirty-five.|No. Iba a sesenta en una zona de treinta y cinco.|nóup. iú uér dúin síksti in a zérti fáiv|🏎️💨📉
L|No. You were driving at sixty miles per hour in a thirty-five zone.
N|brad|surprised|Sixty? No way. My speedometer's broken. Probably.|¿Sesenta? Ni loco. Mi velocímetro está descompuesto. Seguro.
Y|Sure it is. License and registration, please.|Claro que sí. Licencia y tarjeta de circulación, por favor.|shúr it ís. láisens an reyistréishen, plís|🪪📄😐
L|I do not believe you. Please give me your license and registration.
N|brad|angry|This is bullshit, man. You know who I am? I bench three-fifteen.|Esto es una mamada, man. ¿Sabes quién soy? Levanto ciento cuarenta kilos en banca.
Y|Cool story, bro. Hands on the wheel, please.|Qué bonita historia, bro. Manos en el volante, por favor.|kúl stóri, bróu. jánds on de uíl, plís|💪😑🚗
L|That is not important. Please keep your hands on the steering wheel.
N|davis|neutral|Easy, rookie. Write him the ticket and keep it professional.|Tranquilo, novato. Hazle la multa y que sea profesional.
Y|Here's your ticket, sir. You can pay it online or fight it in court.|Aquí está su multa, señor. La puede pagar en línea o pelearla en la corte.|jírs iór tíket, sér. iú kan péi it onláin or fáit it in kórt|🧾💻⚖️
L|This is your ticket. You can pay on the internet or go to court.
N|brad|bored|Whatever. Can I go now?|Como sea. ¿Ya me puedo ir?
Y|Yep. Slow down, alright? The gym ain't going anywhere.|Sí. Bájele, ¿va? El gym no se va a ir a ningún lado.|iép. slóu dáun, ólráit? de yím éint góuin éniuer|🐢🏋️‍♂️😏
L|Yes. Please drive more slowly. The gym will still be there.
N|davis|laugh|Ha! Not bad for your first one, Stanley.|¡Ja! Nada mal para la primera, Stanley.
Y|Thanks, man. My heart's still going crazy though.|Gracias, carnal. Pero el corazón todavía me late a mil.|zénks, mán. mái járts stíl góuin kréizi dóu|💓😅👮‍♂️
L|Thank you. But I am still very nervous.

#poli02|0|8|Bronca en el bar|policia|davis,ray,jake,extrano|En un pleito: separa y calma. «Alright, break it up», «Everybody take a breath», «What happened here?».
N|ray|angry|Officers! Over here! These two are about to tear my bar apart!|¡Oficiales! ¡Por acá! ¡Estos dos me van a destrozar el bar!
Y|Alright, alright! Break it up, guys!|¡Ya, ya! ¡Sepárense, muchachos!|ólráit, ólráit! bréik it áp, gáis!|✋👮‍♂️💥
L|Stop. Please separate.
N|extrano|angry|This dumbass spilled his beer all over my new jacket!|¡Este pendejo me tiró la cerveza en mi chamarra nueva!
N|jake|angry|It was an accident, man! Chill! You bumped into ME!|¡Fue un accidente, man! ¡Cálmate! ¡Tú chocaste conmigo!
Y|Everybody take a breath. One at a time.|Todos respiren. Uno por uno.|évribari téik a bréz. uán at a táim|😮‍💨☝️👮‍♂️
L|Everyone, please breathe. Please speak one person at a time.
N|extrano|angry|One at a time? He owes me a hundred bucks for this jacket!|¿Uno por uno? ¡Me debe cien dólares por esta chamarra!
Y|Dude, it's a little beer. It'll wash out.|Güey, es un poquito de cerveza. Se quita con agua.|dúd, its a lírel bír. írel uásh áut|🍺🧥🧼
L|Sir, it is only a little beer. You can wash it.
N|jake|laugh|See? He gets it. Thank you, officer!|¿Ves? Él sí entiende. ¡Gracias, oficial!
Y|Don't push it, Jake. You still owe him an apology.|No te pases, Jake. Todavía le debes una disculpa.|dóunt púsh it, yéik. iú stíl óu jím an apáloyi|☝️😑🙏
L|Do not exaggerate, Jake. You need to apologize to him.
N|jake|sad|Fine. My bad, man. Sorry about your jacket.|Bueno. Perdón, man. Lo siento por tu chamarra.
N|extrano|bored|Yeah, whatever. Just stay away from me.|Ya, como sea. Nomás aléjate de mí.
Y|Cool. You two stay on opposite sides of the bar tonight.|Bien. Ustedes dos se quedan en lados opuestos del bar hoy.|kúl. iú tú stéi on ápozit sáids of de bár tunáit|↔️🍻👮‍♂️
L|Good. You must stay in different parts of the bar tonight.
N|ray|happy|Thanks, Stanley. You want a soda for the road? On the house.|Gracias, Stanley. ¿Quieres un refresco para el camino? Invita la casa.
Y|Can't, Ray. I'm on duty. But I appreciate it.|No puedo, Ray. Estoy de servicio. Pero se agradece.|kánt, réi. áim on dúti. bat ái aprícheit it|🥤🚫👮‍♂️
L|I cannot, Ray. I am working. But thank you.
N|davis|happy|Look at you. No yelling, no drama. Nice work, rookie.|Mírate. Sin gritos, sin drama. Buen trabajo, novato.
Y|Easy money. Who's buying the donuts?|Pan comido. ¿Quién invita las donas?|ízi máni. húz báin de dóunats?|🍩😎👮‍♂️
L|It was easy. Who will pay for the donuts?

#poli03|0|9|Karen y la limonada ilegal|policia|davis,karen,tommy|Cuando alguien reporta algo ridículo: escucha, no te rías (mucho) y resuelve. «Let me get this straight», «Is that it?».
N|karen|angry|Officers! Finally! I wanna report a crime. An illegal business on my street!|¡Oficiales! ¡Por fin! ¡Quiero reportar un crimen! ¡Un negocio ilegal en mi calle!
Y|Okay, ma'am. What's going on?|Okey, señora. ¿Qué está pasando?|óukéi, mám. uáts góuin ón?|👮‍♂️📝❓
L|Okay, madam. What is happening?
N|karen|angry|That kid. Right there. Selling lemonade. Without a permit!|Ese niño. Ahí mero. Vendiendo limonada. ¡Sin permiso!
Y|Lemme get this straight. You called 911 over lemonade?|A ver si entendí. ¿Llamó al 911 por una limonada?|lémi guét dis stréit. iú kóld náin uán uán óuver lémoneid?|🍋📞🤨
A|Lemme get this straight. You called nine one one over lemonade?
L|Let me understand. You called the emergency number because of lemonade?
N|tommy|scared|Am I going to jail? I only made four dollars!|¿Me van a meter a la cárcel? ¡Nomás gané cuatro dólares!
Y|Nah, little man. Nobody's going to jail. Relax.|Nel, campeón. Nadie va a la cárcel. Tranquilo.|ná, lírel mán. nóubaris góuin tu yéil. riláks|🧒🍋😌
L|No, child. No one will go to jail. Please calm down.
N|karen|angry|He's blocking the sidewalk! And it's too sour! I want my dollar back!|¡Está bloqueando la banqueta! ¡Y está muy agria! ¡Quiero que me devuelva mi dólar!
Y|Wait, you bought one? So you're a customer now?|Espere, ¿usted compró una? ¿O sea que ahora es clienta?|uéit, iú bát uán? sóu iór a kástomer náu?|🤯🍋💵
L|Excuse me, you bought one? Then you are a customer?
N|davis|laugh|Rookie, don't laugh. Stay professional.|Novato, no te rías. Sé profesional.
Y|I'm trying, Davis. I'm trying real hard.|Lo intento, Davis. Lo intento con todas mis fuerzas.|áim tráin, déivis. áim tráin ríl járd|😂🤐👮‍♂️
L|I am trying, Officer Davis. It is difficult.
N|karen|surprised|So you're not gonna arrest him?|¿O sea que no lo van a arrestar?
Y|No, ma'am. But here's your dollar back, from me. Have a nice day.|No, señora. Pero aquí está su dólar de vuelta, de mi parte. Que tenga buen día.|nóu, mám. bat jírs iór dáler bák, fróm mí. jáv a náis déi|💵🙄👋
L|No, madam. Here is your dollar. I will pay it. Have a nice day.
N|tommy|happy|Officer Stanley! You want a lemonade? It's free for cops!|¡Oficial Stanley! ¿Quiere una limonada? ¡Es gratis para los policías!
Y|Heck yeah, gimme two. One for my partner too.|Claro que sí, dame dos. Una para mi compañero también.|jék iéa, guími tú. uán for mái pártner tú|🍋🍋👮‍♂️
L|Yes, please give me two. One is for my partner.
N|davis|happy|Mmm. Honestly? Kinda sour.|Mmm. ¿La neta? Medio agria.
Y|Don't say that, man. Karen's gonna hear you.|No digas eso, carnal. Karen te va a oír.|dóunt séi dát, mán. kárens góna jír iú|🤫👂😂
L|Please do not say that. Karen will hear you.

#poli04|0|10|El ladrón de papitas|policia|davis,destiny,extrano|Con un ladrón de tienda: sin drama. «What's in the jacket, man?», «Let's not make this a thing».
N|destiny|bored|Yeah, hi. That guy just put like five bags of chips in his jacket. Whatever, I'm just the cashier.|Ajá, hola. Ese tipo acaba de meter como cinco bolsas de papas en su chamarra. Como sea, yo nomás soy la cajera.
Y|Thanks. I'll handle it. Hey, sir! Hold up a sec.|Gracias. Yo me encargo. ¡Oiga, señor! Espérese tantito.|zénks. áil jándel it. jéi, sér! jóuld áp a sék|👮‍♂️✋🏃‍♂️
L|Thank you. I will take care of this. Excuse me, sir. Please wait.
N|extrano|scared|Who, me? I didn't do nothing, officer.|¿Quién, yo? Yo no hice nada, oficial.
Y|What's in the jacket, man?|¿Qué traes en la chamarra, carnal?|uáts in de yáket, mán?|🧥🤨🔍
L|What do you have inside your jacket?
N|extrano|neutral|Uh, my body? Muscles? It's a puffy jacket.|Este, ¿mi cuerpo? ¿Músculos? Es una chamarra inflada.
Y|Your jacket's crinkling, bro. Muscles don't crinkle.|Tu chamarra está crujiendo, bro. Los músculos no crujen.|iór yákets krínklin, bróu. másels dóunt krínkel|🥔🔊😂
L|Your jacket is making noise. Muscles do not make that noise.
N|extrano|sad|Okay, okay. I was hungry, man. I lost my job last week.|Okey, okey. Tenía hambre, man. Perdí mi chamba la semana pasada.
Y|I hear you. Put 'em on the counter and let's not make this a thing.|Te entiendo. Ponlas en el mostrador y no hagamos un problema de esto.|ái jír iú. pút em on de káunter an léts nát méik dis a zíng|🥔🥔🥔🧾
A|I hear you. Put them on the counter and let's not make this a thing.
L|I understand. Please put them on the counter. Let us not make a big problem.
N|davis|neutral|First time? Store wanna press charges?|¿Primera vez? ¿La tienda quiere levantar cargos?
N|destiny|bored|Honestly? I don't get paid enough to care.|¿La neta? No me pagan lo suficiente como para que me importe.
Y|Alright, man. No charges this time. Just don't let me catch you doing it again.|Bueno, carnal. Sin cargos esta vez. Que no te vuelva a cachar haciéndolo.|ólráit, mán. nóu chárchez dis táim. dóunt kám bák an dú it agén|☝️🙅‍♂️👮‍♂️
A|Alright, man. No charges this time. Don't come back and do it again.
L|Okay. You will not be charged this time. Please do not steal again.
N|extrano|cry|Thank you, officer. For real. I'm sorry.|Gracias, oficial. En serio. Lo siento.
Y|There's a food bank on Fifth. Tell 'em Stanley sent you.|Hay un banco de comida en la Quinta. Diles que te mandó Stanley.|dérs a fúd bánk on fífz. tél em stánli sént iú|🥫🏢🤝
A|There's a food bank on Fifth. Tell them Stanley sent you.
L|There is a food bank on Fifth Street. Tell them that Stanley sent you.
N|destiny|surprised|Wow. That was lowkey nice. Are cops allowed to be nice?|Guau. Eso estuvo medio bonito. ¿Los polis pueden ser buena onda?
Y|Only on Tuesdays. Don't tell anybody.|Nomás los martes. No le digas a nadie.|óunli on tiúsdeis. dóunt tél énibari|🤫📅😏
L|Only on Tuesday. Please keep it a secret.

#poli05|0|11|El borracho cantante|policia|davis,extrano|Con un borracho: paciencia, nada de gritos. «You can't sleep here, buddy», «Let's get you home».
N|davis|bored|Two a.m. Guy singing on the bench again. Your turn, rookie.|Las dos de la mañana. Otra vez el tipo cantando en la banca. Te toca, novato.
Y|Ugh, again? Okay, I got this.|Ay, ¿otra vez? Bueno, yo me encargo.|ág, agén? óukéi, ái gát dís|😩🎤🌙
A|Again? Okay, I got this.
L|Again? Okay, I will take care of it.
N|extrano|happy|I will always love youuuu! Officer! Sing with me, officer!|¡Siempre te amaréééé! ¡Oficial! ¡Cante conmigo, oficial!
Y|Hey, buddy. You can't sleep here, man.|Oye, amigo. No te puedes dormir aquí, carnal.|jéi, bári. iú kánt slíp jír, mán|🛏️🚫🪑
L|Excuse me, sir. You are not permitted to sleep here.
N|extrano|sad|I'm not sleeping. I'm grieving. My girl dumped me. For a dentist.|No estoy durmiendo. Estoy de luto. Mi novia me cortó. Por un dentista.
Y|Damn, a dentist? That's cold, bro.|¡Chale, un dentista! Qué gacho, bro.|dám, a déntist? dáts kóuld, bróu|🦷💔🥶
L|That is very sad. A dentist? That is cruel.
N|extrano|cry|He's got perfect teeth! How am I supposed to compete with that?|¡Tiene dientes perfectos! ¿Cómo voy a competir con eso?
Y|Plenty of fish in the sea, man. Where do you live?|Hay muchos peces en el mar, carnal. ¿Dónde vives?|plénti ov físh in de sí, mán. uér du iú lív?|🐟🌊🏠
L|There are many other women. What is your address?
N|extrano|neutral|Right... over... there. The blue house. I think.|Ahí... mero... enfrente. La casa azul. Creo.
Y|Alright. Let's get you home. Watch your step.|Bueno. Vamos a llevarte a tu casa. Cuidado con el escalón.|ólráit. léts guét iú jóum. uách iór stép|🏠🚶‍♂️👮‍♂️
L|Okay. I will take you home. Please be careful.
N|extrano|happy|You're a good cop. You're a good... human person.|Eres un buen policía. Eres una buena... persona humana.
Y|Thanks, man. Drink some water and go to bed.|Gracias, carnal. Tómate un agua y vete a dormir.|zénks, mán. dríngk sam uárer an góu tu béd|💧🛏️😴
L|Thank you. Please drink water and go to sleep.
N|davis|laugh|You sang with him, didn't you? I heard you from the car.|Cantaste con él, ¿verdad? Te oí desde la patrulla.
Y|Just the chorus, Davis. Just the chorus.|Nomás el coro, Davis. Nomás el coro.|yást de kórus, déivis. yást de kórus|🎤😳🚓
L|I only sang the chorus, Officer Davis.

#poli06|0|12|Max se perdió|policia|davis,tommy,max|Para ayudar a encontrar algo: «Don't worry, we'll find him», «When did you last see him?», y con el perro: «Come here, boy!».
N|tommy|cry|Officer Stanley! Max is gone! He ran away and I can't find him anywhere!|¡Oficial Stanley! ¡Max se fue! ¡Se escapó y no lo encuentro por ningún lado!
Y|Hey, hey, don't worry, buddy. We'll find him.|Oye, oye, no te preocupes, campeón. Lo vamos a encontrar.|jéi, jéi, dóunt uóri, bári. uíl fáind jím|🐕🔍🧒
L|Please do not worry, child. We will find him.
N|tommy|sad|He was right here! Then a squirrel came and he went crazy!|¡Estaba aquí mismo! ¡Luego vino una ardilla y se volvió loco!
Y|When did you last see him? Which way did he go?|¿Cuándo lo viste por última vez? ¿Para dónde se fue?|uén did iú lást sí jím? uích uéi did ji góu?|🐿️🐕💨
L|At what time did you last see him? In which direction did he go?
N|tommy|neutral|Like five minutes ago. Toward the pizza place.|Como hace cinco minutos. Para la pizzería.
Y|The pizza place? Oh, I know exactly where he is.|¿La pizzería? Ah, ya sé exactamente dónde está.|de pítsa pléis? óu, ái nóu eksáktli uér ji ís|🍕🐕💡
L|The pizzeria? I know where he is.
N|davis|laugh|Ha! That dog loves pepperoni more than I love my pension.|¡Ja! Ese perro quiere más al pepperoni que yo a mi pensión.
N|max|happy|Woof! Woof! Woof!|(Max está en la basura de la pizzería, feliz con una orilla de pizza)
Y|Max! Come here, boy! Drop it!|¡Max! ¡Ven acá, chiquito! ¡Suéltala!|máx! kám jír, bói! dráp ít!|🐕🍕🚫
L|Max, come here. Leave the pizza.
N|max|happy|Woof! Grrr... woof!|(Max dice que esa orilla es suya y que la ganó con honor)
Y|Nice try, dude. Sit! Good boy.|Buen intento, güey. ¡Siéntate! Buen perro.|náis trái, dúd. sít! gúd bói|🐕🪑👍
L|Good attempt. Sit down. You are a good dog.
N|tommy|happy|Max! You found him! You're the best cop ever!|¡Max! ¡Lo encontraste! ¡Eres el mejor policía del mundo!
Y|Just doing my job, little man. Keep him on the leash, okay?|Nomás hago mi chamba, campeón. Tráelo con correa, ¿va?|yást dúin mái yáb, lírel mán. kíp jím on de lísh, óukéi?|🦮😎👮‍♂️
L|I am only doing my work. Please keep him on the leash.
N|max|happy|Woof! Woof!|(Max te da las gracias con un lengüetazo lleno de salsa)
Y|Ew, Max! Pizza breath! Gross, dude.|¡Guácala, Max! ¡Aliento de pizza! Qué asco, güey.|íu, máx! pítsa bréz! gróus, dúd|👅🍕🤢
L|Max, your breath smells like pizza. That is disgusting.
`);

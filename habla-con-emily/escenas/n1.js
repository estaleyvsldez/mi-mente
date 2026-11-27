/* Nivel 1 · Sobrevivir
   # id|nivel|título|lugar|emoji|nombre|voz (F mujer, M hombre, E Emily)|nota
   N|lo que te dicen|español
   Y|lo que tú dices|español|cómo se lee|dibujo */
ESC_TXT.push(`
#s001|1|Entrar al súper|super|🧑‍💼|Empleado|M|En la calle nadie dice «How are you?» completo y lento: es «jáuar iú», todo pegado.
N|Hey, how's it going?|Hola, ¿cómo te va?
Y|Good, thanks. How are you?|Bien, gracias. ¿Y tú?|gud, zénks. jáuar iú|👋😄
N|I'm good. Can I help you find anything?|Bien. ¿Te ayudo a encontrar algo?
Y|Yeah, where's the milk?|Sí, ¿dónde está la leche?|iéa, uérs de mílk|🥛❓
N|It's in aisle five, in the back.|Está en el pasillo cinco, al fondo.
Y|Aisle five? Got it.|¿Pasillo cinco? Entendido.|áil fáiv? gárit|5️⃣👉
N|Anything else?|¿Algo más?
Y|Do you guys have tortillas?|¿Ustedes tienen tortillas?|diú gáis jav tortíyas|🌮🤔
N|Yep, aisle three, next to the bread.|Sí, pasillo tres, junto al pan.
Y|Awesome, thanks a lot.|Qué bien, muchas gracias.|ósom, zénks a lát|🙏😁
N|No problem. Have a good one!|De nada. ¡Que te vaya bien!
Y|You too!|¡Igualmente!|iú túu|✌️

#s002|1|La carnicería|super|🧔|Carnicero|M|«Can I get…?» es la forma normal de pedir algo. Literal es «¿puedo obtener?», pero significa «me da…».
N|Hi there! What can I get you?|¡Hola! ¿Qué te doy?
Y|Can I get two pounds of ground beef?|¿Me da dos libras de carne molida?|quen ái guet túu páunds av gráun bíif|🥩🥩⚖️
N|Sure. Anything else?|Claro. ¿Algo más?
Y|Yeah, I'm looking for chicken breasts.|Sí, busco pechugas de pollo.|iéa, áim lúkin for chíken brests|🐔🔍
N|How many do you want?|¿Cuántas quieres?
Y|Like four, please.|Como cuatro, por favor.|láik fór, plíis|4️⃣🙏
N|Here you go. Is that it?|Aquí tienes. ¿Es todo?
Y|That's it, thank you.|Es todo, gracias.|dáts it, zénkiu|✅
N|Have a good one!|¡Que te vaya bien!
Y|Thanks, you too.|Gracias, igualmente.|zénks, iú túu|👍

#s003|1|Pagar en la caja|super|👩‍💼|Cajera|F|«You're all set» = ya quedó, ya estás listo. Lo vas a oír en todas las cajas.
N|Hi! Did you find everything okay?|¡Hola! ¿Encontraste todo bien?
Y|Yeah, I did. Thanks.|Sí, todo. Gracias.|iéa, ái díd. zénks|🛒👍
N|Do you want a bag?|¿Quieres bolsa?
Y|Yes, please. Two bags.|Sí, por favor. Dos bolsas.|iés, plíis. túu bágs|🛍️🛍️
N|Do you have a rewards card?|¿Tienes tarjeta de puntos?
Y|No, I don't.|No, no tengo.|nóu, ái dóunt|🙅‍♂️💳
N|Okay. Your total is forty-two fifty.|Ok. Son cuarenta y dos cincuenta.
Y|Can I pay with card?|¿Puedo pagar con tarjeta?|quen ái péi uíd cárd|💳❓
N|Sure, go ahead and tap it.|Claro, acércala.
Y|Okay. Do you need my ID?|Ok. ¿Necesitas mi identificación?|oukéi. diú níid mái ái dí|🪪
N|Nope, you're all set. Here's your receipt.|No, ya quedó. Aquí está tu recibo.
Y|Thank you! Have a good night.|¡Gracias! Que pases buena noche.|zénkiu! jáv a gud náit|🌙🧾

#s004|1|La cafetería|cafe|👩‍🍳|Barista|F|«I'll have…» = voy a querer… Es la forma más natural de pedir comida.
N|Hi! What can I get started for you?|¡Hola! ¿Qué te preparo?
Y|Can I get a large iced coffee?|¿Me das un café helado grande?|quen ái guet a lárch áist cófi|🧊☕
N|Sure. Any milk or sugar?|Claro. ¿Leche o azúcar?
Y|Just a little milk, no sugar.|Nomás un poco de leche, sin azúcar.|yást a lírel mílk, nóu shúgar|🥛🚫🍬
N|Got it. Anything to eat?|Listo. ¿Algo de comer?
Y|Yeah, I'll have a croissant too.|Sí, también un cuernito.|iéa, áil jáv a cruasánt túu|🥐
N|Can I get a name for the order?|¿A qué nombre?
Y|It's Stanley.|Stanley.|its Stánli|📛
N|Cool. It'll be ready in a minute.|Va. Sale en un minuto.
Y|Thanks. Where do I pick it up?|Gracias. ¿Dónde lo recojo?|zénks. uér du ái píkirap|📍☕
N|Right over there at the end.|Allá al final.
Y|Gotcha. Thanks!|Entendido. ¡Gracias!|gócha. zénks|👌

#s005|1|Comida rápida|comida|🧑‍🍳|Empleado|M|«Lemme get…» (let me get) es como piden los gringos en la comida rápida.
N|Welcome! What can I get for you today?|¡Bienvenido! ¿Qué te sirvo?
Y|Lemme get a number two.|Dame un número dos.|lémi guet a námber túu|2️⃣🍔
N|Do you want to make it a large?|¿Lo quieres en grande?
Y|Nah, medium's fine.|No, mediano está bien.|ná, mídiums fáin|🤏👍
N|What do you want to drink?|¿Qué quieres de tomar?
Y|A Coke, no ice.|Una Coca, sin hielo.|a cóuk, nóu áis|🥤🚫🧊
N|For here or to go?|¿Para aquí o para llevar?
Y|To go, please.|Para llevar, por favor.|tu góu, plíis|🛍️🚶
N|Anything else?|¿Algo más?
Y|Can I get extra ketchup?|¿Me das cátsup extra?|quen ái guet ékstra kéchap|🍅➕
N|You got it. That'll be eleven bucks.|Claro. Son once dólares.
Y|Here you go. Keep the change.|Tenga. Quédese con el cambio.|jíir iu góu. kíip de chéinch|💵😎

#s006|1|Mesa en el restaurante|restaurante|👩‍🦰|Mesera|F|«Give us a minute» = denos un minuto. Te salva cuando todavía no sabes qué pedir.
N|Hi! How many people?|¡Hola! ¿Cuántas personas?
Y|Just two.|Nomás dos.|yást túu|✌️
N|Right this way. Can I start you off with drinks?|Por aquí. ¿Les traigo algo de tomar?
Y|Can we get two waters for now?|¿Nos trae dos aguas por mientras?|quen uí guet túu uárers for náu|💧💧
N|Sure. Are you ready to order?|Claro. ¿Listos para ordenar?
Y|Give us a minute, please.|Denos un minuto, por favor.|guív as a mínit, plíis|⏳🙏
N|Take your time. Okay, what'll it be?|Con calma. Ok, ¿qué van a querer?
Y|I'll have the steak, medium well.|Yo quiero el filete, tres cuartos.|áil jáv de stéik, mídium uél|🥩🔥
N|Great choice. Any sides?|Buena elección. ¿Algún acompañamiento?
Y|Fries and a salad, please.|Papas y una ensalada, por favor.|fráis an a sálad, plíis|🍟🥗
N|Perfect. I'll put that right in.|Perfecto. Ahorita lo pido.
Y|Thank you so much.|Muchas gracias.|zénkiu sóu mách|😊

#s007|1|La cuenta|restaurante|🧑‍🍳|Mesero|M|«I'm stuffed» = estoy lleno, ya no me cabe nada.
N|How was everything?|¿Qué tal estuvo todo?
Y|It was really good, thanks.|Estuvo muy rico, gracias.|it uás ríli gud, zénks|😋👌
N|Can I get you any dessert?|¿Les traigo postre?
Y|No thanks, I'm stuffed.|No gracias, estoy lleno.|nóu zénks, áim stáft|🤰🍽️
N|No problem.|Sin problema.
Y|Can I get the check, please?|¿Me trae la cuenta, por favor?|quen ái guet de chék, plíis|🧾✍️
N|Sure. Together or separate?|Claro. ¿Junta o separada?
Y|Together. I got it.|Junta. Yo invito.|tuguéder. ái gárit|🤝💳
N|Here you go. I'll be right back.|Aquí tiene. Ahorita regreso.
Y|Is the tip included?|¿Viene incluida la propina?|is de típ inclúded|💰❓
N|No, it's not.|No, no viene.
Y|Okay, no worries.|Ok, no hay problema.|oukéi, nóu uóris|👍

#s008|1|Preguntar cómo llegar|calle|👴|Señor|M|Aquí tú empiezas la plática. «Real quick» = rapidito.
Y|Excuse me, can you help me real quick?|Disculpe, ¿me ayuda tantito?|ikskiús mi, quen iú jélp mi ríl cuík|🙋‍♂️⏱️
N|Sure, what's up?|Claro, ¿qué pasó?
Y|I'm looking for the bus station.|Busco la estación de camiones.|áim lúkin for de bás stéishen|🚌🔍
N|Oh, it's not far. Go straight two blocks.|Ah, no está lejos. Sigue derecho dos cuadras.
Y|Two blocks this way?|¿Dos cuadras por aquí?|túu blóks dis uéi|2️⃣👉
N|Yeah, then turn right at the light.|Sí, luego a la derecha en el semáforo.
Y|Right at the light. Okay.|A la derecha en el semáforo. Ok.|ráit at de láit. oukéi|🚦➡️
N|You can't miss it. It's a big building.|No tiene pierde. Es un edificio grande.
Y|Can I walk there?|¿Puedo ir caminando?|quen ái uók déer|🚶‍♂️❓
N|Yeah, it's like five minutes.|Sí, como cinco minutos.
Y|Perfect. Thanks, man!|Perfecto. ¡Gracias, compa!|pérfekt. zénks, mán|🙌

#s009|1|En el Uber|bus|🧔🏽|Chofer|M|«Drop me off» = déjame. «Pick me up» = pasa por mí.
N|Hey, are you Stanley?|Hola, ¿eres Stanley?
Y|Yeah, that's me.|Sí, soy yo.|iéa, dáts mí|🙋‍♂️
N|Hop in. Going to the airport, right?|Súbete. Vas al aeropuerto, ¿verdad?
Y|Yes, terminal two, please.|Sí, terminal dos, por favor.|iés, términal túu, plíis|✈️2️⃣
N|Cool. Do you want some music?|Va. ¿Quieres música?
Y|Sure, whatever you like.|Claro, lo que tú quieras.|shúr, uarévar iú láik|🎶🤷
N|How long are you traveling for?|¿Por cuánto tiempo viajas?
Y|Just a week. I'm visiting family.|Nomás una semana. Voy a ver a mi familia.|yást a uíik. áim vísitin fámili|📅👨‍👩‍👦
N|Nice. We're almost there.|Qué bien. Ya casi llegamos.
Y|Can you drop me off at the front?|¿Me deja en la entrada?|quen iú dráp mi óf at de fránt|🚗⬇️
N|No problem. Have a safe flight!|Claro. ¡Buen vuelo!
Y|Thanks, man. Take care!|Gracias, compa. ¡Cuídate!|zénks, mán. téik kér|✌️

#s010|1|La gasolinera|gas|🧑|Cajero|M|«Appreciate it» = te lo agradezco. Los gringos lo dicen sin el «I».
Y|Hey, can I get forty on pump six?|Oiga, ¿me pone cuarenta en la bomba seis?|jéi, quen ái guet fórri an pámp síks|⛽6️⃣
N|Forty on six. Anything else?|Cuarenta en la seis. ¿Algo más?
Y|Yeah, and this water.|Sí, y esta agua.|iéa, an dis uárer|💧
N|Cash or card?|¿Efectivo o tarjeta?
Y|Cash.|Efectivo.|cásh|💵
N|Okay, that's forty-two even.|Ok, son cuarenta y dos exactos.
Y|Where's the restroom?|¿Dónde está el baño?|uérs de réstruum|🚻❓
N|In the back, on the left. Here's the key.|Al fondo a la izquierda. Aquí está la llave.
Y|Thanks. I'll bring it right back.|Gracias. Ahorita se la traigo.|zénks. áil bríngit ráit bák|🔑↩️
N|No rush.|Sin prisa.
Y|Appreciate it.|Se lo agradezco.|aprísieirit|🙏

#s011|1|Tienda de ropa|tienda|👩|Vendedora|F|«Just looking» = nomás estoy viendo. Te quita de encima al vendedor.
N|Hi! Are you looking for anything specific?|¡Hola! ¿Buscas algo en especial?
Y|Just looking, thanks.|Nomás estoy viendo, gracias.|yást lúkin, zénks|👀
N|No problem. Let me know if you need anything.|Sin problema. Avísame si necesitas algo.
Y|Actually, do you have this in a large?|De hecho, ¿tienes esta en grande?|ákchuali, diú jáv dis in a lárch|👕🔠
N|Let me check. Yep, here you go.|Déjame ver. Sí, aquí tienes.
Y|Where are the fitting rooms?|¿Dónde están los probadores?|uérar de fírin rúums|🚪👕
N|Right in the back.|Hasta atrás.
Y|It's a little tight. Do you have a bigger size?|Me queda un poco apretada. ¿Tienes una más grande?|its a lírel táit. diú jáv a bíguer sáis|😣➡️🆙
N|Here's an extra large.|Aquí está una extra grande.
Y|This one fits. I'll take it.|Esta me queda. Me la llevo.|dis uán fíts. áil téikit|✅🛍️
N|Awesome. I can ring you up over here.|Genial. Te cobro por acá.
Y|Cool, thanks.|Va, gracias.|cúl, zénks|😎

#s012|1|La farmacia|farmacia|👩‍⚕️|Farmacéutica|F|«What do you recommend?» suena «uádiu recoménd», todo pegado.
N|Hi, how can I help you?|Hola, ¿en qué te ayudo?
Y|I have a bad headache. What do you recommend?|Tengo mucho dolor de cabeza. ¿Qué me recomienda?|ái jáv a bád jédeik. uádiu recoménd|🤕💊
N|You can try ibuprofen. It works pretty fast.|Puedes probar ibuprofeno. Funciona rápido.
Y|How many do I take?|¿Cuántas me tomo?|jáu méni du ái téik|❓💊
N|Two pills every six hours.|Dos pastillas cada seis horas.
Y|With food or without food?|¿Con comida o sin comida?|uíd fúud or uidáut fúud|🍽️❓
N|Better with food.|Mejor con comida.
Y|Okay. Do you have something for a cough too?|Ok. ¿Tiene algo para la tos también?|oukéi. diú jáv sámzin for a cóf túu|😷
N|Yeah, this syrup is good.|Sí, este jarabe es bueno.
Y|I'll take both, thanks.|Me llevo los dos, gracias.|áil téik bóuz, zénks|✌️💊

#s013|1|El vecino nuevo|casa|👩‍🦳|Karen|F|«I just moved in» = me acabo de mudar. «Just» aquí significa «apenas, recién».
N|Hi! Are you the new neighbor?|¡Hola! ¿Eres el vecino nuevo?
Y|Yeah, I just moved in. I'm Stanley.|Sí, me acabo de mudar. Soy Stanley.|iéa, ái yást múuvd ín. áim Stánli|📦🏠
N|Nice to meet you! I'm Karen.|¡Mucho gusto! Soy Karen.
Y|Nice to meet you too.|Mucho gusto.|náis tu míchu túu|🤝
N|Where are you from?|¿De dónde eres?
Y|I'm from Mexico.|Soy de México.|áim fram méksicou|🇲🇽
N|Cool! How do you like it here so far?|¡Qué padre! ¿Qué tal te ha parecido aquí?
Y|I like it. It's pretty quiet.|Me gusta. Está tranquilo.|ái láikit. its príri cuáiet|😌🌳
N|If you need anything, just knock.|Si necesitas algo, nomás toca.
Y|Thanks, I appreciate it.|Gracias, te lo agradezco.|zénks, ái aprísieirit|🚪✊
N|See you around!|¡Nos vemos!
Y|See ya!|¡Nos vemos!|síia|👋

#s014|1|Llamar a un restaurante|telefono|☎️|Recepcionista|F|Por teléfono no ves la cara: escucha bien y no te dé pena decir «Sorry, can you repeat that?».
N|Thanks for calling Mario's. How can I help you?|Gracias por llamar a Mario's. ¿En qué le ayudo?
Y|Hi, are you guys open right now?|Hola, ¿están abiertos ahorita?|jái, ar iú gáis óupen ráit náu|📞🕐
N|Yes, we're open until ten tonight.|Sí, abrimos hasta las diez de la noche.
Y|Do I need a reservation?|¿Necesito reservación?|du ái níid a reservéishen|📋❓
N|Not on weekdays. Just come in.|Entre semana no. Nomás venga.
Y|Okay. Do you have parking?|Ok. ¿Tienen estacionamiento?|oukéi. diú jáv párkin|🅿️
N|Yeah, it's right behind the building.|Sí, está atrás del edificio.
Y|Sorry, can you repeat that?|Perdón, ¿me lo repite?|sóri, quen iú ripíit dat|🔁👂
N|The parking is behind the building.|El estacionamiento está atrás del edificio.
Y|Perfect. See you later then.|Perfecto. Entonces nos vemos al rato.|pérfekt. síiu léirer den|👋📞
N|Sounds good. Bye!|Va. ¡Adiós!

#s015|1|Pedir pizza por teléfono|telefono|🍕|Tony's Pizza|M|«Pickup or delivery?» = ¿para recoger o a domicilio? Te lo preguntan siempre.
N|Tony's Pizza, pickup or delivery?|Tony's Pizza, ¿para recoger o a domicilio?
Y|Delivery, please.|A domicilio, por favor.|delíveri, plíis|🛵🍕
N|What's the address?|¿Cuál es la dirección?
Y|It's on Oak Street, apartment B.|Es en la calle Oak, departamento B.|its an óuk stríit, apártment bíi|🏠📍
N|What can I get you?|¿Qué le preparo?
Y|A large pepperoni and a two-liter Coke.|Una grande de pepperoni y una Coca de dos litros.|a lárch péperoni an a túu líirer cóuk|🍕🥤
N|Anything else?|¿Algo más?
Y|Can I get some wings too?|¿Me manda alitas también?|quen ái guet sam uíngs túu|🍗
N|Sure. It'll be about forty minutes.|Claro. Como cuarenta minutos.
Y|That's fine. Can I pay when it gets here?|Está bien. ¿Puedo pagar cuando llegue?|dáts fáin. quen ái péi uén it guets jíir|💵🚪
N|Yep, cash or card is fine.|Sí, efectivo o tarjeta.
Y|Cool. Thank you!|Va. ¡Gracias!|cúl. zénkiu|👍
`);

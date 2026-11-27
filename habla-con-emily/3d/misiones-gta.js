window.GTA_TXT=window.GTA_TXT||[];GTA_TXT.push(`
#g01|Bienvenido, primo|50|carlos|Acabas de llegar a la ciudad con una maleta y cero plan. Tu primo Carlos ya te tiene la primera misión: no morirse de hambre.
O|talk|casa|carlos|Habla con Carlos
N|carlos|happy|Güey! You made it! How was the bus ride?|¡Güey! ¡Llegaste! ¿Qué tal el camión?
Y|Long, bro. Like twenty hours.|Largo, bro. Como veinte horas.|lóng, bróu. láik tuénti áuers|🚌⏰💀
A|Super long, bro.
L|It was very long. Approximately twenty hours.
N|carlos|laugh|Twenty hours? Damn. You hungry?|¿Veinte horas? Chale. ¿Tienes hambre?
Y|I'm starving, dude.|Me muero de hambre, güey.|áim stárvin, dúd|🤤🍔💀
A|I'm starving.
L|I am very hungry.
N|carlos|neutral|Okay so, fridge is empty. Take my old car and grab some stuff at the tiendita. Chips, sodas, whatever.|Bueno, el refri está vacío. Llévate mi carro viejo y compra cosas en la tiendita. Papitas, refrescos, lo que sea.
Y|Your car? For real? Gimme the keys.|¿Tu carro? ¿En serio? Dame las llaves.|iór kár? for ríl? guími de kíis|🚗🔑😎
A|For real? Give me the keys.
A|Your car? Give me the keys.
L|You will lend me your car? Really? Please give me the keys.
N|carlos|laugh|Don't crash it, güey. It's older than you.|No lo choques, güey. Es más viejo que tú.
Y|No promises. Be right back.|No prometo nada. Ahorita vuelvo.|nóu prámises. bi ráit bák|🤞💨🚗
A|No promises. I'll be right back.
L|I cannot promise. I will return soon.
O|car|Súbete a tu carro
O|goto|tiendita|Maneja a la tiendita
O|talk|tiendita|cajero|Compra la botana
N|cajero|neutral|Hey, man. You new around here?|Qué onda. ¿Eres nuevo por aquí?
Y|Yeah, I just got here today.|Sí, apenas llegué hoy.|iéa, ái yást gát jíer tudéi|🧳🏙️👋
A|Yeah, just got here.
L|Yes, I arrived today.
N|cajero|happy|Welcome to the hood, bro. Need help finding anything?|Bienvenido al barrio, bro. ¿Te ayudo a encontrar algo?
Y|Yeah, where are the chips at?|Sí, ¿dónde están las papitas?|iéa, uér ar de chíps át|🥔❓👀
A|Where are the chips?
L|Excuse me, where can I find the chips?
N|cajero|neutral|Aisle two, right next to the sodas.|Pasillo dos, junto a los refrescos.
Y|Cool. And can I get two Cokes?|Va. ¿Y me da dos Coca-Colas?|kúl. and kan ái guét tú kóuks|🥤🥤👍
A|Can I get two Cokes?
L|Okay. I would also like two Coca-Colas, please.
N|cajero|neutral|Sure thing. That's eight seventy-five.|Claro. Son ocho setenta y cinco.
Y|Here you go. Keep the change.|Aquí tiene. Quédese con el cambio.|jíer iú góu. kíp de chéinch|💵🙌😇
L|Here is the money. You may keep the change.
O|money|-10|Pagaste $10
O|car|Súbete a tu carro
O|goto|casa|Regresa a la casa
O|end|Primo alimentado, refri lleno. Bienvenido a América, compa.

#g02|Grandma Rose al súper|40|rose|La vecina viejita no maneja desde 1987. Llévala al súper y que no se te pierda entre las ofertas.
O|car|Súbete a tu carro
O|goto|porche|Maneja a casa de Grandma Rose
O|talk|porche|rose|Habla con Grandma Rose
N|rose|happy|Oh, sweetie! You must be Carlos's cousin. Aren't you handsome!|¡Ay, corazón! Tú has de ser el primo de Carlos. ¡Qué guapo eres!
Y|Ha! Thank you, ma'am. I'm Stanley.|¡Ja! Gracias, señora. Soy Stanley.|já! zénk iú, mám. áim stánli|😊👵🤝
A|Thanks, ma'am. I'm Stanley.
L|Thank you very much, madam. My name is Stanley.
N|rose|sad|Honey, could you do me a favor? I need groceries, but my knees are killing me.|Mijo, ¿me haces un favor? Necesito mandado, pero las rodillas me están matando.
Y|No problem. Hop in, I'll take you.|No hay problema. Súbase, yo la llevo.|nóu prábrem. jóp ín, áil téik iú|🚗👵💪
A|Sure, I'll take you.
L|It is not a problem. Please get in the car. I will drive you.
N|rose|happy|You're an angel. Back in my day, young men had manners like you.|Eres un ángel. En mis tiempos, los jóvenes tenían modales como tú.
Y|Aw, you're too sweet. Buckle up, okay?|Ay, qué linda. Abróchese, ¿sí?|ó, iór tú suít. bákel áp, okéi|🥰🔒🚗
A|Buckle up, okay?
L|You are very kind. Please fasten your seat belt.
N|rose|laugh|Oh, and don't drive fast. My heart can't take it.|Ah, y no maneje rápido. Mi corazón no aguanta.
Y|Don't worry. I drive like a grandpa.|No se preocupe. Manejo como abuelito.|dóunt uóri. ái dráiv láik a gránpa|🐢🚗👴
L|Do not worry. I drive very slowly.
O|pickup|rose|Ayuda a Grandma Rose a subirse
O|car|Súbete a tu carro
O|drop|super|Lleva a Grandma Rose al supermercado
O|talk|super|rose,cajera|Ayúdala con el mandado
N|rose|neutral|Now where do they keep the prunes? Everything moves around in here.|¿Y dónde tienen las ciruelas pasas? Aquí todo lo cambian de lugar.
Y|Lemme ask. Excuse me, where are the prunes?|Déjeme preguntar. Disculpe, ¿dónde están las ciruelas pasas?|lémi ásk. ekskiús mí, uér ar de prúns|🙋‍♂️🫐❓
A|Let me ask. Excuse me, where are the prunes?
A|Excuse me, where are the prunes?
L|Allow me to ask. Excuse me, where can I find the prunes?
N|cajera|neutral|Aisle seven, bottom shelf. Next to the oatmeal.|Pasillo siete, abajo. Junto a la avena.
Y|Got it. Thanks a lot.|Va. Muchas gracias.|gárit. zénks a lát|👍🙏
L|I understand. Thank you very much.
N|cajera|neutral|That'll be thirty-two forty. You got a rewards card, hon?|Son treinta y dos cuarenta. ¿Tiene tarjeta de puntos, joven?
Y|Nah, I don't. It's on me, Rose.|No, no tengo. Yo invito, Rose.|ná, ái dóunt. its an mí, róus|💳🙅‍♂️😇
A|No, I don't. I got it, Rose.
L|No, I do not have one. I will pay for it, Rose.
N|rose|cry|Oh, sweetie! I'm gonna bake you the biggest apple pie.|¡Ay, mi amor! Te voy a hornear el pay de manzana más grande.
Y|Deal. I love apple pie.|Trato hecho. Me encanta el pay de manzana.|díil. ái láv ápel pái|🥧😋🤝
L|We have an agreement. I like apple pie very much.
O|money|-32|Pagaste $32 del mandado
O|pickup|rose|Súbela otra vez al carro
O|drop|porche|Llévala a su casa
O|end|Grandma Rose te adoptó. Ahora tienes abuela y pay gratis de por vida.

#g03|Se busca chamba|60|marcus|Sin chamba no hay renta. Tu nuevo compa Marcus dice que conoce a alguien en una obra. Ve al parque y sácale el chisme.
O|car|Súbete a tu carro
O|goto|parque|Maneja al parque
O|talk|parque|marcus|Habla con Marcus
N|marcus|happy|Yo, what's good! You Carlos's cousin, right? The new guy?|¡Qué onda! Tú eres el primo de Carlos, ¿no? ¿El nuevo?
Y|Yeah, that's me. What's up, man?|Sí, ese soy yo. ¿Qué onda, carnal?|iéa, dats mí. uáts áp, mán|👋😎🤝
A|That's me. What's up?
L|Yes, I am him. How are you?
N|marcus|neutral|Carlos said you're looking for work. That true?|Carlos dice que andas buscando chamba. ¿Es cierto?
Y|For real, bro. I need a job ASAP.|En serio, bro. Necesito chamba ya.|for ríl, bróu. ái níd a yáb éi és éi pí|💼🙏⏰
A|Yeah, I need a job ASAP.
A|I really need a job, bro.
L|Yes, it is true. I need employment as soon as possible.
N|marcus|happy|Bet. My boy Mike runs a crew at the construction site downtown. They're hiring.|Va. Mi compa Mike tiene una cuadrilla en la obra del centro. Están contratando.
Y|No way! How do I get there?|¡No manches! ¿Cómo llego?|nóu uéi! jáu du ái guét dér|😱🏗️🗺️
A|How do I get there?
L|That is incredible. How can I arrive there?
N|marcus|neutral|Easy. Go straight, take a left at the light, can't miss it. Tell him Marcus sent you.|Fácil. Derecho, a la izquierda en el semáforo, no tiene pierde. Dile que te mandó Marcus.
Y|Straight, then left. Got it. I owe you one.|Derecho y luego a la izquierda. Va. Te debo una.|stréit, den léft. gárit. ái óu iú uán|⬆️⬅️🤝
A|Got it. I owe you one.
L|Straight and then left. I understand. I am in your debt.
O|car|Súbete a tu carro
O|goto|obra|Maneja a la obra
O|talk|obra|mike|Pídele trabajo a Mike
N|mike|neutral|Hey buddy, hard hats only past this point. Can I help you?|Oye amigo, de aquí pa'llá sólo con casco. ¿Te ayudo?
Y|Hey, I'm Stanley. Marcus sent me.|Hola, soy Stanley. Me mandó Marcus.|jéi, áim stánli. márkus sént mi|👷‍♂️🤝📨
A|Hi, I'm Stanley. Marcus sent me.
L|Hello, my name is Stanley. Marcus recommended me.
N|mike|happy|Marcus! Alright. You ever done construction before?|¡Marcus! Órale. ¿Has trabajado en construcción?
Y|Yeah, back in Mexico. Like three years.|Sí, allá en México. Como tres años.|iéa, bák in méksiko. láik zrí iírs|🇲🇽🧱💪
A|Yeah, three years in Mexico.
L|Yes, I worked in construction in Mexico for three years.
N|mike|neutral|Can you start Monday? Six a.m. sharp. Not six-oh-five.|¿Puedes empezar el lunes? Seis de la mañana en punto. No seis y cinco.
Y|Six sharp. I'll be there, man.|Seis en punto. Ahí estaré.|síks shárp. áil bi dér, mán|⏰💯👷‍♂️
A|I'll be there.
L|At six o'clock exactly. I will be present.
N|mike|laugh|And bring boots. Last guy came in flip-flops.|Y trae botas. El último vino en chanclas.
Y|Flip-flops? No way. See you Monday, boss.|¿En chanclas? No manches. Nos vemos el lunes, jefe.|flíp flóps? nóu uéi. sí iú mándei, bás|🩴😂👷‍♂️
A|See you Monday.
L|In sandals? That is incredible. I will see you on Monday.
O|end|¡Tienes chamba! Ahora nomás falta despertarte a las cinco. Suerte con eso.

#g04|Café para la cuadrilla|45|mike|Primer día y ya eres el nuevo. Ya sabes lo que eso significa: te toca ir por el café de todos. Y que no se te olvide ninguno.
O|car|Súbete a tu carro
O|goto|obra|Maneja a la obra
O|talk|obra|mike|Recibe el pedido de Mike
N|mike|laugh|Morning, new guy! Tradition says the rookie buys coffee. Sorry, buddy.|¡Buenos días, nuevo! La tradición dice que el novato compra el café. Lo siento, amigo.
Y|Seriously? On my first day?|¿En serio? ¿En mi primer día?|sírisli? an mái férst déi|😩☕🙄
A|Seriously? My first day?
L|Are you serious? It is my first day.
N|mike|neutral|Yup. Four black coffees and one caramel latte. That one's for me. Don't judge.|Sip. Cuatro cafés negros y un latte de caramelo. Ese es mío. No me juzgues.
Y|A caramel latte? Dude, no judgment.|¿Un latte de caramelo? Güey, no te juzgo.|a kárameel látei? dúd, nóu yáchment|☕🍮😂
A|No judgment, man.
L|A caramel latte? I will not judge you.
N|mike|happy|Here's forty bucks. Cafe's two blocks down. Go, go, go.|Aquí hay cuarenta dólares. El café está a dos cuadras. Corre, corre.
Y|Alright, I'm on it. Be back in ten.|Va, ya voy. Regreso en diez.|ólráit, áim án it. bi bák in tén|🏃‍♂️☕⏱️
A|I'm on it.
L|Okay, I will do it. I will return in ten minutes.
O|money|40|Mike te dio $40
O|car|Súbete a tu carro
O|goto|cafe|Maneja al café
O|talk|cafe|mesera|Pide los cafés
N|mesera|happy|Hey hon, what can I get started for you?|Hola, joven, ¿qué le preparo?
Y|Hey, can I get four black coffees?|Hola, ¿me da cuatro cafés negros?|jéi, kan ái guét fór blák káfis|☕☕☕☕
A|Can I get four black coffees?
L|Hello, I would like four black coffees, please.
N|mesera|neutral|Four black. Anything else?|Cuatro negros. ¿Algo más?
Y|And one caramel latte. Extra caramel.|Y un latte de caramelo. Con extra caramelo.|and uán kárameel látei. ékstra kárameel|🍮☕🤤
A|And one caramel latte.
L|And also one caramel latte with additional caramel.
N|mesera|laugh|Extra caramel at seven a.m.? Somebody's living their best life.|¿Extra caramelo a las siete? Alguien está disfrutando la vida.
Y|It's for my boss. Don't tell him I said that.|Es para mi jefe. No le diga que dije eso.|its for mái bás. dóunt tél jim ái séd dat|🤫😂☕
A|It's for my boss.
L|It is for my supervisor. Please do not tell him.
N|mesera|neutral|My lips are sealed. That's twenty-six fifty. For here or to go?|Soy una tumba. Son veintiséis cincuenta. ¿Para aquí o para llevar?
Y|To go, please. Can I get a tray?|Para llevar, por favor. ¿Me da una charola?|tu góu, plís. kan ái guét a tréi|🥡☕📦
A|To go, please.
L|I would like it to go. May I have a tray, please?
O|money|-27|Pagaste $27
O|car|Súbete a tu carro
O|goto|obra|Regresa a la obra
O|talk|obra|mike|Entrégale el café a Mike
N|mike|happy|There he is! Did you get the extra caramel?|¡Ahí está! ¿Le pusiste extra caramelo?
Y|Extra caramel, boss. And here's your change.|Extra caramelo, jefe. Y aquí está su cambio.|ékstra kárameel, bás. and jíers iór chéinch|🍮💵😎
A|Here's your change.
L|Yes, with extra caramel. And here is your change.
N|mike|laugh|Ha! You're alright, kid. Same time tomorrow?|¡Ja! Eres buena onda, chavo. ¿Mañana igual?
Y|Tomorrow? Bro, you're buying tomorrow.|¿Mañana? Bro, mañana invitas tú.|tumárou? bróu, iór báiin tumárou|☕😏💸
A|You're buying tomorrow.
L|Tomorrow you will pay for the coffee.
N|mike|neutral|Deal. Now grab a shovel, rookie. Break's over.|Trato. Ahora agarra una pala, novato. Se acabó el descanso.
Y|On it, boss. Let's get to work.|Ya voy, jefe. A chambear.|án it, bás. léts guét tu uérk|⛏️💪👷‍♂️
A|Let's get to work.
L|I will do it now. Let us begin working.
O|end|La cuadrilla te ama. Mike te ama más. El caramelo une a la gente.

#g05|Abre tu cuenta|35|carlos|Ya te pagaron tu primer cheque y lo traes en la bolsa como un ranchero. Carlos dice que ya estuvo: ve al banco y abre una cuenta.
O|car|Súbete a tu carro
O|goto|casa|Maneja a la casa
O|talk|casa|carlos|Habla con Carlos
N|carlos|surprised|Güey, why do you have like five hundred dollars in your sock?|Güey, ¿por qué traes como quinientos dólares en el calcetín?
Y|It's my paycheck, bro. I cashed it.|Es mi sueldo, bro. Lo cambié.|its mái péichek, bróu. ái kásht it|🧦💵😬
A|I cashed my check, bro.
L|It is my salary. I exchanged the check for cash.
N|carlos|angry|In your sock? Dude, go open a bank account. Like, today.|¿En el calcetín? Güey, ve a abrir una cuenta de banco. O sea, hoy.
Y|Okay, okay. Chill. I'm going.|Ya, ya. Tranquilo. Ya voy.|okéi, okéi. chíl. áim góuin|😅🏦🏃‍♂️
A|Okay, chill. I'm going.
L|Okay. Calm down. I am going now.
N|carlos|laugh|And wash that money first. It smells like feet.|Y lava ese dinero primero. Huele a pata.
Y|Shut up, dude. It smells fine.|Cállate, güey. Huele bien.|shát áp, dúd. it sméls fáin|🤢🧦😂
A|Shut up, it smells fine.
L|Please be quiet. It does not smell bad.
O|car|Súbete a tu carro
O|goto|banco|Maneja al banco
O|talk|banco|cajera|Abre la cuenta
N|cajera|neutral|Hi there, welcome. How can I help you today?|Hola, bienvenido. ¿En qué le puedo ayudar hoy?
Y|Hi. I wanna open a checking account.|Hola. Quiero abrir una cuenta de cheques.|jái. ái uána óupen a chékin akáunt|🏦📝💳
A|Hi. I want to open a checking account.
A|I'd like to open a checking account.
L|Hello. I would like to open a checking account, please.
N|cajera|neutral|Sure. Do you have a photo ID with you?|Claro. ¿Trae una identificación con foto?
Y|Yeah, here's my passport. Is that cool?|Sí, aquí está mi pasaporte. ¿Está bien?|iéa, jíers mái pásport. is dat kúl|🛂📸👍
A|Here's my passport.
L|Yes, here is my passport. Is that acceptable?
N|cajera|happy|That works. And how much would you like to deposit?|Sirve. ¿Y cuánto le gustaría depositar?
Y|Four hundred. And sorry, it kinda smells.|Cuatrocientos. Y perdón, huele medio raro.|fór jándred. and sári, it káinda sméls|💵🧦😳
A|Four hundred, please.
L|Four hundred dollars. I apologize for the smell.
N|cajera|laugh|Honey, I've seen worse. Trust me.|Mijo, he visto cosas peores. Créame.
Y|Ha! Good to know. Do I get a debit card?|¡Ja! Qué bueno saberlo. ¿Me dan tarjeta de débito?|já! gúd tu nóu. du ái guét a débit kárd|💳😂✅
A|Do I get a debit card?
L|That is good to know. Will I receive a debit card?
N|cajera|neutral|It'll come in the mail in seven to ten days. You're all set.|Le llega por correo en siete a diez días. Ya quedó.
Y|Awesome. Thanks for your help.|Genial. Gracias por su ayuda.|ósam. zénks for iór jélp|🙌🏦😊
L|Excellent. Thank you for your assistance.
O|money|-400|Depositaste $400 en el banco
O|end|Ya tienes cuenta de banco. Tu calcetín por fin descansa.

#g06|Pizza para el gamer|55|tony|Tony necesita un repartidor y tú necesitas lana extra. Llévale una pizza a Jake, el güero gamer. Cóbrale. Él nunca trae dinero.
O|car|Súbete a tu carro
O|goto|pizzeria|Maneja a la pizzería
O|talk|pizzeria|tony|Habla con Tony
N|tony|angry|Ay! You! You the new delivery guy? You're late!|¡Ey! ¡Tú! ¿Eres el repartidor nuevo? ¡Llegas tarde!
Y|Late? Bro, you called me five minutes ago!|¿Tarde? ¡Bro, me hablaste hace cinco minutos!|léit? bróu, iú kóld mi fáiv mínets agóu|⏰🤨📞
A|You called me five minutes ago!
L|I am not late. You telephoned me five minutes ago.
N|tony|laugh|Ha! I like you. You got a mouth. Okay, large pepperoni for Jake. He owes me twelve bucks from last time.|¡Ja! Me caes bien. Tienes boca. Bueno, una grande de pepperoni para Jake. Me debe doce dólares de la otra vez.
Y|So I gotta collect, like, twice?|¿O sea que tengo que cobrar doble?|sóu ái gára kolékt, láik, tuáis|💵💵😬
A|So I have to collect twice?
L|So I must collect payment for two orders?
N|tony|neutral|Thirty-two total. No money, no pizza. Fuggedaboutit.|Treinta y dos en total. Sin dinero no hay pizza. Ni lo pienses.
Y|Got it. No money, no pizza.|Entendido. Sin dinero, no hay pizza.|gárit. nóu máni, nóu pítsa|🍕🚫💸
L|I understand. If he does not pay, he does not receive the pizza.
O|car|Súbete a tu carro
O|goto|jake|Maneja a casa de Jake
O|talk|jake|jake|Cóbrale a Jake
N|jake|happy|Pizza! Dude, you're a hero. Lemme grab that.|¡Pizza! Güey, eres un héroe. Dámela.
Y|Whoa, whoa. That's thirty-two bucks first.|Épale. Primero son treinta y dos dólares.|uóu, uóu. dats zérti tú báks férst|✋🍕💵
A|Hold up. That's thirty-two dollars.
L|Wait. First you must pay thirty-two dollars.
N|jake|surprised|Thirty-two? The pizza's like twenty!|¿Treinta y dos? ¡La pizza cuesta como veinte!
Y|Plus the twelve you owe Tony, bro.|Más los doce que le debes a Tony, bro.|plás de tuélv iú óu tóuni, bróu|📒😏💸
A|Plus the twelve you owe Tony.
L|In addition to the twelve dollars that you owe Tony.
N|jake|sad|Dude, I got like twenty bucks and a coupon for free bowling.|Güey, traigo como veinte dólares y un cupón de boliche gratis.
Y|Nice try. Tony's gonna kill me, man.|Buen intento. Tony me va a matar.|náis trái. tóunis góna kíl mi, mán|😂🎳💀
A|Nice try. Tony's going to kill me.
L|That was a good attempt. Tony will be very angry with me.
N|jake|happy|Okay, okay. Here, thirty-two. But you're staying for one round of Call of Duty.|Ya, ya. Toma, treinta y dos. Pero te quedas a una partida de Call of Duty.
Y|One round. Then I'm out.|Una partida. Y me voy.|uán ráund. den áim áut|🎮1️⃣👋
A|Just one round.
L|Only one game. Then I will leave.
O|money|32|Jake te pagó $32
O|car|Súbete a tu carro
O|goto|pizzeria|Regresa con Tony
O|talk|pizzeria|tony|Entrégale el dinero a Tony
N|tony|surprised|He paid? All of it? Nobody gets money outta Jake!|¿Pagó? ¿Todo? ¡Nadie le saca dinero a Jake!
Y|I got skills. Do I get a tip?|Tengo talento. ¿Me toca propina?|ái gát skíls. du ái guét a típ|😎💪💵
A|Do I get a tip?
L|I am very capable. Will I receive a tip?
N|tony|laugh|A tip? Ha! Okay, ten bucks. And you're hired. Weekend delivery.|¿Propina? ¡Ja! Va, diez dólares. Y estás contratado. Repartidor de fin de semana.
Y|For real? You're hiring me?|¿En serio? ¿Me vas a contratar?|for ríl? iór jáirin mi|😱🍕💼
A|You're hiring me?
L|Really? Are you giving me a job?
N|tony|neutral|Don't be late. And don't eat the pizzas.|No llegues tarde. Y no te comas las pizzas.
Y|No promises on the pizzas, Tony.|Lo de las pizzas no lo prometo, Tony.|nóu prámises an de pítsas, tóuni|🍕🤤😂
L|I cannot promise that I will not eat the pizzas.
O|money|10|Tony te dio $10 de propina
O|end|Tony está impresionado. Le cobraste a Jake. Eso es casi un milagro.

#g07|Outfit de entrevista|50|jasmine|Tienes una entrevista en una oficina de verdad y tu única camisa dice «Cerveza Corona». Jasmine te va a salvar. Más o menos.
O|car|Súbete a tu carro
O|goto|ropa|Maneja a la tienda de ropa
O|talk|ropa|jasmine|Habla con Jasmine
N|jasmine|laugh|Boy, what are you wearing? Is that a beer shirt?|Muchacho, ¿qué traes puesto? ¿Es una playera de cerveza?
Y|Don't judge me. It's my lucky shirt.|No me juzgues. Es mi playera de la suerte.|dóunt yách mi. its mái láki shért|🍺👕🍀
A|It's my lucky shirt.
L|Please do not criticize me. It is my lucky shirt.
N|jasmine|neutral|Your luck just ran out. Okay, see, you need a button-up and some real pants.|Tu suerte se acabó. Mira, necesitas una camisa de botones y pantalones de verdad.
Y|Okay, but I'm kinda broke. Nothing crazy.|Va, pero ando medio pobre. Nada caro.|okéi, bat áim káinda bróuk. názin kréisi|💸😬🙏
A|Okay, but I'm broke.
L|Okay, but I do not have much money. Nothing expensive.
N|jasmine|happy|Mm-hmm. Try this blue one. It's giving professional.|Ajá. Pruébate esta azul. Se ve profesional.
Y|How do I look? Be honest.|¿Cómo me veo? Sé honesta.|jáu du ái lúk? bi ánest|🪞👔🤔
A|How do I look?
L|What is your opinion of my appearance? Please be honest.
N|jasmine|flirty|Okay, I see you! You clean up nice, Stanley.|¡Ándale! Te ves muy bien arreglado, Stanley.
Y|Stop it. You're making me blush.|Ya. Me vas a sonrojar.|stáp it. iór méikin mi blásh|😳☺️👔
A|Stop, you're making me blush.
L|Please stop. You are embarrassing me.
O|talk|ropa|cajero|Paga la ropa
N|cajero|neutral|Alright, the shirt and the pants come to eighty-nine ninety-nine.|Bueno, la camisa y el pantalón son ochenta y nueve noventa y nueve.
Y|Eighty-nine? Damn. Any discounts?|¿Ochenta y nueve? Chale. ¿Algún descuento?|éiti náin? dám. éni dískaunts|😱💸🏷️
A|Do you have any discounts?
L|Eighty-nine dollars? That is expensive. Are there any discounts?
N|cajero|neutral|If you sign up for our card, you get fifteen percent off.|Si saca nuestra tarjeta, le damos quince por ciento.
Y|Fifteen percent? Bet. Sign me up.|¿Quince por ciento? Va. Apúnteme.|fiftíin persént? bét. sáin mi áp|✍️💳😎
A|Sign me up.
L|Fifteen percent? Okay. Please register me.
N|cajero|neutral|Great. Want me to throw in a tie for ten bucks?|Perfecto. ¿Le agrego una corbata por diez dólares?
Y|Nah, I'm good. Just the shirt and pants.|No, así está bien. Nomás la camisa y el pantalón.|ná, áim gúd. yást de shért and pánts|👔👖🙅‍♂️
A|No thanks, I'm good.
L|No, thank you. Only the shirt and the pants.
N|cajero|happy|Smart. Good luck with the interview, man.|Buena decisión. Suerte en la entrevista.
Y|Thanks, man. I'm gonna need it.|Gracias. La voy a necesitar.|zénks, mán. áim góna níd it|🍀😬👔
A|Thanks, I'll need it.
L|Thank you. I will need it.
O|money|-76|Pagaste $76
O|end|Ya pareces gente de oficina. Jasmine dice que te ves «decent». Viniendo de ella, es un piropo.

#g08|La entrevista|80|sofia|Hoy es la entrevista con Linda, la jefa más estricta del edificio. Primero pasa por Sofía, que te va a dar los tips. Luego, a brillar.
O|car|Súbete a tu carro
O|goto|cafe|Maneja al café
O|talk|cafe|sofia|Pide tips a Sofía
N|sofia|happy|Ay, Stanley! Look at you, all fancy! Nervous?|¡Ay, Stanley! ¡Mírate, todo elegante! ¿Nervioso?
Y|Honestly? I'm freaking out a little.|¿La neta? Ando medio asustado.|ánestli? áim fríkin áut a lírel|😰💦👔
A|Honestly, I'm kinda nervous.
L|To be honest, I am somewhat nervous.
N|sofia|neutral|Mira, Linda is strict but fair. Look her in the eye and don't say «like» every two seconds.|Mira, Linda es estricta pero justa. Mírala a los ojos y no digas «like» cada dos segundos.
Y|So, like, no «like»? Like, at all?|O sea, ¿nada de «like»? ¿Nada de nada?|sóu, láik, nóu láik? láik, at ól|🤐😂🙃
A|No «like» at all?
L|So I should not say «like» at all?
N|sofia|laugh|Exactly that. Don't do that. Ay, Dios.|Exactamente eso. No hagas eso. Ay, Dios.
Y|My bad. I got this. Wish me luck.|Perdón. Yo puedo. Deséame suerte.|mái bád. ái gát dis. uísh mi lák|🍀💪😤
A|I got this. Wish me luck.
L|I apologize. I can do it. Please wish me luck.
O|car|Súbete a tu carro
O|goto|oficina|Maneja a la oficina
O|talk|oficina|linda|Convence a Linda
N|linda|neutral|Stanley? Have a seat. So, tell me a little about yourself.|¿Stanley? Siéntese. A ver, cuénteme un poco de usted.
Y|Sure. I'm from Mexico, and I'm a hard worker.|Claro. Soy de México y soy muy trabajador.|shúr. áim fram méksiko, and áim a járd uérker|🇲🇽💪📋
A|I'm from Mexico and I work hard.
L|Of course. I am from Mexico, and I am a very diligent worker.
N|linda|neutral|I see you work construction. Why do you want an office job?|Veo que trabaja en construcción. ¿Por qué quiere un trabajo de oficina?
Y|I wanna grow, you know? Learn new stuff.|Quiero crecer, ¿sabe? Aprender cosas nuevas.|ái uána gróu, iú nóu? lérn nú stáf|📈🧠🌱
A|I want to grow and learn new things.
L|I would like to develop professionally and learn new skills.
N|linda|neutral|Okay. What's your biggest weakness?|Bueno. ¿Cuál es su mayor debilidad?
Y|Tacos. But I'm working on it.|Los tacos. Pero estoy trabajando en eso.|tákous. bat áim uérkin án it|🌮😅🙏
A|Honestly? Tacos.
L|I like tacos too much. However, I am trying to improve.
N|linda|laugh|Ha! Okay, that's a first. Can you start part-time next week? Evenings.|¡Ja! Bueno, eso es nuevo. ¿Puede empezar medio tiempo la próxima semana? En las tardes.
Y|Absolutely. Thank you so much, Linda.|Claro que sí. Muchísimas gracias, Linda.|ábsolutli. zénk iú sóu mách, línda|🙌💼🎉
A|For sure. Thank you, Linda.
L|Certainly. Thank you very much, Linda.
N|linda|neutral|One more thing. Next time, leave the beer shirt at home. Jasmine told me.|Una cosa más. La próxima, deje la playera de cerveza en casa. Jasmine me contó.
Y|She told you? Oh my God. Noted.|¿Le contó? No manches. Anotado.|shi tóuld iú? óu mái gád. nóuted|🍺👕🤦‍♂️
A|Noted.
L|She informed you? I will remember that.
O|end|¡Contratado! Ahora tienes dos chambas. Y un problema con los tacos.

#g09|La multa|40|davis|Te estacionaste donde no debías y Officer Davis te está esperando junto a tu carro. Sé educado, págala y que no se ponga peor.
O|goto|estacionamiento|Ve al estacionamiento
O|talk|estacionamiento|davis|Habla con Officer Davis
N|davis|neutral|Sir, is this your vehicle?|Señor, ¿este es su vehículo?
Y|Yes, officer. Is there a problem?|Sí, oficial. ¿Hay algún problema?|iés, áfiser. is dér a prábrem|👮‍♂️🚗😬
A|Yes, sir. Is there a problem?
L|Yes, officer. Is something wrong?
N|davis|neutral|You're parked in a fire lane. That's a seventy-five dollar ticket.|Está estacionado en zona de bomberos. Son setenta y cinco dólares de multa.
Y|Oh, man. My bad. I didn't see the sign.|Ay, no. Perdón. No vi el letrero.|óu, mán. mái bád. ái dídent sí de sáin|🚒🪧🤦‍♂️
A|Sorry, I didn't see the sign.
L|I apologize. I did not see the sign.
N|davis|neutral|It's painted red, sir. The whole curb.|Está pintado de rojo, señor. Toda la banqueta.
Y|Yeah, that's on me. Where do I pay it?|Sí, fue mi culpa. ¿Dónde la pago?|iéa, dats an mí. uér du ái péi it|🔴😅💵
A|That's on me. Where do I pay?
L|Yes, it was my fault. Where can I pay it?
N|davis|happy|I appreciate the honesty. Pay it at the station, it's faster. And move the car.|Le agradezco la honestidad. Páguela en la estación, es más rápido. Y mueva el carro.
Y|Will do. Thanks, officer. Have a good one.|Así lo haré. Gracias, oficial. Que le vaya bien.|uíl dú. zénks, áfiser. jáv a gúd uán|👍👮‍♂️🚗
A|Thanks, officer.
L|I will do that. Thank you, officer. Have a nice day.
O|car|Súbete a tu carro
O|goto|policia|Maneja a la estación de policía
O|talk|policia|agente|Paga la multa
N|agente|bored|Next. What are you here for?|Siguiente. ¿A qué viene?
Y|Hi, I need to pay a parking ticket.|Hola, necesito pagar una multa de estacionamiento.|jái, ái níd tu péi a párkin tíket|🎫🅿️💵
A|I wanna pay a parking ticket.
L|Hello, I would like to pay a parking fine.
N|agente|neutral|Ticket number?|¿Número de multa?
Y|Lemme check. It's four, seven, two, nine.|Déjeme ver. Es cuatro, siete, dos, nueve.|lémi chék. its fór, séven, tú, náin|🔢👀🎫
A|Let me check. Four, seven, two, nine.
L|Allow me to look. The number is four, seven, two, nine.
N|agente|neutral|Seventy-five. Cash or card?|Setenta y cinco. ¿Efectivo o tarjeta?
Y|Card, please. My new debit card.|Tarjeta, por favor. Mi tarjeta de débito nueva.|kárd, plís. mái nú débit kárd|💳✨😎
A|Card, please.
L|I will pay with a card, please.
N|agente|neutral|Approved. Here's your receipt. Next time, read the curb.|Aprobado. Aquí está su recibo. La próxima, fíjese en la banqueta.
Y|Trust me, I'm never parking there again.|Créame, nunca me vuelvo a estacionar ahí.|trást mi, áim néver párkin dér agén|🙅‍♂️🅿️😅
L|Believe me, I will never park there again.
O|money|-75|Pagaste $75 de multa
O|end|Multa pagada. Lección aprendida: rojo no significa «estaciónate aquí, guapo».

#g10|Lunes de gym|50|marcus|Marcus te prometió que iban a ir al gym cada lunes. Hoy es lunes. Recógelo y prepárate, porque Brad el mamado ya está ahí presumiendo.
O|car|Súbete a tu carro
O|goto|parque|Maneja por Marcus
O|talk|parque|marcus|Habla con Marcus
N|marcus|happy|Yo! Monday, baby! Leg day! You ready?|¡Ey! ¡Es lunes! ¡Día de pierna! ¿Listo?
Y|Leg day? Bro, I'm already tired.|¿Día de pierna? Bro, ya estoy cansado.|lég déi? bróu, áim olrédi táierd|🦵😩💀
A|Bro, I'm already tired.
L|Today we exercise our legs? I am already tired.
N|marcus|laugh|No excuses. Get in the car, let's go!|Sin pretextos. ¡Súbete al carro, vámonos!
Y|Fine. But you're buying the smoothies.|Va. Pero tú invitas los licuados.|fáin. bat iór báiin de smúdis|🥤💪😏
A|Fine, but you're buying smoothies.
L|Okay. However, you will pay for the smoothies.
N|marcus|laugh|Smoothies? Bro, I'm broke. I'll buy you a banana.|¿Licuados? Bro, ando quebrado. Te compro un plátano.
Y|A banana? Wow. Best friend ever.|¿Un plátano? Guau. El mejor amigo del mundo.|a banána? uáu. bést frénd éver|🍌🙄😂
A|Wow, best friend ever.
L|Only a banana? You are very generous.
O|pickup|marcus|Recoge a Marcus
O|car|Súbete a tu carro
O|drop|gym|Lleva a Marcus al gym
O|talk|gym|marcus,brad|Aguanta a Brad
N|brad|laugh|Ha! Look who's here. Marcus brought a little friend.|¡Ja! Miren quién vino. Marcus trajo a un amiguito.
Y|Little? Dude, who even are you?|¿Amiguito? Güey, ¿y tú quién eres?|lírel? dúd, jú íven ar iú|🤨💪😤
A|And who are you?
L|I am not small. Excuse me, who are you?
N|brad|happy|I'm Brad. I bench three-fifteen. What do you bench, bro? The bar?|Soy Brad. Levanto trescientas quince en banca. ¿Y tú, bro? ¿Nomás la barra?
Y|I bench your mom, bro.|Yo levanto a tu mamá, bro.|ái bénch iór mám, bróu|😏🏋️‍♂️🔥
A|I bench your mom.
L|That is none of your business.
N|marcus|laugh|Ohhh! Bro! He got you, Brad! I'm dead!|¡Uuuh! ¡Bro! ¡Te la aplicó, Brad! ¡Me muero!
N|brad|angry|Okay, funny guy. Plank contest. Loser buys protein shakes.|Bueno, chistosito. Concurso de plancha. El que pierda paga las proteínas.
Y|You're on. Marcus, time it.|Va. Marcus, cronométralo.|iór án. márkus, táim it|⏱️💪🔥
A|You're on.
L|I accept the challenge. Marcus, please measure the time.
N|marcus|surprised|Two minutes... three minutes... Yo, Brad is shaking!|Dos minutos... tres minutos... ¡Ey, Brad está temblando!
Y|What's wrong, Brad? Too easy for you?|¿Qué pasó, Brad? ¿Muy fácil para ti?|uáts róng, brád? tú ísi for iú|😈🥵😂
A|Too easy for you?
L|What is the matter, Brad? Is it too easy for you?
N|brad|sad|Ugh! Okay! Okay! I'm done. You win, man.|¡Uf! ¡Ya! ¡Ya! Me rindo. Ganaste, man.
Y|Cool. Chocolate shake, please. Large.|Va. Licuado de chocolate, por favor. Grande.|kúl. chákolet shéik, plís. lárch|🍫🥤🏆
A|Chocolate shake. Large.
L|Thank you. I would like a large chocolate shake.
O|end|Le ganaste a Brad en la plancha. Te duele todo, pero valió la pena.

#g11|¿Dónde está Max?|45|rose|Max, el perro del barrio, se escapó con una salchicha robada. Grandma Rose está llorando. Pregunta por ahí y encuéntralo antes de que se acabe la salchicha.
O|car|Súbete a tu carro
O|goto|porche|Maneja a casa de Grandma Rose
O|talk|porche|rose|Habla con Grandma Rose
N|rose|cry|Stanley! Max ran off! He took a hot dog off my grill and just vanished!|¡Stanley! ¡Max se escapó! ¡Se robó una salchicha de mi asador y desapareció!
Y|Don't worry, Rose. I'm gonna find him.|No se preocupe, Rose. Lo voy a encontrar.|dóunt uóri, róus. áim góna fáind jim|🐕🔍💪
A|Don't worry, I'll find him.
L|Do not worry, Rose. I will find him.
N|rose|sad|He loves the park. Maybe ask little Tommy, he plays with him.|Le encanta el parque. Pregúntale a Tommy, él juega con él.
Y|Tommy, got it. Be right back.|Tommy, va. Ahorita vuelvo.|támi, gárit. bi ráit bák|👦🐕💨
A|Got it. Be right back.
L|Tommy, I understand. I will return soon.
N|rose|cry|Please hurry, sweetie. That hot dog had onions. Onions are bad for dogs!|Apúrate, mi amor. La salchicha traía cebolla. ¡La cebolla le hace daño a los perros!
Y|Onions? Okay, I'm going right now.|¿Cebolla? Bueno, ya me voy.|ánions? okéi, áim góuin ráit náu|🧅🐕🏃‍♂️
A|I'm going right now.
L|Onions? Okay, I am leaving immediately.
O|car|Súbete a tu carro
O|goto|parque|Maneja al parque
O|talk|parque|tommy|Pregúntale a Tommy
N|tommy|happy|Hey! Stanley! Wanna play soccer? Wanna see a trick?|¡Oye! ¡Stanley! ¿Jugamos fútbol? ¿Quieres ver un truco?
Y|Later, buddy. Have you seen Max?|Al rato, campeón. ¿Has visto a Max?|léirer, bári. jáv iú sín máks|🐕❓👀
A|Have you seen Max?
L|Maybe later. Have you seen the dog Max?
N|tommy|surprised|Yeah! He ran by with a hot dog! He went to the alley behind the bar!|¡Sí! ¡Pasó corriendo con una salchicha! ¡Se fue al callejón atrás del bar!
Y|The alley? You sure, little man?|¿El callejón? ¿Seguro, campeón?|de áli? iú shúr, lírel mán|🌭🏃‍♂️🐕
A|Are you sure?
L|To the alley? Are you certain?
N|tommy|happy|Super sure! Can I come? Please? Please please please?|¡Súper seguro! ¿Puedo ir? ¿Porfa? ¿Porfa porfa porfa?
Y|Sorry, dude. Ask your mom first.|Perdón, güey. Pregúntale a tu mamá primero.|sári, dúd. ásk iór mám férst|👩‍👦🙅‍♂️😅
A|Ask your mom first.
L|I am sorry. You must ask your mother for permission.
O|car|Súbete a tu carro
O|goto|callejon|Maneja al callejón
O|talk|callejon|max|Atrapa a Max
N|max|happy|Woof! Woof!|(Max está orgullosísimo de su salchicha)
Y|Max! Come here, boy!|¡Max! ¡Ven acá, chiquito!|máks! kám jíer, bói|🐕👋❤️
A|Come here, Max!
L|Max, please come here.
N|max|neutral|Grrr... woof.|(Max dice que la salchicha es suya y de nadie más)
Y|Drop it! Drop it, Max!|¡Suéltala! ¡Suéltala, Max!|dráp it! dráp it, máks|🌭🚫🐶
A|Drop it!
L|Release the hot dog, Max.
N|max|sad|Arf...|(Max soltó la salchicha y te mira como si le hubieras roto el corazón)
Y|Good boy! Let's go home, buddy.|¡Buen perro! Vámonos a casa, amigo.|gúd bói! léts góu jóum, bári|🏠🐕🥰
A|Good boy! Let's go home.
L|You are a good dog. Let us go home.
O|pickup|max|Sube a Max al carro
O|car|Súbete a tu carro
O|drop|porche|Llévale a Max a Grandma Rose
O|end|Max regresó a casa. Sin salchicha, pero con dignidad. Grandma Rose te debe otro pay.

#g12|Karen en la caja|60|cajera|En el súper te cobraron doble los aguacates. Reclama tu dinero. Ah, y hay una tal Karen que quiere hablar con el gerente desde 2009.
O|car|Súbete a tu carro
O|goto|casa|Maneja a la casa
O|talk|casa|carlos|Habla con Carlos
N|carlos|surprised|Güey, look at this receipt. You paid twelve bucks for four avocados?|Güey, mira este ticket. ¿Pagaste doce dólares por cuatro aguacates?
Y|What? They were like a buck fifty each.|¿Qué? Estaban como a dólar cincuenta cada uno.|uát? dei uér láik a bák fífti íich|🥑💵😳
A|They were a buck fifty each.
L|Really? They cost approximately one dollar and fifty cents each.
N|carlos|angry|They charged you twice, bro. Go get your money back. That's guacamole money.|Te cobraron doble, bro. Ve a que te regresen tu lana. Es dinero del guacamole.
Y|Hell no. I'm going back right now.|Ni madres. Ahorita mismo regreso.|jél nóu. áim góuin bák ráit náu|😤🥑🚗
A|No way. I'm going back right now.
L|I will not accept that. I am returning now.
N|carlos|laugh|And if you see a lady with a short blond haircut and sunglasses, run.|Y si ves a una señora de pelo corto rubio y lentes oscuros, corre.
Y|Run? Why? What are you talking about?|¿Correr? ¿Por qué? ¿De qué hablas?|rán? uái? uát ar iú tókin abáut|🏃‍♂️❓🤔
A|What are you talking about?
L|Why should I run? What do you mean?
O|car|Súbete a tu carro
O|goto|super|Maneja al supermercado
O|talk|super|cajera,karen|Reclama tu dinero
N|cajera|neutral|Hi, next in line. Oh, you were here earlier, right?|Hola, el que sigue. Ah, usted estuvo aquí hace rato, ¿verdad?
Y|Yeah. I think you charged me twice for the avocados.|Sí. Creo que me cobró doble los aguacates.|iéa. ái zínk iú chárcht mi tuáis for de avokádous|🥑🥑💸
A|I think you charged me twice.
L|Yes. I believe that you charged me two times for the avocados.
N|cajera|surprised|Oh, no. Can I see your receipt?|Ay, no. ¿Me deja ver su ticket?
Y|Sure, here. See? Right there, twice.|Claro, tenga. ¿Ve? Ahí, dos veces.|shúr, jíer. sí? ráit dér, tuáis|🧾👉👀
A|Here you go. See? Twice.
L|Of course, here it is. Do you see? It appears twice.
N|karen|angry|Excuse me! Some of us have places to be! Is this gonna take all day?|¡Disculpen! ¡Algunos tenemos cosas que hacer! ¿Esto va a tardar todo el día?
Y|Ma'am, chill. It's gonna take two minutes.|Señora, tranquila. Van a ser dos minutos.|mám, chíl. its góna téik tú mínets|✋😤⏱️
A|Relax, ma'am. Two minutes.
L|Madam, please calm down. It will only take two minutes.
N|karen|angry|Don't you tell me to chill! I want to speak to the manager!|¡No me diga que me calme! ¡Quiero hablar con el gerente!
Y|Lady, you're literally not even in line.|Señora, usted literalmente ni está en la fila.|léidi, iór lírerali nát íven in láin|🙄🚶‍♀️😂
A|You're not even in line.
L|Madam, you are not standing in the line.
N|cajera|laugh|He's right, ma'am. The line starts back there.|Tiene razón, señora. La fila empieza allá atrás.
N|karen|angry|Unbelievable! This store is a joke!|¡Increíble! ¡Esta tienda es un chiste!
Y|Bye, Karen. Have a nice day!|Adiós, Karen. ¡Que tenga bonito día!|bái, kéren. jáv a náis déi|👋😇🙃
A|Have a nice day!
L|Goodbye, madam. I hope that you have a pleasant day.
N|cajera|happy|Okay, I refunded the avocados. Six dollars back. Sorry about that, and her.|Listo, le devolví lo de los aguacates. Seis dólares. Perdón por eso, y por ella.
Y|No worries. Thanks for fixing it.|No pasa nada. Gracias por arreglarlo.|nóu uóris. zénks for fíksin it|👍🥑😊
A|No worries. Thanks.
L|It is fine. Thank you for correcting the error.
O|money|6|Te devolvieron $6
O|end|Recuperaste tus seis dólares y humillaste a Karen. Día productivo.

#g13|La chava del bar|70|ray|Viernes en la noche. Ray el bartender dice que hay una chava en la barra que se ríe de todo. Se llama Emily. No la riegues.
O|car|Súbete a tu carro
O|goto|bar|Maneja al bar
O|talk|bar|ray|Habla con Ray
N|ray|happy|Well, look who's here! What're you drinking, son?|¡Mira nomás quién llegó! ¿Qué vas a tomar, hijo?
Y|Just a beer, Ray. Whatever's on tap.|Nomás una cerveza, Ray. La que tengas de barril.|yást a bíer, réi. uaréver's an táp|🍺😌🍻
A|Just a beer. Whatever's on tap.
L|I would like one beer, please. Any draft beer is fine.
N|ray|flirty|Coming up. Hey, don't look now, but the girl at the end of the bar keeps checking you out.|Va. Oye, no voltees, pero la chava del fondo no deja de verte.
Y|For real? The one in pink?|¿En serio? ¿La de rosa?|for ríl? de uán in pínk|👀💗😳
A|The one in pink?
L|Really? The woman who is wearing pink?
N|ray|laugh|That's Emily. Sweet girl. Laughs at all my jokes, so she's got bad taste.|Es Emily. Muy linda. Se ríe de todos mis chistes, así que tiene mal gusto.
Y|Ha! Okay. What should I say?|¡Ja! Bueno. ¿Qué le digo?|já! okéi. uát shud ái séi|🤔💬😅
A|What do I say?
L|Okay. What should I tell her?
N|ray|neutral|Son, just be yourself. And buy her a drink. That never hurts.|Hijo, nomás sé tú mismo. Y invítale un trago. Eso nunca falla.
Y|Be myself. Buy a drink. Got it.|Ser yo mismo. Invitar un trago. Va.|bi maisélf. bái a drínk. gárit|🍹😎👍
L|I should act naturally and buy her a drink. I understand.
O|money|-12|Pagaste $12 de tragos
O|talk|bar|emily|Platica con Emily
N|emily|flirty|Hi. Is that drink for me, or are you just really thirsty?|Hola. ¿Esa bebida es para mí o nomás tienes mucha sed?
Y|It's for you. I'm Stanley, by the way.|Es para ti. Me llamo Stanley, por cierto.|its for iú. áim stánli, bai de uéi|🍹😊👋
A|It's for you. I'm Stanley.
L|It is for you. My name is Stanley.
N|emily|happy|Aw, thank you! I'm Emily. You're not from around here, are you?|¡Ay, gracias! Soy Emily. No eres de aquí, ¿verdad?
Y|Nope. Mexico. Is it the accent?|No. De México. ¿Es por el acento?|nóup. méksiko. is it di áksent|🇲🇽🗣️😏
A|I'm from Mexico. Is it the accent?
L|No, I am from Mexico. Is it because of my accent?
N|emily|laugh|Kinda. It's cute, though. Don't change it.|Un poquito. Pero está lindo. No lo cambies.
Y|Cute, huh? You're kinda cute too.|¿Lindo, eh? Tú también estás bonita.|kiút, ja? iór káinda kiút tú|😏💘🥰
A|You're cute too.
L|You think it is cute? I think you are also attractive.
N|emily|flirty|Oh my God, smooth. Okay, Stanley. You get one shot. Make me laugh.|Ay, qué galán. A ver, Stanley. Tienes una oportunidad. Hazme reír.
Y|My English is so bad, I ordered a «beer» and got a «bear».|Mi inglés es tan malo que pedí una cerveza y me dieron un oso.|mái ínglish is sóu bád, ái órderd a bíer and gát a bér|🍺🐻😂
A|I ordered a beer and got a bear.
L|My English is not good. I once confused the word beer with bear.
N|emily|laugh|Stop it! That's so dumb! Okay, fine. Here, gimme your phone.|¡Ya! ¡Qué tonto! Bueno, va. A ver, dame tu celular.
Y|Wait, for real? You're giving me your number?|Espérate, ¿en serio? ¿Me vas a dar tu número?|uéit, for ríl? iór guívin mi iór námber|📱😱💘
A|You're giving me your number?
L|Really? Are you giving me your telephone number?
O|end|Tienes el número de Emily. Ray te guiñó el ojo. No lo arruines mandándole cuarenta mensajes.

#g14|Primera cita|90|emily|Por fin aceptó salir contigo. Recógela, llévala a un restaurante bonito y no hables con la boca llena. Fácil, ¿no?
O|car|Súbete a tu carro
O|goto|cafe|Maneja al café donde quedaron
O|talk|cafe|emily|Recoge a Emily
N|emily|happy|Hey you! Oh my God, you actually showed up on time.|¡Hola tú! Ay, llegaste a tiempo y todo.
Y|Of course. You look amazing, by the way.|Claro. Te ves increíble, por cierto.|av kórs. iú lúk améisin, bai de uéi|😍✨👗
A|You look amazing.
L|Naturally. You look very beautiful.
N|emily|flirty|Stop it. You don't look so bad yourself. So where are we going?|Ya. Tú tampoco te ves mal. ¿Y a dónde vamos?
Y|It's a surprise. Hop in, I got you.|Es sorpresa. Súbete, yo me encargo.|its a sorpráis. jóp ín, ái gát iú|🎁🚗😏
A|It's a surprise. Hop in.
L|It is a surprise. Please get in the car.
N|emily|laugh|Okay, mystery man. Your car smells like... pizza?|Bueno, hombre misterioso. Tu carro huele a... ¿pizza?
Y|Long story. I deliver pizza sometimes.|Larga historia. A veces reparto pizza.|lóng stóri. ái delíver pítsa sámtaims|🍕🚗😅
A|I deliver pizza sometimes.
L|It is a long story. Sometimes I work delivering pizza.
O|pickup|emily|Recoge a Emily
O|car|Súbete a tu carro
O|drop|restaurante|Lleva a Emily al restaurante
O|talk|restaurante|mesero,emily|Pide la cena
N|mesero|neutral|Good evening. Table for two?|Buenas noches. ¿Mesa para dos?
Y|Yeah, table for two. Somewhere quiet?|Sí, mesa para dos. ¿Algo tranquilo?|iéa, téibel for tú. sámuer kuáiet|🕯️🍽️💑
A|Table for two, please.
L|Yes, a table for two people, in a quiet area if possible.
N|mesero|neutral|Right this way. What can I get you to drink?|Por aquí. ¿Qué les traigo de tomar?
Y|Can we get a bottle of red wine?|¿Nos trae una botella de vino tinto?|kan uí guét a bárel av réd uáin|🍷🍷🥂
A|A bottle of red wine, please.
L|We would like a bottle of red wine, please.
N|emily|flirty|Ooh, fancy. Trying to impress me, huh?|Uy, qué elegante. Quieres impresionarme, ¿eh?
Y|Is it working?|¿Está funcionando?|is it uérkin|😏🍷💘
L|Am I succeeding?
N|emily|laugh|Maybe a little. Okay, a lot. Don't let it go to your head.|Tal vez un poquito. Bueno, mucho. No te lo creas.
Y|Too late. It's already in my head.|Muy tarde. Ya me lo creí.|tú léit. its olrédi in mái jéd|🤯😎😂
A|Too late.
L|It is too late. I already believe it.
N|mesero|neutral|Here's your check, whenever you're ready.|Aquí está la cuenta, cuando gusten.
Y|I got it. Can I pay with card?|Yo invito. ¿Puedo pagar con tarjeta?|ái gát it. kan ái péi uid kárd|💳😇🧾
A|I got this. Card's okay?
L|I will pay. May I pay with a credit card?
O|money|-85|Pagaste $85 de la cena
O|pickup|emily|Sube a Emily al carro
O|drop|porche|Llévala a su casa
O|talk|porche|emily|Despídete de Emily
N|emily|flirty|So... this was really fun. Like, really fun.|Entonces... esto estuvo bien divertido. O sea, muy divertido.
Y|Same. Can I see you again?|Igual. ¿Te puedo volver a ver?|séim. kan ái sí iú agén|🥺💘🔁
A|Can I see you again?
L|I agree. May I see you again?
N|emily|happy|You better. Text me when you get home, okay?|Más te vale. Mándame mensaje cuando llegues, ¿sí?
Y|I will. Goodnight, Emily.|Va. Buenas noches, Emily.|ái uíl. gúdnáit, émili|🌙😘📱
L|I will do that. Good night, Emily.
N|emily|flirty|Wait. Come here.|Espérate. Ven.
Y|What? Did I forget something?|¿Qué? ¿Se me olvidó algo?|uát? did ái forguét sámzin|😳💋❓
A|Did I forget something?
L|What is it? Did I forget something?
O|end|Primera cita: éxito total. Y te dio un beso de buenas noches. Vas a soñar con ella toda la semana.

#g15|Jake y sus cincuenta|55|jake|Jake te pidió cincuenta dólares prestados hace un mes «para una emergencia». La emergencia fue un videojuego. Hoy los cobras.
O|car|Súbete a tu carro
O|goto|jake|Maneja a casa de Jake
O|talk|jake|jake|Cóbrale a Jake
N|jake|scared|Oh, hey, dude! I was literally just about to call you!|¡Ah, qué onda, güey! ¡Literal te iba a marcar ahorita!
Y|Sure you were. Where's my fifty bucks?|Ajá, cómo no. ¿Dónde están mis cincuenta dólares?|shúr iú uér. uérs mái fífti báks|🤨💵👀
A|Where's my fifty bucks?
L|I do not believe you. Where are my fifty dollars?
N|jake|sad|Okay, so, funny story. I kinda spent it on a new game.|Bueno, mira, historia chistosa. Medio me lo gasté en un juego nuevo.
Y|Dude, you said it was an emergency!|¡Güey, dijiste que era una emergencia!|dúd, iú séd it uás an imérchensi|😤🎮🚨
A|You said it was an emergency!
L|You told me it was an emergency.
N|jake|neutral|It was! The game was on sale! That's an emergency, bro.|¡Sí era! ¡El juego estaba en oferta! Eso es una emergencia, bro.
Y|You're an idiot, bro. When can you pay me?|Eres un idiota, bro. ¿Cuándo me pagas?|iór an ídiet, bróu. uén kan iú péi mi|🤦‍♂️📅💸
A|When can you pay me?
L|You are not intelligent. When will you be able to pay me?
N|jake|happy|Okay, here's the deal. Pickup game at the court. If I win, we're even. If you win, I pay double.|Va, el trato es así. Cascarita en la cancha. Si gano, quedamos a mano. Si ganas tú, te pago doble.
Y|Double? Bet. Get in the car.|¿Doble? Va. Súbete al carro.|dábel? bét. guét in de kár|🏀💰😈
A|Bet. Let's go.
L|You will pay me double? I accept. Please get in the car.
O|pickup|jake|Recoge a Jake
O|car|Súbete a tu carro
O|drop|cancha|Lleva a Jake a la cancha
O|talk|cancha|jake|Gánale a Jake
N|jake|laugh|First to five. Prepare to get destroyed, old man.|El primero en llegar a cinco. Prepárate para que te destruya, ruco.
Y|Old man? I'm like one year older than you.|¿Ruco? Soy como un año más grande que tú.|óuld mán? áim láik uán iír óulder dan iú|👴😂🏀
A|I'm one year older than you.
L|I am not old. I am only one year older than you.
N|jake|angry|Foul! That was a foul! You pushed me!|¡Falta! ¡Eso fue falta! ¡Me empujaste!
Y|That's not a foul, dude. You tripped on your own feet.|Eso no es falta, güey. Te tropezaste solito.|dats nát a fául, dúd. iú trípt an iór óun fít|🦶😂🙄
A|You tripped on your own feet.
L|That was not a foul. You fell by yourself.
N|jake|sad|Five to one. Okay. I'm embarrassed. Can I pay you Friday?|Cinco a uno. Bueno. Qué vergüenza. ¿Te pago el viernes?
Y|Friday. A hundred bucks. No excuses.|El viernes. Cien dólares. Sin pretextos.|fráidei. a jándred báks. nóu ekskiúses|📅💯💵
A|Friday. No excuses.
L|On Friday, you will pay one hundred dollars. I will not accept excuses.
N|jake|happy|Friday. For sure. Pinky promise.|El viernes. Seguro. Te lo juro por la garrita.
Y|Pinky promise? How old are you, dude?|¿Por la garrita? ¿Cuántos años tienes, güey?|pínki prámis? jáu óuld ar iú, dúd|🤙😂👶
A|How old are you?
L|A pinky promise? You are behaving like a child.
O|end|Ganaste cinco a uno. Jake te debe cien. Spoiler: no te va a pagar el viernes.

#g16|El choque|65|davis|Alguien te pegó en el estacionamiento. Y ese alguien es Karen. Claro que es Karen. Arréglalo sin perder la cabeza y que Officer Davis haga su chamba.
O|car|Súbete a tu carro
O|goto|estacionamiento|Maneja al estacionamiento
O|talk|estacionamiento|karen|Enfrenta a Karen
N|karen|angry|You! You hit my car! Look at this scratch!|¡Usted! ¡Le pegó a mi carro! ¡Mire este rayón!
Y|Lady, I was parked. You hit me.|Señora, yo estaba estacionado. Usted me pegó.|léidi, ái uás párkt. iú jít mi|🅿️🚗💥
A|I was parked. You hit me.
L|Madam, my car was parked. You collided with my car.
N|karen|angry|That's ridiculous! You were parked crooked! This is your fault!|¡Eso es ridículo! ¡Estaba mal estacionado! ¡Es su culpa!
Y|Crooked? Are you kidding me right now?|¿Mal estacionado? ¿Me estás cotorreando?|krúked? ar iú kíding mi ráit náu|🤬😤📏
A|Are you kidding me?
L|My car was not crooked. Are you joking?
N|karen|angry|Wait a minute. You're the guy from the grocery store! The avocado guy!|Un momento. ¡Usted es el del súper! ¡El de los aguacates!
Y|Yep, that's me. Small world, huh?|Sip, ese soy yo. El mundo es un pañuelo, ¿no?|iép, dats mí. smól uérld, ja|🥑🌎😏
A|Small world, huh?
L|Yes, I am that person. What a coincidence.
N|karen|angry|I'm calling the police!|¡Voy a llamar a la policía!
Y|Please do. I'll wait right here.|Por favor, hágalo. Aquí lo espero.|plís dú. áil uéit ráit jíer|📞👮‍♂️😌
A|Go ahead. I'll wait.
L|Please call them. I will wait here.
O|talk|estacionamiento|davis,karen|Explícale a Officer Davis
N|davis|neutral|Alright, alright. What happened here? One at a time.|Bueno, bueno. ¿Qué pasó aquí? Uno a la vez.
Y|Officer, I was parked, and she backed into me.|Oficial, yo estaba estacionado y ella me pegó de reversa.|áfiser, ái uás párkt, and shi bákt íntu mi|🚙⬅️💥
A|I was parked and she backed into me.
L|Officer, my car was parked and she drove backward into it.
N|karen|angry|He's lying! I want his supervisor!|¡Está mintiendo! ¡Quiero a su supervisor!
Y|Officer, there's a camera right there. Check it.|Oficial, ahí hay una cámara. Revísela.|áfiser, dérs a kámera ráit dér. chék it|📹👉✅
A|There's a camera. Check it.
L|Officer, there is a security camera there. Please review it.
N|davis|neutral|Good call. Ma'am, the camera shows you backing up. I need your insurance.|Buena idea. Señora, la cámara la muestra a usted de reversa. Necesito su seguro.
N|karen|sad|This is... unbelievable.|Esto es... increíble.
Y|Thanks, officer. Appreciate you.|Gracias, oficial. Se lo agradezco.|zénks, áfiser. apríshieit iú|🙏👮‍♂️😎
A|Thanks, officer.
L|Thank you, officer. I appreciate your help.
N|davis|happy|You kept your cool, sir. Most people would've lost it.|Mantuvo la calma, señor. Casi todos se hubieran vuelto locos.
Y|Honestly? I was screaming on the inside.|¿La neta? Por dentro estaba gritando.|ánestli? ái uás skrímin an di insáid|😤🤐😂
A|I was screaming inside.
L|To be honest, I was very angry internally.
O|money|200|El seguro de Karen te pagó $200
O|end|Karen pagó. La cámara no miente. Y tú ni levantaste la voz. Nivel: adulto.

#g17|Carlos al hospital|60|mike|Tu primo Carlos se cayó de una escalera en la obra. Nada grave, pero grita como si se estuviera muriendo. Llévalo al hospital.
O|car|Súbete a tu carro
O|goto|obra|Maneja a la obra
O|talk|obra|mike,carlos|Revisa a Carlos
N|mike|scared|Stanley! Your cousin fell off the ladder. He says his ankle's broken.|¡Stanley! Tu primo se cayó de la escalera. Dice que tiene el tobillo roto.
Y|Oh, shit. Carlos, you okay?|Ay, no manches. Carlos, ¿estás bien?|óu, shít. kárlos, iú okéi|😱🪜🦶
A|Carlos, are you okay?
L|Oh no. Carlos, are you alright?
N|carlos|cry|Güey, I'm dying! Tell my mom I love her! Tell her I was a good boy!|¡Güey, me muero! ¡Dile a mi mamá que la quiero! ¡Dile que fui bueno!
Y|Dude, relax. You're not dying. It's your ankle.|Güey, cálmate. No te estás muriendo. Es tu tobillo.|dúd, riláks. iór nát dáiin. its iór ánkel|🙄🦶😂
A|Relax, you're not dying.
L|Please calm down. You are not dying. It is only your ankle.
N|mike|neutral|Can you drive him to the ER? I gotta stay with the crew.|¿Lo puedes llevar a urgencias? Yo me tengo que quedar con la cuadrilla.
Y|Yeah, I got him. Help me get him in the car.|Sí, yo lo llevo. Ayúdame a subirlo al carro.|iéa, ái gát jim. jélp mi guét jim in de kár|🚗🤝🏥
A|I got him. Help me lift him.
L|Yes, I will take him. Please help me put him in the car.
O|pickup|carlos|Sube a Carlos al carro
O|car|Súbete a tu carro
O|drop|hospital|Lleva a Carlos al hospital
O|talk|hospital|doctor,carlos|Habla con la doctora
N|doctor|neutral|Hi, I'm Doctor Reyes. What happened?|Hola, soy la doctora Reyes. ¿Qué pasó?
Y|He fell off a ladder at work. His ankle's all swollen.|Se cayó de una escalera en el trabajo. Tiene el tobillo bien hinchado.|ji fél af a láder at uérk. jis ánkels ól suólen|🪜🦶🎈
A|He fell off a ladder. His ankle's swollen.
L|He fell from a ladder at work. His ankle is very swollen.
N|doctor|neutral|Okay. On a scale of one to ten, how bad is the pain?|Bueno. Del uno al diez, ¿qué tanto le duele?
N|carlos|cry|A thousand! A million!|¡Mil! ¡Un millón!
Y|He means like a five. He's being dramatic.|Quiere decir como un cinco. Es bien dramático.|ji míns láik a fáiv. jis bíin dramátik|🎭🙄5️⃣
A|Like a five. He's dramatic.
L|He means approximately five. He is exaggerating.
N|doctor|laugh|Ha! I see. Let's get an X-ray just in case.|¡Ja! Ya veo. Vamos a sacarle una radiografía por si acaso.
Y|Cool. How long is that gonna take?|Va. ¿Cuánto se va a tardar?|kúl. jáu lóng is dat góna téik|⏳🩻🤔
A|How long is that going to take?
A|How long will it take?
L|Okay. How much time will that require?
N|doctor|happy|Good news. It's just a sprain. Ice, rest, and no ladders for two weeks.|Buenas noticias. Es sólo un esguince. Hielo, reposo y nada de escaleras por dos semanas.
Y|Hear that, drama queen? You'll live.|¿Oíste, dramático? Vas a vivir.|jír dat, dráma kuín? iúl lív|👑😂🧊
A|You'll live, bro.
L|Did you hear that? You will survive.
N|carlos|sad|Two weeks? Güey, who's gonna make the carne asada?|¿Dos semanas? Güey, ¿quién va a hacer la carne asada?
Y|You can sit and boss me around. Like always.|Puedes sentarte y mandarme. Como siempre.|iú kan sít and bás mi aráund. láik ólueis|🪑👑🥩
A|You can boss me around, like always.
L|You can sit down and give me instructions, as usual.
O|money|-50|Pagaste $50 del copago
O|pickup|carlos|Sube a Carlos al carro
O|drop|casa|Llévalo a la casa
O|end|Carlos va a vivir. Y te va a pedir que le traigas todo por dos semanas. Felicidades, eres enfermero.

#g18|Chloe y los celos|75|chloe|Estás en el antro con los compas. Chloe, la rubia más coqueta de la ciudad, no te suelta. Y Emily acaba de llegar. Uy.
O|car|Súbete a tu carro
O|goto|antro|Maneja al antro
O|talk|antro|chloe|Sobrevive a Chloe
N|chloe|flirty|Oh my God, hi! You're Stanley, right? Literally everyone's talking about you!|¡Ay, hola! Eres Stanley, ¿no? ¡Literal todo el mundo habla de ti!
Y|Really? What are they saying?|¿En serio? ¿Qué dicen?|ríli? uát ar dei séiin|😳👂🗣️
A|What are they saying?
L|Is that true? What do they say about me?
N|chloe|flirty|That you're cute and you beat Brad at planks. Wanna dance?|Que estás guapo y que le ganaste a Brad en la plancha. ¿Bailamos?
Y|Ha! Thanks, but I'm kinda seeing someone.|¡Ja! Gracias, pero ando saliendo con alguien.|já! zénks, bat áim káinda síin sámuan|💃🙅‍♂️💘
A|Thanks, but I'm seeing someone.
L|Thank you, but I am currently dating someone.
N|chloe|sad|Ugh, of course you are. Okay, one dance. As friends. Totally innocent.|Uf, claro que sí. Bueno, un baile. De amigos. Totalmente inocente.
Y|One dance. As friends. Hands where I can see them.|Un baile. De amigos. Las manos donde las vea.|uán dáns. as fréns. jánds uér ái kan sí dem|🙌😂🕺
A|One dance. As friends.
L|Only one dance, as friends. Please keep your hands visible.
N|chloe|laugh|Ugh, you're no fun. But okay, I respect it.|Uf, qué aburrido. Pero va, lo respeto.
Y|I'm a lotta fun. Just not that kinda fun.|Soy muy divertido. Nomás no de ese tipo.|áim a lóra fán. yást nát dat káinda fán|😇🎉🙅‍♂️
A|I'm fun. Just not that kind of fun.
L|I am very fun, but not in that way.
O|talk|antro|emily,chloe|Explícale a Emily
N|emily|angry|Wow. Okay. So this is what you do on Fridays?|Guau. Bueno. ¿Así que esto haces los viernes?
Y|Babe, wait. It's not what it looks like.|Amor, espérate. No es lo que parece.|béib, uéit. its nát uát it lúks láik|😰🙏💔
A|It's not what it looks like.
L|Darling, please wait. The situation is not what it appears.
N|chloe|laugh|Literally just one dance! He talked about you the whole time. It was kinda annoying.|¡Literal fue sólo un baile! Habló de ti todo el rato. Fue medio molesto.
Y|See? I'm all yours. Only yours.|¿Ves? Soy todo tuyo. Sólo tuyo.|sí? áim ól iórs. óunli iórs|❤️🫵🥺
A|I'm all yours.
L|Do you see? I belong only to you.
N|emily|sad|You promise?|¿Me lo prometes?
Y|I promise. Come on, lemme buy you a drink.|Te lo prometo. Ándale, déjame invitarte un trago.|ái prámis. kam án, lémi bái iú a drínk|🤞🍹❤️
A|I promise. Let me buy you a drink.
L|I promise you. Please allow me to buy you a drink.
N|emily|flirty|Fine. But you're dancing with me now. All night.|Va. Pero ahora bailas conmigo. Toda la noche.
Y|All night? Bet. Let's go.|¿Toda la noche? Va. Vámonos.|ól náit? bét. léts góu|🕺💃🔥
A|Let's go.
L|The entire night? Okay. Let us go.
O|money|-15|Pagaste $15 de tragos
O|end|Crisis evitada. Chloe ya tiene otro objetivo. Emily no te soltó en toda la noche.

#g19|El aumento|85|linda|Llevas meses partiéndote el lomo en la oficina. Es hora de pedir aumento. Jasmine y Sofía te van a echar porras. Linda no tanto.
O|car|Súbete a tu carro
O|goto|oficina|Maneja a la oficina
O|talk|oficina|jasmine,sofia|Pide consejo a Jasmine y Sofía
N|sofia|happy|Ay, today's the day! You're asking Linda for the raise?|¡Ay, hoy es el día! ¿Le vas a pedir el aumento a Linda?
Y|Yeah. I'm kinda scared, not gonna lie.|Sí. Ando medio asustado, no voy a mentir.|iéa. áim káinda skérd, nát góna lái|😬💼💦
A|Yeah. I'm kind of scared.
L|Yes. To be honest, I am somewhat afraid.
N|jasmine|neutral|Boy, don't be scared. You've been covering everybody's shifts for months. You earned it.|Muchacho, no tengas miedo. Llevas meses cubriendo los turnos de todos. Te lo ganaste.
Y|You think so? For real?|¿Tú crees? ¿En serio?|iú zínk sóu? for ríl|🥹💪❓
A|For real?
L|Do you believe that? Really?
N|sofia|neutral|Mira, ask for three dollars more an hour. She'll say two. You take two fifty.|Mira, pide tres dólares más la hora. Ella va a decir dos. Tú aceptas dos cincuenta.
Y|Ask for three, take two fifty. Smart.|Pedir tres, aceptar dos cincuenta. Muy listo.|ásk for zrí, téik tú fífti. smárt|🧠💵📈
A|Ask for three, settle for two fifty.
L|I will request three dollars and accept two dollars and fifty cents. That is intelligent.
O|talk|oficina|linda|Negocia con Linda
N|linda|neutral|Stanley. You wanted to see me?|Stanley. ¿Quería verme?
Y|Yeah, got a minute? I wanna talk about my pay.|Sí, ¿tiene un minuto? Quiero hablar de mi sueldo.|iéa, gát a mínet? ái uána tók abáut mái péi|⏱️💵💬
A|Do you have a minute? I want to talk about my pay.
L|Yes. Do you have a moment? I would like to discuss my salary.
N|linda|neutral|Okay. I'm listening.|Bueno. Le escucho.
Y|I've been here six months, I cover shifts, and I'm never late.|Llevo seis meses, cubro turnos y nunca llego tarde.|áiv bín jíer síks mánz, ái káver shífts, and áim néver léit|📅💪⏰
A|I cover shifts and I'm never late.
L|I have worked here for six months. I cover other shifts and I am always punctual.
N|linda|neutral|That's true. What are you asking for?|Es cierto. ¿Qué está pidiendo?
Y|Three dollars more an hour.|Tres dólares más por hora.|zrí dálers mór an áuer|3️⃣💵⏰
A|Three more an hour.
L|I am requesting an increase of three dollars per hour.
N|linda|neutral|Three's a lot. I can do two.|Tres es mucho. Le puedo dar dos.
Y|Meet me in the middle? Two fifty?|¿Nos vemos a la mitad? ¿Dos cincuenta?|mít mi in de mírel? tú fífti|🤝⚖️💵
A|How about two fifty?
L|Can we compromise? Two dollars and fifty cents?
N|linda|happy|You drive a hard bargain. Fine. Two fifty, starting next paycheck.|Sabe negociar. Va. Dos cincuenta a partir del próximo cheque.
Y|Thank you, Linda. You won't regret it.|Gracias, Linda. No se va a arrepentir.|zénk iú, línda. iú uóunt rigrét it|🙌💼🎉
A|You won't regret it.
L|Thank you, Linda. You will not regret this decision.
O|money|100|Bono de bienvenida al aumento: $100
O|end|Aumento conseguido. Sofía tenía razón. Siempre tiene razón. Da miedo.

#g20|La amiga del aeropuerto|80|emily|La mejor amiga de Emily, Nina, llega en avión y Emily está trabajando. Te toca ir por ella y llevarla a su hotel. Causa buena impresión.
O|car|Súbete a tu carro
O|goto|aeropuerto|Maneja al aeropuerto
O|talk|aeropuerto|nina|Encuentra a Nina
N|nina|neutral|Excuse me, hon, are you Stanley? Emily said to look for the guy holding a sign with a taco on it.|Disculpa, ¿tú eres Stanley? Emily me dijo que buscara al que trae un letrero con un taco.
Y|Yeah, that's me. The taco was Emily's idea.|Sí, ese soy yo. Lo del taco fue idea de Emily.|iéa, dats mí. de tákou uás émilis aidía|🌮🪧😂
A|That's me. The taco was her idea.
L|Yes, I am Stanley. The taco was Emily's idea.
N|nina|laugh|Of course it was. Nice to finally meet you!|Claro que sí. ¡Qué gusto conocerte por fin!
Y|You too. How was your flight?|Igualmente. ¿Qué tal tu vuelo?|iú tú. jáu uás iór fláit|✈️😊👋
A|How was your flight?
L|It is a pleasure to meet you too. How was your flight?
N|nina|sad|Ugh, long. Delayed two hours and the guy next to me snored the whole time.|Uf, largo. Se retrasó dos horas y el señor de al lado roncó todo el camino.
Y|That sucks. Lemme grab your bags.|Qué mal. Déjame cargar tus maletas.|dat sáks. lémi gráb iór bágs|🧳💪😴
A|That sucks. Let me grab your bags.
L|That is unfortunate. Please allow me to carry your luggage.
N|nina|flirty|Aw, a gentleman. Emily didn't tell me that part.|Ay, un caballero. Emily no me contó esa parte.
Y|What did she tell you? Should I be worried?|¿Qué te contó? ¿Me debo preocupar?|uát did shi tél iú? shud ái bi uórid|😬👂🤔
A|What did she tell you?
L|What did she say to you? Should I be concerned?
O|pickup|nina|Recoge a Nina
O|car|Súbete a tu carro
O|drop|hotel|Lleva a Nina al hotel
O|talk|hotel|cajero,nina|Arregla la reservación
N|cajero|neutral|Welcome. Checking in?|Bienvenidos. ¿Se van a registrar?
Y|Yeah, she's got a reservation. Under Nina Flores.|Sí, ella tiene reservación. A nombre de Nina Flores.|iéa, shis gát a reservéishon. ánder nína flóres|🏨📋🔑
A|She has a reservation under Nina Flores.
L|Yes, she has a reservation in the name of Nina Flores.
N|cajero|surprised|Hmm. I don't see anything under Flores. Are you sure it's for tonight?|Mmm. No veo nada a nombre de Flores. ¿Seguro que es para hoy?
N|nina|scared|What? I booked it a month ago! I have the email!|¿Qué? ¡La reservé hace un mes! ¡Tengo el correo!
Y|Can you check again? Maybe it's under her first name.|¿Puede revisar otra vez? A lo mejor está con su nombre de pila.|kan iú chék agén? méibi its ánder jer férst néim|🔍📧🤞
A|Can you check again?
L|Could you please verify again? Perhaps it is under her first name.
N|cajero|happy|Ah, found it. Someone typed «Floras». My apologies.|Ah, aquí está. Alguien escribió «Floras». Mil disculpas.
Y|No worries. Can she get a room with a view, though?|No pasa nada. ¿Pero le puede dar un cuarto con vista?|nóu uóris. kan shi guét a rúm uid a viú, dóu|🌅🛏️😏
A|Can she get a room with a view?
L|It is fine. However, could she have a room with a view?
N|cajero|neutral|For the trouble? I'll upgrade her to the ocean view. No charge.|¿Por la molestia? Le doy cuarto con vista al mar. Sin costo.
N|nina|happy|Oh my gosh! Okay, Emily was right about you. You're a keeper.|¡Ay, Dios! Bueno, Emily tenía razón sobre ti. Eres para quedarse.
Y|Ha! Tell her that. I need the points.|¡Ja! Díselo. Necesito los puntos.|já! tél jer dát. ái níd de póints|😎📈💘
A|Tell her that.
L|Please tell her that. I need her approval.
O|end|Nina tiene cuarto con vista al mar y le va a contar todo a Emily. Puntos extra.

#g21|Boletos para el juego|70|marcus|Hay partido grande en el estadio y Marcus está a punto de llorar porque no tiene boletos. Consigue dos. Regatea como mexicano.
O|car|Súbete a tu carro
O|goto|parque|Maneja a el parque
O|talk|parque|marcus|Habla con Marcus
N|marcus|sad|Bro. The game's sold out. My team's in the playoffs and I'm gonna watch it on my phone. That's tragic.|Bro. Se acabaron los boletos. Mi equipo está en playoffs y lo voy a ver en el celular. Qué tragedia.
Y|Relax, bro. I know a guy who knows a guy.|Tranquilo, bro. Conozco a alguien que conoce a alguien.|riláks, bróu. ái nóu a gái hu nóus a gái|😎🤝🎟️
A|I know a guy.
L|Calm down. I have a contact who can help.
N|marcus|surprised|Deadass? You can get tickets?|¿Neta? ¿Puedes conseguir boletos?
Y|Probably. Get in. We're going to the stadium.|Probablemente. Súbete. Vamos al estadio.|prábabli. guét ín. uír góuin tu de stéidiem|🏟️🚗🔥
A|Get in. We're going to the stadium.
L|Probably. Please get in the car. We are going to the stadium.
N|marcus|happy|Yo, if you pull this off, I'm naming my firstborn after you.|Ey, si lo logras, le pongo tu nombre a mi primer hijo.
Y|Stanley Junior. I like it.|Stanley Junior. Me gusta.|stánli yúnior. ái láik it|👶😂🏈
L|Stanley Junior. I approve of that name.
O|pickup|marcus|Recoge a Marcus
O|car|Súbete a tu carro
O|drop|estadio|Lleva a Marcus al estadio
O|talk|estadio|extrano,marcus|Regatea los boletos
N|extrano|neutral|Psst. You need tickets? I got two. Section one-oh-five. Three hundred each.|Psst. ¿Necesitan boletos? Tengo dos. Sección ciento cinco. Trescientos cada uno.
Y|Three hundred? Each? Bro, are you crazy?|¿Trescientos? ¿Cada uno? Bro, ¿estás loco?|zrí jándred? íich? bróu, ar iú kréisi|😱💸🤪
A|Three hundred each? Are you crazy?
L|Three hundred dollars for each ticket? That is too expensive.
N|extrano|neutral|It's the playoffs, man. Supply and demand.|Son los playoffs, carnal. Oferta y demanda.
Y|I'll give you two hundred for both.|Te doy doscientos por los dos.|áil guív iú tú jándred for bóuz|✌️💵🎟️
A|Two hundred for both.
L|I will pay two hundred dollars for both tickets.
N|extrano|laugh|Two hundred? Get outta here. Five hundred.|¿Doscientos? Ni lo sueñes. Quinientos.
Y|Two fifty, cash, right now. Take it or leave it.|Doscientos cincuenta, en efectivo, ahorita. Lo tomas o lo dejas.|tú fífti, kásh, ráit náu. téik it or líiv it|💵⏱️🤷‍♂️
A|Two fifty, cash. Take it or leave it.
L|Two hundred and fifty dollars in cash immediately. That is my final offer.
N|marcus|surprised|Bro, he's walking away! Let's go, there's other guys.|¡Bro, ya se va! Vámonos, hay más revendedores.
N|extrano|angry|Wait, wait! Fine. Two fifty. You're killing me, man.|¡Espérate, espérate! Va. Doscientos cincuenta. Me estás matando.
Y|Pleasure doing business. Enjoy your day.|Un placer hacer negocios. Que te vaya bien.|pléshur dúin bísnes. enyói iór déi|🤝😎💰
A|Pleasure doing business.
L|It was a pleasure to do business with you.
N|marcus|happy|Bro! You're a legend! Stanley Junior is happening!|¡Bro! ¡Eres una leyenda! ¡Stanley Junior va a existir!
Y|Hot dogs are on you, though.|Pero los hot dogs los pagas tú.|ját dógs ar an iú, dóu|🌭🌭😏
A|You're buying the hot dogs.
L|However, you will pay for the hot dogs.
O|money|-250|Pagaste $250 por los boletos
O|end|Boletos conseguidos. Marcus lloró en el himno. Y en el medio tiempo. Y al final.

#g22|Jake en problemas|90|jake|Jake le debe dinero a un tipo mal encarado y ahora lo tiene acorralado en el callejón. Ve por él y sácalo de ahí hablando. Sin golpes, con labia.
O|car|Súbete a tu carro
O|goto|jake|Maneja a casa de Jake
O|talk|jake|jake|Habla con Jake
N|jake|scared|Dude, dude, dude. I need help. I owe a guy money and he's kinda big and kinda mad.|Güey, güey, güey. Necesito ayuda. Le debo dinero a un tipo y está medio grandote y medio enojado.
Y|What? How much do you owe him?|¿Qué? ¿Cuánto le debes?|uát? jáu mách du iú óu jim|😱💸❓
A|How much do you owe him?
L|What happened? How much money do you owe him?
N|jake|sad|Eighty bucks. I lost a bet on a cat video.|Ochenta dólares. Perdí una apuesta sobre un video de gatos.
Y|A cat video? Dude, you're unbelievable.|¿Un video de gatos? Güey, no tienes remedio.|a kát vídeo? dúd, iór anbilívabel|🐱📹🤦‍♂️
A|You're unbelievable.
L|A video of a cat? You are incredible, in a bad way.
N|jake|scared|I gotta meet him in the alley behind the bar. Come with me. Please. Please.|Lo tengo que ver en el callejón atrás del bar. Ven conmigo. Porfa. Porfa.
Y|Okay, stay calm. Get in the car.|Va, cálmate. Súbete al carro.|okéi, stéi kám. guét in de kár|😮‍💨🚗💨
A|Stay calm. Get in the car.
L|Okay, remain calm. Please get in the car.
O|pickup|jake|Sube a Jake al carro
O|car|Súbete a tu carro
O|drop|callejon|Lleva a Jake al callejón
O|talk|callejon|extrano,jake|Saca a Jake del problema
N|extrano|angry|Who are you? This ain't your business, man.|¿Y tú quién eres? Esto no es asunto tuyo.
Y|I'm his friend. Look, let's just talk, okay?|Soy su amigo. Mira, nomás platiquemos, ¿va?|áim jis frénd. lúk, léts yást tók, okéi|🤝🗣️✋
A|I'm his friend. Let's just talk.
L|I am his friend. Please, let us have a conversation.
N|extrano|angry|Talk? He owes me eighty bucks and he keeps ghosting me.|¿Platicar? Me debe ochenta dólares y me deja en visto.
Y|I get it. He's an idiot. But he's my idiot.|Te entiendo. Es un idiota. Pero es mi idiota.|ái guérit. jis an ídiet. bat jis mái ídiet|🤷‍♂️😅🫂
A|He's an idiot. But he's my idiot.
L|I understand. He is foolish, but he is my friend.
N|jake|sad|Thanks... I think?|Gracias... ¿creo?
N|extrano|neutral|So what, you gonna pay for him?|¿Y qué? ¿Tú vas a pagar por él?
Y|I got forty on me. Forty now, forty Friday.|Traigo cuarenta. Cuarenta ahorita y cuarenta el viernes.|ái gát fóri an mí. fóri náu, fóri fráidei|💵📅🤝
A|Forty now, forty on Friday.
L|I have forty dollars. I will pay forty now and forty on Friday.
N|extrano|neutral|And if he doesn't pay Friday?|¿Y si no paga el viernes?
Y|Then you can have his PlayStation. Deal?|Entonces te quedas con su PlayStation. ¿Trato?|den iú kan jáv jis pléisteishen. díil|🎮😈🤝
A|You can keep his PlayStation. Deal?
L|In that case, you may take his PlayStation. Do we have an agreement?
N|jake|scared|Dude! Not the PlayStation!|¡Güey! ¡La PlayStation no!
N|extrano|laugh|Ha! I like that. Deal. Friday, kid.|¡Ja! Eso me gusta. Trato. El viernes, chamaco.
Y|Friday. Let's go, Jake. Now.|El viernes. Vámonos, Jake. Ya.|fráidei. léts góu, yéik. náu|🏃‍♂️💨🚗
A|Let's go, Jake.
L|Friday. Jake, we must leave immediately.
O|money|-40|Pagaste $40 por Jake
O|pickup|jake|Saca a Jake del callejón
O|car|Súbete a tu carro
O|drop|jake|Lleva a Jake a su casa
O|end|Jake está a salvo. Su PlayStation, no tanto. Ahora te debe ciento cuarenta. Nunca los vas a ver.

#g23|Arma la fiesta|100|carlos|Vas a hacer la fiesta del año en la playa para todos tus compas. Y para pedirle algo importante a Emily. Consigue la comida y las bebidas sin quedarte en la quiebra.
O|car|Súbete a tu carro
O|goto|casa|Maneja a la casa
O|talk|casa|carlos|Planea con Carlos
N|carlos|happy|Órale, güey! A beach party for everybody? Who's coming?|¡Órale, güey! ¿Fiesta en la playa para todos? ¿Quién va?
Y|Everybody, bro. And I'm gonna ask Emily to be my girlfriend.|Todos, bro. Y le voy a pedir a Emily que sea mi novia.|évribari, bróu. and áim góna ásk émili tu bi mái guérlfrend|🏖️💍💘
A|Everybody. And I'm gonna ask Emily out officially.
L|Everyone. Also, I will ask Emily to be my girlfriend.
N|carlos|surprised|No mames! For real? Okay, okay, you need pizza and drinks. Tony and Ray.|¡No manches! ¿En serio? Bueno, necesitas pizza y bebidas. Tony y Ray.
Y|Exactly. Can you handle the carne asada?|Exacto. ¿Te encargas de la carne asada?|egsáktli. kan iú jándel de kárne asáda|🥩🔥🙏
A|Can you do the carne asada?
L|That is correct. Will you be responsible for the grilled meat?
N|carlos|laugh|Güey, you're asking a Mexican if he can do carne asada? Offended.|Güey, ¿le preguntas a un mexicano si puede hacer carne asada? Me ofendes.
Y|My bad, my bad. You're the king.|Perdón, perdón. Tú eres el rey.|mái bád, mái bád. iór de kíng|👑🥩😂
A|My bad. You're the king.
L|I apologize. You are the best at it.
O|car|Súbete a tu carro
O|goto|pizzeria|Maneja a la pizzería
O|talk|pizzeria|tony|Pide las pizzas
N|tony|happy|Ay! My favorite delivery guy! Whaddya need?|¡Ey! ¡Mi repartidor favorito! ¿Qué necesitas?
Y|I need ten large pizzas for Saturday.|Necesito diez pizzas grandes para el sábado.|ái níd tén lárch pítsas for sárerdei|🍕🔟📅
A|Ten large pizzas for Saturday.
L|I would like to order ten large pizzas for Saturday.
N|tony|surprised|Ten? What, you feeding an army? That's two hundred bucks.|¿Diez? ¿Qué, vas a alimentar a un ejército? Son doscientos dólares.
Y|Come on, Tony. I'm family. Hook me up.|Ándale, Tony. Soy de la familia. Hazme un paro.|kam án, tóuni. áim fámili. júk mi áp|🙏🤌🍕
A|Come on, I'm family. Hook me up.
L|Please, Tony. We are close. Give me a discount.
N|tony|neutral|Family, he says. Okay. One fifty. And you deliver 'em yourself.|Familia, dice. Bueno. Ciento cincuenta. Y tú las repartes.
Y|Deal. You're the best, Tony.|Trato. Eres el mejor, Tony.|díil. iór de bést, tóuni|🤝🍕❤️
A|Deal. You're the best.
L|I accept. You are the best, Tony.
O|money|-150|Pagaste $150 de pizzas
O|car|Súbete a tu carro
O|goto|bar|Maneja al bar
O|talk|bar|ray|Consigue las bebidas
N|ray|happy|Son! Heard you're throwing a party. Word travels fast.|¡Hijo! Supe que vas a hacer fiesta. Los chismes vuelan.
Y|Yeah, at the beach. Can you hook me up with drinks?|Sí, en la playa. ¿Me consigues bebidas?|iéa, at de bích. kan iú júk mi áp uid drínks|🏖️🍻🙏
A|Can you help me with the drinks?
L|Yes, at the beach. Could you provide the beverages?
N|ray|neutral|I can do five cases of beer and a cooler. Hundred bucks. Friends and family price.|Te doy cinco cajas de cerveza y una hielera. Cien dólares. Precio de cuates.
Y|A hundred? Ray, that's a steal. Thank you.|¿Cien? Ray, eso es una ganga. Gracias.|a jándred? réi, dats a stíil. zénk iú|💵🍺😍
A|That's a steal. Thank you.
L|One hundred dollars? That is very cheap. Thank you.
N|ray|happy|One condition. You tell that girl how you feel. No chickening out.|Con una condición. Le dices a esa chava lo que sientes. Nada de rajarte.
Y|No chickening out. I promise, Ray.|Nada de rajarme. Te lo prometo, Ray.|nóu chíkenin áut. ái prámis, réi|🐔🚫🤞
A|I promise, Ray.
L|I will not be a coward. I promise you, Ray.
O|money|-100|Pagaste $100 de bebidas
O|end|Pizzas, carne asada y cerveza: listo. Ahora sólo falta lo difícil: el corazón.

#g24|La gran fiesta|150|emily|Es la noche. Todos tus compas están en la playa. Recoge a Emily, llévala a la fiesta y dile lo que sientes. Sin miedo, Stanley. Ya hablas como nativo.
O|car|Súbete a tu carro
O|goto|porche|Maneja por Emily
O|talk|porche|emily|Recoge a Emily
N|emily|flirty|Hey, handsome. Okay, why are you being so mysterious about tonight?|Hola, guapo. A ver, ¿por qué andas tan misterioso con lo de hoy?
Y|You'll see. Just trust me, okay?|Ya verás. Nomás confía en mí, ¿sí?|iúl sí. yást trást mi, okéi|🤫✨🙏
A|Just trust me.
L|You will see. Please trust me.
N|emily|laugh|Last time you said «trust me» we ended up at a pizza place at two a.m.|La última vez que dijiste «confía en mí» terminamos en una pizzería a las dos de la mañana.
Y|And it was the best night ever. Admit it.|Y fue la mejor noche de la vida. Admítelo.|and it uás de bést náit éver. admít it|🍕🌙😏
A|It was the best night ever.
L|And it was an excellent night. Please admit it.
N|emily|happy|Okay, fine. It was. Let's go, mystery man.|Bueno, va. Sí fue. Vámonos, hombre misterioso.
Y|Your chariot awaits, my lady.|Su carruaje la espera, mi lady.|iór chériat auéits, mái léidi|🚗👑😂
A|Your ride awaits.
L|The car is ready for you, madam.
O|pickup|emily|Recoge a Emily
O|car|Súbete a tu carro
O|drop|playa|Lleva a Emily a la playa
O|talk|playa|marcus,jake,carlos,chloe,jasmine|Saluda a la banda
N|marcus|happy|Ayyy! There he is! The man of the hour!|¡Eeey! ¡Ahí está! ¡El hombre del momento!
N|jake|laugh|Dude, I ate four slices already. Don't tell Tony.|Güey, ya me comí cuatro rebanadas. No le digas a Tony.
Y|Y'all came! This is lit. Thanks for coming, guys.|¡Vinieron todos! Esto está buenísimo. Gracias por venir.|iól kéim! dis is lít. zénks for kámin, gáis|🎉🔥🙌
A|Thanks for coming, guys!
L|All of you came! This is excellent. Thank you for attending.
N|carlos|happy|Güey, the carne asada is ready. And I didn't burn it. Mostly.|Güey, la carne asada ya está. Y no la quemé. Casi nada.
Y|Bro, it smells amazing. You're the king.|Bro, huele increíble. Eres el rey.|bróu, it sméls améisin. iór de kíng|🥩👑🤤
A|It smells amazing, bro.
L|It smells excellent. You are the best.
N|jasmine|neutral|Okay, see, everybody knows why we're here. So when you gonna do it?|A ver, todos sabemos por qué estamos aquí. ¿Entonces cuándo lo vas a hacer?
N|chloe|flirty|Literally do it now! I'm gonna cry, I already know it!|¡Literal hazlo ya! ¡Voy a llorar, ya sé!
Y|Okay, okay. Y'all, gimme a minute. Wish me luck.|Ya, ya. Denme un minuto. Deséenme suerte.|okéi, okéi. iól, guími a mínet. uísh mi lák|🍀😰💘
A|Give me a minute. Wish me luck.
L|Okay. Everyone, please give me a moment. Wish me good luck.
O|talk|playa|emily|Dile a Emily lo que sientes
N|emily|surprised|Stanley? Why is everybody staring at us?|¿Stanley? ¿Por qué todos nos están viendo?
Y|'Cause I gotta tell you something. And I'm kinda nervous.|Porque te tengo que decir algo. Y ando medio nervioso.|kós ái gára tél iú sámzin. and áim káinda nérvas|💓😰🗣️
A|Because I have to tell you something.
L|Because I need to tell you something important, and I am nervous.
N|emily|flirty|Okay... you're making me nervous too. Spill it.|Bueno... me estás poniendo nerviosa a mí también. Suéltalo.
Y|When I got here, I didn't know anybody. Now I got friends, a job, and you.|Cuando llegué, no conocía a nadie. Ahora tengo amigos, chamba y a ti.|uén ái gát jíer, ái dídent nóu énibari. náu ái gát fréns, a yáb, and iú|🏙️🤝❤️
A|Now I got friends, a job, and you.
L|When I arrived, I did not know anyone. Now I have friends, a job, and you.
N|emily|cry|Stanley... oh my God.|Stanley... ay, Dios mío.
Y|I'm crazy about you, Emily. Will you be my girlfriend?|Estoy loco por ti, Emily. ¿Quieres ser mi novia?|áim kréisi abáut iú, émili. uíl iú bi mái guérlfrend|💘🥺💍
A|Will you be my girlfriend?
L|I like you very much, Emily. Would you like to be my girlfriend?
N|emily|happy|Yes! Yes, you dummy! Of course!|¡Sí! ¡Sí, tontito! ¡Claro que sí!
Y|For real? Oh, thank God. Come here.|¿En serio? Ay, gracias a Dios. Ven acá.|for ríl? óu, zénk gád. kám jíer|😭🤗💋
A|Come here.
L|Really? I am very relieved. Please come here.
N|emily|flirty|I love you, Stanley. Even your terrible jokes.|Te quiero, Stanley. Hasta tus chistes malísimos.
Y|I love you too. Now let's go party!|Yo también te quiero. ¡Ahora vámonos de fiesta!|ái láv iú tú. náu léts góu pári|❤️🎉🏖️
A|I love you too.
L|I love you as well. Now let us celebrate.
O|money|500|Premio final: $500 y el corazón de Emily
O|end|Llegaste sin nada y ahora tienes chamba, compas, familia y novia. Y hablas como gringo. Misión cumplida, Stanley.
`);

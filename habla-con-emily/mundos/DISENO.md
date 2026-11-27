# Habla con Emily: diseño del juego (lo siguen todos los agentes)

Es un **juego** para aprender a **hablar** inglés como gringo. El jugador es **Stanley**, un mexicano en EE.UU.
Cada **misión** es una escena: un personaje (o varios) le habla y Stanley contesta **sus propias líneas**.
Nunca repite lo que dicen los demás. El juego tiene 8 mundos con 100 misiones en total. Va de muy fácil a difícil.

## Cómo se juega una misión
1. Ronda con ayuda: el personaje habla y abajo sale lo que Stanley tiene que decir (inglés, cómo se lee, español y un dibujo con emojis).
2. Ronda sin ayuda: la misma misión, pero sólo ve la idea en español y el dibujo.
3. Si Stanley dice otra cosa (un piropo, un insulto, una broma, «no me acuerdo»), el personaje **le sigue la corriente**: se ríe, se enoja, se sonroja… pero la misión no avanza hasta que diga su línea.

## Formato de los archivos (mundos/wN.js)
```
MUNDO_TXT.push(`
#id|mundo|orden|título en español|lugar|cast separado por comas|nota corta en español (el tip de la misión)
N|personaje|emoción|lo que dice en inglés|traducción al español
Y|lo que dice Stanley en inglés|español|cómo se lee|dibujo con 2-4 emojis
A|otra forma válida de decir la línea Y de arriba (opcional, puede haber varias)
M|personaje|clave|recuerdo en inglés (frase corta en pasado o plan, desde el punto de vista del personaje hablándole a Stanley)|recuerdo en español
`);
```
- `id`: `w1m01`, `w1m02`… (mundo y orden con 2 dígitos).
- No uses el carácter `|` ni comillas invertidas (backtick) ni `${` dentro del texto.
- **Emociones válidas**: `neutral, happy, laugh, flirty, angry, sad, cry, surprised, bored, scared`.
- **Personajes válidos**: los ids de `mundos/personajes.js` (emily, chloe, jasmine, sofia, marcus, jake, carlos, mike, linda, karen, destiny, rose, joe, tommy, max, ray, tony, davis, brad, nina) y los extras (cajera, cajero, mesera, mesero, doctor, chofer, agente, extrano).
- `max` es un perro: sus líneas N son ladridos tipo `Woof! Woof!` con traducción graciosa tipo `(Max quiere tu sándwich)`. Stanley sí le habla a Max («Good boy!», «Sit!», «Drop it!»).
- **Lugares válidos** (cada uno tiene su propio mundo animado): `barrio, porche, tiendita, super, caja, casa, cocina, cuarto, oficina, obra, cafe, restaurante, pizzeria, comida, bar, antro, fiesta, parque, playa, cita, coche, telefono, aeropuerto, avion, hotel, cancha, gym, videojuegos, policia, hospital, calle_noche, tienda_ropa, banco, doctor, estadio`.
- Una misión tiene entre **4 y 10 líneas Y** (las primeras del mundo 1: 4 o 5 líneas cortas; las últimas del juego: 8 a 10).
- Puede empezar con Y (Stanley habla primero) o con N. Puede haber varias N seguidas (grupo platicando) antes de la Y.
- La línea `M` va al final de la misión donde se queda en algo (planes, promesas, chismes) y se usa después en otra misión.

## Cómo se habla (lo más importante)
- **Inglés de la calle, de nativo gringo.** Nada de inglés de libro. Contracciones siempre: I'm, you're, it's, don't, can't, won't, I'll, I'd, gonna, wanna, gotta, kinda, lemme, gimme, y'all, ain't.
- Muletillas: so, like, you know, I mean, dude, bro, man, babe, girl, honestly, literally, for real.
- Jerga actual: no cap, bet, lowkey, highkey, deadass, sus, lit, bruh, my bad, I'm down, it's a vibe, salty, ghosted, hooked up, chill, sick, legit, bougie, slay, spill the tea, I'm dead (de risa), what's good.
- Cada personaje habla a su manera (ver `es` y `fillers` en personajes.js). Marcus y Jasmine usan inglés afroamericano de forma natural y con respeto, nunca de caricatura. Tony habla como neoyorquino italiano. Rose y Joe hablan como abuelos. Tommy, como niño.
- **Variedad en cada misión**: risas, chistes, albures suaves, insultos entre amigos («shut up, dude», «you're an idiot, bro», «dumbass»), piropos, coqueteo. No es tarea: tiene que ser divertido.
- **Groserías**: sí, en pleitos y entre compas (shit, damn, hell, ass, pissed, bullshit, fuck, fucking, wtf, screw you, jerk, asshole, dumbass, son of a b…). **Nunca** insultos racistas, homofóbicos ni de odio.
- **Amor y sexo**: coqueteo subido de tono, besos, «come to bed», «stay the night», «you drive me crazy», «I want you», la mañana siguiente. Sugerente y adulto, **no** explícito ni gráfico.
- Las líneas Y deben ser **fáciles de decir en voz alta** y de reconocer por el micrófono. Al principio cortas (2-6 palabras); después más largas (hasta ~14 palabras).
- **Cómo se lee**: ortografía en español como lo leería un mexicano, con acentos en la sílaba fuerte. Ejemplos: you = iú, I'm = áim, gonna = góna, gotta = gára, wanna = uána, what's up = uáts áp, thanks = zénks, do you = diú, the = de, that = dat, water = uárer, better = bérer, little = lírel, get it = guérit, I don't know = ái dóuno, kind of = káinda.
- **Dibujo**: 2 a 4 emojis graciosos o ridículos que expliquen la idea (ej. «I'm starving» = 🤤🍔💀).

## Los 8 mundos (de fácil a difícil)
| Mundo | Nombre | Misiones | Idea |
|---|---|---|---|
| 1 | El Barrio | 13 | Llegas al barrio. Vecinos: Grandma Rose, Grandpa Joe, Tommy, Max el perro, tu primo Carlos y tu compa Marcus. Saludos, presentarte, favores. Muy fácil. |
| 2 | La Tiendita y el Súper | 12 | Comprar, pagar, cajera Destiny, Tony el de la pizza, cocinar con Carlos. Fácil. |
| 3 | La Chamba | 13 | Entrevista, primer día, jefa Linda, Mike de la obra, Sofía y Jasmine de compañeras, pedir día libre, llegar tarde, aumento. Fácil-medio. |
| 4 | Pleitos y Broncas | 12 | Mal servicio, Karen, te cobran de más, vecino ruidoso, alguien choca tu carro, Officer Davis, trash talk, insultos (de broma y en serio), mandar a alguien a la goma. Medio. |
| 5 | La Noche | 13 | Bar con Ray, antro, fiesta en grupo con Marcus, Jake, Chloe y Jasmine; conoces a Emily; chistes, borrachera, apuestas. Medio. |
| 6 | El Amor | 13 | Citas con Emily, coqueteo con Chloe, celos, la noche, la mañana siguiente, pelea y reconciliación, «te amo». Medio-difícil. |
| 7 | De Viaje | 12 | Aeropuerto, avión con Nina, hotel, Uber, perderte, Karen otra vez en el aeropuerto, Las Vegas con los compas. Difícil. |
| 8 | La Cancha y los Juegos | 12 | Fútbol con Tommy y Brad, trash talk, videojuegos con Jake, estadio con Marcus, gym, apuestas; final épico con todos. Difícil. |

## Hilos de memoria (los personajes se acuerdan)
Quien escribe la misión que **planta** el recuerdo pone la línea `M` con la clave exacta. Quien escribe la misión que **lo usa** hace que el personaje lo mencione en una línea N (y Stanley contesta).
| Clave | Personaje | Se planta en | Se usa en | Recuerdo (en) |
|---|---|---|---|---|
| pay_de_rose | rose | w1 (misión 3 o 4) | w2 (alguna misión con rose) | I made you my famous apple pie, sweetie. |
| gym_marcus | marcus | w1 (misión 6-9) | w8 (misión en el gym) | We said we'd hit the gym together every Monday. |
| balon_tommy | tommy | w1 (misión 8-12) | w8 (misión de fútbol con tommy) | I lent you my soccer ball. You still have it! |
| carne_carlos | carlos | w1 (misión 10-13) | w5 (carne asada / fiesta) | You promised you'd bring the beer to my barbecue. |
| cupon_destiny | destiny | w2 (misión 2-5) | w2 (misión 9-12) | I told you to come back Tuesday for the discount. |
| aumento_linda | linda | w3 (misión 6-9) | w3 (misión 11-13) | I told you I'd think about your raise. |
| karen_tienda | karen | w4 (misión 1-4) | w7 (aeropuerto) | You're the guy who embarrassed me at the store! |
| parque_emily | emily | w5 (misión donde la conoces, 6-10) | w6 (misión 1: picnic en el parque) | We said we'd have a picnic at the park on Saturday. |
| cincuenta_jake | jake | w5 (cualquiera) | w8 (videojuegos) | I still owe you fifty bucks. Don't remind me. |
| numero_chloe | chloe | w5 (cualquiera) | w6 (cualquiera con chloe) | I gave you my number and you never texted me! |
| vegas_marcus | marcus | w7 (misión 8-12) | w8 (final) | What happens in Vegas stays in Vegas, bro. |

## Validar
Después de escribir, corre: `node tools/validar.js` desde la carpeta `habla-con-emily`. Corrige todo lo que marque.

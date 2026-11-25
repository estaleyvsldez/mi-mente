# Instalar Mi Mente en tu iPhone sin laptop (TestFlight)

Una Mac en la nube de GitHub compila la app y la sube a TestFlight. Tú solo usas el iPhone.
Lo haces **una sola vez**; después, cada versión nueva es tocar un botón.

> Necesitas la **cuenta de desarrollador de Apple (Apple Developer Program, 99 USD al año)**.
> Apple no deja instalar apps propias en un iPhone sin una Mac o sin esa cuenta.

## 1. Inscríbete en el Apple Developer Program
Desde el iPhone: descarga la app **Apple Developer** → *Account* → **Enroll** y paga con tu Apple ID.
La aprobación tarda entre unas horas y 2 días.

## 2. Registra la app (Safari, en el iPhone)
1. Entra a **developer.apple.com/account** → *Certificates, IDs & Profiles* → *Identifiers* → **+** →
   *App IDs* → *App*. En **Bundle ID** pon algo único, por ejemplo `com.tunombre.mimente`.
2. Entra a **appstoreconnect.apple.com** → *Apps* → **+** → *New App*. Plataforma iOS, nombre
   "Mi Mente" (o el que quieras, si está ocupado), y elige el Bundle ID del paso anterior. SKU: `mimente`.

## 3. Crea una API key de App Store Connect
appstoreconnect.apple.com → *Users and Access* → *Integrations* → *App Store Connect API* →
**Generate API Key** → nombre `github`, acceso **Admin**.
Apunta el **Issuer ID** y el **Key ID**, y **descarga** el archivo `AuthKey_XXXX.p8` (solo se
puede bajar una vez). En el iPhone queda en la app Archivos: ábrelo y copia todo su texto.

Tu **Team ID** está en developer.apple.com/account → *Membership details*.

## 4. Pon los secretos en GitHub
En github.com (Safari) → tu repo **mi-mente** → *Settings* → *Secrets and variables* → *Actions* →
**New repository secret**, y crea estos 5:

| Nombre | Valor |
|---|---|
| `ASC_KEY_ID` | el Key ID |
| `ASC_ISSUER_ID` | el Issuer ID |
| `ASC_KEY_P8` | todo el texto del archivo .p8 (incluye `-----BEGIN PRIVATE KEY-----`) |
| `APPLE_TEAM_ID` | tu Team ID |
| `BUNDLE_ID` | el Bundle ID del paso 2 |

## 5. Envía la app a TestFlight
En GitHub → *Actions* → **Editor IA (enviar a TestFlight)** → **Run workflow**.
Tarda unos 10 minutos. Luego Apple la procesa (10 a 30 minutos más).

## 6. Instálala
1. Descarga **TestFlight** del App Store.
2. En App Store Connect → tu app → *TestFlight* → *Internal Testing* → crea un grupo y agrégate
   con tu correo de Apple ID.
3. Te llega una invitación: ábrela en TestFlight → **Instalar**.

Cada build de TestFlight dura 90 días. Para actualizar, vuelve al paso 5.

## Si algo falla
En *Actions*, abre la ejecución en rojo y busca la línea `error:`.
- *Faltan estos secretos* → revisa el paso 4 (los nombres tienen que ser exactos).
- *No profiles for 'com…' were found* o algo de *signing* → la API key tiene que tener acceso
  **Admin**, y el Bundle ID tiene que coincidir con el de App Store Connect.
- *No suitable application records were found* → falta crear la app en App Store Connect (paso 2).

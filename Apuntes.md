# CLAUDE.md: contexto del proyecto CyberAware

Este archivo lo lee Claude Code al empezar cada sesión. Resume qué es el proyecto, cómo está
hecho, qué decisiones se tomaron y qué falta. Mantenedlo actualizado cuando cambie algo importante.

## Quiénes somos y qué es esto

- Proyecto del módulo **C087 (Proyecto)** del Curso de especialización en Ciberseguridad en
  Entornos de las TI (modalidad online). Trabajo en pareja: **Dylan Grados Castilla** (GitHub
  `gradosvfx`) y **Victor González Jimenez**.
- **CyberAware** es a la vez el nombre de la empresa ficticia y de la plataforma: una web de
  concienciación en ciberseguridad que contratarían empresas para formar a sus empleados
  (usuarios no técnicos). Cada empresa cliente tendría su propia instalación.
- Somos estudiantes: **explica siempre qué haces y por qué**, en español y sin dar por sabido
  nada. Tenemos que entender el código para defenderlo en los screencasts y ante el profesor.
  Antes de cambios grandes, propón un plan y espera confirmación.

## Entrega actual: Actividad 3 (fecha límite: 20/11/2026, 23:55)

Tres PDF (nombre del grupo: CyberAware):
- **A. Memoria técnica actualizada** (`C087_Actividad_03_A_CyberAware.pdf`): la del NF1 con los
  cambios surgidos al implantar, registrados en la tabla de versiones y justificados.
  Los cambios ya hechos están en `CHANGELOG.md`.
- **B. Manual del administrador** (`C087_Actividad_03_B_CyberAware.pdf`): índice completo y al
  menos 3 apartados desarrollados, paso a paso y reproducibles. Debe reflejar el entorno REAL
  implantado (la rúbrica penaliza lo que no corresponda a la implantación).
- **C. Relación de screencasts** (`C087_Actividad_03_C_CyberAware.pdf`): tabla con URL, autor y
  sinopsis. Un vídeo por persona, máximo 2 minutos, narrado, en YouTube o Vimeo, con nombre
  `C087_Actividad_03_Demo_1_CyberAware`. Hay que mostrar requisitos de la actividad 2 (citar
  RF/IC), explicar decisiones y comentar mejoras.

## Plataforma (requisitos principales)

- Cuatro módulos, en cualquier orden: contraseñas (`contrasenas`), phishing (`phishing`),
  ingeniería social (`ingenieria`) y webs falsas HTTP/HTTPS (`https`).
- Cada módulo tiene 5 partes en **orden estricto**: preguntas iniciales (3, sin mostrar la
  solución) → vídeo de teoría (3-4 min) → caso real → actividad práctica (minijuego) →
  preguntas finales (las mismas, opciones en otro orden) con comparación, explicación de las
  incorrectas, resumen y dos valoraciones de 1 a 5 (general y claridad).
- Acceso con usuario y contraseña, **sin registro abierto**: las cuentas las crea el
  administrador en el panel de PocketBase (nombre genérico `empleadoNN`, contraseña aleatoria
  de 15+ caracteres, solo letras y números, con `scripts/generar_contrasena.sh`).
- Solo ordenador (sin versión móvil). Navegadores: Chrome, Firefox y Edge.
- Requisitos completos: RF01-RF15, RNF01-RNF11 e IC01-IC12 en la memoria (documentos A y B
  del NF1).

## Arquitectura

```
Navegador ─HTTPS─► Caddy (80/443, único contenedor con puertos publicados)
                     ├─ /        → web (Nginx, archivos estáticos)
                     ├─ /api/*   → waf (ModSecurity + OWASP CRS) → pocketbase
                     └─ /_/*     → pocketbase (panel; solo desde ADMIN_IP)
crowdsec  lee los registros de Caddy; el bouncer del servidor bloquea IPs en el cortafuegos
backups   copia diaria de pb_data/backups y caddy_data al disco de copias (7 días)
```

- Redes Docker: `frontend` (Caddy), `backend` interna sin salida a Internet (Caddy, web, waf,
  pocketbase; subred 172.30.10.0/24), `default` (CrowdSec). Backups sin red.
- Entornos: **desarrollo** en el PC de cada uno con Docker Desktop (Windows);
  **servidor** = máquina virtual Ubuntu Server 24.04 en VirtualBox (red en modo puente) en el
  PC de uno de los dos. En la VM no se programa: solo `git pull` y `docker compose up -d --build`.
- Un único `docker-compose.yml` para ambos entornos; las diferencias van en `.env`
  (ver `.env.example`).

## Estructura del repositorio y responsables

```
docker-compose.yml, Caddyfile, .env.example   Infraestructura (ambos)
waf/          Exclusiones de OWASP CRS (ambos)
crowdsec/     acquis.yaml, config.yaml.local, lista-blanca.yaml (ambos)
pocketbase/   Dockerfile (binario oficial con SHA-256) y pb_migrations/ (ambos)
scripts/      generar_contrasena.sh, indicadores.py (ambos)
web/index.html       Inicio de sesión (RF12)
web/dashboard.html   Página principal (RF01)
web/modulo.html      Página común de todos los módulos: modulo.html?m=<id>
web/js/app.js        Navegación y flujo de las 5 partes
web/js/api.js        Comunicación con PocketBase (API REST con fetch, sin SDK)
web/js/preguntas.js  Preguntas, comparación, resumen y valoración
web/js/dom.js        Utilidades: h() para crear elementos, vaciar(), cargarJSON()
web/css/estilos.css  Estilos comunes
web/data/<id>.json, web/js/juegos/<id>.js, web/css/juegos/<id>.css   Por módulo
```

- **Dylan**: `phishing` y `https` (su JSON, su JS y su CSS).
- **Victor**: `contrasenas` e `ingenieria` (su JSON, su JS y su CSS).
- Archivos comunes: solo tras acordarlo entre los dos. `.github/CODEOWNERS` lo refleja
  (falta sustituir `@usuario-victor` por el usuario real de Victor).

## Flujo de Git

- Nunca se sube directamente a `main`: una rama por tarea → pull request → lo aprueba el otro
  → merge. Protección de `main`: "Require a pull request before merging" con 1 aprobación;
  NO activar "Require review from Code Owners" (bloquearía los PR sobre los propios módulos).
- Mensajes de commit en español y descriptivos (ej.: `Phishing: añadir señal del adjunto`).
- Anotar los cambios relevantes en `CHANGELOG.md` (sirve para el apartado A de la entrega).
- Nunca subir `.env`, contraseñas, `pb_data/` ni `copias-local/`. El repositorio es público.
- Vídeos de menos de 50 MB (GitHub rechaza archivos de más de 100 MB).

## Reglas de código (respetarlas siempre)

- Todo en **español**: textos, nombres de variables y funciones, comentarios.
- **Nunca `innerHTML`**: crear el DOM con `h()` de `dom.js` y `textContent` (prevención de XSS).
- **CSP estricta** (definida en el Caddyfile): nada de `<script>` en línea, atributos `onclick`
  en el HTML, `style="..."` ni recursos externos (CDN, Google Fonts…). Todo se sirve desde el
  propio servidor. Cambiar estilos desde JS con `elemento.style.propiedad` sí está permitido.
- El **contenido** de cada módulo va en su JSON, no en el código (RNF05). Añadir un módulo
  nuevo = su JSON + entrada en `data/modulos.json` + su minijuego + una migración que añada su
  id a los valores del campo `modulo` de la colección `progreso`.
- Interfaz de un minijuego: `export function iniciar(contenedor, config, { repaso, alTerminar })`;
  llama a `alTerminar(puntuacion)` con un entero de 0 a 100. En modo repaso no se guarda nada.
- Accesibilidad (RNF08): etiquetas en los campos, foco visible, contraste suficiente, botones
  reales (`<button>`) para todo lo que se pulsa.
- Dominios de ejemplo en los contenidos: siempre reservados (`.example`), nunca reales.
- Los casos reales deben ser verificables y citar sus fuentes con enlace.

## Base de datos (PocketBase 0.40.5)

- Toda la estructura está en `pocketbase/pb_migrations/1761480000_cyberaware_init.js`:
  - `users`: login por `username` (único), email no obligatorio, contraseña mínima 15,
    sin OAuth2/OTP/MFA, sesión de 8 h; cada usuario solo ve su cuenta; crear/editar/borrar
    solo superusuario.
  - `progreso`: un registro por usuario y módulo (índice único), estados de las 5 partes,
    porcentaje, respuestas y aciertos iniciales/finales (0-3), puntuación de la actividad
    (0-100), valoraciones (1-5). El usuario solo ve, crea y modifica lo suyo, no puede cambiar
    el propietario ni borrar. Borrado en cascada al eliminar la cuenta.
  - Ajustes: copia diaria a las 12:00 UTC conservando 1, registros 7 días sin id de usuario,
    proxy de confianza X-Forwarded-For, sesión de superusuario de 30 min.
- Cambios de estructura: se hacen en el panel en local (con `PB_AUTOMIGRATE=true` se genera la
  migración sola) y se sube el archivo de migración. En el servidor las migraciones son de solo
  lectura.

## Seguridad: decisiones importantes

- Caddy solo deja pasar desde fuera de ADMIN_IP estas rutas de la API:
  `/api/collections/users/auth-with-password`, `/api/collections/users/records*` y
  `/api/collections/progreso/records*`. El resto (panel, superusuario, ajustes, copias,
  registros) devuelve 403. Si la web necesita otra ruta, hay que añadirla al Caddyfile.
- WAF: `ALLOWED_METHODS` incluye PATCH y DELETE (si no, CRS bloquea el guardado del progreso).
  El campo de contraseña está excluido del análisis. Auditoría solo de partes A, H y Z.
  Se implanta en `DetectionOnly` y se pasa a `On` antes de la prueba con usuarios.
- CrowdSec: lista blanca propia (localhost + IP de administración; hay que editar la IP en
  `crowdsec/lista-blanca.yaml`); API central desactivada, así que **no** se recibe la lista
  comunitaria.
- La sesión del usuario se guarda en `sessionStorage` (se borra al cerrar el navegador).
- Limitación conocida: las respuestas correctas están en los JSON públicos y la puntuación se
  calcula en el navegador; un usuario técnico podría alterar sus resultados.

## Cómo levantarlo en local

1. `cp .env.example .env` (en Windows: `copy`) y poner: `SITE_ADDRESS=localhost`,
   `ADMIN_IP=0.0.0.0/0`, `PB_MIGRATIONS_MODO=rw`, `PB_AUTOMIGRATE=true`,
   `CROWDSEC_BOUNCER_KEY=` cualquier texto, `DISCO_COPIAS=./copias-local`.
2. `docker compose up -d --build`
3. `docker compose exec pocketbase /pb/pocketbase superuser upsert admin@cyberaware.local "CONTRASEÑA" --dir /pb/pb_data`
4. Panel: `https://localhost/_/` → crear cuentas en `users`. Plataforma: `https://localhost`.

- Abrir `index.html` con doble clic NO funciona (se queda en «Cargando…»): los módulos de
  JavaScript no se cargan desde `file://` y además hace falta PocketBase.
- Detener con `docker compose down`. **Nunca** `docker compose down -v` (borra la base de datos
  y los certificados).

## Estado

Hecho y probado (navegador automatizado + PocketBase y Caddy reales, sin Docker):
reglas de acceso de PocketBase, rutas y restricciones de Caddy, CSP y cabeceras, los cuatro
módulos completos de principio a fin, puntuaciones de los minijuegos, modo repaso,
«Continuar donde lo dejé», valoraciones y `scripts/indicadores.py`.

Escrito pero **sin probar todavía con Docker**: `docker-compose.yml`, WAF, CrowdSec y bouncer,
contenedor de copias. La primera vez que se levante puede salir algún error de configuración.

Pendiente:
- Grabar los vídeos de teoría (`web/media/LEEME.md` lista los nombres de archivo; los guiones
  son las transcripciones de cada JSON). Sin vídeo, la plataforma muestra la transcripción y un
  botón para continuar.
- Desplegar en la máquina virtual y escribir el manual del administrador con lo realmente hecho.
- Actualizar la memoria (apartado A): cambios del `CHANGELOG.md`; árbol del repositorio
  (dashboard.html, css/juegos/); y correcciones detectadas en la revisión del NF1:
  justificación de CrowdSec (sin lista comunitaria), momento en que entra el WAF, criterio
  de mejora del 70 % (proponer: final ≥ mín(inicial + 30, 90 %) y nunca inferior a la inicial),
  qué pasa si un participante necesita más de una sesión en la prueba piloto, borrar las copias
  manuales de PocketBase (no se eliminan solas) y retirar el certificado raíz de los equipos de
  prueba al terminar el proyecto.
- Sustituir `@usuario-victor` en `.github/CODEOWNERS` e IP en `crowdsec/lista-blanca.yaml`.
- Grabar los screencasts y preparar el documento C.

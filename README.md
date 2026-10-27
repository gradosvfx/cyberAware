# CyberAware

Plataforma web de concienciación en ciberseguridad para empleados sin conocimientos técnicos.
Cuatro módulos (contraseñas, phishing, ingeniería social y webs falsas/HTTP-HTTPS), cada uno con
preguntas iniciales, vídeo, caso real, actividad práctica y preguntas finales.

Proyecto del módulo C087 (Curso de especialización en Ciberseguridad en Entornos de las TI).
Autores: Dylan Grados Castilla y Victor González Jimenez.

## Estructura

```
docker-compose.yml   Contenedores, redes y volúmenes
Caddyfile            HTTPS, reparto de rutas y restricción por IP
.env.example         Plantilla de variables (el .env real no se sube)
.github/CODEOWNERS   Responsable de cada archivo (revisiones automáticas)
waf/                 Exclusiones del WAF (OWASP CRS)
crowdsec/            Origen de registros, lista blanca y conservación de alertas
pocketbase/          Dockerfile y migraciones (colecciones, reglas y ajustes)
scripts/             generar_contrasena.sh, indicadores.py
web/
├── index.html       Inicio de sesión (RF12)
├── dashboard.html   Página principal: módulos, progreso y «Continuar donde lo dejé» (RF01)
├── modulo.html      Página común a todos los módulos: modulo.html?m=<id> (RF02-RF11, RF15)
├── css/estilos.css  Estilos comunes
├── css/juegos/      Estilos de cada minijuego
├── js/              app.js (navegación), api.js (PocketBase), preguntas.js, dom.js
├── js/juegos/       Un archivo por minijuego
├── data/            Un JSON por módulo (preguntas, teoría, caso real, actividad, resumen)
└── media/           Vídeos, imágenes y fuentes
```

## Reparto del trabajo

Cada módulo tiene sus propios archivos, así que cada integrante trabaja en los suyos sin
pisar los del otro:

| Responsable | Archivos |
|-------------|----------|
| Dylan  | `data/phishing.json`, `js/juegos/phishing.js`, `css/juegos/phishing.css` y lo mismo para `https` |
| Victor | `data/contrasenas.json`, `js/juegos/contrasenas.js`, `css/juegos/contrasenas.css` y lo mismo para `ingenieria` |
| Ambos  | Archivos comunes (`*.html`, `js/app.js`, `js/api.js`, `js/preguntas.js`, `css/estilos.css`, infraestructura): se cambian solo tras acordarlo |

Flujo: una rama por tarea, pull request y aprobación del otro integrante antes de fusionar.
`.github/CODEOWNERS` hace que GitHub pida la revisión al responsable cuando alguien toca sus
archivos (configuración de la rama principal explicada en el propio archivo).

## Desarrollo local (Docker Desktop)

1. `cp .env.example .env` y ajustar: `SITE_ADDRESS=localhost`, `ADMIN_IP=0.0.0.0/0`,
   `PB_MIGRATIONS_MODO=rw`, `PB_AUTOMIGRATE=true`, `DISCO_COPIAS=./copias-local` y una clave
   cualquiera en `CROWDSEC_BOUNCER_KEY`.
2. `docker compose up -d --build`
3. Crear el superusuario:
   `docker compose exec pocketbase /pb/pocketbase superuser upsert admin@cyberaware.local "CONTRASEÑA" --dir /pb/pb_data`
4. Abrir `https://localhost` (aceptar el certificado de la autoridad interna) y el panel en `https://localhost/_/`.
5. Crear cuentas en el panel (colección users): nombre de usuario `empleadoNN` y contraseña de
   `./scripts/generar_contrasena.sh`.

Los cambios de estructura de la base de datos se hacen desde el panel en local: PocketBase genera
el archivo de migración en `pocketbase/pb_migrations/`, que se sube al repositorio.

## Servidor (máquina virtual Ubuntu Server 24.04)

Resumen; el procedimiento completo está en el manual del administrador.

1. Red en modo puente con IP fija; IP fija también para el equipo de administración.
2. UFW: 80 y 443 desde la red de pruebas; 22 solo desde la IP de administración; SSH solo con clave.
3. Docker Engine y Docker Compose (Engine 26 o posterior, por el `subpath` del contenedor de copias).
4. Registros de los contenedores en journald con 7 días de conservación:
   - `/etc/docker/daemon.json`: `{ "log-driver": "journald" }`
   - `/etc/systemd/journald.conf`: `MaxRetentionSec=7day`
   - `sudo systemctl restart systemd-journald docker`
5. Montar el disco de copias en `/srv/copias`.
6. Clonar el repositorio, `cp .env.example .env` y rellenarlo (`openssl rand -hex 32` para la clave
   del bouncer). Editar la IP de `crowdsec/lista-blanca.yaml` con la de administración.
7. `docker compose build` y escanear las imágenes con Trivy; después `docker compose up -d`.
8. Crear el superusuario (paso 3 de desarrollo) y comprobar en el panel que existen las colecciones.
9. Instalar el bouncer de cortafuegos de CrowdSec en el servidor (repositorio oficial de CrowdSec,
   paquete `crowdsec-firewall-bouncer-iptables`) y configurar en
   `/etc/crowdsec/bouncers/crowdsec-firewall-bouncer.yaml`:
   `api_url: http://127.0.0.1:8080/`, `api_key:` la del `.env` e `iptables_chains: [INPUT, DOCKER-USER]`.
10. Exportar el certificado raíz de Caddy e instalarlo en los equipos de prueba y de administración:
    `docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./root.crt`
11. Comprobar: `docker compose ps`, Nmap desde un equipo no autorizado (solo 80 y 443) y prueba
    de bloqueo de CrowdSec (`docker compose exec crowdsec cscli decisions list`).
12. Antes de la prueba con usuarios: `WAF_MODO=On` en `.env` y `docker compose up -d waf`.

## Operación

- Detener: `docker compose down`. **Nunca** `docker compose down -v` (borra base de datos y certificados).
- Registros: `docker compose logs caddy|waf|pocketbase|crowdsec`.
- Copias: PocketBase hace una copia diaria a las 12:00 UTC y conserva solo la última; el contenedor
  de copias la lleva al disco de copias a las 13:00 UTC y conserva 7 días.
  Las copias manuales (desde el panel) no se borran solas: eliminarlas tras usarlas.
- Indicadores de la prueba con usuarios (desde el equipo de administración):
  `python3 scripts/indicadores.py --url https://IP_DEL_SERVIDOR --ca root.crt --email admin@cyberaware.local`

## Limitaciones conocidas

- Las respuestas correctas están en los JSON públicos y la puntuación se calcula en el navegador:
  un usuario con conocimientos técnicos podría alterar sus resultados. Se controla con la
  supervisión de la prueba y la revisión de valores anómalos.
- Para añadir un módulo nuevo hace falta su JSON, su entrada en `data/modulos.json` y una
  migración que añada su identificador al campo `modulo` de la colección progreso.

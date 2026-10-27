# Registro de cambios

Formato: fecha, versión y cambios. Los cambios que afectan a la memoria técnica se
reflejan también en su tabla de control de versiones.

## [0.2.0] - 2026-10-26

### Cambiado
- La página de inicio se divide en dos: index.html (inicio de sesión) y dashboard.html
  (página principal). Con sesión abierta, index.html lleva al dashboard; sin sesión,
  dashboard.html y modulo.html llevan al inicio de sesión.
- Los estilos de cada minijuego pasan de estilos.css a css/juegos/<módulo>.css y se cargan
  solo al abrir la actividad. Así cada integrante tiene sus propios archivos (JSON, JS y CSS).

### Añadido
- .github/CODEOWNERS con el responsable de cada archivo.

## [0.1.0] - 2026-10-26

### Añadido
- Infraestructura: docker-compose.yml con Caddy, App web (Nginx), WAF (ModSecurity + OWASP CRS),
  PocketBase, CrowdSec y copias de seguridad; redes frontend, backend (interna) y default.
- Caddyfile: HTTPS con autoridad interna, restricción por IP del panel y de las rutas de
  administración, lista de rutas de la API permitidas, cabeceras de seguridad y CSP.
- PocketBase: imagen propia con versión y suma SHA-256 fijas; migración inicial con la colección
  users (acceso por nombre de usuario, contraseña de 15 caracteres como mínimo, sin registro
  abierto) y la colección progreso con sus reglas de acceso, límites e índice único.
- Web: inicio de sesión, página principal, página de módulo con las cinco partes en orden,
  preguntas iniciales y finales, comparación, resumen y valoración.
- Cuatro minijuegos: comprobador de contraseñas, correo de phishing, chat de ingeniería social
  e historia interactiva de HTTP/HTTPS.
- Contenido de los cuatro módulos (preguntas, transcripciones, casos reales con fuentes).
- Scripts: generar_contrasena.sh e indicadores.py.

### Cambios respecto a la memoria técnica (NF1)
- Un único docker-compose.yml para desarrollo y servidor: las diferencias (dirección, IP de
  administración, modo del WAF, modo de las migraciones) se definen en el archivo .env.
- Las copias programadas de PocketBase, la conservación de registros (7 días), el proxy de
  confianza y la duración de la sesión de superusuario (30 min) se configuran en la migración,
  no a mano desde el panel, para que la instalación sea reproducible.
- El WAF permite los métodos PATCH y DELETE (por defecto OWASP CRS solo admite GET, HEAD,
  POST y OPTIONS y bloquearía el guardado del progreso).
- El registro de auditoría del WAF se limita a las partes A, H y Z (sin cabeceras ni cuerpos).
- Los horarios de copia se expresan en UTC (12:00 PocketBase y 13:00 contenedor de copias).
- CrowdSec: se desactiva la API central (DISABLE_ONLINE_API), por lo que no se recibe la lista
  comunitaria; la protección se basa en los escenarios locales y el bouncer de cortafuegos.
- Volumen adicional crowdsec_config para conservar la configuración y el hub de CrowdSec.
- El journald de los contenedores se configura en /etc/docker/daemon.json del servidor, no en
  el compose (Docker Desktop no lo admite).

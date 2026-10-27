# Archivos multimedia

Los vídeos no se incluyen todavía. La plataforma funciona sin ellos: si un vídeo
no existe, muestra la transcripción y un botón para continuar.

## Vídeos de teoría (3-4 minutos, MP4 comprimido, menos de 50 MB)

| Archivo                       | Módulo                    | Guion (transcripción)           |
|-------------------------------|---------------------------|---------------------------------|
| `videos/contrasenas.mp4`      | Contraseñas               | `data/contrasenas.json` → teoria |
| `videos/phishing.mp4`         | Phishing                  | `data/phishing.json` → teoria    |
| `videos/ingenieria.mp4`       | Ingeniería social         | `data/ingenieria.json` → teoria  |
| `videos/https.mp4`            | Webs falsas y HTTP/HTTPS  | `data/https.json` → teoria       |

## Vídeos cortos de la historia de HTTP/HTTPS (opcionales)

`videos/https_escena1.mp4` a `videos/https_escena4.mp4`. Si no existen, la escena se
muestra solo con texto y el navegador simulado.

## Subtítulos (recomendado para accesibilidad)

Si se crea un archivo WebVTT (por ejemplo `videos/phishing.vtt`), basta con indicar su
ruta en el campo `subtitulos` de la teoría del JSON del módulo.

## Fuentes

Atkinson Hyperlegible Next y Atkinson Hyperlegible Mono (Braille Institute), con licencia
SIL Open Font License 1.1 (`fuentes/LICENCIA-OFL.txt`). Se sirven desde el propio servidor.

#!/bin/sh
# Genera una contraseña aleatoria solo con letras y números (por defecto, 20 caracteres).
# Uso: ./scripts/generar_contrasena.sh [longitud]
LONGITUD="${1:-20}"
if [ "$LONGITUD" -lt 15 ]; then
  echo "La longitud mínima es 15 caracteres." >&2
  exit 1
fi
LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c "$LONGITUD"
echo

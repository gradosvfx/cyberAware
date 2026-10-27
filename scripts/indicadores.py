#!/usr/bin/env python3
"""Calcula los indicadores de la prueba con usuarios (apartado 2.2 de la memoria)
a partir de los datos guardados en PocketBase.

Se ejecuta desde el equipo de administración (las rutas de superusuario solo
están abiertas para esa IP). Solo usa la biblioteca estándar de Python.

Uso:
  python3 scripts/indicadores.py --url https://192.168.1.50 --ca root.crt --email admin@cyberaware.local

La contraseña del superusuario se pide por teclado (no queda en el historial).
"""
import argparse
import getpass
import json
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

MODULOS = ["contrasenas", "phishing", "ingenieria", "https"]
PREGUNTAS_POR_MODULO = 3


def peticion(base, ruta, contexto, token=None, cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    cabeceras = {"Content-Type": "application/json"}
    if token:
        cabeceras["Authorization"] = token
    req = urllib.request.Request(base + ruta, data=datos, headers=cabeceras,
                                 method="POST" if cuerpo is not None else "GET")
    with urllib.request.urlopen(req, context=contexto, timeout=20) as r:
        return json.loads(r.read())


def todos(base, coleccion, contexto, token):
    elementos, pagina = [], 1
    while True:
        q = urllib.parse.urlencode({"page": pagina, "perPage": 200})
        d = peticion(base, f"/api/collections/{coleccion}/records?{q}", contexto, token)
        elementos += d["items"]
        if pagina >= d["totalPages"]:
            return elementos
        pagina += 1


def pct(parte, total):
    return 100 * parte / total if total else 0.0


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("--url", required=True, help="Dirección de la plataforma, p. ej. https://192.168.1.50")
    a.add_argument("--ca", help="Certificado raíz de la autoridad interna de Caddy (root.crt)")
    a.add_argument("--email", required=True, help="Correo del superusuario de PocketBase")
    args = a.parse_args()

    contexto = ssl.create_default_context(cafile=args.ca) if args.ca else ssl.create_default_context()
    base = args.url.rstrip("/")
    try:
        token = peticion(base, "/api/collections/_superusers/auth-with-password", contexto,
                         cuerpo={"identity": args.email, "password": getpass.getpass("Contraseña del superusuario: ")})["token"]
        usuarios = todos(base, "users", contexto, token)
        progreso = todos(base, "progreso", contexto, token)
    except urllib.error.HTTPError as e:
        sys.exit(f"Error {e.code}: comprueba las credenciales y que ejecutas el script desde el equipo de administración.")
    except urllib.error.URLError as e:
        sys.exit(f"No se puede conectar con {base}: {e.reason}")

    participantes = [u["id"] for u in usuarios]
    n = len(participantes)
    if not n:
        sys.exit("No hay cuentas de usuario.")
    por_usuario = {u: {r["modulo"]: r for r in progreso if r["usuario"] == u} for u in participantes}

    # Objetivo 3: completan los cuatro módulos.
    completan = sum(1 for u in participantes
                    if all(por_usuario[u].get(m, {}).get("porcentaje") == 100 for m in MODULOS))

    # Objetivos 3 y 5: media de valoraciones por participante (quien no valora los 4 módulos no supera).
    def supera(campo):
        total = 0
        for u in participantes:
            notas = [por_usuario[u].get(m, {}).get(campo) or 0 for m in MODULOS]
            if all(notas) and sum(notas) / len(notas) >= 4:
                total += 1
        return total

    # Objetivo 4: mejora formativa (solo módulos con preguntas iniciales y finales completadas).
    validos = [r for r in progreso if r["estado_iniciales"] == "completada" and r["estado_finales"] == "completada"]
    no_terminados = [r for r in progreso if r not in validos]
    media_ini = pct(sum(r["aciertos_iniciales"] for r in validos), len(validos) * PREGUNTAS_POR_MODULO)
    media_fin = pct(sum(r["aciertos_finales"] for r in validos), len(validos) * PREGUNTAS_POR_MODULO)
    if media_ini > 70:
        cumple_mejora = media_fin >= 90 and media_fin >= media_ini
        criterio = "media inicial > 70 %: la final debe ser >= 90 % y no inferior a la inicial"
    else:
        cumple_mejora = media_fin - media_ini >= 30
        criterio = "mejora de al menos 30 puntos porcentuales"

    print(f"Participantes (cuentas): {n}")
    print(f"Completan los 4 módulos: {completan} ({pct(completan, n):.0f} %)  objetivo: >= 80 %")
    print(f"Valoración general media >= 4: {supera('valoracion_general')} ({pct(supera('valoracion_general'), n):.0f} %)  objetivo: >= 80 %")
    print(f"Claridad media >= 4: {supera('valoracion_claridad')} ({pct(supera('valoracion_claridad'), n):.0f} %)  objetivo: >= 80 %")
    print(f"Mejora formativa sobre {len(validos)} módulos terminados: inicial {media_ini:.1f} %, final {media_fin:.1f} %, "
          f"diferencia {media_fin - media_ini:+.1f} puntos -> {'CUMPLE' if cumple_mejora else 'NO CUMPLE'} ({criterio})")
    print(f"Módulos empezados sin preguntas finales (se indican aparte): {len(no_terminados)}")
    print("Media de la actividad práctica por módulo:")
    for m in MODULOS:
        notas = [r["puntuacion_actividad"] for r in progreso if r["modulo"] == m and r["estado_actividad"] == "completada"]
        print(f"  {m}: {sum(notas) / len(notas):.0f} % ({len(notas)} usuarios)" if notas else f"  {m}: sin datos")


if __name__ == "__main__":
    main()

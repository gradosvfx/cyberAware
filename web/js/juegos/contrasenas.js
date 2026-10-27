// Actividad del módulo de contraseñas: comprobador en tiempo real.
// Todo se calcula en el navegador: la contraseña escrita nunca se guarda ni se envía.
// Solo se guarda la puntuación (100 % al conseguir una contraseña fuerte).

import { h, vaciar } from "../dom.js";

const NIVELES = ["Muy débil", "Débil", "Mejorable", "Fuerte"];
const FILAS_TECLADO = ["qwertyuiop", "asdfghjklñ", "zxcvbnm", "1234567890"];
const SUSTITUCIONES = { "@": "a", "4": "a", "3": "e", "1": "i", "!": "i", "0": "o", "5": "s", "$": "s", "7": "t" };

function sinAcentos(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizar(texto) {
  return sinAcentos(texto).replace(/[@4310!5$7]/g, (c) => SUSTITUCIONES[c]);
}

// Secuencias: 3 dígitos seguidos (123, 987), 4 letras seguidas (abcd)
// o 4 teclas seguidas de una fila del teclado (qwer, asdf).
function tieneSecuencia(texto) {
  const t = sinAcentos(texto);
  for (let i = 0; i < t.length; i++) {
    for (const largo of [3, 4]) {
      const trozo = t.slice(i, i + largo);
      if (trozo.length < largo) continue;
      const digitos = /^\d+$/.test(trozo);
      const letras = /^[a-z]+$/.test(trozo);
      if ((largo === 3 && !digitos) || (largo === 4 && !letras)) continue;
      const pasos = [...trozo].slice(1).map((c, k) => c.charCodeAt(0) - trozo.charCodeAt(k));
      if (pasos.every((d) => d === 1) || pasos.every((d) => d === -1)) return true;
    }
  }
  return FILAS_TECLADO.some((fila) => {
    for (let i = 0; i + 4 <= fila.length; i++) {
      const trozo = fila.slice(i, i + 4);
      if (t.includes(trozo) || t.includes([...trozo].reverse().join(""))) return true;
    }
    return false;
  });
}

function tieneRepeticion(texto) {
  return /(.)\1\1/.test(texto) || /(.{2,})\1/.test(texto.toLowerCase());
}

function patronPredecible(texto) {
  // Palabra con mayúscula inicial + números o símbolos al final (Verano2026!),
  // o un año en cualquier posición.
  return /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+[0-9!@#$%&*.?]+$/.test(texto) || /(19|20)\d{2}/.test(texto);
}

function tiposDeCaracteres(texto) {
  return [/[a-zñáéíóú]/, /[A-ZÑÁÉÍÓÚ]/, /\d/, /[^\p{L}\d]/u].filter((r) => r.test(texto)).length;
}

export function evaluar(contrasena, config) {
  const largo = [...contrasena].length;
  const minimo = config.longitudMinima;
  const crudo = sinAcentos(contrasena);
  const normal = normalizar(contrasena);
  const comun = config.palabrasComunes.find((p) => p.length >= 4 && (crudo.includes(p) || normal.includes(p)));
  const comprobaciones = [
    { ok: largo >= minimo, texto: `Longitud: ${largo} de al menos ${minimo} caracteres. Es lo que más cuenta.` },
    { ok: !comun, texto: comun ? `Contiene una palabra o contraseña muy común («${comun}»), aunque cambies letras por números.` : "No contiene palabras ni contraseñas muy comunes." },
    { ok: !tieneSecuencia(contrasena), texto: "Sin secuencias como abc, 123 o qwerty." },
    { ok: !tieneRepeticion(contrasena), texto: "Sin caracteres o grupos repetidos (aaa, 1212)." },
    { ok: !patronPredecible(contrasena), texto: "Sin patrones previsibles como un año o «Palabra2024!»." },
    { ok: tiposDeCaracteres(contrasena) >= 2 || largo >= 20, texto: "Mezcla al menos dos tipos de caracteres (o, si es una frase, que sea muy larga)." },
  ];

  let nivel = largo >= minimo ? 3 : largo >= 12 ? 2 : largo >= 8 ? 1 : 0;
  const fallos = comprobaciones.slice(1).filter((c) => !c.ok).length;
  nivel = Math.max(0, nivel - fallos);
  if (comun) nivel = Math.min(nivel, 1);
  if (largo === 0) nivel = 0;
  return { nivel, comprobaciones, fuerte: nivel === 3 };
}

export function iniciar(contenedor, config, { alTerminar }) {
  let terminado = false;
  const medidor = h("div", { class: "medidor", "data-nivel": "0" },
    h("div", { class: "medidor-barra", "aria-hidden": "true" }, h("span"), h("span"), h("span"), h("span")),
    h("p", { class: "medidor-texto", "aria-live": "polite" }, "Escribe una contraseña inventada"));
  const lista = h("ul", { class: "comprobaciones" });
  const zonaFinal = h("div", { "aria-live": "polite" });
  const entrada = h("input", {
    id: "clave-prueba", type: "text", autocomplete: "off", autocapitalize: "none",
    spellcheck: "false", "aria-describedby": "aviso-clave",
  });

  function actualizar() {
    const valor = entrada.value;
    const { nivel, comprobaciones, fuerte } = evaluar(valor, config);
    medidor.dataset.nivel = String(valor ? nivel : 0);
    medidor.querySelector(".medidor-texto").textContent = valor ? NIVELES[nivel] : "Escribe una contraseña inventada";
    vaciar(lista).append(...(valor ? comprobaciones.map((c) => h("li", { class: c.ok ? "cumple" : "falla" }, c.texto)) : []));
    if (fuerte && !terminado) {
      vaciar(zonaFinal).append(
        h("div", { class: "aviso aviso-seguro" },
          h("strong", {}, "¡Contraseña fuerte!"),
          h("p", {}, "Recuerda: no la uses, solo era un ejemplo. Para tus cuentas reales, crea frases largas distintas para cada servicio y guárdalas en un gestor de contraseñas.")),
        h("button", {
          type: "button", class: "boton",
          onclick: async (e) => {
            const boton = e.currentTarget;
            boton.disabled = true;
            terminado = true;
            entrada.value = "";
            entrada.disabled = true;
            vaciar(lista);
            try {
              await alTerminar(100);
              vaciar(zonaFinal);
            } catch (error) {
              terminado = false;
              entrada.disabled = false;
              boton.disabled = false;
              zonaFinal.append(h("div", { class: "aviso aviso-peligro", role: "alert" }, error.message));
            }
          },
        }, "Terminar la actividad"));
    } else if (!fuerte && !terminado) {
      vaciar(zonaFinal);
    }
  }
  entrada.addEventListener("input", actualizar);

  vaciar(contenedor).append(
    h("div", { class: "aviso aviso-peligro", id: "aviso-clave" },
      h("strong", {}, "No escribas ninguna contraseña real"),
      h("p", {}, "Inventa una para esta prueba. Lo que escribas se analiza solo en tu navegador: no se guarda ni se envía.")),
    h("p", { class: "lectura" }, config.instrucciones),
    h("div", { class: "campo campo-clave" },
      h("label", { for: "clave-prueba" }, "Contraseña de prueba"),
      entrada),
    medidor, lista, zonaFinal);
}

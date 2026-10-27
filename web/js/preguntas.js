// Preguntas iniciales y finales (RF03, RF09), comparación (RF10),
// resumen y valoración del módulo (RF11).

import { h, vaciar, barajar } from "./dom.js";

// Orden de las opciones: en las finales se barajan y se garantiza que no
// coincida con el orden inicial.
export function ordenOpciones(pregunta, final) {
  if (!final) return pregunta.opciones;
  let orden = barajar(pregunta.opciones);
  if (orden.every((o, i) => o.id === pregunta.opciones[i].id)) {
    orden = [...orden.slice(1), orden[0]];
  }
  return orden;
}

export function contarAciertos(preguntas, respuestas) {
  return preguntas.reduce((total, p, i) => total + (respuestas[i] === p.correcta ? 1 : 0), 0);
}

function textoOpcion(pregunta, id) {
  return pregunta.opciones.find((o) => o.id === id)?.texto ?? "Sin respuesta";
}

// Muestra las preguntas de una en una. Las respuestas se entregan juntas
// al responder la última (si el usuario sale antes, no se guarda nada).
export function ejecutarCuestionario(contenedor, preguntas, { final, alTerminar }) {
  const ordenes = preguntas.map((p) => ordenOpciones(p, final));
  const respuestas = new Array(preguntas.length).fill(null);
  let indice = 0;

  function pintar() {
    const pregunta = preguntas[indice];
    const nombre = `pregunta-${pregunta.id}`;
    const ultima = indice === preguntas.length - 1;

    const botonSiguiente = h("button", {
      type: "submit", class: "boton", disabled: respuestas[indice] === null,
    }, ultima ? "Guardar respuestas" : "Siguiente pregunta");

    const formulario = h("form", { class: "aparece", novalidate: true },
      h("p", { class: "contador" }, `Pregunta ${indice + 1} de ${preguntas.length}`),
      h("fieldset", { class: "pregunta" },
        h("legend", {}, pregunta.enunciado),
        ordenes[indice].map((opcion) => h("label", { class: "opcion" },
          h("input", {
            type: "radio", name: nombre, value: opcion.id,
            checked: respuestas[indice] === opcion.id,
            onchange: () => { respuestas[indice] = opcion.id; botonSiguiente.disabled = false; },
          }),
          h("span", {}, opcion.texto)))),
      h("div", { class: "acciones" },
        indice > 0 ? h("button", {
          type: "button", class: "boton boton-secundario",
          onclick: () => { indice--; pintar(); },
        }, "Pregunta anterior") : null,
        botonSiguiente));

    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      if (respuestas[indice] === null) return;
      if (!ultima) { indice++; pintar(); return; }
      botonSiguiente.disabled = true;
      botonSiguiente.textContent = "Guardando…";
      try {
        await alTerminar([...respuestas], contarAciertos(preguntas, respuestas));
      } catch (error) {
        botonSiguiente.disabled = false;
        botonSiguiente.textContent = "Guardar respuestas";
        contenedor.prepend(h("div", { class: "aviso aviso-peligro", role: "alert" }, error.message));
      }
    });

    vaciar(contenedor).append(formulario);
    formulario.querySelector("input")?.focus();
  }

  pintar();
}

// Vista de solo lectura de las respuestas iniciales (sin mostrar la correcta).
export function respuestasGuardadas(preguntas, respuestas) {
  return h("ol", { class: "ideas" },
    preguntas.map((p, i) => h("li", {},
      h("strong", {}, p.enunciado), h("br"),
      "Tu respuesta: ", textoOpcion(p, respuestas?.[i]))));
}

// Tabla con respuesta inicial, final y correcta. Si la final es incorrecta,
// se añade la explicación del concepto (RF10).
export function comparacion(preguntas, iniciales, finales) {
  const filas = [];
  preguntas.forEach((p, i) => {
    const inicialOk = iniciales?.[i] === p.correcta;
    const finalOk = finales?.[i] === p.correcta;
    filas.push(h("tr", {},
      h("th", { scope: "row" }, p.enunciado),
      h("td", {}, h("span", { class: inicialOk ? "ok" : "mal" }, inicialOk ? "Correcta: " : "Incorrecta: "), textoOpcion(p, iniciales?.[i])),
      h("td", {}, h("span", { class: finalOk ? "ok" : "mal" }, finalOk ? "Correcta: " : "Incorrecta: "), textoOpcion(p, finales?.[i])),
      h("td", {}, textoOpcion(p, p.correcta))));
    if (!finalOk) {
      filas.push(h("tr", {}, h("td", { colspan: 4, class: "explicacion" },
        h("strong", {}, "Por qué: "), p.explicacion)));
    }
  });
  return h("div", { class: "tabla-envoltura" },
    h("table", {},
      h("thead", {}, h("tr", {},
        h("th", { scope: "col" }, "Pregunta"),
        h("th", { scope: "col" }, "Al empezar"),
        h("th", { scope: "col" }, "Al terminar"),
        h("th", { scope: "col" }, "Respuesta correcta"))),
      h("tbody", {}, filas)));
}

export function resumen(ideas) {
  return h("section", {},
    h("h3", {}, "Lo que conviene recordar"),
    h("ul", { class: "ideas" }, ideas.map((idea) => h("li", {}, idea))));
}

function escala(nombre, pregunta, minimo, maximo, actual) {
  return h("fieldset", { class: "escala" },
    h("legend", {}, pregunta),
    h("div", { class: "escala-opciones" },
      [1, 2, 3, 4, 5].map((n) => h("label", {},
        h("input", { type: "radio", name: nombre, value: n, required: true, checked: actual === n }),
        String(n)))),
    h("p", { class: "escala-extremos" }, `1 = ${minimo}, 5 = ${maximo}`));
}

// Formulario de valoración (dos preguntas de 1 a 5).
export function formularioValoracion(registro, alGuardar) {
  if (registro.valoracion_general && registro.valoracion_claridad) {
    return h("section", {},
      h("h3", {}, "Tu valoración"),
      h("p", {}, `Valoración general: ${registro.valoracion_general} de 5. Claridad de las explicaciones: ${registro.valoracion_claridad} de 5.`));
  }
  const mensaje = h("div", { "aria-live": "polite" });
  const boton = h("button", { type: "submit", class: "boton" }, "Enviar valoración");
  const formulario = h("form", { novalidate: true },
    h("h3", {}, "Valora este módulo"),
    h("p", { class: "nota" }, "Tu valoración nos ayuda a mejorar los contenidos. Solo se usa de forma agregada."),
    escala("valoracion_general", "¿Qué te ha parecido el módulo en general?", "muy mal", "muy bien", registro.valoracion_general),
    escala("valoracion_claridad", "¿Las explicaciones han sido claras?", "nada claras", "muy claras", registro.valoracion_claridad),
    mensaje,
    boton);
  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const general = Number(formulario.elements.valoracion_general.value);
    const claridad = Number(formulario.elements.valoracion_claridad.value);
    if (!general || !claridad) {
      vaciar(mensaje).append(h("p", { class: "aviso aviso-senal" }, "Responde a las dos preguntas antes de enviar."));
      return;
    }
    boton.disabled = true;
    try {
      await alGuardar({ valoracion_general: general, valoracion_claridad: claridad });
    } catch (error) {
      boton.disabled = false;
      vaciar(mensaje).append(h("p", { class: "aviso aviso-peligro", role: "alert" }, error.message));
    }
  });
  return formulario;
}

// Actividad del módulo de ingeniería social: conversación simulada con un falso jefe.
// Cada paso tiene varias respuestas; solo una es segura. Todas las ramas tienen el mismo
// número de decisiones. Puntuación = decisiones seguras / total de decisiones.

import { h, vaciar } from "../dom.js";

export function iniciar(contenedor, config, { alTerminar }) {
  const pasos = config.pasos;
  let paso = 0;
  let seguras = 0;

  const mensajes = h("div", { class: "chat-mensajes", "aria-live": "polite" });
  const opciones = h("div", { class: "chat-opciones" });
  const resultado = h("div");

  function burbuja(tipo, texto, adjunto) {
    const b = h("div", { class: `burbuja ${tipo} aparece` }, texto,
      adjunto ? h("span", { class: "adjunto" }, adjunto) : null);
    mensajes.append(b);
    return b;
  }

  function mostrarPaso() {
    const p = pasos[paso];
    for (const m of p.mensajes) burbuja("atacante", m.texto, m.adjunto);
    vaciar(opciones).append(
      h("p", { class: "nota" }, `Decisión ${paso + 1} de ${pasos.length}. ¿Qué haces?`),
      p.opciones.map((o) => h("button", { type: "button", class: "boton boton-secundario", onclick: () => elegir(o) }, o.texto)));
    opciones.querySelector("button")?.focus();
  }

  function elegir(opcion) {
    vaciar(opciones);
    burbuja("usuario", opcion.texto);
    if (opcion.segura) seguras++;

    if (opcion.consecuencia === "infeccion") {
      mensajes.append(h("div", { class: "infeccion aparece", role: "alert" },
        h("strong", {}, "Simulación: tu equipo ha sido infectado"),
        h("p", {}, "Al abrir el archivo se ha ejecutado un programa malicioso. En un caso real, podría cifrar tus archivos o robar tus contraseñas.")));
    }

    const explicacion = h("div", { class: `aviso ${opcion.segura ? "aviso-seguro" : "aviso-peligro"} aparece` },
      h("strong", {}, opcion.segura ? "Decisión segura" : "Decisión insegura"),
      h("p", {}, opcion.explicacion));
    const continuar = h("button", { type: "button", class: "boton" },
      paso < pasos.length - 1 ? "Seguir la conversación" : "Ver el resultado");

    continuar.addEventListener("click", async () => {
      vaciar(opciones);
      if (opcion.respuesta) burbuja("atacante", opcion.respuesta);
      paso++;
      if (paso < pasos.length) { mostrarPaso(); return; }

      burbuja("sistema", config.cierre);
      const puntuacion = Math.round((seguras / pasos.length) * 100);
      vaciar(resultado).append(
        h("h3", {}, "Resultado"),
        h("p", {}, `Has tomado ${seguras} ${seguras === 1 ? "decisión segura" : "decisiones seguras"} de ${pasos.length}.`),
        h("p", {}, "Técnicas que ha usado el atacante:"),
        h("ul", { class: "ideas" }, config.tecnicas.map((t) => h("li", {}, t))));
      try {
        await alTerminar(puntuacion);
      } catch (error) {
        resultado.append(h("div", { class: "aviso aviso-peligro", role: "alert" }, error.message));
      }
    });

    vaciar(opciones).append(explicacion, h("div", { class: "acciones" }, continuar));
    continuar.focus();
  }

  vaciar(contenedor).append(
    h("p", { class: "lectura" }, config.instrucciones),
    h("div", { class: "chat" },
      h("div", { class: "chat-cabecera" },
        h("strong", {}, config.contacto.nombre),
        h("span", {}, config.contacto.detalle)),
      mensajes, opciones),
    resultado);
  mostrarPaso();
}

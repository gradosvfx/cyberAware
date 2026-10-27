// Actividad del módulo de webs falsas y HTTP/HTTPS: historia interactiva.
// Si se elige una opción insegura, se ve la consecuencia y hay que «rebobinar»
// para elegir otra; solo la opción segura hace avanzar la historia.
// Puntuación = escenas en las que la primera decisión fue la segura / total de escenas.

import { h, vaciar } from "../dom.js";

function navegador(barra, pagina) {
  // Un certificado no válido se muestra como en los navegadores reales: «No seguro» y https tachado.
  const seguro = barra.protocolo === "https" && !barra.certificadoInvalido;
  return h("div", { class: "navegador", "aria-label": "Navegador simulado" },
    h("div", { class: "navegador-barra" },
      h("div", { class: "navegador-direccion" },
        h("span", { class: `navegador-indicador ${seguro ? "" : "inseguro"}` },
          h("img", { src: seguro ? "media/img/candado-cerrado.svg" : "media/img/aviso.svg", alt: "" }),
          seguro ? "Conexión cifrada" : "No seguro"),
        h("span", { class: "url" },
          barra.certificadoInvalido ? h("s", { class: "protocolo-roto" }, "https") : barra.protocolo,
          `://${barra.dominio}${barra.ruta || ""}`))),
    h("div", { class: `navegador-pagina ${pagina.alerta ? "alerta" : ""}` },
      h("h3", {}, pagina.titulo),
      pagina.texto.map((t) => h("p", {}, t))));
}

export function iniciar(contenedor, config, { alTerminar }) {
  const escenas = config.escenas;
  let indice = 0;
  let aciertosPrimerIntento = 0;
  const zona = h("div");

  function pintarIntroduccion() {
    vaciar(zona).append(
      h("section", { class: "lectura aparece" },
        h("h3", {}, config.introduccion.titulo),
        config.introduccion.parrafos.map((p) => h("p", {}, p)),
        h("div", { class: "acciones" },
          h("button", { type: "button", class: "boton", onclick: () => pintarEscena(true) }, "Empezar la historia"))));
  }

  function pintarEscena(primerIntento) {
    const e = escenas[indice];
    const decision = h("div", { "aria-live": "polite" });
    const video = e.video ? h("video", { class: "escena-video", controls: true, preload: "metadata", src: e.video }) : null;
    if (video) video.addEventListener("error", () => video.remove());

    vaciar(zona).append(
      h("p", { class: "contador" }, `Escena ${indice + 1} de ${escenas.length}`),
      h("h3", { tabindex: "-1" }, e.titulo),
      video,
      h("p", { class: "lectura" }, e.situacion),
      navegador(e.barra, e.pagina),
      h("fieldset", { class: "pregunta" },
        h("legend", {}, e.pregunta),
        e.opciones.map((o) => h("button", {
          type: "button", class: "boton boton-secundario opcion-escena",
          onclick: (ev) => elegir(o, primerIntento, decision, ev.currentTarget),
        }, o.texto))),
      decision);
    zona.querySelector("h3")?.focus();
  }

  function elegir(opcion, primerIntento, decision, boton) {
    for (const b of zona.querySelectorAll(".opcion-escena")) b.disabled = true;
    boton.classList.add("elegida");
    if (opcion.segura && primerIntento) aciertosPrimerIntento++;

    if (!opcion.segura) {
      vaciar(decision).append(
        h("div", { class: "aviso aviso-peligro aparece", role: "alert" },
          h("strong", {}, "Consecuencia"),
          h("p", {}, opcion.consecuencia),
          h("p", {}, opcion.explicacion)),
        h("div", { class: "acciones" },
          h("button", { type: "button", class: "boton", onclick: () => pintarEscena(false) }, "Rebobinar y elegir otra opción")),
        primerIntento ? h("p", { class: "nota" }, "Esta escena ya no puntúa: solo cuenta la primera decisión.") : null);
      return;
    }

    const ultima = indice === escenas.length - 1;
    const siguiente = h("button", { type: "button", class: "boton" }, ultima ? "Ver el resultado" : "Siguiente escena");
    siguiente.addEventListener("click", async () => {
      if (!ultima) { indice++; pintarEscena(true); return; }
      const puntuacion = Math.round((aciertosPrimerIntento / escenas.length) * 100);
      vaciar(zona).append(
        h("h3", {}, "Fin de la historia"),
        h("p", {}, `Has elegido la opción segura a la primera en ${aciertosPrimerIntento} de ${escenas.length} escenas.`),
        h("ul", { class: "ideas" }, config.conclusiones.map((t) => h("li", {}, t))));
      try {
        await alTerminar(puntuacion);
      } catch (error) {
        zona.append(h("div", { class: "aviso aviso-peligro", role: "alert" }, error.message));
      }
    });
    vaciar(decision).append(
      h("div", { class: "aviso aviso-seguro aparece" },
        h("strong", {}, "Buena decisión"),
        h("p", {}, opcion.explicacion)),
      h("div", { class: "acciones" }, siguiente));
    siguiente.focus();
  }

  vaciar(contenedor).append(h("p", { class: "lectura" }, config.instrucciones), zona);
  pintarIntroduccion();
}

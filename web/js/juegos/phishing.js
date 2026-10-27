// Actividad del módulo de phishing: correo simulado.
// El usuario marca las partes sospechosas; cada marca muestra una nota.
// Puntuación = (señales encontradas - partes no sospechosas marcadas) / total de señales.

import { h, vaciar } from "../dom.js";

export function puntuar(encontradas, errores, total) {
  return Math.max(0, Math.round(((encontradas - errores) / total) * 100));
}

export function iniciar(contenedor, config, { alTerminar }) {
  const zonas = config.zonas;
  const totalSenales = Object.values(zonas).filter((z) => z.sospechosa).length;
  const marcadas = new Set();
  const botones = new Map();
  let terminado = false;

  const nota = h("div", { class: "aviso", "aria-live": "polite" },
    h("strong", {}, "Notas"),
    h("p", {}, "Pulsa sobre cualquier parte del correo que te parezca sospechosa."));
  const marcador = h("p", { class: "marcador", "aria-live": "polite" });
  const barraEstado = h("div", { class: "correo-estado", "aria-live": "polite" });
  const resultado = h("div");

  function contar() {
    let encontradas = 0;
    let errores = 0;
    for (const id of marcadas) (zonas[id].sospechosa ? encontradas++ : errores++);
    return { encontradas, errores };
  }

  function actualizarMarcador() {
    const { encontradas, errores } = contar();
    vaciar(marcador).append(
      `Señales marcadas: ${encontradas}.`, h("br"),
      `Partes marcadas que no eran sospechosas: ${errores}.`);
  }

  function mostrarNota(id) {
    const z = zonas[id];
    nota.className = `aviso ${z.sospechosa ? "aviso-seguro" : "aviso-senal"} aparece`;
    vaciar(nota).append(
      h("strong", {}, z.sospechosa ? `Bien visto: ${z.titulo}` : `Esto no es una señal: ${z.titulo}`),
      h("p", {}, z.explicacion));
  }

  function marcar(id) {
    if (terminado) { mostrarNota(id); return; }
    if (!marcadas.has(id)) {
      marcadas.add(id);
      for (const b of botones.get(id)) {
        b.classList.add(zonas[id].sospechosa ? "marcada-ok" : "marcada-error");
        b.setAttribute("aria-pressed", "true");
      }
      actualizarMarcador();
    }
    mostrarNota(id);
  }

  function zona(id, contenido, clase = "zona") {
    if (!zonas[id]) throw new Error(`Zona sin definir: ${id}`);
    const boton = h("button", { type: "button", class: clase, "aria-pressed": "false", onclick: () => marcar(id) }, contenido);
    if (!botones.has(id)) botones.set(id, []);
    botones.get(id).push(boton);
    return boton;
  }

  function segmento(s) {
    if (s.boton) {
      const b = zona(s.boton.zona, s.boton.texto, "zona zona-enlace");
      const mostrar = () => { barraEstado.textContent = s.boton.destino; };
      const ocultar = () => { barraEstado.textContent = ""; };
      b.addEventListener("mouseenter", mostrar);
      b.addEventListener("focus", mostrar);
      b.addEventListener("mouseleave", ocultar);
      b.addEventListener("blur", ocultar);
      return b;
    }
    return s.zona ? zona(s.zona, s.texto) : s.texto;
  }

  const c = config.correo;
  const correo = h("article", { class: "correo", "aria-label": "Correo simulado" },
    h("div", { class: "correo-cabecera" },
      h("div", {}, "De: ", c.de.map(segmento)),
      h("div", {}, "Para: ", h("span", { class: "mono" }, c.para)),
      h("div", {}, "Fecha: ", c.fecha.map(segmento)),
      h("p", { class: "correo-asunto" }, c.asunto.map(segmento))),
    h("div", { class: "correo-cuerpo" },
      c.cuerpo.map((parrafo) => h("p", {}, parrafo.map(segmento)))),
    barraEstado);

  const botonTerminar = h("button", {
    type: "button", class: "boton",
    onclick: async () => {
      terminado = true;
      botonTerminar.disabled = true;
      const { encontradas, errores } = contar();
      const puntuacion = puntuar(encontradas, errores, totalSenales);
      const noEncontradas = Object.entries(zonas).filter(([id, z]) => z.sospechosa && !marcadas.has(id));
      for (const [id] of noEncontradas) for (const b of botones.get(id)) b.classList.add("no-encontrada");

      vaciar(resultado).append(
        h("h3", {}, "Resultado"),
        h("p", {}, `Has encontrado ${encontradas} de ${totalSenales} señales y has marcado ${errores} ${errores === 1 ? "parte que no era sospechosa" : "partes que no eran sospechosas"}.`),
        noEncontradas.length
          ? h("div", {},
            h("p", {}, "Señales que se te han escapado (resaltadas en amarillo en el correo):"),
            h("ul", { class: "ideas" }, noEncontradas.map(([, z]) => h("li", {}, h("strong", {}, `${z.titulo}. `), z.explicacion))))
          : h("p", {}, "¡Las has encontrado todas!"),
        h("p", { class: "nota" }, "Puedes seguir pulsando las partes del correo para leer las notas."));
      try {
        await alTerminar(puntuacion);
      } catch (error) {
        resultado.append(h("div", { class: "aviso aviso-peligro", role: "alert" }, error.message));
        botonTerminar.disabled = false;
        terminado = false;
      }
    },
  }, "He terminado");

  actualizarMarcador();
  vaciar(contenedor).append(
    h("p", { class: "lectura" }, config.instrucciones),
    h("div", { class: "correo-zona" },
      correo,
      h("aside", { class: "nota-lateral" }, nota, marcador, h("div", { class: "acciones" }, botonTerminar))),
    resultado);
}

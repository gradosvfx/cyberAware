// Navegación de CyberAware: inicio de sesión, página principal (RF01, RF12)
// y página de cada módulo con sus cinco partes (RF02-RF11, RF15).

import { h, vaciar, cargarJSON, tira, aviso } from "./dom.js";
import {
  PARTES, NOMBRES_PARTES, NOMBRES_ESTADOS, sesion, cerrarSesion, iniciarSesion,
  obtenerProgresos, crearProgreso, actualizarProgreso, estadoParte, porcentaje,
  estadoModulo, parteDisponible, primeraParteSinCompletar, faltaValoracion,
} from "./api.js";
import {
  ejecutarCuestionario, respuestasGuardadas, comparacion, resumen, formularioValoracion,
} from "./preguntas.js";

const JUEGOS = ["contrasenas", "phishing", "ingenieria", "https"];
const contenido = document.getElementById("contenido");

function prepararCabecera() {
  const s = sesion();
  const zona = document.getElementById("cabecera-sesion");
  if (!zona) return;
  if (!s) { zona.hidden = true; return; }
  document.getElementById("nombre-usuario").textContent = s.usuario;
  zona.hidden = false;
}

document.getElementById("cerrar-sesion")?.addEventListener("click", () => {
  cerrarSesion();
  location.href = "index.html";
});

function mostrarError(error) {
  vaciar(contenido).append(
    aviso("peligro", "No se ha podido cargar la página", error.message),
    h("button", { type: "button", class: "boton", onclick: () => location.reload() }, "Volver a intentarlo"));
}

function textoEstadoModulo(estado) {
  return { pendiente: "Pendiente", en_progreso: "En progreso", completado: "Completado" }[estado];
}

function estadosPartes(registro) {
  return PARTES.map((p) => estadoParte(registro, p));
}

// =====================================================================
// index.html: inicio de sesión (RF12)
// =====================================================================

function pintarAcceso() {
  const caducada = new URLSearchParams(location.search).get("caducada");
  const mensaje = h("div", { "aria-live": "polite" });
  const boton = h("button", { type: "submit", class: "boton" }, "Entrar");

  const formulario = h("form", { class: "tarjeta", novalidate: true },
    h("h2", {}, "Accede con tu cuenta"),
    caducada ? aviso("senal", null, "Tu sesión ha caducado. Vuelve a entrar para continuar.") : null,
    h("div", { class: "campo" },
      h("label", { for: "usuario" }, "Nombre de usuario"),
      h("input", {
        id: "usuario", name: "usuario", type: "text", autocomplete: "username",
        autocapitalize: "none", spellcheck: "false", required: true,
      })),
    h("div", { class: "campo" },
      h("label", { for: "contrasena" }, "Contraseña"),
      h("input", {
        id: "contrasena", name: "contrasena", type: "password",
        autocomplete: "current-password", required: true,
      })),
    mensaje,
    boton,
    h("p", { class: "nota" },
      "La cuenta te la entrega la persona de contacto de tu empresa. Si has olvidado la contraseña, pídele una nueva indicando tu nombre de usuario."));

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const usuario = formulario.elements.usuario.value.trim().toLowerCase();
    const contrasena = formulario.elements.contrasena.value;
    if (!usuario || !contrasena) {
      vaciar(mensaje).append(aviso("senal", null, "Escribe tu nombre de usuario y tu contraseña."));
      return;
    }
    boton.disabled = true;
    boton.textContent = "Entrando…";
    try {
      await iniciarSesion(usuario, contrasena);
      location.replace("dashboard.html");
    } catch (error) {
      vaciar(mensaje).append(aviso("peligro", null, error.message));
      boton.disabled = false;
      boton.textContent = "Entrar";
      formulario.elements.contrasena.value = "";
    }
  });

  vaciar(contenido).append(h("div", { class: "acceso" },
    h("section", { class: "acceso-intro" },
      h("h1", {}, "Aprende a reconocer los engaños antes de caer en ellos"),
      h("p", {}, "Cuatro módulos cortos, con vídeo, un caso real y una actividad práctica en cada uno. Puedes hacerlos en el orden que quieras y continuar otro día donde lo dejaste."),
      h("ul", { class: "acceso-temas" },
        h("li", {}, "Contraseñas"),
        h("li", {}, "Phishing"),
        h("li", {}, "Ingeniería social"),
        h("li", {}, "Webs falsas y HTTP/HTTPS"))),
    formulario));
  formulario.elements.usuario.focus();
}

// Elige el módulo y la parte para «Continuar donde lo dejé»:
// 1) el módulo sin terminar con la actividad más reciente;
// 2) si no hay ninguno empezado, el primer módulo pendiente;
// 3) si todos están completados, no hay destino.
function destinoContinuar(modulos, progresos) {
  const sinTerminar = progresos
    .filter((r) => estadoModulo(r) !== "completado")
    .sort((a, b) => (a.updated < b.updated ? 1 : -1));
  if (sinTerminar.length) {
    const r = sinTerminar[0];
    return { modulo: r.modulo, parte: primeraParteSinCompletar(r) };
  }
  const pendiente = modulos.find((m) => !progresos.some((r) => r.modulo === m.id));
  return pendiente ? { modulo: pendiente.id, parte: "iniciales" } : null;
}

// =====================================================================
// dashboard.html: página principal con los módulos (RF01)
// =====================================================================

async function pintarInicio() {
  const [{ modulos }, progresos] = await Promise.all([
    cargarJSON("data/modulos.json"),
    obtenerProgresos(),
  ]);
  const registroDe = (id) => progresos.find((r) => r.modulo === id) || null;
  const completados = modulos.filter((m) => estadoModulo(registroDe(m.id)) === "completado").length;
  const global = Math.round(modulos.reduce((suma, m) => suma + porcentaje(registroDe(m.id)), 0) / modulos.length);
  const destino = destinoContinuar(modulos, progresos);
  const pendientesDeValorar = modulos.filter((m) => faltaValoracion(registroDe(m.id)));

  const continuar = destino
    ? h("a", { class: "boton", href: `modulo.html?m=${encodeURIComponent(destino.modulo)}#${destino.parte}` },
      progresos.length ? "Continuar donde lo dejé" : "Empezar el primer módulo")
    : null;

  vaciar(contenido).append(
    h("section", { class: "saludo" },
      h("div", {},
        h("h1", {}, "Tu formación"),
        h("p", {}, "Cada módulo tiene cinco partes que se hacen en orden. Tu avance se guarda automáticamente.")),
      h("div", { class: "global" },
        h("p", { class: "global-cifra" }, h("strong", {}, `${global} %`), " del total"),
        h("p", { class: "nota" }, `${completados} de ${modulos.length} módulos completados`),
        h("div", { class: "acciones" }, continuar))),
    !destino ? aviso("seguro", "Has completado los cuatro módulos",
      "Puedes volver a cualquiera para repasar los contenidos.") : null,
    pendientesDeValorar.length ? aviso("senal", "Te falta valorar algún módulo",
      `Entra en ${pendientesDeValorar.map((m) => m.titulo).join(", ")} para responder las dos preguntas de valoración.`) : null,
    h("ul", { class: "modulos" },
      modulos.map((m) => {
        const r = registroDe(m.id);
        const estado = estadoModulo(r);
        return h("li", { class: "modulo-fila" },
          h("div", {},
            h("h2", {}, m.titulo),
            h("p", {}, m.resumen)),
          h("div", {},
            h("div", { class: "modulo-estado" },
              h("span", { class: `etiqueta-estado ${estado}` }, textoEstadoModulo(estado)),
              h("span", {}, `${porcentaje(r)} %`)),
            tira(estadosPartes(r))),
          h("a", {
            class: estado === "completado" ? "boton boton-secundario" : "boton",
            href: `modulo.html?m=${encodeURIComponent(m.id)}`,
            "aria-label": `${estado === "completado" ? "Repasar" : "Abrir"} el módulo ${m.titulo}`,
          }, estado === "completado" ? "Repasar" : "Abrir"));
      })));
  contenido.focus();
}

async function paginaAcceso() {
  // Con sesión abierta no tiene sentido volver a entrar: se va directamente al dashboard.
  if (sesion()) { location.replace("dashboard.html"); return; }
  pintarAcceso();
}

async function paginaDashboard() {
  if (!sesion()) { location.replace("index.html"); return; }
  prepararCabecera();
  await pintarInicio();
}

// =====================================================================
// Página de módulo
// =====================================================================

const estado = { modulo: null, datos: null, registro: null, parte: null };
let listaPartes;
let cabeceraModulo;
let panel;

function refrescarEstructura() {
  const r = estado.registro;
  vaciar(cabeceraModulo).append(
    h("h1", {}, estado.modulo.titulo),
    h("p", {}, estado.datos.descripcion),
    tira(estadosPartes(r), true),
    h("p", { class: "nota" }, `${porcentaje(r)} % completado`));

  vaciar(listaPartes).append(...PARTES.map((p) => {
    const disponible = parteDisponible(r, p);
    const e = estadoParte(r, p);
    return h("li", {},
      h("button", {
        type: "button",
        class: `parte-boton ${e}`,
        disabled: !disponible,
        "aria-current": estado.parte === p ? "step" : null,
        onclick: () => abrirParte(p),
      },
      h("span", { class: "parte-nombre" }, NOMBRES_PARTES[p]),
      h("span", { class: "parte-estado" }, disponible ? NOMBRES_ESTADOS[e] : "Bloqueada: completa la parte anterior")));
  }));
}

async function marcarEnProgreso(parte) {
  if (estadoParte(estado.registro, parte) !== "pendiente") return;
  const cambios = { [`estado_${parte}`]: "en_progreso" };
  if (!estado.registro) {
    try {
      estado.registro = await crearProgreso(estado.modulo.id, cambios);
    } catch (error) {
      // Puede existir ya (por ejemplo, abierto en otra pestaña): se recupera.
      estado.registro = (await obtenerProgresos()).find((r) => r.modulo === estado.modulo.id) || null;
      if (!estado.registro) throw error;
      if (estadoParte(estado.registro, parte) === "pendiente") {
        estado.registro = await actualizarProgreso(estado.registro.id, cambios);
      }
    }
  } else {
    estado.registro = await actualizarProgreso(estado.registro.id, cambios);
  }
  refrescarEstructura();
}

// Marca una parte como completada. Si ya lo estaba (repaso), no cambia nada.
async function completarParte(parte, extra = {}) {
  if (estadoParte(estado.registro, parte) === "completada") return;
  const simulado = { ...estado.registro, [`estado_${parte}`]: "completada" };
  estado.registro = await actualizarProgreso(estado.registro.id, {
    ...extra,
    [`estado_${parte}`]: "completada",
    porcentaje: porcentaje(simulado),
  });
  refrescarEstructura();
}

function botonSiguiente(parte) {
  const i = PARTES.indexOf(parte);
  if (i === PARTES.length - 1) {
    return h("a", { class: "boton", href: "dashboard.html" }, "Volver a los módulos");
  }
  const siguiente = PARTES[i + 1];
  return h("button", { type: "button", class: "boton", onclick: () => abrirParte(siguiente) },
    `Continuar con: ${NOMBRES_PARTES[siguiente]}`);
}

function cabeceraPanel(parte, subtitulo) {
  const titulo = h("h2", { tabindex: "-1" }, NOMBRES_PARTES[parte]);
  return [titulo, subtitulo ? h("p", { class: "panel-sub" }, subtitulo) : null];
}

async function abrirParte(parte, { enfocar = true } = {}) {
  if (!PARTES.includes(parte) || !parteDisponible(estado.registro, parte)) return;
  estado.parte = parte;
  history.replaceState(null, "", `#${parte}`);
  refrescarEstructura();
  vaciar(panel).append(h("p", { class: "cargando" }, "Cargando…"));
  try {
    if (parte === "iniciales") await parteIniciales();
    else if (parte === "teoria") await parteTeoria();
    else if (parte === "caso") await parteCaso();
    else if (parte === "actividad") await parteActividad();
    else await parteFinales();
  } catch (error) {
    vaciar(panel).append(aviso("peligro", "No se ha podido abrir esta parte", error.message),
      h("button", { type: "button", class: "boton", onclick: () => abrirParte(parte) }, "Volver a intentarlo"));
  }
  if (enfocar) panel.querySelector("h2")?.focus();
}

async function parteIniciales() {
  const { preguntas } = estado.datos;
  if (estadoParte(estado.registro, "iniciales") === "completada") {
    vaciar(panel).append(
      ...cabeceraPanel("iniciales", "Ya has respondido estas preguntas. Al terminar el módulo verás cuáles eran las respuestas correctas."),
      respuestasGuardadas(preguntas, estado.registro.respuestas_iniciales),
      h("div", { class: "acciones" }, botonSiguiente("iniciales")));
    return;
  }
  await marcarEnProgreso("iniciales");
  const zona = h("div");
  vaciar(panel).append(
    ...cabeceraPanel("iniciales", "Responde según lo que sepas ahora. No se muestra la solución: la verás al final del módulo."),
    zona);
  ejecutarCuestionario(zona, preguntas, {
    final: false,
    alTerminar: async (respuestas, aciertos) => {
      await completarParte("iniciales", { respuestas_iniciales: respuestas, aciertos_iniciales: aciertos });
      vaciar(zona).append(
        aviso("seguro", "Respuestas guardadas", "Al final del módulo compararemos estas respuestas con las finales."),
        h("div", { class: "acciones" }, botonSiguiente("iniciales")));
    },
  });
}

async function parteTeoria() {
  const { teoria } = estado.datos;
  const yaCompletada = estadoParte(estado.registro, "teoria") === "completada";
  if (!yaCompletada) await marcarEnProgreso("teoria");

  const resultado = h("div", { "aria-live": "polite" });
  const transcripcion = h("details", {},
    h("summary", {}, "Leer la transcripción del vídeo"),
    h("div", { class: "lectura" }, teoria.transcripcion.map((p) => h("p", {}, p))));

  async function terminar() {
    await completarParte("teoria");
    vaciar(resultado).append(
      aviso("seguro", "Teoría completada", "Puedes volver a ver el vídeo cuando quieras."),
      h("div", { class: "acciones" }, botonSiguiente("teoria")));
  }

  const video = h("video", {
    controls: true, preload: "metadata", src: teoria.video,
    "aria-label": `Vídeo: ${teoria.titulo}`,
  });
  if (teoria.subtitulos) {
    video.append(h("track", { kind: "captions", srclang: "es", label: "Español", src: teoria.subtitulos, default: true }));
  }
  video.addEventListener("ended", () => { terminar().catch((e) => resultado.append(aviso("peligro", null, e.message))); });
  video.addEventListener("error", () => {
    video.hidden = true;
    transcripcion.open = true;
    vaciar(resultado).append(
      aviso("senal", "El vídeo no está disponible", "Lee la explicación y pulsa el botón para continuar."),
      yaCompletada ? h("div", { class: "acciones" }, botonSiguiente("teoria")) : h("div", { class: "acciones" },
        h("button", { type: "button", class: "boton", onclick: (e) => { e.currentTarget.disabled = true; terminar().catch((err) => resultado.append(aviso("peligro", null, err.message))); } },
          "He leído la explicación")));
  });

  vaciar(panel).append(
    ...cabeceraPanel("teoria", yaCompletada
      ? "Ya has visto este vídeo. Puedes repasarlo cuando quieras."
      : `${teoria.titulo}. Duración aproximada: ${teoria.duracion}. La parte se completa al llegar al final del vídeo.`),
    video, transcripcion, resultado);
  if (yaCompletada) resultado.append(h("div", { class: "acciones" }, botonSiguiente("teoria")));
}

async function parteCaso() {
  const { caso } = estado.datos;
  const yaCompletada = estadoParte(estado.registro, "caso") === "completada";
  if (!yaCompletada) await marcarEnProgreso("caso");
  const resultado = h("div", { "aria-live": "polite" });
  const boton = h("button", {
    type: "button", class: "boton",
    onclick: async () => {
      boton.disabled = true;
      try {
        await completarParte("caso");
        vaciar(resultado).append(aviso("seguro", "Caso real completado", null),
          h("div", { class: "acciones" }, botonSiguiente("caso")));
      } catch (error) {
        boton.disabled = false;
        resultado.append(aviso("peligro", null, error.message));
      }
    },
  }, "He leído el caso");

  vaciar(panel).append(
    ...cabeceraPanel("caso", "Un caso real relacionado con este módulo."),
    h("article", { class: "lectura" },
      h("h3", {}, caso.titulo),
      h("p", { class: "caso-meta" }, caso.fecha),
      caso.parrafos.map((p) => h("p", {}, p)),
      h("section", { class: "caso-leccion" },
        h("h3", {}, "Qué podemos aprender"),
        h("p", {}, caso.leccion)),
      h("section", { class: "fuentes" },
        h("h3", {}, "Fuentes"),
        h("ul", {}, caso.fuentes.map((f) => h("li", {},
          h("a", { href: f.url, target: "_blank", rel: "noopener noreferrer" }, f.nombre)))))),
    resultado,
    yaCompletada ? h("div", { class: "acciones" }, botonSiguiente("caso")) : h("div", { class: "acciones" }, boton));
}

// Carga (una sola vez) la hoja de estilos propia de un minijuego.
function cargarEstilos(ruta) {
  if (document.querySelector(`link[href="${ruta}"]`)) return Promise.resolve();
  return new Promise((resolver, rechazar) => {
    const enlace = h("link", { rel: "stylesheet", href: ruta });
    enlace.addEventListener("load", () => resolver());
    enlace.addEventListener("error", () => rechazar(new Error(`No se ha podido cargar ${ruta}.`)));
    document.head.append(enlace);
  });
}

async function parteActividad() {
  const { actividad } = estado.datos;
  if (!JUEGOS.includes(actividad.tipo)) throw new Error("Tipo de actividad desconocido.");
  const repaso = estadoParte(estado.registro, "actividad") === "completada";
  if (!repaso) await marcarEnProgreso("actividad");
  const [juego] = await Promise.all([
    import(`./juegos/${actividad.tipo}.js`),
    cargarEstilos(`css/juegos/${actividad.tipo}.css`),
  ]);

  const zona = h("div");
  const resultado = h("div", { "aria-live": "polite" });
  vaciar(panel).append(
    ...cabeceraPanel("actividad", actividad.titulo),
    repaso ? aviso("senal", "Modo repaso",
      `Puedes repetir la actividad, pero tu puntuación guardada (${estado.registro.puntuacion_actividad} %) no cambia.`) : null,
    zona, resultado);

  juego.iniciar(zona, actividad, {
    repaso,
    alTerminar: async (puntuacion) => {
      if (!repaso) await completarParte("actividad", { puntuacion_actividad: puntuacion });
      vaciar(resultado).append(
        aviso("seguro", repaso ? "Repaso terminado" : "Actividad completada",
          repaso ? `En este intento habrías obtenido un ${puntuacion} %.` : `Puntuación de la actividad: ${puntuacion} %.`),
        h("div", { class: "acciones" }, botonSiguiente("actividad")));
      resultado.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
  });
}

function pintarResultados() {
  const r = estado.registro;
  const { preguntas, resumen: ideas } = estado.datos;
  const zonaValoracion = h("div", { id: "valoracion" });

  function pintarValoracion() {
    vaciar(zonaValoracion).append(formularioValoracion(estado.registro, async (valores) => {
      estado.registro = await actualizarProgreso(estado.registro.id, valores);
      refrescarEstructura();
      pintarValoracion();
      zonaValoracion.append(aviso("seguro", "Gracias por tu valoración", null),
        h("div", { class: "acciones" }, h("a", { class: "boton", href: "dashboard.html" }, "Volver a los módulos")));
    }));
  }
  pintarValoracion();

  vaciar(panel).append(
    ...cabeceraPanel("finales", "Resultados del módulo"),
    faltaValoracion(r) ? aviso("senal", "Falta tu valoración", "Responde las dos preguntas del final de esta página para terminar.") : null,
    h("p", {}, `Al empezar acertaste ${r.aciertos_iniciales} de ${preguntas.length} preguntas; al terminar, ${r.aciertos_finales} de ${preguntas.length}.`),
    comparacion(preguntas, r.respuestas_iniciales, r.respuestas_finales),
    resumen(ideas),
    zonaValoracion,
    !faltaValoracion(r) ? h("div", { class: "acciones" }, h("a", { class: "boton boton-secundario", href: "dashboard.html" }, "Volver a los módulos")) : null);
}

async function parteFinales() {
  if (estadoParte(estado.registro, "finales") === "completada") {
    pintarResultados();
    return;
  }
  await marcarEnProgreso("finales");
  const zona = h("div");
  vaciar(panel).append(
    ...cabeceraPanel("finales", "Son las mismas preguntas del principio, con las opciones en otro orden. Solo se pueden responder una vez."),
    zona);
  ejecutarCuestionario(zona, estado.datos.preguntas, {
    final: true,
    alTerminar: async (respuestas, aciertos) => {
      await completarParte("finales", { respuestas_finales: respuestas, aciertos_finales: aciertos });
      pintarResultados();
      panel.querySelector("h2")?.focus();
    },
  });
}

async function paginaModulo() {
  if (!sesion()) { location.replace("index.html"); return; }
  prepararCabecera();

  const id = new URLSearchParams(location.search).get("m");
  const { modulos } = await cargarJSON("data/modulos.json");
  const modulo = modulos.find((m) => m.id === id);
  if (!modulo) {
    vaciar(contenido).append(aviso("senal", "Módulo no encontrado", "Vuelve a la página principal y elige un módulo."),
      h("a", { class: "boton", href: "dashboard.html" }, "Ir a los módulos"));
    return;
  }

  const [datos, progresos] = await Promise.all([cargarJSON(`data/${modulo.id}.json`), obtenerProgresos()]);
  estado.modulo = modulo;
  estado.datos = datos;
  estado.registro = progresos.find((r) => r.modulo === modulo.id) || null;
  document.title = `${modulo.titulo} | CyberAware`;

  cabeceraModulo = h("div", { class: "modulo-cabecera" });
  listaPartes = h("ol", { class: "partes", "aria-label": "Partes del módulo" });
  panel = h("section", { class: "panel", "aria-live": "off" });

  vaciar(contenido).append(
    h("nav", { class: "migas", "aria-label": "Ruta" }, h("a", { href: "dashboard.html" }, "Volver a los módulos")),
    cabeceraModulo,
    h("div", { class: "modulo-cuerpo" }, h("nav", { "aria-label": "Partes" }, listaPartes), panel));

  const pedida = location.hash.slice(1);
  let inicial;
  if (faltaValoracion(estado.registro)) inicial = "finales";
  else if (PARTES.includes(pedida) && parteDisponible(estado.registro, pedida)) inicial = pedida;
  else inicial = primeraParteSinCompletar(estado.registro) || "finales";
  await abrirParte(inicial, { enfocar: false });

  window.addEventListener("hashchange", () => {
    const p = location.hash.slice(1);
    if (p !== estado.parte && PARTES.includes(p)) abrirParte(p);
  });
}

(async () => {
  try {
    const pagina = document.body.dataset.pagina;
    if (pagina === "modulo") await paginaModulo();
    else if (pagina === "dashboard") await paginaDashboard();
    else await paginaAcceso();
  } catch (error) {
    mostrarError(error);
  }
})();

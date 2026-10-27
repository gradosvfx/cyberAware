// Utilidades de DOM. Todo el contenido se inserta con textContent / nodos,
// nunca con innerHTML, para evitar XSS.

export function h(etiqueta, atributos = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos || {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === "class") el.className = valor;
    else if (clave.startsWith("on") && typeof valor === "function") el.addEventListener(clave.slice(2), valor);
    else if (clave === "dataset") Object.assign(el.dataset, valor);
    else if (valor === true) el.setAttribute(clave, "");
    else el.setAttribute(clave, String(valor));
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

// Vacía un elemento. Devuelve un objeto con append() que ignora null/undefined/false
// y aplana listas, para poder escribir: vaciar(zona).append(a, condicion ? b : null, lista).
export function vaciar(el) {
  el.replaceChildren();
  return {
    append(...hijos) {
      for (const hijo of hijos.flat(Infinity)) {
        if (hijo === null || hijo === undefined || hijo === false) continue;
        el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
      }
      return el;
    },
  };
}

export async function cargarJSON(ruta) {
  const respuesta = await fetch(ruta, { cache: "no-cache" });
  if (!respuesta.ok) throw new Error(`No se ha podido cargar ${ruta} (${respuesta.status}).`);
  return respuesta.json();
}

// Tira de 5 segmentos con el estado de cada parte del módulo.
export function tira(estados, grande = false) {
  return h("div", { class: grande ? "tira tira-grande" : "tira", "aria-hidden": "true" },
    estados.map((e) => h("span", { class: e })));
}

export function aviso(tipo, titulo, ...texto) {
  return h("div", { class: `aviso aviso-${tipo}`, role: tipo === "peligro" ? "alert" : "status" },
    titulo ? h("strong", {}, titulo) : null,
    texto.filter((t) => t !== null && t !== undefined)
      .map((t) => (t instanceof Node ? t : h("p", {}, t))));
}

// Baraja una copia del array (Fisher-Yates).
export function barajar(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

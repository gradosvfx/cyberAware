// Comunicación con PocketBase a través de su API REST (/api/...).
// La aplicación nunca construye SQL: solo usa la API, que aplica las reglas de acceso.

const CLAVE_SESION = "cyberaware.sesion";

export const PARTES = ["iniciales", "teoria", "caso", "actividad", "finales"];
export const NOMBRES_PARTES = {
  iniciales: "Preguntas iniciales",
  teoria: "Teoría",
  caso: "Caso real",
  actividad: "Actividad práctica",
  finales: "Preguntas finales",
};
export const NOMBRES_ESTADOS = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
};

export class ErrorApi extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// La sesión se guarda en sessionStorage: se borra al cerrar el navegador,
// lo que es más seguro en equipos compartidos.
export function sesion() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_SESION));
  } catch {
    return null;
  }
}

export function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_SESION);
}

function mensajeDeError(estado) {
  switch (estado) {
    case 0: return "No se puede conectar con el servidor. Comprueba la conexión e inténtalo de nuevo.";
    case 403: return "La petición se ha bloqueado por seguridad. Si el problema continúa, avisa a la persona de contacto de tu empresa.";
    case 404: return "No se ha encontrado el dato solicitado.";
    case 429: return "Demasiadas peticiones seguidas. Espera unos segundos e inténtalo de nuevo.";
    default: return estado >= 500
      ? "El servidor no está disponible en este momento. Inténtalo de nuevo en unos minutos."
      : "No se ha podido guardar la información. Inténtalo de nuevo.";
  }
}

async function peticion(metodo, ruta, cuerpo, { conSesion = true } = {}) {
  const cabeceras = { Accept: "application/json" };
  if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";
  const s = sesion();
  if (conSesion && s?.token) cabeceras.Authorization = s.token;

  let respuesta;
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ErrorApi(0, mensajeDeError(0));
  }

  if (respuesta.status === 401 && conSesion) {
    cerrarSesion();
    location.replace("index.html?caducada=1");
    throw new ErrorApi(401, "La sesión ha caducado.");
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, mensajeDeError(respuesta.status));
  return datos;
}

export async function iniciarSesion(usuario, contrasena) {
  try {
    const datos = await peticion("POST", "/api/collections/users/auth-with-password",
      { identity: usuario, password: contrasena }, { conSesion: false });
    sessionStorage.setItem(CLAVE_SESION, JSON.stringify({
      token: datos.token,
      id: datos.record.id,
      usuario: datos.record.username,
    }));
  } catch (error) {
    if (error.estado === 400) {
      throw new ErrorApi(400, "El nombre de usuario o la contraseña no son correctos.");
    }
    throw error;
  }
}

export async function obtenerProgresos() {
  const datos = await peticion("GET", "/api/collections/progreso/records?perPage=50&sort=-updated");
  return datos.items;
}

export async function crearProgreso(modulo, cambios = {}) {
  const registro = {
    usuario: sesion().id,
    modulo,
    porcentaje: 0,
  };
  for (const parte of PARTES) registro[`estado_${parte}`] = "pendiente";
  return peticion("POST", "/api/collections/progreso/records", { ...registro, ...cambios });
}

export async function actualizarProgreso(id, cambios) {
  return peticion("PATCH", `/api/collections/progreso/records/${encodeURIComponent(id)}`, cambios);
}

// ---- Cálculos sobre un registro de progreso ----

export function estadoParte(registro, parte) {
  return registro?.[`estado_${parte}`] || "pendiente";
}

export function porcentaje(registro) {
  return PARTES.filter((p) => estadoParte(registro, p) === "completada").length * 20;
}

export function estadoModulo(registro) {
  if (!registro) return "pendiente";
  if (porcentaje(registro) === 100) return "completado";
  return PARTES.some((p) => estadoParte(registro, p) !== "pendiente") ? "en_progreso" : "pendiente";
}

export function parteDisponible(registro, parte) {
  const i = PARTES.indexOf(parte);
  return i === 0 || estadoParte(registro, PARTES[i - 1]) === "completada";
}

export function primeraParteSinCompletar(registro) {
  return PARTES.find((p) => estadoParte(registro, p) !== "completada") || null;
}

export function faltaValoracion(registro) {
  return estadoModulo(registro) === "completado"
    && (!registro.valoracion_general || !registro.valoracion_claridad);
}

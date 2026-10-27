const configurado = Number.parseInt(
  process.env.FIRESTORE_MAX_DOCS_POR_DIA ?? "25000",
  10,
);

const MAX_DOCS_POR_DIA =
  Number.isSafeInteger(configurado) && configurado > 0
    ? configurado
    : 25000;

let diaContado = "";
let docsLeidosHoy = 0;

function actualizarDia(now = Date.now()) {
  const hoy = new Date(now).toISOString().slice(0, 10);

  if (hoy !== diaContado) {
    diaContado = hoy;
    docsLeidosHoy = 0;
  }
}

export function estadoLecturas(now = Date.now()) {
  actualizarDia(now);

  return {
    maximo: MAX_DOCS_POR_DIA,
    usados: docsLeidosHoy,
    restantes: Math.max(0, MAX_DOCS_POR_DIA - docsLeidosHoy),
  };
}

export function registrarLecturas(cantidad, now = Date.now()) {
  actualizarDia(now);

  if (Number.isSafeInteger(cantidad) && cantidad > 0) {
    docsLeidosHoy += cantidad;
  }

  return estadoLecturas(now);
}
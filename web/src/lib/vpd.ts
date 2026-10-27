/** Muestra el VPD ambiental en kPa con la precisión del resumen (dos decimales). */
export function formatoVpd(valor: number | null | undefined, conUnidad = true): string {
  if (valor == null || !Number.isFinite(valor)) return "—";
  const numero = valor.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return conUnidad ? `${numero} kPa` : numero;
}

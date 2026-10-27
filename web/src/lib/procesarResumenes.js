// Convierte documentos de "resumenes" en lo que muestra el panel. Lo usan /api/sensores y /api/admin/historial.
// Devuelve { summaries, alerts, counts }; las alertas quedan ordenadas de la mas reciente a la mas antigua.
export function procesarResumenes(documentos) {
  let alertCount = 0;
  let invalidCount = 0;
  const alerts = [];
  const summaries = documentos.flatMap((document) => {
    const data = document.data();
    const counts =
      data.conteos && typeof data.conteos === "object" ? data.conteos : {};
    const temperature =
      data.temperatura_c && typeof data.temperatura_c === "object"
        ? data.temperatura_c.promedio
        : null;
    const humidity =
      data.humedad_pct && typeof data.humedad_pct === "object"
        ? data.humedad_pct.promedio
        : null;
    // Resumen VPD añadido por data-processor. Documentos antiguos no lo incluyen.
    const vpd =
      data.vpd_kpa && typeof data.vpd_kpa === "object"
        ? data.vpd_kpa.promedio
        : null;

    if (
      typeof data.timestamp !== "string" ||
      !Number.isFinite(Date.parse(data.timestamp))
    ) {
      return [];
    }

    if (Number.isSafeInteger(counts.alertas) && counts.alertas > 0) {
      alertCount += counts.alertas;
    }
    if (Number.isSafeInteger(counts.invalidas) && counts.invalidas > 0) {
      invalidCount += counts.invalidas;
    }

    if (Array.isArray(data.eventos)) {
      data.eventos.forEach((event, index) => {
        if (
          !event ||
          typeof event !== "object" ||
          !["alerta", "invalida"].includes(event.estado) ||
          typeof event.timestamp !== "string" ||
          !Number.isFinite(Date.parse(event.timestamp))
        ) {
          return;
        }

        const reasons = Array.isArray(event.motivos)
          ? event.motivos.filter((reason) => typeof reason === "string").slice(0, 5)
          : [];

        alerts.push({
          id: `${document.id}-${index}`,
          timestamp: event.timestamp,
          estado: event.estado,
          motivos: reasons,
        });
      });
    }

    return [
      {
        id: document.id,
        timestamp: data.timestamp,
        estado: typeof data.estado === "string" ? data.estado : "desconocido",
        alertas: Number.isSafeInteger(counts.alertas) ? counts.alertas : 0,
        invalidas: Number.isSafeInteger(counts.invalidas) ? counts.invalidas : 0,
        temperatura_c:
          typeof temperature === "number" && Number.isFinite(temperature)
            ? temperature
            : null,
        humedad_pct:
          typeof humidity === "number" && Number.isFinite(humidity)
            ? humidity
            : null,
        vpd_kpa:
          typeof vpd === "number" && Number.isFinite(vpd) && vpd >= 0
            ? vpd
            : null,
      },
    ];
  });

  alerts.sort(
    (first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp),
  );

  return { summaries, alerts, counts: { alertas: alertCount, invalidas: invalidCount } };
}

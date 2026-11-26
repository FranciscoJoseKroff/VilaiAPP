// Suma los recursos de una recompensa sin pasar la capacidad del almacén (el servidor rechaza
// cualquier guardado por encima de ella). Devuelve también lo que no cupo, para avisar al jugador.
export function sumarRecursosConCapacidad(recursos, ganancia, capacidades) {
  const resultado = { ...recursos };
  const sobrante = {};
  for (const [recurso, cantidad] of Object.entries(ganancia || {})) {
    const actual = Number(resultado[recurso] || 0);
    const capacidad = Number(capacidades?.[recurso]);
    const total = actual + Number(cantidad || 0);
    // Sin capacidad conocida no se limita; si ya estaba sobre el tope no se toca lo que había.
    const limite = Number.isFinite(capacidad) ? Math.max(capacidad, actual) : Infinity;
    resultado[recurso] = Math.min(total, limite);
    if (total > limite) sobrante[recurso] = total - limite;
  }
  return { recursos: resultado, sobrante };
}

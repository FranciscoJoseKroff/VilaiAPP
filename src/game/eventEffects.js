export function seleccionarEdificiosAfectados(edificios, tipoEvento, evento) {
  const lista = Array.isArray(edificios) ? edificios : [];
  const objetivos = evento?.edificiosObjetivo
    || (tipoEvento === 'helada' ? ['granja', 'horno'] : ['casa', 'aserradero', 'mina']);
  const vulnerables = lista.filter((edificio) => objetivos.includes(edificio.tipoId));
  return tipoEvento === 'incendio' ? vulnerables : [vulnerables[0] || lista[0]].filter(Boolean);
}

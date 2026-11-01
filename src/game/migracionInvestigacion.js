export function migrarInvestigacion(aldea) {
  if (!aldea || typeof aldea !== 'object') return aldea;
  const tecnologias = aldea.tecnologias && typeof aldea.tecnologias === 'object'
    ? aldea.tecnologias
    : {};
  const investigaciones = aldea.investigaciones && typeof aldea.investigaciones === 'object'
    ? aldea.investigaciones
    : {};
  const nivelMetalurgia = Number(tecnologias.metalurgia) || 0;
  if (investigaciones.metalurgia && nivelMetalurgia < 1) tecnologias.metalurgia = 1;
  if (nivelMetalurgia > 0 && !investigaciones.metalurgia) investigaciones.metalurgia = true;
  aldea.tecnologias = tecnologias;
  aldea.investigaciones = investigaciones;
  return aldea;
}
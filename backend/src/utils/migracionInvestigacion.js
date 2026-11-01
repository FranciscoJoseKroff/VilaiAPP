function migrarInvestigacion(aldea) {
	if (!aldea || typeof aldea !== 'object') return aldea;
	if (!aldea.tecnologias || typeof aldea.tecnologias !== 'object') aldea.tecnologias = {};
	if (!aldea.investigaciones || typeof aldea.investigaciones !== 'object') aldea.investigaciones = {};
	const nivelMetalurgia = Number(aldea.tecnologias.metalurgia) || 0;
	if (aldea.investigaciones.metalurgia && nivelMetalurgia < 1) aldea.tecnologias.metalurgia = 1;
	if (nivelMetalurgia > 0 && !aldea.investigaciones.metalurgia) aldea.investigaciones.metalurgia = true;
	if (typeof aldea.markModified === 'function') {
		aldea.markModified('tecnologias');
		aldea.markModified('investigaciones');
	}
	return aldea;
}

module.exports = { migrarInvestigacion };
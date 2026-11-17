const fs = require('fs');
const path = require('path');
const Aldea = require('../src/models/Village');

const aldeanos = Aldea.schema.path('aldeanos').schema;
const edificios = Aldea.schema.path('edificios').schema;
const fixture = {
  estado: aldeanos.path('estado').enumValues,
  trabajo: aldeanos.path('trabajo').enumValues,
  rasgo: aldeanos.path('rasgo').enumValues,
  edificio: edificios.path('tipoId').enumValues,
  evento: Aldea.schema.path('eventoNocturno.tipo').enumValues.filter((tipo) => tipo !== null),
};

const destino = path.resolve(__dirname, '..', '..', 'fixtures', 'enums-aldeano.json');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Fixture generado: ${destino}`);

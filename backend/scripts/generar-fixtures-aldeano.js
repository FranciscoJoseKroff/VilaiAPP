const fs = require('fs');
const path = require('path');
const Aldea = require('../src/models/Village');

const aldeanos = Aldea.schema.path('aldeanos').schema;
const fixture = {
  estado: aldeanos.path('estado').enumValues,
  trabajo: aldeanos.path('trabajo').enumValues,
};

const destino = path.resolve(__dirname, '..', '..', 'AldeaIncrementalFront', 'fixtures', 'enums-aldeano.json');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.writeFileSync(destino, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(`Fixture generado: ${destino}`);

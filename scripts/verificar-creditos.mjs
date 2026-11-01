import fs from 'node:fs';

const iconsSource = fs.readFileSync('src/data/gameIcons.js', 'utf8');
const creditsSource = fs.readFileSync('src/data/creditos.js', 'utf8');
const ids = [...iconsSource.matchAll(/^  ([a-zA-Z0-9_-]+): \{/gm)]
  .map((match) => match[1])
  .filter((id) => id !== 'fallback');

let valido = true;
for (const id of ids) {
  const bloque = iconsSource.match(new RegExp(`  ${id}: \\{([\\s\\S]*?)\\n  \\},`));
  if (!bloque?.[1].match(/autor:\s*['"][^'"]+['"]/)) console.error(`Falta autor para el icono "${id}".`);
  if (!bloque?.[1].match(/urlOrigen:\s*['"][^'"]+['"]/)) console.error(`Falta urlOrigen para el icono "${id}".`);
  if (!new RegExp(`id:\\s*['"]${id}['"]`).test(creditsSource)) console.error(`Falta acreditar el icono "${id}" en creditos.js.`);
  if (!bloque?.[1].match(/autor:\s*['"][^'"]+['"]/)
    || !bloque?.[1].match(/urlOrigen:\s*['"][^'"]+['"]/)
    || !new RegExp(`id:\\s*['"]${id}['"]`).test(creditsSource)) valido = false;
}
if (!valido) process.exit(1);
console.log(`${ids.length} iconos tienen atribución completa.`);

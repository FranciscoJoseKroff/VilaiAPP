import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [clave, ...resto] = arg.replace(/^--/, '').split('=');
  return [clave, resto.join('=')];
}));

const svgPath = args.svg;
const id = args.id;
const autor = args.autor;
const urlOrigen = args.urlOrigen;
const registroPath = args.registro || path.resolve('src/data/gameIcons.js');

if (!svgPath || !id || !autor || !urlOrigen) {
  console.error('Uso: node scripts/importar-icono.mjs --svg=... --id=... --autor=... --urlOrigen=...');
  process.exit(1);
}

const svg = fs.readFileSync(path.resolve(svgPath), 'utf8');
const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/i);
if (!viewBoxMatch) throw new Error(`El SVG no contiene viewBox: ${svgPath}`);

const paths = [...svg.matchAll(/<path\b[^>]*\bd=["']([^"']+)["'][^>]*\/?>/gi)]
  .map((match) => match[1])
  .filter((d) => !/^M\s*0\s*0\s*h?512/i.test(d.trim()));

if (paths.length === 0) throw new Error(`El SVG no contiene paths: ${svgPath}`);
const source = fs.readFileSync(registroPath, 'utf8');
if (new RegExp(`\\n  ${id}: \\{`).test(source)) throw new Error(`El icono "${id}" ya existe en el registro.`);

const entrada = [
  `  ${id}: {`,
  `    viewBox: '${viewBoxMatch[1]}',`,
  `    paths: ${JSON.stringify(paths)},`,
  `    autor: '${autor.replace(/'/g, "\\'")}',`,
  `    urlOrigen: '${urlOrigen}',`,
  `  },`,
].join('\n');

const marcador = 'export const GAME_ICONS = {';
if (!source.includes(marcador)) throw new Error(`No se encontró el registro en ${registroPath}`);
fs.writeFileSync(registroPath, source.replace(marcador, `${marcador}\n${entrada}`));
console.log(`Añadido "${id}" a ${registroPath}`);

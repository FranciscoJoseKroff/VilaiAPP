import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const soundsDir = path.join(root, 'assets', 'sounds');
const catalogPath = path.join(root, 'src', 'audio', 'sfx.js');
const catalogSource = fs.readFileSync(catalogPath, 'utf8');
const catalog = catalogSource.match(/export const SFX_CATALOG = \{([\s\S]*?)\n\};/);
const errors = [];

if (!catalog) {
  console.error('No se pudo encontrar SFX_CATALOG en src/audio/sfx.js.');
  process.exit(1);
}

const entries = [...catalog[1].matchAll(
  /(?:^|\n)\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))\s*:\s*require\(['"]([^'"]+)['"]\)/g,
)];

if (entries.length === 0) {
  console.error('No se encontraron archivos en el catálogo SFX_CATALOG.');
  process.exit(1);
}

for (const [, quotedName, bareName, source] of entries) {
  const name = quotedName ?? bareName;
  const filePath = path.resolve(path.dirname(catalogPath), source);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`El sonido "${name}" no tiene archivo: ${path.relative(root, filePath)}.`);
  }
}

if (!fs.existsSync(soundsDir) || !fs.statSync(soundsDir).isDirectory()) {
  errors.push('No existe la carpeta assets/sounds/.');
} else {
  const inspectDirectory = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        inspectDirectory(filePath);
      } else if (entry.isFile() && fs.statSync(filePath).size === 0) {
        errors.push(`El archivo está vacío: ${path.relative(root, filePath)}.`);
      }
    }
  };
  inspectDirectory(soundsDir);
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Verificados ${entries.length} sonidos del catálogo; no hay archivos vacíos.`);
}

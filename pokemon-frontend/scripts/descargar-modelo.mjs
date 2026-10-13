import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const destino = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'modelo');

const candidatos = [
  'https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/2/model.json?tfjs-format=file',
  'https://www.kaggle.com/models/google/mobilenet-v2/TfJs/100-224-classification/3/model.json?tfjs-format=file',
  'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v2_100_224/classification/3/default/1/model.json?tfjs-format=file',
];

async function intentar(url) {
  const [base, query] = url.split('?');
  const carpeta = base.slice(0, base.lastIndexOf('/') + 1);
  const sufijo = query ? `?${query}` : '';
  console.log(`Probando ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const modelo = await resp.json();
  await mkdir(destino, { recursive: true });
  for (const grupo of modelo.weightsManifest) {
    for (const ruta of grupo.paths) {
      const r = await fetch(carpeta + ruta + sufijo);
      if (!r.ok) throw new Error(`HTTP ${r.status} en ${ruta}`);
      await writeFile(join(destino, ruta), Buffer.from(await r.arrayBuffer()));
      console.log(`  ✔ ${ruta}`);
    }
  }
  await writeFile(join(destino, 'model.json'), JSON.stringify(modelo));
  console.log(`\n✅ Modelo guardado en ${destino}`);
}

for (const url of candidatos) {
  try { await intentar(url); process.exit(0); }
  catch (e) { console.log(`  ✘ ${e.message}\n`); }
}
console.error('❌ No se pudo descargar el modelo desde ninguna dirección.');
process.exit(1);
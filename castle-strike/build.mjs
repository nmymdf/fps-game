import { build } from 'esbuild';
import fs from 'node:fs';

const entry = process.argv[2] || 'src/main.js';
const out = process.argv[3] || 'dist/index.html';
const title = process.argv[4] || '城堡突襲';
const res = await build({
  entryPoints: [entry], bundle: true, write: false, format: 'iife', minify: true, target: 'es2020', legalComments: 'none', loader: { '.jpg': 'dataurl', '.png': 'dataurl', '.webp': 'dataurl', '.mp3': 'dataurl' },
});
const js = res.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const html = fs.readFileSync('src/template.html', 'utf8').replace('%TITLE%', title).replace('/*JS*/', () => js);
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0) + ' KB');

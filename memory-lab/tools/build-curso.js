/* Genera la página única del curso simple (para publicar en claude.ai): node tools/build-curso.js <salida.html> */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const web = process.argv.includes('--web');
const out = process.argv.filter(a => !a.startsWith('--'))[2] || path.join(root, 'curso', 'curso.html');
const pub = path.join(root, 'public');
const js = ['js/english-core.js', 'data/english/categories.js']
  .concat(fs.readdirSync(path.join(pub, 'data/english')).filter(f => /^p\d.*\.js$/.test(f)).sort().map(f => 'data/english/' + f))
  .map(f => fs.readFileSync(path.join(pub, f), 'utf8'))
  .concat(['curso/pron1.js', 'curso/pron2.js', 'curso/pron3.js', 'curso/app.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')))
  .map(s => '<script>\n' + s.replace(/<\/script/g, '<\\/script') + '\n</script>').join('\n');
const html = '<title>Inglés para Hablar</title>\n<style>\n' + fs.readFileSync(path.join(root, 'curso/style.css'), 'utf8') + '\n</style>\n'
  + '<main id="app"></main>\n<div class="footer" id="foot" hidden></div>\n' + js + '\n';
const final = web
  ? '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="theme-color" content="#2f5fe0">\n</head>\n<body>\n' + html + '</body>\n</html>\n'
  : html;
fs.writeFileSync(out, final);
console.log('Curso generado' + (web ? ' (web)' : '') + ': ' + out + ' (' + Math.round(final.length / 1024) + ' KB)');

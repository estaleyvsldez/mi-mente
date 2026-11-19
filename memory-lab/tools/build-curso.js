/* Genera la página única del curso simple (para publicar en claude.ai): node tools/build-curso.js <salida.html> */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'curso', 'curso.html');
const pub = path.join(root, 'public');
const js = ['js/english-core.js', 'data/english/categories.js']
  .concat(fs.readdirSync(path.join(pub, 'data/english')).filter(f => /^p\d.*\.js$/.test(f)).sort().map(f => 'data/english/' + f))
  .map(f => fs.readFileSync(path.join(pub, f), 'utf8'))
  .concat(['curso/pron1.js', 'curso/pron2.js', 'curso/pron3.js', 'curso/app.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')))
  .map(s => '<script>\n' + s.replace(/<\/script/g, '<\\/script') + '\n</script>').join('\n');
const html = '<title>Inglés para Hablar</title>\n<style>\n' + fs.readFileSync(path.join(root, 'curso/style.css'), 'utf8') + '\n</style>\n'
  + '<main id="app"></main>\n<div class="footer" id="foot" hidden></div>\n' + js + '\n';
fs.writeFileSync(out, html);
console.log('Curso generado: ' + out + ' (' + Math.round(html.length / 1024) + ' KB)');

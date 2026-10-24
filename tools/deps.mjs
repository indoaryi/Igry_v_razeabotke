#!/usr/bin/env node
// Проверка связей между частями кода игры: кто чьи имена берёт.
//   node tools/deps.mjs <папка игры>            — сводка: движок → игра (должно быть пусто), неизвестные имена, порядок склейки
//   node tools/deps.mjs <папка игры> --all      — ещё и полный список: какая часть какие имена берёт у каких частей
// Части склеиваются в одну функцию (см. build.mjs), поэтому все имена верхнего уровня общие.
// Движок (всё, что лежит в engine/) не должен брать имён у игры: всё игровое приходит к нему через крючки (см. engine/src/core/game.js).
// Внутри движка ядро не должно брать имён у необязательных частей — библиотеки предметов (engine/src/props) и шагающих машин
// (engine/src/machine): игра может их не подключать (как пустая площадка ploshchadka/).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let acorn;
try { acorn = require('acorn'); } catch { acorn = createRequire('/opt/npm-tools/node_modules/')('acorn'); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const game = args.find((a) => !a.startsWith('--')) || 'pyatietazhki';
const showAll = args.includes('--all');
const man = JSON.parse(fs.readFileSync(path.join(root, game, 'build.json'), 'utf8'));

// names the browser gives every page
const BROWSER = new Set(['window', 'document', 'navigator', 'location', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
  'getComputedStyle', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'Image', 'ImageData', 'OffscreenCanvas', 'HTMLCanvasElement', 'HTMLElement', 'Element', 'Node', 'Event',
  'CustomEvent', 'KeyboardEvent', 'PointerEvent', 'localStorage', 'sessionStorage', 'indexedDB', 'AudioContext', 'webkitAudioContext', 'OfflineAudioContext', 'alert', 'confirm', 'prompt',
  'devicePixelRatio', 'innerWidth', 'innerHeight', 'scrollTo', 'getSelection', 'Path2D', 'DOMParser', 'XMLSerializer', 'FileReader', 'createImageBitmap', 'screen', 'history', 'customElements', 'visualViewport']);
const GLOBALS = new Set([...Object.getOwnPropertyNames(globalThis), ...BROWSER, 'undefined', 'NaN', 'Infinity', 'arguments', 'eval']);

// ---- one part: the names it declares at the top, everything it binds anywhere, and every name it reads or writes ----
function analyse(file) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const ast = acorn.parse('(function(){\n' + src + '\n})', { ecmaVersion: 'latest', locations: true, allowReturnOutsideFunction: true });
  const body = ast.body[0].expression.body.body;
  const top = new Map();              // name → { kind, line }
  const bound = new Set();            // every name bound anywhere in the part (params, locals, top)
  const refs = [];                    // { name, line, now } — now: runs while the page loads (not inside a function)
  const addPat = (p, into) => {
    if (!p) return;
    if (p.type === 'Identifier') into(p.name, p);
    else if (p.type === 'ObjectPattern') for (const q of p.properties) addPat(q.type === 'RestElement' ? q.argument : q.value, into);
    else if (p.type === 'ArrayPattern') for (const q of p.elements) addPat(q, into);
    else if (p.type === 'RestElement') addPat(p.argument, into);
    else if (p.type === 'AssignmentPattern') addPat(p.left, into);
  };
  for (const st of body) {
    if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') top.set(st.id.name, { kind: st.type === 'FunctionDeclaration' ? 'function' : 'class', line: st.loc.start.line - 1 });
    else if (st.type === 'VariableDeclaration') for (const d of st.declarations) addPat(d.id, (n, node) => top.set(n, { kind: st.kind, line: node.loc.start.line - 1 }));
  }
  const ref = (node, fnDepth) => refs.push({ name: node.name, line: node.loc.start.line - 1, now: fnDepth === 0 });
  // walk with a context: 'ref' (reads and writes) or 'bind' (declares a name)
  function visit(n, ctx, d) {
    if (!n || typeof n.type !== 'string') return;
    switch (n.type) {
      case 'Identifier': if (ctx === 'bind') bound.add(n.name); else ref(n, d); return;
      case 'MemberExpression': visit(n.object, 'ref', d); if (n.computed) visit(n.property, 'ref', d); return;
      case 'Property':
        if (n.computed) visit(n.key, 'ref', d);
        visit(n.value, ctx, d); return;
      case 'MethodDefinition': case 'PropertyDefinition':
        if (n.computed) visit(n.key, 'ref', d);
        visit(n.value, 'ref', d + (n.type === 'PropertyDefinition' ? 1 : 0)); return;
      case 'VariableDeclarator': visit(n.id, 'bind', d); visit(n.init, 'ref', d); return;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression':
        if (n.id) visit(n.id, 'bind', d);
        for (const p of n.params) visit(p, 'bind', d + 1);
        visit(n.body, 'ref', d + 1); return;
      case 'ClassDeclaration': case 'ClassExpression':
        if (n.id) visit(n.id, 'bind', d);
        visit(n.superClass, 'ref', d); visit(n.body, 'ref', d); return;
      case 'CatchClause': visit(n.param, 'bind', d); visit(n.body, 'ref', d); return;
      case 'AssignmentPattern': visit(n.left, ctx, d); visit(n.right, 'ref', d); return;
      case 'ObjectPattern': for (const q of n.properties) visit(q, ctx, d); return;
      case 'ArrayPattern': for (const q of n.elements) visit(q, ctx, d); return;
      case 'RestElement': visit(n.argument, ctx, d); return;
      case 'LabeledStatement': visit(n.body, 'ref', d); return;
      case 'BreakStatement': case 'ContinueStatement': return;
      default:
        for (const k of Object.keys(n)) {
          if (k === 'loc' || k === 'start' || k === 'end' || k === 'type') continue;
          const v = n[k];
          if (Array.isArray(v)) for (const c of v) visit(c, 'ref', d);
          else if (v && typeof v.type === 'string') visit(v, 'ref', d);
        }
    }
  }
  for (const st of body) visit(st, 'ref', 0);
  return { file, top, bound, refs };
}

const parts = man.parts.map(analyse);
const owner = new Map();              // top-level name → index of the part that declares it
const dupes = [];
parts.forEach((p, i) => { for (const n of p.top.keys()) { if (owner.has(n)) dupes.push(`${n}: ${parts[owner.get(n)].file} и ${p.file}`); owner.set(n, i); } });
const isEngine = (f) => f.startsWith('engine/');
const isOptional = (f) => f.startsWith('engine/src/props/') || f.startsWith('engine/src/machine/');
const isCore = (f) => isEngine(f) && !isOptional(f);

const engineToGame = [], coreToOptional = [], unknown = [], early = [], edges = new Map();
parts.forEach((p, i) => {
  for (const r of p.refs) {
    if (p.top.has(r.name)) continue;                       // its own
    const j = owner.get(r.name);
    if (j === undefined) {
      if (!p.bound.has(r.name) && !GLOBALS.has(r.name)) unknown.push(`${p.file}:${r.line} ${r.name}`);
      continue;
    }
    if (p.bound.has(r.name)) continue;                     // shadowed by a local of the same name somewhere in the part (rare)
    const q = parts[j];
    const k = p.file + ' → ' + q.file;
    if (!edges.has(k)) edges.set(k, new Map());
    const m = edges.get(k); m.set(r.name, (m.get(r.name) || 0) + 1);
    if (isEngine(p.file) && !isEngine(q.file)) engineToGame.push(`${p.file}:${r.line} ${r.name}  (из ${q.file})`);
    if (isCore(p.file) && isOptional(q.file)) coreToOptional.push(`${p.file}:${r.line} ${r.name}  (из ${q.file})`);
    // a const/let/class of a later part read while the page loads: it does not exist yet
    if (r.now && j > i && q.top.get(r.name).kind !== 'function') early.push(`${p.file}:${r.line} ${r.name} — объявлено позже, в ${q.file}`);
  }
});

const uniq = (a) => [...new Set(a)];
const out = (title, list) => { console.log(`\n${title}: ${list.length ? '' : 'нет'}`); for (const s of list) console.log('  ' + s); };
console.log(`${game}: ${parts.length} частей, ${owner.size} имён верхнего уровня`);
out('Движок берёт у игры', uniq(engineToGame));
out('Ядро движка берёт у библиотеки или машин', uniq(coreToOptional));
out('Неизвестные имена (нигде не объявлены)', uniq(unknown));
out('Используется раньше, чем объявлено', uniq(early));
out('Одно имя объявлено дважды', dupes);
if (showAll) {
  console.log('\nСвязи:');
  for (const [k, m] of edges) console.log(`  ${k}: ${[...m.keys()].sort().join(', ')}`);
}
const bad = engineToGame.length + coreToOptional.length + unknown.length + early.length + dupes.length;
process.exitCode = bad ? 1 : 0;

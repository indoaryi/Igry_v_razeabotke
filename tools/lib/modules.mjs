// Reading our modules: what each file imports, declares, exports, and which names it uses — for tools/deps.mjs and tools/build.mjs.
// Our modules use a small, fixed form (tools/deps.mjs checks it):
//   imports — one line each at the top of the file:  import { a, b } from './file.js';   (or  import './file.js';  for side effects)
//   exports — a keyword before a top-level declaration:  export function f() …,  export const x = …,  export let y = …,  export class K …
// Nothing else (no default exports, no `export { … }` lists, no `import * as`), so the build can join the modules into one script
// by dropping the import lines and the word `export` — every top-level name must therefore be unique across a game.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// the parser is needed only to check the code (tools/deps.mjs); the build reads the import lines by themselves
let acorn = null;
function parser() {
  if (acorn) return acorn;
  const require = createRequire(import.meta.url);
  try { acorn = require('acorn'); } catch { acorn = createRequire('/opt/npm-tools/node_modules/')('acorn'); }
  return acorn;
}

export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
export const rel = (f) => path.relative(root, f).split(path.sep).join('/');

// names every page has
const BROWSER = ['window', 'document', 'navigator', 'location', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
  'getComputedStyle', 'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'Image', 'ImageData', 'OffscreenCanvas', 'HTMLCanvasElement', 'HTMLElement', 'Element', 'Node', 'Event',
  'CustomEvent', 'KeyboardEvent', 'PointerEvent', 'localStorage', 'sessionStorage', 'indexedDB', 'AudioContext', 'webkitAudioContext', 'OfflineAudioContext', 'alert', 'confirm', 'prompt',
  'devicePixelRatio', 'innerWidth', 'innerHeight', 'scrollTo', 'getSelection', 'Path2D', 'DOMParser', 'XMLSerializer', 'FileReader', 'createImageBitmap', 'screen', 'history', 'customElements',
  'visualViewport', 'Blob', 'URL', 'File', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'structuredClone', 'fetch', 'TextEncoder', 'TextDecoder'];
export const GLOBALS = new Set([...Object.getOwnPropertyNames(globalThis), ...BROWSER, 'undefined', 'NaN', 'Infinity', 'arguments', 'eval']);

const IMPORT_LINE = /^\s*import\s+(?:\{([^}]*)\}\s+from\s+)?'([^']+)';\s*$/;
const EXPORT_DECL = /^(\s*)export (?=(?:function|const|let|class|async function)\b)/;

// the import lines of a module, read without the parser: [{ names, spec, from, line }]
export function scanImports(file, src) {
  const out = [];
  src.split('\n').forEach((l, i) => {
    const m = IMPORT_LINE.exec(l);
    if (m) out.push({ names: m[1] ? m[1].split(',').map((x) => x.trim()).filter(Boolean) : [], spec: m[2], from: rel(path.resolve(root, path.dirname(file), m[2])), line: i + 1 });
  });
  return out;
}
// the module's source turned into a part of one joined script: import lines dropped, the word `export` taken off declarations
export function joinable(src) {
  return src.split('\n').filter((l) => !IMPORT_LINE.test(l)).map((l) => l.replace(EXPORT_DECL, '$1')).join('\n');
}

function addPat(p, into) {
  if (!p) return;
  if (p.type === 'Identifier') into(p.name, p);
  else if (p.type === 'ObjectPattern') for (const q of p.properties) addPat(q.type === 'RestElement' ? q.argument : q.value, into);
  else if (p.type === 'ArrayPattern') for (const q of p.elements) addPat(q, into);
  else if (p.type === 'RestElement') addPat(p.argument, into);
  else if (p.type === 'AssignmentPattern') addPat(p.left, into);
}

// one file: { file, src, imports: [{ names, from, line }], top: Map(name → { kind, line, exported }), refs: [{ name, line, write, now }], form: [problems] }
//   refs are the names the file uses that are not its own locals: its top-level names, imported names, globals, unknown names;
//   now — used while the page loads (outside any function), write — assigned to
export function readModule(file) {
  const abs = path.resolve(root, file);
  const src = fs.readFileSync(abs, 'utf8');
  const form = [];
  let ast;
  try { ast = parser().parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true }); }
  catch (e) { return { file: rel(abs), src, imports: [], top: new Map(), refs: [], form: [`не читается как модуль: ${e.message}`] }; }
  const imports = [], top = new Map();
  // the line-based joining must see exactly what the parser sees
  const lines = src.split('\n');
  lines.forEach((l, i) => { if (/^\s*import\b/.test(l) && !IMPORT_LINE.test(l)) form.push(`${i + 1}: импорт не в одну строку вида  import { … } from '…';`); });
  let seenCode = false;
  for (const st of ast.body) {
    if (st.type === 'ImportDeclaration') {
      if (seenCode) form.push(`${st.loc.start.line}: импорт должен стоять в начале файла`);
      if (st.loc.start.line !== st.loc.end.line) form.push(`${st.loc.start.line}: импорт не в одну строку`);
      const names = [];
      for (const s of st.specifiers) {
        if (s.type !== 'ImportSpecifier' || s.imported.name !== s.local.name) form.push(`${st.loc.start.line}: импорт только вида { имя } — без default, * as и переименований`);
        else names.push(s.local.name);
      }
      imports.push({ names, from: rel(path.resolve(path.dirname(abs), st.source.value)), spec: st.source.value, line: st.loc.start.line });
      continue;
    }
    seenCode = true;
    let decl = st, exported = false;
    if (st.type === 'ExportNamedDeclaration') {
      if (!st.declaration || st.source) { form.push(`${st.loc.start.line}: экспорт только перед объявлением (export function / const / let / class)`); continue; }
      decl = st.declaration; exported = true;
      if (!EXPORT_DECL.test(lines[st.loc.start.line - 1])) form.push(`${st.loc.start.line}: export должен начинать строку`);
    } else if (st.type === 'ExportDefaultDeclaration' || st.type === 'ExportAllDeclaration') { form.push(`${st.loc.start.line}: export default / export * не используем`); continue; }
    if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') top.set(decl.id.name, { kind: decl.type === 'FunctionDeclaration' ? 'function' : 'class', line: decl.loc.start.line, exported });
    else if (decl.type === 'VariableDeclaration') for (const d of decl.declarations) addPat(d.id, (n, node) => top.set(n, { kind: decl.kind, line: node.loc.start.line, exported }));
  }
  // ---- every name used, with the locals of functions and blocks left out ----
  const refs = [];
  const scopes = [];
  const isLocal = (n) => scopes.some((s) => s.has(n));
  const hoist = (body, into) => {
    const walk = (n) => {
      if (!n || typeof n.type !== 'string') return;
      if (n.type === 'FunctionDeclaration') { into.add(n.id.name); return; }
      if (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression' || n.type === 'ClassExpression') return;
      if (n.type === 'ClassDeclaration') return;
      if (n.type === 'VariableDeclaration' && n.kind === 'var') for (const d of n.declarations) addPat(d.id, (nm) => into.add(nm));
      for (const k of Object.keys(n)) {
        if (k === 'loc' || k === 'start' || k === 'end' || k === 'type') continue;
        const v = n[k];
        if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v);
      }
    };
    walk(body);
  };
  const blockNames = (stmts) => {
    const s = new Set();
    for (const st of stmts) {
      if (st.type === 'VariableDeclaration' && st.kind !== 'var') for (const d of st.declarations) addPat(d.id, (nm) => s.add(nm));
      else if (st.type === 'ClassDeclaration') s.add(st.id.name);
      else if (st.type === 'FunctionDeclaration') s.add(st.id.name);
    }
    return s;
  };
  const ref = (id, depth, write) => { if (!isLocal(id.name)) refs.push({ name: id.name, line: id.loc.start.line, write, now: depth === 0 }); };
  function target(p, depth) {
    if (!p) return;
    if (p.type === 'Identifier') ref(p, depth, true);
    else if (p.type === 'MemberExpression') { visit(p.object, depth); if (p.computed) visit(p.property, depth); }
    else if (p.type === 'ObjectPattern') for (const q of p.properties) { if (q.type === 'RestElement') target(q.argument, depth); else { if (q.computed) visit(q.key, depth); target(q.value, depth); } }
    else if (p.type === 'ArrayPattern') for (const q of p.elements) target(q, depth);
    else if (p.type === 'RestElement') target(p.argument, depth);
    else if (p.type === 'AssignmentPattern') { target(p.left, depth); visit(p.right, depth); }
  }
  function defaults(p, depth) {
    if (!p) return;
    if (p.type === 'AssignmentPattern') { visit(p.right, depth); defaults(p.left, depth); }
    else if (p.type === 'ObjectPattern') for (const q of p.properties) { if (q.computed) visit(q.key, depth); defaults(q.type === 'RestElement' ? q.argument : q.value, depth); }
    else if (p.type === 'ArrayPattern') p.elements.forEach((q) => defaults(q, depth));
    else if (p.type === 'RestElement') defaults(p.argument, depth);
  }
  function fn(n, depth) {
    const s = new Set();
    for (const p of n.params) addPat(p, (nm) => s.add(nm));
    if (n.type === 'FunctionExpression' && n.id) s.add(n.id.name);
    if (n.body.type === 'BlockStatement') { hoist(n.body, s); for (const nm of blockNames(n.body.body)) s.add(nm); }
    scopes.push(s);
    for (const p of n.params) defaults(p, depth + 1);
    if (n.body.type === 'BlockStatement') for (const st of n.body.body) visit(st, depth + 1); else visit(n.body, depth + 1);
    scopes.pop();
  }
  function visit(n, depth) {
    if (!n || typeof n.type !== 'string') return;
    switch (n.type) {
      case 'Identifier': ref(n, depth, false); return;
      case 'MemberExpression': visit(n.object, depth); if (n.computed) visit(n.property, depth); return;
      case 'Property': if (n.computed) visit(n.key, depth); visit(n.value, depth); return;
      case 'MethodDefinition': if (n.computed) visit(n.key, depth); fn(n.value, depth); return;
      case 'PropertyDefinition': if (n.computed) visit(n.key, depth); visit(n.value, depth + 1); return;
      case 'VariableDeclaration': for (const d of n.declarations) { defaults(d.id, depth); visit(d.init, depth); } return;
      case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': fn(n, depth); return;
      case 'ClassDeclaration': case 'ClassExpression': {
        const s = new Set(); if (n.type === 'ClassExpression' && n.id) s.add(n.id.name);
        scopes.push(s); visit(n.superClass, depth); visit(n.body, depth); scopes.pop(); return;
      }
      case 'AssignmentExpression': target(n.left, depth); if (n.operator !== '=' && n.left.type === 'Identifier') ref(n.left, depth, false); visit(n.right, depth); return;
      case 'UpdateExpression': if (n.argument.type === 'Identifier') { ref(n.argument, depth, true); ref(n.argument, depth, false); } else visit(n.argument, depth); return;
      case 'BlockStatement': case 'StaticBlock': scopes.push(blockNames(n.body)); for (const st of n.body) visit(st, depth); scopes.pop(); return;
      case 'SwitchStatement': visit(n.discriminant, depth); scopes.push(blockNames(n.cases.flatMap((c) => c.consequent))); for (const c of n.cases) { visit(c.test, depth); for (const st of c.consequent) visit(st, depth); } scopes.pop(); return;
      case 'ForStatement': case 'ForInStatement': case 'ForOfStatement': {
        const s = new Set(), init = n.init || n.left;
        if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') for (const d of init.declarations) addPat(d.id, (nm) => s.add(nm));
        scopes.push(s);
        if (n.type === 'ForStatement') { visit(n.init, depth); visit(n.test, depth); visit(n.update, depth); }
        else { if (n.left.type === 'VariableDeclaration') visit(n.left, depth); else target(n.left, depth); visit(n.right, depth); }
        visit(n.body, depth); scopes.pop(); return;
      }
      case 'CatchClause': { const s = new Set(); addPat(n.param, (nm) => s.add(nm)); scopes.push(s); visit(n.body, depth); scopes.pop(); return; }
      case 'LabeledStatement': visit(n.body, depth); return;
      case 'BreakStatement': case 'ContinueStatement': return;
      case 'ImportDeclaration': return;
      case 'ExportNamedDeclaration': visit(n.declaration, depth); return;
      default:
        for (const k of Object.keys(n)) {
          if (k === 'loc' || k === 'start' || k === 'end' || k === 'type') continue;
          const v = n[k];
          if (Array.isArray(v)) for (const c of v) visit(c, depth); else if (v && typeof v.type === 'string') visit(v, depth);
        }
    }
  }
  for (const st of ast.body) visit(st, 0);
  return { file: rel(abs), src, imports, top, refs, form };
}

// all modules of a game in the order the browser runs them: depth first from the entry, each module after what it imports
// (the same order native modules run in). read(file) → { imports, … }: readModule for checking, or the quick reader for the build.
// A cycle is reported, not followed.
export function walkModules(entry, read = quickModule) {
  const order = [], state = new Map(), cycles = [], mods = new Map(), missing = [];
  const visit = (file, stack) => {
    if (state.get(file) === 'done') return;
    if (state.get(file) === 'busy') { cycles.push([...stack.slice(stack.indexOf(file)), file]); return; }
    state.set(file, 'busy');
    const m = read(file);
    mods.set(file, m);
    for (const im of m.imports) {
      if (!fs.existsSync(path.resolve(root, im.from))) { missing.push(`${file}:${im.line} → ${im.spec}`); continue; }
      visit(im.from, [...stack, file]);
    }
    state.set(file, 'done');
    order.push(file);
  };
  visit(rel(path.resolve(root, entry)), []);
  return { order, mods, cycles, missing };
}
export function quickModule(file) {
  const src = fs.readFileSync(path.resolve(root, file), 'utf8');
  return { file, src, imports: scanImports(file, src) };
}

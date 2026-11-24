// Kiểm thử logic giao diện bằng DOM mô phỏng tối giản (không cần trình duyệt).
// Chạy: node Scripts/check-logic.js
const fs = require('fs');
const vm = require('vm');
const path = require('path');

class El {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.elements = {};
    this._classes = new Set();
    this._text = '';
    this._listeners = {};
    this.hidden = false;
    this.value = '';
    this.name = '';
  }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return Array.from(this._classes).join(' '); }
  get classList() {
    const s = this._classes;
    return { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c) };
  }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
  set innerHTML(html) {
    this.children = [];
    let form = null;
    const re = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    let m;
    while ((m = re.exec(String(html)))) {
      const el = new El(m[1]);
      const attrs = m[2];
      const cls = /class="([^"]*)"/.exec(attrs); if (cls) el.className = cls[1];
      const did = /data-id="([^"]*)"/.exec(attrs); if (did) el.dataset.id = did[1];
      const dst = /data-stat="([^"]*)"/.exec(attrs); if (dst) el.dataset.stat = dst[1];
      const nm = /name="([^"]*)"/.exec(attrs); if (nm) { el.name = nm[1]; if (form) form.elements[nm[1]] = el; }
      if (m[1] === 'form') form = el;
      this.appendChild(el);
    }
  }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  replaceChild(next, old) {
    const i = this.children.indexOf(old);
    if (i >= 0) this.children[i] = next;
    return old;
  }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  fire(type, extra) {
    const ev = Object.assign({ preventDefault() {}, currentTarget: this, target: this }, extra || {});
    (this._listeners[type] || []).forEach(fn => fn.call(this, ev));
  }
  focus() {}
  reset() { Object.keys(this.elements).forEach(k => { this.elements[k].value = ''; }); }
  querySelector(sel) { return query(this, sel)[0] || null; }
}

function walk(root, fn) {
  root.children.forEach(c => { fn(c); walk(c, fn); });
}
function matchOne(el, sel) {
  if (sel.startsWith('.')) return sel.slice(1).split('.').every(c => el.classList.contains(c));
  let m = /^\[data-id="([^"]+)"\]$/.exec(sel); if (m) return el.dataset.id === m[1];
  m = /^\[data-stat="([^"]+)"\]$/.exec(sel); if (m) return el.dataset.stat === m[1];
  return el.tagName === sel;
}
function query(root, sel) {
  const parts = sel.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    // DOM mô phỏng phẳng: chỉ cần phân biệt nhóm cha theo data-id.
    if (parts[0].indexOf('[data-id=') === 0) {
      const base = query(root, parts[0])[0];
      return base ? query(base, parts.slice(1).join(' ')) : [];
    }
    return query(root, parts[parts.length - 1]);
  }
  const out = [];
  walk(root, el => { if (matchOne(el, parts[0])) out.push(el); });
  return out;
}

const ids = {};
['tenant-list', 'tenant-count', 'crumb', 'workspace', 'empty', 'counter-full',
 'counter-patch', 'side-foot', 'btn-add-tenant', 'form-new-tenant', 'btn-cancel-tenant',
 'new-name', 'new-type'].forEach(id => { ids[id] = new El('div'); ids[id].id = id; });

const docRoot = new El('root');
Object.values(ids).forEach(el => docRoot.appendChild(el));
const document = {
  getElementById: id => ids[id] || null,
  createElement: tag => new El(tag),
  querySelector: sel => query(docRoot, sel)[0] || null
};
const storage = {};
const localStorage = {
  getItem: k => Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: k => { delete storage[k]; }
};

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
vm.runInNewContext(source, { document, localStorage, window: { prompt: () => null }, Intl, Date, String, Number, Array, Object, JSON, console });

function assert(cond, label) {
  if (!cond) { console.error('FAIL: ' + label); process.exitCode = 1; }
  else console.log('PASS: ' + label);
}
function counter(id) { return ids[id].textContent; }
function fill(form, values) { Object.keys(values).forEach(k => { form.elements[k].value = values[k]; }); }

assert(counter('counter-full') === 'Render toàn bộ: 0', 'ban đầu chưa render pane nào');

ids['btn-add-tenant'].fire('click');
ids['new-name'].value = 'Công ty A'; ids['new-type'].value = 'company';
ids['form-new-tenant'].fire('submit');
const panes = ids['workspace'].children.filter(c => c.classList.contains('tenant-pane'));
assert(panes.length === 1, 'tạo công ty A -> có 1 vùng riêng');
assert(counter('counter-full') === 'Render toàn bộ: 1', 'tạo công ty A -> render toàn bộ 1 lần');
assert(counter('counter-patch') === 'Cập nhật phần: 0', 'tạo công ty A -> chưa vá phần nào');

const formA = panes[0].querySelector('.voucher-form');
fill(formA, { date: '2026-11-24', note: 'Thu khách', account: '111', kind: 'in', amount: '1000000' });
formA.fire('submit');
assert(panes[0].querySelector('[data-stat="count"]').textContent === '1', 'thêm chứng từ -> số chứng từ cập nhật');
assert(panes[0].querySelector('[data-stat="in"]').textContent.replace(/\D/g, '') === '1000000', 'thêm chứng từ -> tổng thu cập nhật');
assert(panes[0].querySelector('.vtable tbody').children.length === 1, 'thêm chứng từ -> chỉ nối 1 hàng');
assert(counter('counter-full') === 'Render toàn bộ: 1', 'thêm chứng từ -> KHÔNG render lại pane');
assert(counter('counter-patch') === 'Cập nhật phần: 2', 'thêm chứng từ -> vá đúng 2 phần (thống kê + bảng)');

ids['btn-add-tenant'].fire('click');
ids['new-name'].value = 'HKD B'; ids['new-type'].value = 'hkd';
ids['form-new-tenant'].fire('submit');
const panes2 = ids['workspace'].children.filter(c => c.classList.contains('tenant-pane'));
assert(panes2.length === 2, 'tạo công ty B -> có thêm 1 vùng riêng');
assert(panes2[0] === panes[0], 'tạo công ty B -> vùng của A giữ nguyên, không tạo lại');
assert(panes2[1].querySelector('[data-stat="count"]').textContent === '0', 'công ty B bắt đầu rỗng, không lẫn dữ liệu A');
assert(counter('counter-full') === 'Render toàn bộ: 2', 'tạo công ty B -> render toàn bộ 2');

const btnA = ids['tenant-list'].querySelector('[data-id="' + panes[0].dataset.id + '"]');
btnA.fire('click');
assert(panes2[0].hidden === false && panes2[1].hidden === true, 'click công ty A -> chỉ hiện vùng của A');
assert(panes2[0].querySelector('[data-stat="count"]').textContent === '1', 'click lại A -> dữ liệu A vẫn đúng');
assert(counter('counter-full') === 'Render toàn bộ: 2', 'click lại A -> KHÔNG render lại');
assert(counter('counter-patch') === 'Cập nhật phần: 2', 'click lại A -> KHÔNG vá lại khi dữ liệu không đổi');

const keys = Object.keys(storage).filter(k => k.indexOf('ketoan.v1:tenant:') === 0);
assert(keys.some(k => k.endsWith(':data')) && keys.filter(k => k.endsWith(':data')).length === 2, 'mỗi công ty có một khó lưu dữ liệu riêng');

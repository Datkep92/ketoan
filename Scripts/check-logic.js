// Kiểm thử logic giao diện và kho dữ liệu bằng DOM mô phỏng (không cần trình duyệt).
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
    this.id = '';
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

const baseIds = ['tenant-list', 'tenant-count', 'crumb', 'workspace', 'empty', 'counter-full',
  'counter-patch', 'side-foot', 'btn-add-tenant', 'form-new-tenant', 'btn-cancel-tenant',
  'new-name', 'new-type', 'new-mst'];

function boot(seed) {
  const ids = {};
  baseIds.forEach(id => { ids[id] = new El('div'); ids[id].id = id; });
  const docRoot = new El('root');
  Object.values(ids).forEach(el => docRoot.appendChild(el));
  const document = {
    getElementById: id => ids[id] || null,
    createElement: tag => new El(tag),
    querySelector: sel => query(docRoot, sel)[0] || null
  };
  const storage = Object.assign({}, seed || {});
  const localStorage = {
    getItem: k => Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
  };
  const win = { prompt: () => null };
  const sandbox = { document, localStorage, window: win, Intl, Date, String, Number, Array, Object, JSON, Math, console };
  vm.createContext(sandbox);
  const dbSource = fs.readFileSync(path.join(__dirname, '..', 'db.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInContext(dbSource, sandbox, { filename: 'db.js' });
  vm.runInContext(appSource, sandbox, { filename: 'app.js' });
  return { ids, document, storage, localStorage, win, DB: win.KetoanDB };
}

function assert(cond, label) {
  if (!cond) { console.error('FAIL: ' + label); process.exitCode = 1; }
  else console.log('PASS: ' + label);
}
function counter(box, id) { return box.ids[id].textContent; }
function fill(form, values) { Object.keys(values).forEach(k => { form.elements[k].value = values[k]; }); }
function panes(box) { return box.ids['workspace'].children.filter(c => c.classList.contains('tenant-pane')); }

const box = boot();
const ids = box.ids;
const DB = box.DB;

assert(counter(box, 'counter-full') === 'Render toàn bộ: 0', 'ban đầu chưa render pane nào');

ids['btn-add-tenant'].fire('click');
ids['new-name'].value = 'Công ty A'; ids['new-type'].value = 'company'; ids['new-mst'].value = '0100000001';
ids['form-new-tenant'].fire('submit');
const paneA = panes(box)[0];
assert(panes(box).length === 1, 'tạo công ty A -> có 1 vùng riêng');
assert(counter(box, 'counter-full') === 'Render toàn bộ: 1', 'tạo công ty A -> render toàn bộ 1 lần');
assert(counter(box, 'counter-patch') === 'Cập nhật phần: 0', 'tạo công ty A -> chưa vá phần nào');

const formA = paneA.querySelector('.voucher-form');
fill(formA, { date: '2026-11-24', note: 'Thu khách', account: '111', kind: 'in', amount: '1000000' });
formA.fire('submit');
assert(paneA.querySelector('[data-stat="count"]').textContent === '1', 'thêm chứng từ -> số chứng từ cập nhật');
assert(paneA.querySelector('[data-stat="in"]').textContent.replace(/\D/g, '') === '1000000', 'thêm chứng từ -> tổng thu cập nhật');
assert(paneA.querySelector('.vtable tbody').children.length === 1, 'thêm chứng từ -> chỉ nối 1 hàng');
assert(counter(box, 'counter-full') === 'Render toàn bộ: 1', 'thêm chứng từ -> KHÔNG render lại pane');
assert(counter(box, 'counter-patch') === 'Cập nhật phần: 2', 'thêm chứng từ -> vá đúng 2 phần (thống kê + bảng)');

ids['btn-add-tenant'].fire('click');
ids['new-name'].value = 'HKD B'; ids['new-type'].value = 'hkd'; ids['new-mst'].value = '0200000002';
ids['form-new-tenant'].fire('submit');
assert(panes(box).length === 2, 'tạo công ty B -> có thêm 1 vùng riêng');
assert(panes(box)[0] === paneA, 'tạo công ty B -> vùng của A giữ nguyên, không tạo lại');
assert(panes(box)[1].querySelector('[data-stat="count"]').textContent === '0', 'công ty B bắt đầu rỗng, không lẫn dữ liệu A');
assert(counter(box, 'counter-full') === 'Render toàn bộ: 2', 'tạo công ty B -> render toàn bộ 2');

ids['tenant-list'].querySelector('[data-id="0100000001"]').fire('click');
assert(panes(box)[0].hidden === false && panes(box)[1].hidden === true, 'click công ty A -> chỉ hiện vùng của A');
assert(panes(box)[0].querySelector('[data-stat="count"]').textContent === '1', 'click lại A -> dữ liệu A vẫn đúng');
assert(counter(box, 'counter-full') === 'Render toàn bộ: 2', 'click lại A -> KHÔNG render lại');
assert(counter(box, 'counter-patch') === 'Cập nhật phần: 2', 'click lại A -> KHÔNG vá lại khi dữ liệu không đổi');

const rootKeys = Object.keys(box.storage).filter(k => k.indexOf('ketoan.v1:') === 0);
assert(rootKeys.length === 1 && rootKeys[0] === 'ketoan.v1:store', 'chỉ còn đúng một khóa kho dữ liệu chung');
const snap = DB.snapshot();
assert(snap.schemaVersion === 2 && Object.keys(snap.nodes).sort().join(',') === '0100000001,0200000002', 'kho có 2 nhánh mã thuế, đúng phiên bản');
assert(!Object.keys(box.storage).some(k => k.indexOf('ketoan.v1:tenant:') === 0), 'không còn khóa lưu riêng cũ');
assert(snap.nodes['0100000001'].branches.chungtu.vouchers.length === 1, 'chứng từ A nằm đúng nhánh A');
assert(snap.nodes['0200000002'].branches.chungtu.vouchers.length === 0, 'chứng từ B nằm đúng nhánh B');

DB.setPath(['nodes', '0100000001', 'branches', 'danhmuc'], { soTaiKhoan: 5 });
const danhmuc = DB.getPath(['nodes', '0100000001', 'branches', 'danhmuc']);
assert(danhmuc && danhmuc.soTaiKhoan === 5, 'thêm nhánh danh mục mới không cần đổi cấu trúc');

ids['btn-add-tenant'].fire('click');
ids['new-name'].value = 'Trùng MST'; ids['new-type'].value = 'company'; ids['new-mst'].value = '0100000001';
ids['form-new-tenant'].fire('submit');
assert(panes(box).length === 2, 'MST trùng -> không tạo thêm nhánh');
assert(ids['side-foot'].textContent.indexOf('đã có') >= 0, 'MST trùng -> có thông báo trên thanh bên');

ids['btn-add-tenant'].fire('click');
ids['new-name'].value = 'Không MST'; ids['new-type'].value = 'company'; ids['new-mst'].value = '';
ids['form-new-tenant'].fire('submit');
assert(panes(box).length === 3, 'MST trống -> vẫn tạo được một nhánh riêng');
assert(Object.keys(DB.snapshot().nodes).some(k => k.indexOf('MST-') === 0), 'MST trống -> khóa nhánh được tự tạo');

const legacySeed = {
  'ketoan.v1:tenants': JSON.stringify([{ id: 'old1', name: 'Công ty cũ', type: 'company', mst: '0300000003', createdAt: 'x', updatedAt: 'x' }]),
  'ketoan.v1:tenant:old1:meta': JSON.stringify({ id: 'old1', name: 'Công ty cũ', type: 'company', mst: '0300000003' }),
  'ketoan.v1:tenant:old1:data': JSON.stringify({ rev: 2, vouchers: [{ id: 'v1', date: '2026-01-01', note: 'Thu cũ', account: '111', kind: 'in', amount: 500000 }], accounts: [{ code: '111', name: 'Tiền mặt' }] })
};
const oldBox = boot(legacySeed);
const oldSnap = oldBox.DB.snapshot();
assert(oldSnap.schemaVersion === 2 && !!oldSnap.nodes['0300000003'], 'dữ liệu cũ -> chuyển thành nhánh MST');
assert(oldSnap.nodes['0300000003'].branches.chungtu.vouchers[0].note === 'Thu cũ', 'dữ liệu cũ -> giữ nguyên chứng từ');
assert(!Object.keys(oldBox.storage).some(k => k.indexOf('ketoan.v1:tenant:') === 0), 'dữ liệu cũ -> khóa cũ được dọn');
assert(panes(oldBox).length === 1 && panes(oldBox)[0].querySelector('[data-stat="count"]').textContent === '1', 'dữ liệu cũ -> mở đúng pane khi khởi động');

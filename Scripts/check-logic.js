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
    this._html = String(html);
    this.children = [];
    let form = null;
    const re = /<([a-zA-Z][\w-]*)([^>]*)>/g;
    let m;
    while ((m = re.exec(String(html)))) {
      const el = new El(m[1]);
      const attrs = m[2];
      const cls = /class="([^"]*)"/.exec(attrs); if (cls) el.className = cls[1];
      const dataRe = /data-([\w-]+)="([^"]*)"/g;
      let dm;
      while ((dm = dataRe.exec(attrs))) {
        const key = dm[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        el.dataset[key] = dm[2];
      }
      const vl = /value="([^"]*)"/.exec(attrs); if (vl) el.value = vl[1];
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
  click() {}
  querySelector(sel) { return query(this, sel)[0] || null; }
  querySelectorAll(sel) { return query(this, sel); }
}

function walk(root, fn) {
  root.children.forEach(c => { fn(c); walk(c, fn); });
}
function matchOne(el, sel) {
  if (sel.startsWith('.')) return sel.slice(1).split('.').every(c => el.classList.contains(c));
  let m = /^\[data-([\w-]+)="([^"]+)"\]$/.exec(sel);
  if (m) {
    const key = m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return el.dataset[key] === m[2];
  }
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
  const win = { prompt: () => null, confirm: () => true, URL: { createObjectURL: () => '', revokeObjectURL: () => {} } };
  const sandbox = { document, localStorage, window: win, Intl, Date, String, Number, Array, Object, JSON, Math, console, Blob: function () {} };
  vm.createContext(sandbox);
  const sources = [
    'db.js',
    'js/core.js',
    'js/modules/danhmuc.js',
    'js/modules/chungtu.js',
    'js/modules/congno.js',
    'js/modules/baocao.js',
    'js/modules/caidat.js',
    'js/modules/tonkho.js',
    'js/modules/banhang.js',
    'js/modules/hoadon.js',
    'js/modules/muahang.js',
    'js/modules/cashbank.js',
    'js/modules/taisan.js',
    'app.js'
  ];
  sources.forEach(name => {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), sandbox, { filename: name });
  });
  return { ids, document, storage, localStorage, win, DB: win.KetoanDB, Ketoan: win.Ketoan };
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

// ---------- Khung module: các phần mới cùng chạy trên một kho dữ liệu ----------
function sectionOf(pane, name) { return pane.querySelectorAll('.module-section').filter(s => s.dataset.module === name)[0]; }
function tabOf(pane, name) { return pane.querySelectorAll('.module-tab').filter(t => t.dataset.tab === name)[0]; }

assert(paneA.querySelectorAll('.module-tab').map(t => t.dataset.tab).join(',') ===
  'chungtu,danhmuc,congno,baocao,caidat,tonkho,banhang,hoadon,muahang,cashbank,taisan', 'khung có đủ mười một phần');
assert(Object.keys(box.Ketoan.modules).length === 11, 'mười một module cùng đăng ký vào một nơi');
const branchesA = DB.snapshot().nodes['0100000001'].branches;
assert(['chungtu', 'danhmuc', 'congno', 'baocao', 'caidat', 'tonkho', 'banhang', 'hoadon',
  'muahang', 'cashbank', 'taisan'].every(n => !!branchesA[n]),
  'mỗi công ty có đủ nhánh dữ liệu riêng cho các phần');
assert(counter(box, 'counter-full') === 'Render toàn bộ: 3', 'thêm module không render lại pane cũ');

tabOf(paneA, 'danhmuc').fire('click');
const dmSec = sectionOf(paneA, 'danhmuc');
assert(dmSec.hidden === false && sectionOf(paneA, 'chungtu').hidden === true, 'chuyển phần -> chỉ hiện phần được chọn');

const patchBefore = Number(counter(box, 'counter-patch').replace(/\D/g, ''));
const dmForm = dmSec.querySelector('.dm-form');
fill(dmForm, { type: 'customers', code: '', name: 'Khách A', extra: '0123456789', price: '' });
dmForm.fire('submit');
const dmList = dmSec.querySelector('[data-kind="customers"]');
assert(dmList && dmList.children.filter(c => c.tagName === 'li').length === 1, 'thêm khách hàng -> hiện đúng danh sách');
assert(Number(counter(box, 'counter-patch').replace(/\D/g, '')) > patchBefore, 'thêm danh mục -> tăng cập nhật phần');

fill(dmForm, { type: 'accounts', code: '3387', name: 'Phải thu khác', extra: '', price: '' });
dmForm.fire('submit');
const accountField = sectionOf(paneA, 'chungtu').querySelector('.voucher-form').elements['account'];
assert(accountField && String(accountField._html || '').indexOf('3387') >= 0, 'thêm tài khoản -> form chứng từ cập nhật');

tabOf(paneA, 'congno').fire('click');
const cnSec = sectionOf(paneA, 'congno');
const cnForm = cnSec.querySelector('.cn-form');
fill(cnForm, { type: 'phaiThu', partner: 'Khách A', amount: '2000000', paid: '500000', due: '2026-12-31' });
cnForm.fire('submit');
assert(cnSec.querySelector('.cn-table tbody').children.filter(c => c.tagName === 'tr').length === 1, 'thêm công nợ -> thêm đúng một dòng');
assert(cnSec.querySelector('[data-cn="conThu"]').textContent.replace(/\D/g, '') === '1500000', 'công nợ -> còn thu đúng');

tabOf(paneA, 'baocao').fire('click');
const bcSec = sectionOf(paneA, 'baocao');
assert(bcSec.querySelector('[data-report="revenue"]').textContent.replace(/\D/g, '') === '1000000',
  'báo cáo -> doanh thu lấy từ chứng từ của đúng công ty');
assert(bcSec.querySelector('[data-report="conThu"]').textContent.replace(/\D/g, '') === '1500000',
  'báo cáo -> còn thu lấy từ công nợ');

tabOf(paneA, 'caidat').fire('click');
const setSec = sectionOf(paneA, 'caidat');
const setForm = setSec.querySelector('.setup-form');
fill(setForm, { currency: 'VND', symbol: 'HD/26', year: '2026', note: 'Kỳ thử' });
setForm.fire('submit');
assert(DB.getPath(['nodes', '0100000001', 'branches', 'caidat', 'donViTien']) === 'VND', 'thiết lập -> lưu đúng nhánh');

const backup = DB.snapshot();
assert(Object.keys(backup.nodes).length === 3, 'xuất dữ liệu -> bản sao có đủ công ty');
assert(DB.replaceAll(backup) === true, 'nhập lại bản sao hợp lệ');
assert(DB.replaceAll({ schemaVersion: 99, nodes: {} }) === false, 'từ chối bản dữ liệu phiên bản lạ');

// ---------- Kho, bán hàng, hóa đơn nối vào chung từ, công nợ và báo cáo ----------
function branchOf(name) { return DB.getPath(['nodes', '0100000001', 'branches', name]); }
function stockOf() { return branchOf('tonkho').stock || {}; }

tabOf(paneA, 'tonkho').fire('click');
const khoSec = sectionOf(paneA, 'tonkho');
const khoForm = khoSec.querySelector('.kho-form');
fill(khoForm, { code: 'SP01', name: 'Dịch vụ dọn dẹp', unit: 'ca', qty: '20', price: '50000' });
khoForm.fire('submit');
assert(branchOf('danhmuc').items.length === 1, 'thêm hàng -> danh mục có mặt hàng mới');
const itemId = branchOf('danhmuc').items[0].id;
assert(stockOf()[itemId] === 20, 'thêm hàng -> tồn kho ban đầu đúng');
assert(khoSec.querySelector('[data-kho="qty"]').textContent === '20', 'kho -> tổng tồn cập nhật');
assert(bcSec.querySelector('[data-report="tonKho"]').textContent.replace(/\D/g, '') === '1000000',
  'báo cáo -> giá trị tồn kho lấy từ kho của đúng công ty');

const adjustForm = khoSec.querySelector('.kho-adjust');
fill(adjustForm, { item: itemId, type: 'nhap', qty: '5', note: 'Nhập bù' });
adjustForm.fire('submit');
assert(stockOf()[itemId] === 25, 'nhập kho -> cộng đúng số lượng');
fill(adjustForm, { item: itemId, type: 'xuat', qty: '100', note: 'Thử xuất quá' });
adjustForm.fire('submit');
assert(stockOf()[itemId] === 25, 'xuất quá tồn -> từ chối, không trừ tồn');
assert(ids['side-foot'].textContent.indexOf('không đủ') >= 0, 'xuất quá tồn -> có thông báo');

tabOf(paneA, 'banhang').fire('click');
const bhSec = sectionOf(paneA, 'banhang');
const bhForm = bhSec.querySelector('.bh-form');
fill(bhForm, { date: '2026-11-24', item: itemId, qty: '10', price: '50000', paid: '300000', note: 'Bán dịch vụ' });
bhForm.fire('submit');
assert(stockOf()[itemId] === 15, 'bán hàng -> trừ đúng tồn kho');
assert(bhSec.querySelector('[data-bh="revenue"]').textContent.replace(/\D/g, '') === '500000',
  'bán hàng -> tổng doanh thu cập nhật');
assert(branchOf('chungtu').vouchers.length === 2, 'bán hàng -> ghi thêm một phiếu thu');
assert(branchOf('chungtu').vouchers[1].amount === 300000, 'bán hàng -> phiếu thu đúng số tiền đã thu');
assert(branchOf('congno').records.length === 2, 'bán hàng -> ghi thêm một khoản phải thu');
assert(branchOf('congno').records[1].amount === 200000, 'bán hàng -> công nợ đúng phần chưa thu');
assert(bcSec.querySelector('[data-report="revenue"]').textContent.replace(/\D/g, '') === '1300000',
  'báo cáo -> cộng tiền thu từ bán hàng');
assert(bcSec.querySelector('[data-report="banHang"]').textContent.replace(/\D/g, '') === '500000',
  'báo cáo -> doanh thu bán hàng đúng');

fill(bhForm, { date: '2026-11-24', item: itemId, qty: '100', price: '50000', paid: '0' });
bhForm.fire('submit');
assert(branchOf('banhang').orders.length === 1, 'bán quá tồn -> không lưu phiếu mới');
assert(stockOf()[itemId] === 15, 'bán quá tồn -> tồn kho giữ nguyên');

tabOf(paneA, 'hoadon').fire('click');
const hdSec = sectionOf(paneA, 'hoadon');
const hdForm = hdSec.querySelector('.hd-form');
fill(hdForm, { sale: branchOf('banhang').orders[0].id, date: '2026-11-24', tax: '8', paid: '100000' });
hdForm.fire('submit');
assert(branchOf('hoadon').invoices.length === 1, 'hóa đơn -> lưu đúng một hóa đơn');
assert(branchOf('hoadon').invoices[0].so === 'HD/26-001', 'hóa đơn -> số tự tạo theo ký hiệu thiết lập');
assert(branchOf('hoadon').invoices[0].total === 540000, 'hóa đơn -> tính đúng tiền thuế và tổng');
assert(hdSec.querySelector('[data-hd="total"]').textContent.replace(/\D/g, '') === '540000',
  'hóa đơn -> tổng thanh toán cập nhật');
assert(bcSec.querySelector('[data-report="hoaDon"]').textContent.replace(/\D/g, '') === '540000',
  'báo cáo -> tổng hóa đơn cập nhật');

fill(hdForm, { sale: '', so: 'HD/26-001', date: '2026-11-24', customer: 'Khách khác', amount: '100000', tax: '0', paid: '0' });
hdForm.fire('submit');
assert(branchOf('hoadon').invoices.length === 1, 'trùng số hóa đơn -> không lưu thêm');
assert(ids['side-foot'].textContent.indexOf('đã có') >= 0, 'trùng số hóa đơn -> có thông báo');

// ---------- Mua hàng, quỹ, tài sản và trả hàng ----------
fill(dmForm, { type: 'suppliers', code: '', name: 'NCC A', extra: '', price: '' });
dmForm.fire('submit');
const supplierId = branchOf('danhmuc').suppliers[0].id;

tabOf(paneA, 'muahang').fire('click');
const mhSec = sectionOf(paneA, 'muahang');
const mhForm = mhSec.querySelector('.mh-form');
fill(mhForm, { date: '2026-11-25', supplier: supplierId, item: itemId, qty: '3', price: '100000', tax: '10', paid: '110000', note: 'Nhập hàng' });
mhForm.fire('submit');
assert(branchOf('muahang').purchases.length === 1, 'mua hàng -> lưu đúng một phiếu mua');
assert(stockOf()[itemId] === 18, 'mua hàng -> cộng đúng tồn kho');
assert(mhSec.querySelector('[data-mh="amount"]').textContent.replace(/\D/g, '') === '330000',
  'mua hàng -> tổng tiền gồm thuế cập nhật');
assert(branchOf('chungtu').vouchers.length === 3 && branchOf('chungtu').vouchers[2].amount === 110000,
  'mua hàng -> tiền đã trả thành chứng từ chi');
assert(branchOf('congno').records.length === 3 && branchOf('congno').records[2].type === 'phaiTra' &&
  branchOf('congno').records[2].amount === 220000, 'mua hàng -> phần chưa trả thành khoản phải trả');

const mhBillForm = mhSec.querySelector('.mh-bill-form');
fill(mhBillForm, { purchase: '', so: 'HH/26-001', date: '2026-11-25', supplier: 'NCC A', amount: '200000', tax: '10', paid: '50000', note: '' });
mhBillForm.fire('submit');
assert(branchOf('muahang').bills.length === 1 && branchOf('muahang').bills[0].so === 'HH/26-001',
  'hóa đơn đầu vào -> số hóa đơn lưu đúng');
assert(branchOf('muahang').bills[0].total === 220000, 'hóa đơn đầu vào -> tính đúng tiền thuế');
fill(mhBillForm, { purchase: '', so: 'HH/26-001', date: '2026-11-25', supplier: 'NCC A', amount: '100000', tax: '0', paid: '0', note: '' });
mhBillForm.fire('submit');
assert(branchOf('muahang').bills.length === 1 && ids['side-foot'].textContent.indexOf('đã có') >= 0,
  'hóa đơn đầu vào -> trùng số bị từ chối');

tabOf(paneA, 'cashbank').fire('click');
const cbSec = sectionOf(paneA, 'cashbank');
const cbForm = cbSec.querySelector('.cb-form');
fill(cbForm, { date: '2026-11-26', type: 'in', account: '111', amount: '500000', note: 'Thu vốn' });
cbForm.fire('submit');
assert(branchOf('cashbank').entries.length === 1, 'quỹ -> lưu đúng một phiếu thu');
assert(cbSec.querySelector('[data-cb="balance"]').textContent.replace(/\D/g, '') === '500000',
  'quỹ -> số dư tính đúng');
assert(branchOf('chungtu').vouchers.length === 4, 'quỹ -> đồng thời ghi chứng từ');
assert(bcSec.querySelector('[data-report="cash"]').textContent.replace(/\D/g, '') === '1690000',
  'báo cáo -> tiền còn cập nhật theo phiếu quỹ');

tabOf(paneA, 'taisan').fire('click');
const tsSec = sectionOf(paneA, 'taisan');
const tsForm = tsSec.querySelector('.ts-form');
fill(tsForm, { name: 'Máy tính', date: '2026-11-01', cost: '1200000', years: '2', note: '' });
tsForm.fire('submit');
assert(branchOf('taisan').assets.length === 1, 'tài sản -> thêm đúng một tài sản');
const assetId = branchOf('taisan').assets[0].id;
fill(tsSec.querySelector('.ts-dep-form'), { asset: assetId, date: '2026-11-30', months: '1' });
tsSec.querySelector('.ts-dep-form').fire('submit');
assert(branchOf('taisan').assets[0].accumulated === 50000, 'khấu hao -> tính đúng một tháng');
assert(tsSec.querySelector('[data-ts="left"]').textContent.replace(/\D/g, '') === '1150000',
  'tài sản -> giá trị còn lại đúng');
assert(bcSec.querySelector('[data-report="khauHao"]').textContent.replace(/\D/g, '') === '50000',
  'báo cáo -> khấu hao cập nhật');
assert(bcSec.querySelector('[data-report="taiSan"]').textContent.replace(/\D/g, '') === '1200000',
  'báo cáo -> nguyên giá tài sản cập nhật');
assert(bcSec.querySelector('[data-report="muaHang"]').textContent.replace(/\D/g, '') === '330000',
  'báo cáo -> tổng mua hàng cập nhật');
assert(bcSec.querySelector('[data-report="hoaDonVao"]').textContent.replace(/\D/g, '') === '220000',
  'báo cáo -> tổng hóa đơn đầu vào cập nhật');

tabOf(paneA, 'banhang').fire('click');
const returnForm = bhSec.querySelector('.bh-return-form');
fill(returnForm, { order: branchOf('banhang').orders[0].id, date: '2026-11-27', qty: '2', note: 'Hàng lỗi' });
returnForm.fire('submit');
assert(branchOf('banhang').orders[0].returnedQty === 2, 'trả hàng -> ghi đúng số lượng trả');
assert(stockOf()[itemId] === 20, 'trả hàng -> hoàn nhập tồn kho');
assert(bhSec.querySelector('[data-bh="revenue"]').textContent.replace(/\D/g, '') === '400000',
  'trả hàng -> doanh thu bán giảm đúng');
assert(branchOf('congno').records[1].amount === 200000,
  'trả hàng -> phần đã hoàn tiền không làm giảm công nợ');
assert(bcSec.querySelector('[data-report="banHang"]').textContent.replace(/\D/g, '') === '400000',
  'báo cáo -> doanh thu bán hàng đã trừ hàng trả');

ids['tenant-list'].querySelector('[data-id="0200000002"]').fire('click');
assert(sectionOf(panes(box)[1], 'tonkho').querySelector('[data-kho="qty"]').textContent === '0',
  'công ty B -> kho riêng, không lẫn dữ liệu của A');
ids['tenant-list'].querySelector('[data-id="0100000001"]').fire('click');
assert(stockOf()[itemId] === 20 && branchOf('banhang').orders.length === 1 && branchOf('hoadon').invoices.length === 1,
  'quay lại công ty A -> kho, bán hàng, hóa đơn vẫn đúng');
assert(counter(box, 'counter-full') === 'Render toàn bộ: 3', 'thêm ba phần -> KHÔNG render lại pane cũ');

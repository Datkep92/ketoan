// Phần dùng chung cho mọi tính năng: đăng ký module và các hàm tiện ích.
// Nạp bằng script thường để vẫn chạy được khi mở trực tiếp index.html (file://).
(function (global) {
  'use strict';

  var DB = global.KetoanDB;
  var modules = {};
  var order = [];

  function register(name, def) {
    if (!name || !def) return;
    def.name = name;
    def.order = typeof def.order === 'number' ? def.order : 100;
    if (!modules[name]) order.push(name);
    modules[name] = def;
    order.sort(function (a, b) { return modules[a].order - modules[b].order; });
  }

  function list() {
    return order.map(function (name) { return modules[name]; });
  }

  function nodeKey(meta) {
    if (!meta) return '';
    return String(meta.key || meta.mst || meta.id || '').toUpperCase();
  }

  function sig(value) {
    try { return JSON.stringify(value); } catch (e) { return String(value); }
  }

  function money(n) {
    return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + ' đ';
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function uid(prefix) {
    return DB && DB.uid ? DB.uid(prefix) : prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function currentUser() {
    return DB && DB.currentUser ? DB.currentUser() : null;
  }

  // Chưa đăng nhập (môi trường kiểm thử) thì vẫn cho thao tác như trước.
  function can(action) {
    var user = currentUser();
    if (!user) return true;
    if (user.role === 'admin') return true;
    if (user.role === 'viewer') return action === 'read';
    if (user.role === 'accountant') {
      return ['settings', 'users', 'import', 'export', 'lock'].indexOf(action) < 0;
    }
    return false;
  }

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Mọi module đọc/ghi qua một cây chung; nhánh của module tự được tạo nếu thiếu.
  function data(key, mod) {
    var fallback = mod && mod.defaults ? mod.defaults() : {};
    if (!DB) return fallback;
    if (mod && mod.branch) DB.ensureBranch(key, mod.branch, fallback);
    return mod && mod.branch ? DB.branch(key, mod.branch, fallback) : fallback;
  }

  function save(key, mod, value) {
    if (!DB || !mod || !mod.branch || !can('write')) return null;
    return DB.saveBranch(key, mod.branch, value);
  }

  // Danh mục là nguồn tài khoản duy nhất cho form chứng từ.
  function accounts(key) {
    var dm = modules.danhmuc;
    var value = dm ? data(key, dm) : null;
    if (value && value.accounts && value.accounts.length) return value.accounts.slice();
    return DB && DB.defaultAccounts ? DB.defaultAccounts() : [];
  }

  // Các phần mới đọc danh mục và kho theo đúng mã số thuế, không tạo bản sao.
  function listFrom(key, modName, field) {
    var mod = modules[modName];
    var value = mod ? data(key, mod) : null;
    return value && Array.isArray(value[field]) ? value[field].slice() : [];
  }
  function hangHoa(key) { return listFrom(key, 'danhmuc', 'items'); }
  function khachHang(key) { return listFrom(key, 'danhmuc', 'customers'); }
  function donBan(key) { return listFrom(key, 'banhang', 'orders'); }
  function tonKho(key) {
    var mod = modules.tonkho;
    var value = mod ? data(key, mod) : null;
    return value && value.stock && typeof value.stock === 'object' && !Array.isArray(value.stock) ? value.stock : {};
  }

  // Cầu nối dùng chung cho các thao tác chạm nhiều nhánh: kiểm chỉ đọc một lần,
  // sau đó lưu từng nhánh. Module mới chỉ cần khai báo dữ liệu cần ghi.
  function isReadOnly() { return !!(DB && DB.isReadOnly && DB.isReadOnly()); }
  function branch(key, modName) {
    var mod = modules[modName];
    return mod ? data(key, mod) : {};
  }
  function nhaCungCap(key) { return listFrom(key, 'danhmuc', 'suppliers'); }
  function chungTu(key) { return listFrom(key, 'chungtu', 'vouchers'); }
  function congNo(key) { return listFrom(key, 'congno', 'records'); }
  function donMua(key) { return listFrom(key, 'muahang', 'purchases'); }
  function hoaDonVao(key) { return listFrom(key, 'muahang', 'bills'); }
  function hoaDon(key) { return listFrom(key, 'hoadon', 'invoices'); }
  function phieuQuy(key) { return listFrom(key, 'cashbank', 'entries'); }
  function taiSan(key) { return listFrom(key, 'taisan', 'assets'); }
  function roundMoney(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function nextCode(list, prefix, width) {
    var nums = (list || []).map(function (row) {
      var m = /-(\d+)$/.exec(String(row.ma || row.so || ''));
      return m ? Number(m[1]) : 0;
    });
    var n = Math.max.apply(Math, [0].concat(nums)) + 1;
    return prefix + '-' + String(n).padStart(width || 4, '0');
  }
  function commit(key, writes, ctx, okText) {
    if (isReadOnly()) {
      if (ctx && ctx.foot) ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, thay đổi chưa được lưu.');
      return false;
    }
    for (var i = 0; i < writes.length; i++) {
      var mod = modules[writes[i].module];
      if (!mod || !save(key, mod, writes[i].value)) {
        if (ctx && ctx.foot) ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, thay đổi chưa được lưu.');
        return false;
      }
    }
    if (ctx && ctx.foot && okText) ctx.foot(okText);
    return true;
  }

  // Nối một phiếu thu/chi vào khoản công nợ đang chọn. Trả về bản ghi cần lưu
  // để bên gọi đưa vào cùng một lần commit với chứng từ.
  function linkCongNo(key, voucher) {
    if (!voucher || !voucher.linkId || !modules.congno) return null;
    var cn = data(key, modules.congno);
    var found = null;
    (cn.records || []).forEach(function (r) { if (r.id === voucher.linkId) found = r; });
    if (!found) return null;
    if (!Array.isArray(found.voucherIds)) found.voucherIds = [];
    found.voucherIds.push(voucher.id);
    var match = (voucher.kind === 'in' && found.type !== 'phaiTra') ||
      (voucher.kind === 'out' && found.type === 'phaiTra');
    if (match) found.paid = roundMoney((Number(found.paid) || 0) + (Number(voucher.amount) || 0));
    return { module: 'congno', value: cn };
  }

  // Phiếu đã hủy vẫn được giữ lại để tra cứu nhưng không vào sổ, báo cáo và thống kê.
  function activeVouchers(list) {
    return (list || []).filter(function (v) {
      return v && !v.voided && (Number(v.amount) || 0) > 0;
    });
  }

  // Đảo lại liên kết công nợ khi hủy phiếu thu/chi.
  function unlinkCongNo(key, voucher) {
    if (!voucher || !voucher.linkId || !modules.congno) return null;
    var cn = data(key, modules.congno);
    var found = null;
    (cn.records || []).forEach(function (r) { if (r.id === voucher.linkId) found = r; });
    if (!found) return null;
    found.voucherIds = (found.voucherIds || []).filter(function (id) { return id !== voucher.id; });
    var match = (voucher.kind === 'in' && found.type !== 'phaiTra') ||
      (voucher.kind === 'out' && found.type === 'phaiTra');
    if (match) {
      found.paid = roundMoney(Math.max(0, (Number(found.paid) || 0) - (Number(voucher.amount) || 0)));
    }
    return { module: 'congno', value: cn };
  }

  // Số dư sổ của một tài khoản tiền đến cuối tháng; dùng để đối chiếu sao kê.
  function bankBalance(entries, account, untilMonth) {
    var code = String(account || '111');
    var limit = untilMonth ? String(untilMonth) + '-31' : '';
    var total = 0;
    (entries || []).forEach(function (e) {
      if (String(e.account || '111') !== code) return;
      if (limit && String(e.date || '') > limit) return;
      total += (e.type === 'out' ? -1 : 1) * (Number(e.amount) || 0);
    });
    return roundMoney(total);
  }

  // ---------- Nghiệp vụ mở rộng ----------
  // Các hàm này không thay cách lưu cũ: định khoản mới là nguồn bút toán bổ sung,
  // chứng từ/bán hàng/mua hàng cũ vẫn được suy ra như trước để dữ liệu cũ không mất.
  function monthOf(date) { return String(date || '').slice(0, 7); }

  function lockUntil(key) {
    var kk = modules.khoaky ? data(key, modules.khoaky) : {};
    return kk && kk.lockedUntil ? String(kk.lockedUntil) : '';
  }

  function isLocked(key, date) {
    var until = lockUntil(key);
    var month = monthOf(date);
    return !!(until && month && month <= until);
  }

  function audit(key, action, detail) {
    var mod = modules.quanly;
    if (!mod) return;
    var store = data(key, mod);
    if (!Array.isArray(store.audit)) store.audit = [];
    store.audit.unshift({
      id: uid('log'), at: new Date().toISOString(),
      action: String(action || ''), detail: String(detail || ''),
      user: (currentUser() || {}).name || ''
    });
    if (store.audit.length > 200) store.audit.length = 200;
    save(key, mod, store);
  }

  // Chặn ghi vào kỳ đã khóa trước khi module thay đổi dữ liệu.
  function guard(ctx, date, action) {
    if (!can('write')) {
      if (ctx && ctx.foot) ctx.foot('Người dùng này chỉ được xem, không thể thay đổi dữ liệu.');
      return false;
    }
    if (isReadOnly()) {
      if (ctx && ctx.foot) ctx.foot('Dữ liệu đang ở chế độ chỉ đọc, thay đổi chưa được lưu.');
      return false;
    }
    if (isLocked(ctx.key, date)) {
      if (ctx && ctx.foot) ctx.foot('Kỳ ' + monthOf(date) + ' đã khóa. Vào phần Khóa kỳ & số dư để mở kỳ.');
      return false;
    }
    if (action) audit(ctx.key, action, monthOf(date));
    return true;
  }

  function updateIn(key, modName, id, patch) {
    var mod = modules[modName];
    if (!mod) return null;
    var store = data(key, mod);
    var field = mod.recordField || 'records';
    var rows = Array.isArray(store[field]) ? store[field] : [];
    var found = null;
    rows.forEach(function (row) { if (row && row.id === id) found = row; });
    if (!found) return null;
    Object.keys(patch || {}).forEach(function (k) { found[k] = patch[k]; });
    found.updatedAt = new Date().toISOString();
    return { module: modName, value: store };
  }

  function removeFrom(key, modName, id) {
    var mod = modules[modName];
    if (!mod) return null;
    var store = data(key, mod);
    var field = mod.recordField || 'records';
    var rows = Array.isArray(store[field]) ? store[field] : [];
    var next = rows.filter(function (row) { return !row || row.id !== id; });
    if (next.length === rows.length) return null;
    store[field] = next;
    store.updatedAt = new Date().toISOString();
    return { module: modName, value: store };
  }

  function addEntry(out, date, note, debit, credit, amount, source) {
    out.push({
      date: date || '', note: note || '', debit: debit || '', credit: credit || '',
      amount: roundMoney(amount), source: source || ''
    });
  }

  // Ghép dòng Nợ/Có thành các bút toán cân bằng; dùng cho định khoản và kết chuyển.
  function linesToEntries(out, v, source) {
    var lines = Array.isArray(v.lines) ? v.lines : [];
    var debits = [], credits = [];
    lines.forEach(function (l) {
      var d = roundMoney(Number(l.debit) || 0);
      var c = roundMoney(Number(l.credit) || 0);
      if (d > 0) debits.push({ account: String(l.account || ''), amount: d });
      else if (c > 0) credits.push({ account: String(l.account || ''), amount: c });
    });
    var ci = 0, used = 0;
    debits.forEach(function (d) {
      var need = d.amount;
      while (need > 0.009 && ci < credits.length) {
        var take = Math.min(need, roundMoney(credits[ci].amount - used));
        if (!(take > 0)) { ci++; used = 0; continue; }
        addEntry(out, v.date, (v.so ? v.so + ' ' : '') + (v.note || ''), d.account, credits[ci].account, take, source);
        need = roundMoney(need - take);
        used = roundMoney(used + take);
        if (used >= credits[ci].amount - 0.009) { ci++; used = 0; }
      }
    });
  }

  // Suy ra bút toán từ các nghiệp vụ đã có; phần định khoản thêm vào sau cùng.
  function journalFrom(src) {
    var out = [];
    var ct = src.ct || {}, bh = src.bh || {}, mh = src.mh || {}, ts = src.ts || {};
    var dk = src.dk || {}, cb = src.cb || {}, cn = src.cn || {}, kk = src.kk || {};
    var hd = src.hd || {};
    activeVouchers(ct.vouchers).forEach(function (v) {
      var amount = Number(v.amount) || 0;
      if (!(amount > 0)) return;
      var acc = v.account || '';
      var cash = (acc === '111' || acc === '112') ? acc : '111';
      var other = (acc === '111' || acc === '112') ? '' : acc;
      var from = String(v.source || '');
      if (!other) {
        if (from.indexOf('luong-insurance') === 0) other = '338';
        else if (from.indexOf('luong') === 0) other = '334';
        else if (from.indexOf('hdon-paid') === 0) other = '131';
        else if (from.indexOf('banhang-return') === 0) other = '511';
        else if (from.indexOf('muahang') === 0) other = '331';
        else if (v.kind === 'in') other = /thu/i.test(v.note || '') ? '3387' : '511';
        else other = /tra|hoàn|mua/i.test(v.note || '') ? '331' : '642';
      }
      if (v.kind === 'in') addEntry(out, v.date, v.note, cash, other, amount, from || 'chungtu');
      else addEntry(out, v.date, v.note, other, cash, amount, from || 'chungtu');
    });
    (bh.orders || []).forEach(function (o) {
      var paid = Number(o.paid) || 0;
      (o.returns || []).forEach(function (r) { paid -= Number(r.refund) || 0; });
      var remain = roundMoney((Number(o.amount) || 0) - (Number(o.returned) || 0) - paid);
      if (remain > 0) addEntry(out, o.date, 'Công nợ bán ' + (o.ma || o.id), '131', '511', remain, 'banhang');
      var cogs = roundMoney(Number(o.cogs) || 0);
      if (cogs > 0) addEntry(out, o.date, 'Giá vốn ' + (o.ma || o.id), '632', '152', cogs, 'banhang-cogs');
      (o.returns || []).forEach(function (r) {
        var back = roundMoney(Number(r.cogs) || 0);
        if (back > 0) addEntry(out, r.date || o.date, 'Hoàn giá vốn ' + (o.ma || o.id), '152', '632', back, 'banhang-return-cogs');
      });
    });
    (hd.invoices || []).forEach(function (inv) {
      var tax = roundMoney(Number(inv.taxAmount) || 0);
      if (tax > 0) addEntry(out, inv.date, 'Thuế GTGT đầu ra HĐ ' + (inv.so || ''), '131', '3331', tax, 'hdon-vat');
      if (!inv.saleId) {
        var amount = roundMoney(Number(inv.amount) || 0);
        if (amount > 0) addEntry(out, inv.date, 'Doanh thu HĐ ' + (inv.so || ''), '131', '511', amount, 'hdon');
      }
    });
    (mh.purchases || []).forEach(function (p) {
      var total = roundMoney(Number(p.total) || 0);
      var tax = roundMoney(Number(p.taxAmount) || 0);
      var goods = roundMoney(total - tax);
      if (goods > 0) addEntry(out, p.date, 'Mua hàng ' + (p.ma || p.id), '152', '331', goods, 'muahang');
      if (tax > 0) addEntry(out, p.date, 'Thuế GTGT đầu vào ' + (p.ma || p.id), '1331', '331', tax, 'muahang-vat');
      (p.returns || []).forEach(function (r) {
        if (Number(r.total) > 0) addEntry(out, r.date || p.date, 'Trả hàng mua ' + (p.ma || p.id), '331', '152', r.total, 'muahang-return');
      });
    });
    (ts.assets || []).forEach(function (a) {
      var cost = roundMoney(Number(a.cost) || 0);
      if (cost > 0) {
        var pay = String(a.payment || '') === 'credit' ? '331' : '111';
        addEntry(out, a.date, 'Mua tài sản ' + (a.name || ''), '211', pay, cost, 'taisan-purchase');
      }
      if (a.disposed) return;
      (a.depreciation || []).forEach(function (d) {
        var amount = roundMoney(Number(d.amount) || 0);
        if (amount > 0) addEntry(out, d.date || a.date, 'Khấu hao ' + (a.name || ''), '642', '214', amount, 'taisan');
      });
    });
    (ts.disposals || []).forEach(function (d) {
      var cost = roundMoney(Number(d.cost) || 0);
      var acc = roundMoney(Number(d.accumulated) || 0);
      var proceeds = roundMoney(Number(d.proceeds) || 0);
      var label = 'Thanh lý ' + (d.name || d.assetName || d.assetId || '');
      if (proceeds > 0) addEntry(out, d.date, label, '111', '211', proceeds, 'taisan-disposal');
      if (acc > 0) addEntry(out, d.date, label + ' hao mòn', '214', '211', acc, 'taisan-disposal');
      var rest = roundMoney(cost - proceeds - acc);
      if (rest > 0) addEntry(out, d.date, label + ' lỗ', '642', '211', rest, 'taisan-disposal');
      else if (rest < 0) addEntry(out, d.date, label + ' lãi', '211', '511', -rest, 'taisan-disposal');
    });
    (cb.payrolls || []).forEach(function (p) {
      var gross = roundMoney(Number(p.gross) || 0);
      var hold = roundMoney(Number(p.hold !== undefined ? p.hold : p.insurance) || 0);
      var employer = roundMoney(Number(p.employer) || 0);
      var ky = p.ky || '';
      var date = p.date || (ky ? ky + '-01' : '');
      if (gross > 0) addEntry(out, date, 'Tiền lương kỳ ' + ky, '642', '334', gross, 'luong-accrual');
      if (hold > 0) addEntry(out, date, 'Khấu trừ BHXH, BHYT, BHTN kỳ ' + ky, '334', '338', hold, 'luong-accrual');
      if (employer > 0) addEntry(out, date, 'Trích theo lương kỳ ' + ky, '642', '338', employer, 'luong-accrual');
    });
    (cn.provisions || []).forEach(function (p) {
      if (Number(p.amount) > 0) addEntry(out, p.date || (p.ky ? p.ky + '-01' : ''), 'Dự phòng công nợ kỳ ' + (p.ky || ''), '642', '229', p.amount, 'duphong');
    });
    (cn.records || []).forEach(function (r) {
      if (r.source) return;
      var amount = roundMoney(Number(r.amount) || 0);
      if (!(amount > 0)) return;
      if (r.type === 'phaiTra') addEntry(out, r.date, 'Phải trả ' + (r.partner || ''), '642', '331', amount, 'congno');
      else addEntry(out, r.date, 'Phải thu ' + (r.partner || ''), '131', '3387', amount, 'congno');
    });
    (dk.entries || []).forEach(function (v) { linesToEntries(out, v, 'dinhkhoan'); });
    (kk.closings || []).forEach(function (v) { linesToEntries(out, v, 'khoaky-close'); });
    return out;
  }

  function openingsOf(key) {
    var kk = modules.khoaky ? data(key, modules.khoaky) : {};
    return kk && Array.isArray(kk.openings) ? kk.openings : [];
  }

  // ---------- Định giá tồn kho ----------
  // Mỗi lần nhập tạo một lô; xuất theo FIFO hoặc bình quân tùy thiết lập của công ty.
  function valuation(key) {
    var mod = modules.caidat;
    var cfg = mod ? data(key, mod) : {};
    return cfg && cfg.valMethod === 'binhquan' ? 'binhquan' : 'fifo';
  }

  function ensureLots(store) {
    if (!store || typeof store !== 'object') return null;
    if (!store.lots || typeof store.lots !== 'object' || Array.isArray(store.lots)) store.lots = {};
    if (!store.avg || typeof store.avg !== 'object' || Array.isArray(store.avg)) store.avg = {};
    return store;
  }

  function recomputeAvg(store, id) {
    var arr = (store.lots || {})[id] || [];
    var qty = 0, value = 0;
    arr.forEach(function (lot) {
      var n = Number(lot.qty) || 0;
      qty += n;
      value += n * (Number(lot.price) || 0);
    });
    store.avg[id] = qty > 0 ? roundMoney(value / qty) : 0;
  }

  function stockIn(store, id, qty, price, at) {
    if (!ensureLots(store)) return;
    id = String(id || '');
    qty = roundMoney(qty);
    if (!(qty > 0)) return;
    var arr = Array.isArray(store.lots[id]) ? store.lots[id] : [];
    arr.push({ id: uid('lot'), qty: qty, price: roundMoney(price), at: at || new Date().toISOString() });
    store.lots[id] = arr;
    recomputeAvg(store, id);
  }

  function stockOut(store, id, qty, fallbackPrice, method, at) {
    if (!ensureLots(store)) return 0;
    id = String(id || '');
    qty = roundMoney(qty);
    if (!(qty > 0)) return 0;
    var arr = Array.isArray(store.lots[id]) ? store.lots[id] : [];
    var fallback = roundMoney(fallbackPrice);
    var cost = 0, remain = qty;
    if (method === 'binhquan') {
      var avg = Number(store.avg[id]) || fallback;
      cost = roundMoney(avg * qty);
      var total = arr.reduce(function (sum, lot) { return sum + (Number(lot.qty) || 0); }, 0);
      if (total > 0) {
        var used = Math.min(1, qty / total);
        arr.forEach(function (lot) { lot.qty = roundMoney((Number(lot.qty) || 0) * (1 - used)); });
      }
    } else {
      for (var i = 0; i < arr.length && remain > 0; i++) {
        var lot = arr[i];
        var take = Math.min(remain, Number(lot.qty) || 0);
        if (take > 0) {
          lot.qty = roundMoney((Number(lot.qty) || 0) - take);
          cost += take * (Number(lot.price) || 0);
          remain -= take;
        }
      }
      cost += remain * fallback;
    }
    store.lots[id] = arr.filter(function (lot) { return (Number(lot.qty) || 0) > 0; });
    recomputeAvg(store, id);
    return roundMoney(cost);
  }

  function stockValue(store, items, key) {
    var method = valuation(key);
    var stock = store && store.stock && typeof store.stock === 'object' ? store.stock : {};
    var total = 0;
    (items || []).forEach(function (it) {
      var qty = Number(stock[it.id]) || 0;
      if (!(qty > 0)) return;
      var fallback = Number(it.price) || 0;
      if (method === 'binhquan') {
        var avg = store && store.avg ? Number(store.avg[it.id]) || 0 : 0;
        total += qty * (avg || fallback);
      } else {
        var arr = store && store.lots && Array.isArray(store.lots[it.id]) ? store.lots[it.id] : [];
        var left = qty;
        arr.forEach(function (lot) {
          var take = Math.min(left, Number(lot.qty) || 0);
          total += take * (Number(lot.price) || 0);
          left -= take;
        });
        total += left * fallback;
      }
    });
    return roundMoney(total);
  }

  global.Ketoan = {
    register: register,
    modules: modules,
    list: list,
    helpers: {
      nodeKey: nodeKey,
      sig: sig,
      money: money,
      today: today,
      uid: uid,
      esc: esc,
      data: data,
      save: save,
      accounts: accounts,
      hangHoa: hangHoa,
      khachHang: khachHang,
      donBan: donBan,
      tonKho: tonKho,
      isReadOnly: isReadOnly,
      branch: branch,
      nhaCungCap: nhaCungCap,
      chungTu: chungTu,
      congNo: congNo,
      donMua: donMua,
      hoaDonVao: hoaDonVao,
      hoaDon: hoaDon,
      phieuQuy: phieuQuy,
      taiSan: taiSan,
      roundMoney: roundMoney,
      nextCode: nextCode,
      commit: commit,
      linkCongNo: linkCongNo,
      unlinkCongNo: unlinkCongNo,
      activeVouchers: activeVouchers,
      bankBalance: bankBalance,
      monthOf: monthOf,
      lockUntil: lockUntil,
      isLocked: isLocked,
      guard: guard,
      audit: audit,
      updateIn: updateIn,
      removeFrom: removeFrom,
      journalFrom: journalFrom,
      openingsOf: openingsOf,
      addEntry: addEntry,
      can: can,
      currentUser: currentUser,
      valuation: valuation,
      stockIn: stockIn,
      stockOut: stockOut,
      stockValue: stockValue
    }
  };
})(typeof window !== 'undefined' ? window : this);

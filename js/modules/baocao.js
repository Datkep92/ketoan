// Báo cáo tổng hợp: đọc dữ liệu các module khác, không lưu trùng số liệu.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  function defaults() {
    return { updatedAt: '' };
  }

  function mount() {
    return '<div class="card module-card">' +
      '<h3>Báo cáo tổng hợp</h3>' +
      '<div class="report-grid">' +
        '<div class="stat"><label>Doanh thu</label><b data-report="revenue">0 đ</b></div>' +
        '<div class="stat"><label>Chi phí</label><b data-report="expense">0 đ</b></div>' +
        '<div class="stat"><label>Kết quả</label><b data-report="profit">0 đ</b></div>' +
        '<div class="stat"><label>Tiền còn</label><b data-report="cash">0 đ</b></div>' +
        '<div class="stat"><label>Còn thu</label><b data-report="conThu">0 đ</b></div>' +
        '<div class="stat"><label>Còn trả</label><b data-report="conTra">0 đ</b></div>' +
        '<div class="stat"><label>Doanh thu bán hàng</label><b data-report="banHang">0 đ</b></div>' +
        '<div class="stat"><label>Giá trị tồn kho</label><b data-report="tonKho">0 đ</b></div>' +
        '<div class="stat"><label>Tổng hóa đơn</label><b data-report="hoaDon">0 đ</b></div>' +
      '</div>' +
      '<p class="muted">Số liệu lấy trực tiếp từ chứng từ, công nợ, bán hàng, kho và hóa đơn của đúng mã số thuế này. Các báo cáo theo mẫu (cân đối phát sinh, kết quả kinh doanh, thuế) là chỗ mở rộng tiếp theo.</p>' +
    '</div>';
  }

  function patch(ctx, section, data, initial) {
    var ctMod = K.modules.chungtu;
    var cnMod = K.modules.congno;
    if (!ctMod || !cnMod) return;
    var ct = H.data(ctx.key, ctMod);
    var cn = H.data(ctx.key, cnMod);
    var bhMod = K.modules.banhang;
    var tkMod = K.modules.tonkho;
    var hdMod = K.modules.hoadon;
    var bh = bhMod ? H.data(ctx.key, bhMod) : { orders: [] };
    var tk = tkMod ? H.data(ctx.key, tkMod) : { stock: {} };
    var hd = hdMod ? H.data(ctx.key, hdMod) : { invoices: [] };
    var s = H.sig({
      v: ct.vouchers || [], r: cn.records || [],
      bh: bh.orders || [], stock: tk.stock || {},
      items: H.hangHoa(ctx.key), hd: hd.invoices || []
    });
    if (ctx.pane.sigs['baocao.tonghop'] === s) return;
    ctx.pane.sigs['baocao.tonghop'] = s;

    var income = 0, expense = 0;
    (ct.vouchers || []).forEach(function (v) {
      if (v.kind === 'in') income += Number(v.amount) || 0;
      else expense += Number(v.amount) || 0;
    });
    var conThu = 0, conTra = 0;
    (cn.records || []).forEach(function (r) {
      var remain = (Number(r.amount) || 0) - (Number(r.paid) || 0);
      if (r.type === 'phaiTra') conTra += remain;
      else conThu += remain;
    });
    var sales = 0;
    (bh.orders || []).forEach(function (o) { sales += Number(o.amount) || 0; });
    var stockValue = 0;
    H.hangHoa(ctx.key).forEach(function (it) {
      stockValue += (Number((tk.stock || {})[it.id]) || 0) * (Number(it.price) || 0);
    });
    var invoiceTotal = 0;
    (hd.invoices || []).forEach(function (inv) { invoiceTotal += Number(inv.total) || 0; });
    var values = {
      revenue: income,
      expense: expense,
      profit: income - expense,
      cash: income - expense,
      conThu: conThu,
      conTra: conTra,
      banHang: sales,
      tonKho: stockValue,
      hoaDon: invoiceTotal
    };
    Object.keys(values).forEach(function (name) {
      var node = section.querySelector('[data-report="' + name + '"]');
      if (node) node.textContent = H.money(values[name]);
    });
    if (!initial) ctx.bumpPatch();
  }

  var mod = {
    label: 'Báo cáo',
    order: 40,
    branch: 'baocao',
    defaults: defaults,
    mount: mount,
    patch: patch
  };
  K.register('baocao', mod);
})(typeof window !== 'undefined' ? window : this);

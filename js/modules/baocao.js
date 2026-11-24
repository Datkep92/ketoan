// Báo cáo: số liệu tổng hợp và các sổ/báo cáo dùng ngay (nhật ký, sổ cái,
// cân đối phát sinh, kết quả kinh doanh, cân đối tài sản và thuế GTGT).
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  var TABS = [
    { id: 'tonghop', label: 'Tổng hợp' },
    { id: 'nhatky', label: 'Nhật ký chung' },
    { id: 'socai', label: 'Sổ cái' },
    { id: 'candoi', label: 'Cân đối phát sinh' },
    { id: 'kqkd', label: 'Kết quả & CĐKT' },
    { id: 'thue', label: 'Thuế GTGT' }
  ];

  var NAMES = {
    '111': 'Tiền mặt', '112': 'Tiền gửi ngân hàng', '131': 'Phải thu khách hàng',
    '152': 'Hàng hóa', '214': 'Hao mòn tài sản', '331': 'Phải trả người bán',
    '3331': 'Thuế GTGT đầu ra', '511': 'Doanh thu bán hàng',
    '641': 'Chi phí bán hàng', '642': 'Chi phí quản lý', '3387': 'Phải thu khác'
  };

  function defaults() {
    return { updatedAt: '' };
  }

  function mount() {
    var tabs = TABS.map(function (t, i) {
      return '<button type="button" class="report-tab' + (i === 0 ? ' active' : '') +
        '" data-report-tab="' + t.id + '">' + t.label + '</button>';
    }).join('');
    return '<div class="card module-card">' +
      '<h3>Báo cáo tổng hợp</h3>' +
      '<div class="report-tabs">' + tabs + '</div>' +
      '<div class="report-pane" data-report-pane="tonghop">' +
        '<div class="report-grid">' +
          '<div class="stat"><label>Doanh thu chứng từ</label><b data-report="revenue">0 đ</b></div>' +
          '<div class="stat"><label>Chi phí</label><b data-report="expense">0 đ</b></div>' +
          '<div class="stat"><label>Lợi nhuận</label><b data-report="profit">0 đ</b></div>' +
          '<div class="stat"><label>Tiền còn</label><b data-report="cash">0 đ</b></div>' +
          '<div class="stat"><label>Còn thu</label><b data-report="conThu">0 đ</b></div>' +
          '<div class="stat"><label>Còn trả</label><b data-report="conTra">0 đ</b></div>' +
          '<div class="stat"><label>Doanh thu bán hàng</label><b data-report="banHang">0 đ</b></div>' +
          '<div class="stat"><label>Giá trị tồn kho</label><b data-report="tonKho">0 đ</b></div>' +
          '<div class="stat"><label>Tổng hóa đơn</label><b data-report="hoaDon">0 đ</b></div>' +
          '<div class="stat"><label>Tổng mua hàng</label><b data-report="muaHang">0 đ</b></div>' +
          '<div class="stat"><label>Hóa đơn đầu vào</label><b data-report="hoaDonVao">0 đ</b></div>' +
          '<div class="stat"><label>Nguyên giá tài sản</label><b data-report="taiSan">0 đ</b></div>' +
          '<div class="stat"><label>Khấu hao</label><b data-report="khauHao">0 đ</b></div>' +
        '</div>' +
        '<p class="muted">Số liệu lấy trực tiếp từ dữ liệu của đúng mã số thuế này. Chuyển tab để xem các sổ và báo cáo chi tiết.</p>' +
      '</div>' +
      '<div class="report-pane" data-report-pane="nhatky" hidden>' +
        '<div class="report-scroll"><table class="report-table"><thead><tr><th>Ngày</th><th>Diễn giải</th><th>Tài khoản Nợ</th><th>Tài khoản Có</th><th>Số tiền</th><th>Nguồn</th></tr></thead>' +
          '<tbody data-report-body="nhatky"></tbody></table></div>' +
      '</div>' +
      '<div class="report-pane" data-report-pane="socai" hidden>' +
        '<div class="report-scroll"><table class="report-table"><thead><tr><th>Ngày</th><th>Diễn giải</th><th>Đối tài khoản</th><th>Nợ / Có</th><th>Số tiền</th><th>Số dư</th></tr></thead>' +
          '<tbody data-report-body="socai"></tbody></table></div>' +
      '</div>' +
      '<div class="report-pane" data-report-pane="candoi" hidden>' +
        '<div class="report-scroll"><table class="report-table"><thead><tr><th>Tài khoản</th><th>Phát sinh Nợ</th><th>Phát sinh Có</th><th>Số dư Nợ</th><th>Số dư Có</th></tr></thead>' +
          '<tbody data-report-body="candoi"></tbody></table></div>' +
        '<div class="report-grid"><div class="stat"><label>Tổng phát sinh Nợ</label><b data-report="cdpsDebit">0 đ</b></div>' +
          '<div class="stat"><label>Tổng phát sinh Có</label><b data-report="cdpsCredit">0 đ</b></div>' +
          '<div class="stat"><label>Tổng số dư</label><b data-report="cdpsBalance">0 đ</b></div></div>' +
      '</div>' +
      '<div class="report-pane" data-report-pane="kqkd" hidden>' +
        '<div class="report-grid">' +
          '<div class="stat"><label>Doanh thu</label><b data-report="kqkdDoanhThu">0 đ</b></div>' +
          '<div class="stat"><label>Chi phí</label><b data-report="kqkdChiPhi">0 đ</b></div>' +
          '<div class="stat"><label>Lợi nhuận</label><b data-report="kqkdLoiNhuan">0 đ</b></div>' +
          '<div class="stat"><label>Tiền + tồn kho</label><b data-report="cdktTaiSan">0 đ</b></div>' +
          '<div class="stat"><label>Nợ phải trả</label><b data-report="cdktNo">0 đ</b></div>' +
          '<div class="stat"><label>Vốn chủ sở hữu</label><b data-report="cdktVon">0 đ</b></div>' +
        '</div>' +
        '<p class="muted">Doanh thu lấy từ bán hàng đã trừ trả hàng; chi phí gồm chi phí quản lý, bán hàng và khấu hao. Bảng cân đối gồm tiền, tồn kho, tài sản ròng và các khoản công nợ.</p>' +
      '</div>' +
      '<div class="report-pane" data-report-pane="thue" hidden>' +
        '<div class="report-grid">' +
          '<div class="stat"><label>Thuế đầu ra</label><b data-report="thueDauRa">0 đ</b></div>' +
          '<div class="stat"><label>Thuế đầu vào</label><b data-report="thueDauVao">0 đ</b></div>' +
          '<div class="stat"><label>Thuế phải nộp</label><b data-report="thuePhaiNop">0 đ</b></div>' +
        '</div>' +
        '<p class="muted">Thuế đầu ra lấy từ hóa đơn bán, thuế đầu vào lấy từ hóa đơn mua hàng. Số âm được hiểu là thuế được khấu trừ chuyển kỳ sau.</p>' +
      '</div>' +
    '</div>';
  }

  function bind(ctx, section) {
    var tabs = section.querySelectorAll('.report-tab');
    var panes = section.querySelectorAll('.report-pane');
    function show(id) {
      panes.forEach(function (p) { p.hidden = p.dataset.reportPane !== id; });
      tabs.forEach(function (t) {
        if (t.dataset.reportTab === id) t.classList.add('active');
        else t.classList.remove('active');
      });
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { show(t.dataset.reportTab); });
    });
    show('tonghop');
  }

  function sourcesOf(ctx) {
    function get(name, fallback) {
      var mod = K.modules[name];
      return mod ? H.data(ctx.key, mod) : fallback;
    }
    return {
      ct: get('chungtu', { vouchers: [] }),
      cn: get('congno', { records: [] }),
      bh: get('banhang', { orders: [] }),
      hd: get('hoadon', { invoices: [] }),
      mh: get('muahang', { purchases: [], bills: [] }),
      ts: get('taisan', { assets: [] }),
      kho: get('tonkho', { stock: {} }),
      dm: get('danhmuc', { items: [] }),
      accounts: H.accounts(ctx.key)
    };
  }

  function addEntry(out, date, note, debit, credit, amount, source) {
    out.push({
      date: date || '', note: note || '', debit: debit || '', credit: credit || '',
      amount: H.roundMoney(amount), source: source || ''
    });
  }

  function journal(src) {
    var out = [];
    (src.ct.vouchers || []).forEach(function (v) {
      var amount = Number(v.amount) || 0;
      if (!(amount > 0)) return;
      var acc = v.account || '';
      var cash = (acc === '111' || acc === '112') ? acc : '111';
      var other = (acc === '111' || acc === '112') ? '' : acc;
      var from = String(v.source || '');
      if (!other) {
        if (from.indexOf('banhang-return') === 0) other = '511';
        else if (from.indexOf('muahang') === 0) other = '331';
        else if (v.kind === 'in') other = /thu/i.test(v.note || '') ? '3387' : '511';
        else other = /tra|hoàn|mua/i.test(v.note || '') ? '331' : '642';
      }
      if (v.kind === 'in') addEntry(out, v.date, v.note, cash, other, amount, from || 'chungtu');
      else addEntry(out, v.date, v.note, other, cash, amount, from || 'chungtu');
    });
    (src.bh.orders || []).forEach(function (o) {
      var paid = Number(o.paid) || 0;
      (o.returns || []).forEach(function (r) { paid -= Number(r.refund) || 0; });
      var remain = H.roundMoney((Number(o.amount) || 0) - (Number(o.returned) || 0) - paid);
      if (remain > 0) addEntry(out, o.date, 'Công nợ bán ' + (o.ma || o.id), '131', '511', remain, 'banhang');
    });
    (src.mh.purchases || []).forEach(function (p) {
      var total = Number(p.total) || 0;
      if (total > 0) addEntry(out, p.date, 'Mua hàng ' + (p.ma || p.id), '152', '331', total, 'muahang');
    });
    var dep = 0;
    (src.ts.assets || []).forEach(function (a) { dep += Number(a.accumulated) || 0; });
    if (dep > 0) addEntry(out, '', 'Khấu hao tài sản', '642', '214', dep, 'taisan');
    return out;
  }

  function nameMap(src) {
    var map = {};
    Object.keys(NAMES).forEach(function (c) { map[c] = NAMES[c]; });
    (src.accounts || []).forEach(function (a) { map[a.code] = a.name; });
    return map;
  }

  function codeLabel(code, names) {
    return code + (names[code] ? ' ' + names[code] : '');
  }

  function emptyRow(n, text) {
    return '<tr><td colspan="' + n + '" class="muted">' + text + '</td></tr>';
  }

  function moneyCell(value) {
    return '<td class="num">' + H.money(value) + '</td>';
  }

  function renderBooks(section, src) {
    var entries = journal(src);
    var names = nameMap(src);
    var nhatKy = section.querySelector('[data-report-body="nhatky"]');
    if (nhatKy) {
      nhatKy.innerHTML = entries.length ? entries.map(function (e) {
        return '<tr data-report-source="' + H.esc(e.source) + '"><td>' + H.esc(e.date || '—') + '</td><td>' + H.esc(e.note) + '</td>' +
          '<td>' + H.esc(codeLabel(e.debit, names)) + '</td><td>' + H.esc(codeLabel(e.credit, names)) + '</td>' +
          moneyCell(e.amount) + '<td>' + H.esc(e.source) + '</td></tr>';
      }).join('') : emptyRow(6, 'Chưa có nghiệp vụ');
    }

    var byAccount = {};
    var debitTotal = 0, creditTotal = 0;
    entries.forEach(function (e) {
      [e.debit, e.credit].forEach(function (code) {
        if (!byAccount[code]) byAccount[code] = { code: code, debit: 0, credit: 0, lines: [] };
      });
      byAccount[e.debit].debit += e.amount;
      byAccount[e.debit].lines.push(e);
      byAccount[e.credit].credit += e.amount;
      byAccount[e.credit].lines.push(e);
      debitTotal += e.amount;
      creditTotal += e.amount;
    });
    var codes = Object.keys(byAccount).sort();

    var SoCai = section.querySelector('[data-report-body="socai"]');
    if (SoCai) {
      var sc = [];
      codes.forEach(function (code) {
        var acct = byAccount[code];
        sc.push('<tr data-report-account="' + code + '"><td colspan="6"><b>' + H.esc(codeLabel(code, names)) + '</b></td></tr>');
        acct.lines.forEach(function (e) {
          var side = e.debit === code ? 'Nợ' : 'Có';
          var other = e.debit === code ? e.credit : e.debit;
          sc.push('<tr><td>' + H.esc(e.date || '—') + '</td><td>' + H.esc(e.note) + '</td>' +
            '<td>' + H.esc(codeLabel(other, names)) + '</td><td>' + side + '</td>' +
            moneyCell(e.amount) + moneyCell(H.roundMoney(acct.debit - acct.credit)) + '</tr>');
        });
      });
      SoCai.innerHTML = sc.length ? sc.join('') : emptyRow(6, 'Chưa có nghiệp vụ');
    }

    var canDoi = section.querySelector('[data-report-body="candoi"]');
    var balanceDebit = 0, balanceCredit = 0;
    if (canDoi) {
      var cd = codes.map(function (code) {
        var acct = byAccount[code];
        var bal = H.roundMoney(acct.debit - acct.credit);
        if (bal >= 0) balanceDebit += bal; else balanceCredit -= bal;
        return '<tr data-report-account="' + code + '"><td>' + H.esc(codeLabel(code, names)) + '</td>' + moneyCell(acct.debit) + moneyCell(acct.credit) +
          moneyCell(bal >= 0 ? bal : 0) + moneyCell(bal < 0 ? -bal : 0) + '</tr>';
      });
      canDoi.innerHTML = cd.length ? cd.join('') : emptyRow(5, 'Chưa có nghiệp vụ');
    }

    function put(key, value) {
      var el = section.querySelector('[data-report="' + key + '"]');
      if (el) el.textContent = H.money(H.roundMoney(value));
    }
    put('cdpsDebit', debitTotal);
    put('cdpsCredit', creditTotal);
    put('cdpsBalance', balanceDebit);

    var doanhThu = 0, chiPhi = 0;
    entries.forEach(function (e) {
      if (/^5/.test(e.credit)) doanhThu += e.amount;
      if (/^5/.test(e.debit)) doanhThu -= e.amount;
      if (/^6/.test(e.debit)) chiPhi += e.amount;
      if (/^6/.test(e.credit)) chiPhi -= e.amount;
    });
    doanhThu = H.roundMoney(doanhThu);
    chiPhi = H.roundMoney(chiPhi);
    put('kqkdDoanhThu', doanhThu);
    put('kqkdChiPhi', chiPhi);
    put('kqkdLoiNhuan', doanhThu - chiPhi);

    var tien = H.roundMoney((byAccount['111'] ? byAccount['111'].debit - byAccount['111'].credit : 0) +
      (byAccount['112'] ? byAccount['112'].debit - byAccount['112'].credit : 0));
    var tonKho = 0;
    (src.dm.items || []).forEach(function (it) {
      tonKho += (Number((src.kho.stock || {})[it.id]) || 0) * (Number(it.price) || 0);
    });
    var taiSanRong = 0;
    (src.ts.assets || []).forEach(function (a) {
      taiSanRong += (Number(a.cost) || 0) - (Number(a.accumulated) || 0);
    });
    var conThu = 0, conTra = 0;
    (src.cn.records || []).forEach(function (r) {
      var remain = (Number(r.amount) || 0) - (Number(r.paid) || 0);
      if (r.type === 'phaiTra') conTra += remain; else conThu += remain;
    });
    var dauRa = 0, dauVao = 0;
    (src.hd.invoices || []).forEach(function (inv) { dauRa += Number(inv.taxAmount) || 0; });
    (src.mh.bills || []).forEach(function (b) { dauVao += Number(b.taxAmount) || 0; });
    dauRa = H.roundMoney(dauRa);
    dauVao = H.roundMoney(dauVao);
    var taiSan = H.roundMoney(tien + tonKho + taiSanRong + conThu);
    var no = H.roundMoney(conTra + Math.max(0, dauRa - dauVao));
    put('cdktTaiSan', taiSan);
    put('cdktNo', no);
    put('cdktVon', taiSan - no);
    put('thueDauRa', dauRa);
    put('thueDauVao', dauVao);
    put('thuePhaiNop', dauRa - dauVao);
  }

  function patch(ctx, section, data, initial) {
    var src = sourcesOf(ctx);
    var s = H.sig({
      v: src.ct.vouchers || [], r: src.cn.records || [],
      bh: src.bh.orders || [], stock: src.kho.stock || {},
      items: src.dm.items || [], hd: src.hd.invoices || [],
      mua: src.mh.purchases || [], muaHd: src.mh.bills || [],
      taiSan: src.ts.assets || [], accounts: src.accounts || []
    });
    if (ctx.pane.sigs['baocao.tonghop'] === s) return;
    ctx.pane.sigs['baocao.tonghop'] = s;

    var income = 0, expense = 0;
    (src.ct.vouchers || []).forEach(function (v) {
      if (v.kind === 'in') income += Number(v.amount) || 0;
      else expense += Number(v.amount) || 0;
    });
    var conThu = 0, conTra = 0;
    (src.cn.records || []).forEach(function (r) {
      var remain = (Number(r.amount) || 0) - (Number(r.paid) || 0);
      if (r.type === 'phaiTra') conTra += remain; else conThu += remain;
    });
    var sales = 0;
    (src.bh.orders || []).forEach(function (o) {
      sales += (Number(o.amount) || 0) - (Number(o.returned) || 0);
    });
    var stockValue = 0;
    (src.dm.items || []).forEach(function (it) {
      stockValue += (Number((src.kho.stock || {})[it.id]) || 0) * (Number(it.price) || 0);
    });
    var invoiceTotal = 0;
    (src.hd.invoices || []).forEach(function (inv) { invoiceTotal += Number(inv.total) || 0; });
    var purchaseTotal = 0, inputInvoiceTotal = 0;
    (src.mh.purchases || []).forEach(function (p) { purchaseTotal += Number(p.total) || 0; });
    (src.mh.bills || []).forEach(function (b) { inputInvoiceTotal += Number(b.total) || 0; });
    var assetCost = 0, depreciation = 0;
    (src.ts.assets || []).forEach(function (a) {
      assetCost += Number(a.cost) || 0;
      depreciation += Number(a.accumulated) || 0;
    });
    expense = H.roundMoney(expense + depreciation);
    var values = {
      revenue: income, expense: expense, profit: H.roundMoney(income - expense),
      cash: income - expense, conThu: conThu, conTra: conTra, banHang: sales,
      tonKho: stockValue, hoaDon: invoiceTotal, muaHang: purchaseTotal,
      hoaDonVao: inputInvoiceTotal, taiSan: assetCost, khauHao: depreciation
    };
    Object.keys(values).forEach(function (key) {
      var el = section.querySelector('[data-report="' + key + '"]');
      if (el) el.textContent = H.money(values[key]);
    });
    renderBooks(section, src);
    if (!initial) ctx.bumpPatch();
  }

  var mod = {
    label: 'Báo cáo',
    order: 40,
    branch: 'baocao',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('baocao', mod);
})(typeof window !== 'undefined' ? window : this);

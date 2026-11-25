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
    { id: 'thue', label: 'Thuế GTGT' },
    { id: 'bctc', label: 'Báo cáo tài chính' }
  ];

  var NAMES = {
    '111': 'Tiền mặt', '112': 'Tiền gửi ngân hàng', '131': 'Phải thu khách hàng',
    '152': 'Hàng hóa', '211': 'Tài sản cố định', '214': 'Hao mòn tài sản',
    '229': 'Dự phòng công nợ', '331': 'Phải trả người bán', '334': 'Phải trả người lao động',
    '338': 'Phải trả khác', '3331': 'Thuế GTGT đầu ra', '1331': 'Thuế GTGT đầu vào', '511': 'Doanh thu bán hàng',
    '632': 'Giá vốn hàng bán', '641': 'Chi phí bán hàng', '642': 'Chi phí quản lý',
    '911': 'Kết chuyển kết quả', '3387': 'Phải thu khác'
  };

  function defaults() {
    return { updatedAt: '', taxPayments: [] };
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
        '<h4>Sổ chi tiết công nợ</h4>' +
        '<div class="report-scroll"><table class="report-table"><thead><tr><th>Đối tác</th><th>Loại</th><th>Phát sinh</th><th>Đã thanh toán</th><th>Còn lại</th><th>Hạn</th></tr></thead>' +
          '<tbody data-report-body="socn"></tbody></table></div>' +
      '</div>' +
      '<div class="report-pane" data-report-pane="candoi" hidden>' +
        '<div class="report-scroll"><table class="report-table"><thead><tr><th>Tài khoản</th><th>Dư đầu Nợ</th><th>Dư đầu Có</th><th>Phát sinh Nợ</th><th>Phát sinh Có</th><th>Số dư Nợ</th><th>Số dư Có</th></tr></thead>' +
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
        '<h4>Bảng chấm công, tính lương</h4>' +
        '<div class="report-scroll"><table class="report-table"><thead><tr><th>Kỳ</th><th>Tổng lương</th><th>Khấu trừ</th><th>Trích theo lương</th><th>Thực lãnh</th><th>Đã chi</th></tr></thead>' +
          '<tbody data-report-body="luong"></tbody></table></div>' +
        '<h4>Bảng tính và phân bổ khấu hao</h4>' +
        '<div class="report-scroll"><table class="report-table"><thead><tr><th>Tài sản</th><th>Nguyên giá</th><th>Đã khấu hao</th><th>Giá trị còn lại</th><th>Số tháng đã tính</th></tr></thead>' +
          '<tbody data-report-body="khauhao"></tbody></table></div>' +
      '</div>' +
      '<div class="report-pane" data-report-pane="thue" hidden>' +
        '<div class="report-grid">' +
          '<div class="stat"><label>Thuế đầu ra</label><b data-report="thueDauRa">0 đ</b></div>' +
          '<div class="stat"><label>Thuế đầu vào</label><b data-report="thueDauVao">0 đ</b></div>' +
          '<div class="stat"><label>Thuế phải nộp</label><b data-report="thuePhaiNop">0 đ</b></div>' +
          '<div class="stat"><label>Đã nộp kỳ này</label><b data-report="thueDaNop">0 đ</b></div>' +
          '<div class="stat"><label>Còn phải nộp</label><b data-report="thueConNop">0 đ</b></div>' +
        '</div>' +
        '<div class="report-actions"><button type="button" class="btn primary" data-tax-pay>Lập phiếu nộp thuế</button>' +
          '<span class="muted">Phiếu nộp được ghi vào chứng từ và trừ vào số còn phải nộp của kỳ hiện tại.</span></div>' +
        '<p class="muted">Thuế đầu ra lấy từ hóa đơn bán, thuế đầu vào lấy từ hóa đơn mua hàng. Số âm được hiểu là thuế được khấu trừ chuyển kỳ sau.</p>' +
        '<h4>Tờ khai thuế GTGT (rút gọn)</h4>' +
        '<div class="report-scroll"><table class="report-table"><thead><tr><th>Chỉ tiêu</th><th>Số liệu kỳ này</th></tr></thead>' +
          '<tbody data-report-body="tokhai"></tbody></table></div>' +
      '</div>' +
      '<div class="report-pane" data-report-pane="bctc" hidden>' +
        '<div class="report-actions"><button type="button" class="btn primary" data-report-print>In / xuất PDF</button>' +
          '<span class="muted">In từ trình duyệt để lưu thành PDF hoặc giấy.</span></div>' +
        '<div class="report-scroll print-area"><h4>Bảng cân đối tài chính (B01a — rút gọn)</h4>' +
          '<table class="report-table"><thead><tr><th>Tài sản / nguồn vốn</th><th>Số cuối kỳ</th></tr></thead>' +
          '<tbody data-report-body="b01"></tbody></table>' +
          '<h4>Báo cáo kết quả kinh doanh (B02 — rút gọn)</h4>' +
          '<table class="report-table"><thead><tr><th>Chỉ tiêu</th><th>Số phát sinh</th></tr></thead>' +
          '<tbody data-report-body="b02"></tbody></table>' +
          '<h4>Báo cáo lưu chuyển tiền tệ (B03 — rút gọn)</h4>' +
          '<table class="report-table"><thead><tr><th>Chỉ tiêu</th><th>Số tiền</th></tr></thead>' +
          '<tbody data-report-body="b03"></tbody></table></div>' +
        '<p class="muted">Bản rút gọn dùng cho doanh nghiệp nhỏ và vừa theo Thông tư 133/2016/TT-BTC. Số liệu cập nhật theo từng mã số thuế; in ra để đính kèm hồ sơ.</p>' +
        '<h4>Bản thuyết minh và chia tách số liệu (B09 — rút gọn)</h4>' +
        '<div class="report-scroll print-area"><table class="report-table"><thead><tr><th>Chỉ tiêu</th><th>Số tiền</th></tr></thead>' +
          '<tbody data-report-body="thuyetminh"></tbody></table></div>' +
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
    var printBtn = section.querySelector('[data-report-print]');
    if (printBtn) printBtn.addEventListener('click', function () {
      try { global.print(); } catch (err) { ctx.foot('Trình duyệt không cho in; hãy dùng chức năng In của trình duyệt.'); }
    });
    var payBtn = section.querySelector('[data-tax-pay]');
    if (payBtn) payBtn.addEventListener('click', function () {
      if (!H.guard(ctx, H.today(), 'Lập phiếu nộp thuế GTGT')) return;
      var src = sourcesOf(ctx);
      var bc = H.data(ctx.key, mod);
      var ctData = H.data(ctx.key, K.modules.chungtu);
      var ky = H.today().slice(0, 7);
      var out = 0, inTax = 0;
      (src.hd.invoices || []).forEach(function (inv) { out += Number(inv.taxAmount) || 0; });
      (src.mh.bills || []).forEach(function (b) { inTax += Number(b.taxAmount) || 0; });
      var paid = (Array.isArray(bc.taxPayments) ? bc.taxPayments : []).reduce(function (sum, p) {
        return sum + (String(p.ky || '') === ky ? (Number(p.amount) || 0) : 0);
      }, 0);
      var due = H.roundMoney(Math.max(0, out - inTax - paid));
      if (!(due > 0)) { ctx.foot('Kỳ này không còn thuế phải nộp.'); return; }
      if (!Array.isArray(bc.taxPayments)) bc.taxPayments = [];
      if (!Array.isArray(ctData.vouchers)) ctData.vouchers = [];
      var voucher = {
        id: H.uid('ct'), date: H.today(), kind: 'out', account: '3331',
        amount: due, note: 'Nộp thuế GTGT kỳ ' + ky, ref: '', partner: '',
        source: 'thue-nop', createdAt: new Date().toISOString()
      };
      ctData.vouchers.push(voucher);
      bc.taxPayments.push({
        id: H.uid('thue'), ky: ky, date: H.today(), amount: due,
        voucherId: voucher.id, at: new Date().toISOString()
      });
      bc.updatedAt = new Date().toISOString();
      ctData.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [
        { module: 'baocao', value: bc }, { module: 'chungtu', value: ctData }
      ], ctx, 'Đã lập phiếu nộp thuế ' + H.money(due) + '.')) return;
      ctx.sync('chungtu');
      ctx.sync('baocao');
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
      cb: get('cashbank', { entries: [], payrolls: [] }),
      cn: get('congno', { records: [] }),
      bh: get('banhang', { orders: [] }),
      hd: get('hoadon', { invoices: [] }),
      mh: get('muahang', { purchases: [], bills: [] }),
      ts: get('taisan', { assets: [] }),
      kho: get('tonkho', { stock: {} }),
      dm: get('danhmuc', { items: [] }),
      dk: get('dinhkhoan', { entries: [] }),
      kk: get('khoaky', { openings: [] }),
      accounts: H.accounts(ctx.key),
      taxPayments: get('baocao', { taxPayments: [] }).taxPayments || []
    };
  }

  function addEntry(out, date, note, debit, credit, amount, source) {
    out.push({
      date: date || '', note: note || '', debit: debit || '', credit: credit || '',
      amount: H.roundMoney(amount), source: source || ''
    });
  }

  // Dùng chung bộ suy ra bút toán với phần Định khoản để nhật ký, sổ cái và
  // bảng cân đối đều thấy cả chứng từ tự suy ra lẫn phiếu định khoản thêm vào.
  function journal(src) {
    return H.journalFrom(src);
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

  function renderBooks(section, src, ctx) {
    var entries = journal(src);
    var names = nameMap(src);
    var depreciation = 0;
    entries.forEach(function (e) { if (e.debit === '214') depreciation += Number(e.amount) || 0; });
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
    var openings = {};
    (src.kk.openings || []).forEach(function (o) {
      var code = String(o.account || '');
      if (!code) return;
      if (!openings[code]) openings[code] = { debit: 0, credit: 0 };
      openings[code][o.side === 'co' ? 'credit' : 'debit'] += Number(o.amount) || 0;
    });
    var codes = Object.keys(byAccount).concat(Object.keys(openings)).filter(function (code, i, all) {
      return all.indexOf(code) === i;
    }).sort();

    var SoCai = section.querySelector('[data-report-body="socai"]');
    if (SoCai) {
      var sc = [];
      codes.forEach(function (code) {
        var acct = byAccount[code] || { debit: 0, credit: 0, lines: [] };
        sc.push('<tr data-report-account="' + code + '"><td colspan="6"><b>' + H.esc(codeLabel(code, names)) + '</b></td></tr>');
        (acct.lines || []).forEach(function (e) {
          var side = e.debit === code ? 'Nợ' : 'Có';
          var other = e.debit === code ? e.credit : e.debit;
          sc.push('<tr><td>' + H.esc(e.date || '—') + '</td><td>' + H.esc(e.note) + '</td>' +
            '<td>' + H.esc(codeLabel(other, names)) + '</td><td>' + side + '</td>' +
            moneyCell(e.amount) + moneyCell(H.roundMoney(acct.debit - acct.credit)) + '</tr>');
        });
      });
      SoCai.innerHTML = sc.length ? sc.join('') : emptyRow(6, 'Chưa có nghiệp vụ');
    }

    var SoCn = section.querySelector('[data-report-body="socn"]');
    if (SoCn) {
      var cnRows = (src.cn.records || []).map(function (r) {
        var remain = H.roundMoney((Number(r.amount) || 0) - (Number(r.paid) || 0));
        return '<tr><td>' + H.esc(r.partner || '—') + '</td><td>' +
          H.esc(r.type === 'phaiTra' ? 'Phải trả' : 'Phải thu') + '</td>' +
          moneyCell(r.amount) + moneyCell(r.paid) + moneyCell(remain) +
          '<td>' + H.esc(r.due || '—') + '</td></tr>';
      });
      SoCn.innerHTML = cnRows.length ? cnRows.join('') : emptyRow(6, 'Chưa có công nợ');
    }

    var canDoi = section.querySelector('[data-report-body="candoi"]');
    var balanceDebit = 0, balanceCredit = 0;
    if (canDoi) {
      var cd = codes.map(function (code) {
        var acct = byAccount[code] || { debit: 0, credit: 0 };
        var op = openings[code] || { debit: 0, credit: 0 };
        var bal = H.roundMoney(acct.debit + op.debit - acct.credit - op.credit);
        if (bal >= 0) balanceDebit += bal; else balanceCredit -= bal;
        return '<tr data-report-account="' + code + '"><td>' + H.esc(codeLabel(code, names)) + '</td>' +
          moneyCell(op.debit) + moneyCell(op.credit) + moneyCell(acct.debit) + moneyCell(acct.credit) +
          moneyCell(bal >= 0 ? bal : 0) + moneyCell(bal < 0 ? -bal : 0) + '</tr>';
      });
      canDoi.innerHTML = cd.length ? cd.join('') : emptyRow(7, 'Chưa có nghiệp vụ');
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
    var giaVon = 0;
    entries.forEach(function (e) {
      if (e.debit === '632' && e.credit === '152') giaVon += Number(e.amount) || 0;
    });
    giaVon = H.roundMoney(giaVon);
    put('kqkdDoanhThu', doanhThu);
    put('kqkdChiPhi', chiPhi);
    put('kqkdLoiNhuan', doanhThu - chiPhi);

    var openNet = function (code) {
      var op = openings[code] || { debit: 0, credit: 0 };
      return H.roundMoney(op.debit - op.credit);
    };
    var tien = H.roundMoney((byAccount['111'] ? byAccount['111'].debit - byAccount['111'].credit : 0) +
      (byAccount['112'] ? byAccount['112'].debit - byAccount['112'].credit : 0) +
      openNet('111') + openNet('112'));
    var tonKho = H.stockValue(src.kho, src.dm.items, ctx ? ctx.key : '');
    var taiSanRong = 0;
    (src.ts.assets || []).forEach(function (a) {
      taiSanRong += (Number(a.cost) || 0) - (Number(a.accumulated) || 0);
    });
    var conThu = 0, conTra = 0;
    (src.cn.records || []).forEach(function (r) {
      var remain = (Number(r.amount) || 0) - (Number(r.paid) || 0);
      if (r.type === 'phaiTra') conTra += remain; else conThu += remain;
    });
    conThu = H.roundMoney(conThu + openNet('131'));
    conTra = H.roundMoney(conTra - openNet('331'));
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
    var kyNow = H.today().slice(0, 7);
    var daNop = H.roundMoney((src.taxPayments || []).reduce(function (sum, p) {
      return sum + (String(p.ky || '') === kyNow ? (Number(p.amount) || 0) : 0);
    }, 0));
    put('thueDauRa', dauRa);
    put('thueDauVao', dauVao);
    put('thuePhaiNop', dauRa - dauVao);
    put('thueDaNop', daNop);
    put('thueConNop', Math.max(0, H.roundMoney(dauRa - dauVao - daNop)));

    function reportLine(label, value, bold) {
      return '<tr' + (bold ? ' class="total"' : '') + '><td>' + H.esc(label) + '</td>' +
        (value === '' ? '<td></td>' : moneyCell(value)) + '</tr>';
    }

    var luongBody = section.querySelector('[data-report-body="luong"]');
    if (luongBody) {
      var payrollRows = (src.cb.payrolls || []).map(function (p) {
        return '<tr><td>' + H.esc(p.ky || p.date || '—') + '</td>' + moneyCell(p.gross) +
          moneyCell(p.hold) + moneyCell(p.employer) + moneyCell(p.net) +
          '<td>' + H.esc(p.paid ? 'Đã chi' : 'Chưa chi') + '</td></tr>';
      });
      luongBody.innerHTML = payrollRows.length ? payrollRows.join('') : emptyRow(6, 'Chưa có bảng lương');
    }
    var khauHaoBody = section.querySelector('[data-report-body="khauhao"]');
    if (khauHaoBody) {
      var assetRows = (src.ts.assets || []).map(function (a) {
        var cost = Number(a.cost) || 0;
        var dep = Number(a.accumulated) || 0;
        var months = (a.depreciation || []).length;
        return '<tr><td>' + H.esc(a.name || '—') + '</td>' + moneyCell(cost) +
          moneyCell(dep) + moneyCell(cost - dep) + '<td>' + months + '</td></tr>';
      });
      khauHaoBody.innerHTML = assetRows.length ? assetRows.join('') : emptyRow(5, 'Chưa có tài sản');
    }
    var toKhaiBody = section.querySelector('[data-report-body="tokhai"]');
    if (toKhaiBody) {
      var ky = H.today().slice(0, 7);
      var paidKy = H.roundMoney((src.taxPayments || []).reduce(function (sum, p) {
        return sum + (String(p.ky || '') === ky ? (Number(p.amount) || 0) : 0);
      }, 0));
      toKhaiBody.innerHTML = [
        '<tr><td>Kỳ tính thuế</td><td>' + H.esc(ky) + '</td></tr>',
        reportLine('Thuế GTGT đầu ra', dauRa),
        reportLine('Thuế GTGT đầu vào được khấu trừ', dauVao),
        reportLine('Thuế GTGT phải nộp', H.roundMoney(Math.max(0, dauRa - dauVao)), true),
        reportLine('Đã nộp trong kỳ', paidKy),
        reportLine('Còn phải nộp', H.roundMoney(Math.max(0, dauRa - dauVao - paidKy)), true)
      ].join('');
    }

    var thuePhaiNop = H.roundMoney(Math.max(0, dauRa - dauVao));
    var b01 = section.querySelector('[data-report-body="b01"]');
    if (b01) {
      b01.innerHTML = [
        reportLine('A. Tài sản', '', true),
        reportLine('Tiền mặt và tiền gửi ngân hàng', tien),
        reportLine('Hàng hóa tồn kho', H.roundMoney(tonKho)),
        reportLine('Tài sản cố định ròng', H.roundMoney(taiSanRong)),
        reportLine('Phải thu khách hàng', conThu),
        reportLine('Tổng tài sản', taiSan, true),
        reportLine('B. Nguồn vốn', '', true),
        reportLine('Phải trả người bán', conTra),
        reportLine('Thuế phải nộp', thuePhaiNop),
        reportLine('Vốn chủ sở hữu', H.roundMoney(taiSan - no)),
        reportLine('Tổng nguồn vốn', taiSan, true)
      ].join('');
    }
    var b02 = section.querySelector('[data-report-body="b02"]');
    if (b02) {
      b02.innerHTML = [
        reportLine('Doanh thu bán hàng và cung cấp dịch vụ', doanhThu),
        reportLine('Giá vốn hàng bán', giaVon),
        reportLine('Chi phí bán hàng và quản lý', H.roundMoney(chiPhi - giaVon)),
        reportLine('Lợi nhuận trước thuế', H.roundMoney(doanhThu - chiPhi), true),
        reportLine('Thuế GTGT đầu ra', dauRa),
        reportLine('Thuế GTGT đầu vào', dauVao),
        reportLine('Thuế GTGT phải nộp', H.roundMoney(dauRa - dauVao), true)
      ].join('');
    }
    var b03 = section.querySelector('[data-report-body="b03"]');
    if (b03) {
      var flow = { ban: 0, mua: 0, luong: 0, khac: 0, dauTu: 0 };
      entries.forEach(function (e) {
        var isIn = e.debit === '111' || e.debit === '112';
        var isOut = e.credit === '111' || e.credit === '112';
        if (!isIn && !isOut) return;
        var amt = Number(e.amount) || 0;
        var from = String(e.source || '');
        if (from === 'taisan-disposal' && isIn) flow.dauTu += amt;
        else if (from === 'taisan-purchase' && isOut) flow.dauTu -= amt;
        else if (from.indexOf('banhang') === 0) flow.ban += isIn ? amt : -amt;
        else if (from.indexOf('muahang') === 0) flow.mua += isIn ? -amt : amt;
        else if (from.indexOf('luong') === 0 && isOut) flow.luong += amt;
        else flow.khac += isIn ? amt : -amt;
      });
      var opCash = H.roundMoney(openNet('111') + openNet('112'));
      var operating = H.roundMoney(flow.ban - flow.mua - flow.luong + flow.khac);
      var investing = H.roundMoney(flow.dauTu);
      var netCash = H.roundMoney(operating + investing);
      b03.innerHTML = [
        reportLine('I. Lưu chuyển tiền từ hoạt động kinh doanh', '', true),
        reportLine('Tiền thu bán hàng', H.roundMoney(flow.ban)),
        reportLine('Tiền chi mua hàng', -H.roundMoney(flow.mua)),
        reportLine('Tiền chi lương và trích theo lương', -H.roundMoney(flow.luong)),
        reportLine('Thu, chi khác', H.roundMoney(flow.khac)),
        reportLine('Lưu chuyển tiền thuần từ kinh doanh', operating, true),
        reportLine('II. Lưu chuyển tiền từ hoạt động đầu tư', '', true),
        reportLine('Tiền thu thanh lý tài sản', investing),
        reportLine('Lưu chuyển tiền thuần từ đầu tư', investing, true),
        reportLine('Tăng / giảm tiền trong kỳ', netCash, true),
        reportLine('Tiền đầu kỳ', opCash),
        reportLine('Tiền cuối kỳ', H.roundMoney(opCash + netCash), true)
      ].join('');
    }
    var thuyetMinh = section.querySelector('[data-report-body="thuyetminh"]');
    if (thuyetMinh) {
      var duPhong = 0;
      (src.cn.provisions || []).forEach(function (p) { duPhong += Number(p.amount) || 0; });
      thuyetMinh.innerHTML = [
        reportLine('1. Tiền mặt và tiền gửi ngân hàng', tien),
        reportLine('2. Hàng hóa tồn kho theo phương pháp ' + (H.valuation(ctx.key) === 'binhquan' ? 'bình quân' : 'FIFO'), H.roundMoney(tonKho)),
        reportLine('3. Phải thu khách hàng', conThu),
        reportLine('4. Dự phòng công nợ phải thu', H.roundMoney(duPhong)),
        reportLine('5. Phải trả người bán', conTra),
        reportLine('6. Thuế GTGT phải nộp', thuePhaiNop),
        reportLine('7. Nguyên giá tài sản cố định', H.roundMoney(src.ts.assets || [] .reduce(function (s, a) { return s + (Number(a.cost) || 0); }, 0))),
        reportLine('8. Khấu hao lũy kế', H.roundMoney(depreciation || 0))
      ].join('');
    }
  }

  function patch(ctx, section, data, initial) {
    var src = sourcesOf(ctx);
    var s = H.sig({
      v: src.ct.vouchers || [], r: src.cn.records || [],
      bh: src.bh.orders || [], stock: src.kho.stock || {},
      lots: src.kho.lots || {}, avg: src.kho.avg || {}, val: H.valuation(ctx.key),
      items: src.dm.items || [], hd: src.hd.invoices || [],
      mua: src.mh.purchases || [], muaHd: src.mh.bills || [],
      taiSan: src.ts.assets || [], accounts: src.accounts || [],
      dk: src.dk.entries || [], kk: src.kk.openings || [],
      kkClose: src.kk.closings || [], provision: src.cn.provisions || [],
      payroll: src.cb.payrolls || [], disposal: src.ts.disposals || [],
      tax: src.taxPayments || [],
      voucher: src.ct.vouchers || [], cash: src.cb.entries || []
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
    var stockValue = H.stockValue(src.kho, src.dm.items, ctx.key);
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
    renderBooks(section, src, ctx);
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

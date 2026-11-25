// Quản lý dữ liệu: tìm, sửa, xóa bản ghi ở mọi phần và xem nhật ký thay đổi.
// Đây là nơi xử lý các bản ghi chưa có nút sửa/xõa riêng trên giao diện chính.
(function (global) {
  'use strict';
  var K = global.Ketoan;
  if (!K) return;
  var H = K.helpers;

  var SKIP = { id: 1, at: 1, updatedAt: 1, source: 1, voucherIds: 1, lines: 1,
    returns: 1, depreciation: 1, stock: 1, audit: 1, _html: 1 };
  // CSV mang theo mã bản ghi để nhập lại không tạo trùng; trình sửa vẫn ẩn mã này.
  var CSV_SKIP = Object.assign({}, SKIP);
  delete CSV_SKIP.id;

  var SOURCES = [
    { name: 'chungtu', label: 'Chứng từ', field: 'vouchers' },
    { name: 'danhmuc', label: 'Danh mục', field: 'items' },
    { name: 'congno', label: 'Công nợ', field: 'records' },
    { name: 'tonkho', label: 'Kho — xuất nhập', field: 'movements' },
    { name: 'banhang', label: 'Bán hàng', field: 'orders' },
    { name: 'hoadon', label: 'Hóa đơn', field: 'invoices' },
    { name: 'muahang', label: 'Mua hàng', field: 'purchases' },
    { name: 'cashbank', label: 'Quỹ / ngân hàng', field: 'entries' },
    { name: 'taisan', label: 'Tài sản', field: 'assets' },
    { name: 'dinhkhoan', label: 'Định khoản', field: 'entries' }
  ];

  function defaults() { return { audit: [], updatedAt: '' }; }

  function sourceOf(name) {
    return SOURCES.filter(function (s) { return s.name === name; })[0] || SOURCES[0];
  }

  function storeOf(ctx, name) {
    return H.data(ctx.key, K.modules[name]);
  }

  function updateRow(ctx, source, id, patch) {
    var store = storeOf(ctx, source.name);
    var rows = Array.isArray(store[source.field]) ? store[source.field] : [];
    var found = null;
    rows.forEach(function (r) { if (r && r.id === id) found = r; });
    if (!found) return null;
    Object.keys(patch || {}).forEach(function (k) { found[k] = patch[k]; });
    found.updatedAt = new Date().toISOString();
    store.updatedAt = new Date().toISOString();
    return { module: source.name, value: store };
  }

  function removeRow(ctx, source, id) {
    var store = storeOf(ctx, source.name);
    var rows = Array.isArray(store[source.field]) ? store[source.field] : [];
    var next = rows.filter(function (r) { return !r || r.id !== id; });
    if (next.length === rows.length) return null;
    store[source.field] = next;
    store.updatedAt = new Date().toISOString();
    return { module: source.name, value: store };
  }

  function rowsOf(ctx, source) {
    var store = storeOf(ctx, source.name);
    return Array.isArray(store[source.field]) ? store[source.field] : [];
  }

  function labelOf(row) {
    return row.so || row.ma || row.name || row.partner || row.note || row.id || '';
  }

  function amountOf(row) {
    return row.total || row.amount || row.cost || row.price || row.qty || 0;
  }

  function mount(ctx) {
    var opts = SOURCES.map(function (s) {
      return '<option value="' + s.name + '">' + s.label + '</option>';
    }).join('');
    return '<div class="card module-card">' +
      '<h3>Quản lý & nhật ký thay đổi</h3>' +
      '<div class="ql-tools">' +
        '<select class="ql-branch">' + opts + '</select>' +
        '<input class="ql-search" placeholder="Tìm mã, tên, diễn giải">' +
        '<button class="btn" type="button" data-ql-export>Xuất CSV</button>' +
        '<button class="btn" type="button" data-ql-import>Nhập CSV</button>' +
        '<input class="ql-file" type="file" accept=".csv,text/csv" hidden>' +
      '</div>' +
      '<div class="report-scroll"><table class="report-table ql-table"><thead><tr>' +
        '<th>Mã / tên</th><th>Ngày</th><th>Giá trị</th><th>Diễn giải</th><th></th>' +
      '</tr></thead><tbody data-ql-body="list"></tbody></table></div>' +
      '<div class="ql-edit" data-ql-edit></div>' +
      '</div>' +
      '<div class="card module-card">' +
        '<h3>Nhật ký thay đổi</h3>' +
        '<div class="ql-audit" data-ql-body="audit"></div>' +
        '<p class="muted">Mỗi lần thêm/sửa/xóa nghiệp vụ hoặc đổi kỳ khóa được ghi lại ở đây (tối đa 200 dòng gần nhất).</p>' +
      '</div>';
  }

  function closeEditor(section) {
    var host = section.querySelector('[data-ql-edit]');
    if (host) host.innerHTML = '';
  }

  function openEditor(ctx, section, source, row) {
    if (row.date && H.isLocked(ctx.key, row.date)) {
      ctx.foot('Kỳ của bản ghi này đã khóa, không sửa được.');
      return;
    }
    var host = section.querySelector('[data-ql-edit]');
    host.innerHTML = '';
    var title = global.document.createElement('h4');
    title.textContent = 'Sửa: ' + labelOf(row);
    host.appendChild(title);
    var form = global.document.createElement('form');
    form.className = 'ql-edit-form';
    var fields = Object.keys(row).filter(function (k) {
      return !SKIP[k] && typeof row[k] !== 'object' && row[k] !== undefined;
    });
    fields.forEach(function (key) {
      var input = global.document.createElement('input');
      var type = typeof row[key] === 'number' ? 'number' : 'text';
      if (/date|due|from|to$/.test(key)) type = 'date';
      input.type = type;
      input.value = row[key] === null ? '' : String(row[key]);
      input.placeholder = key;
      input._field = key;
      input._type = type;
      form.appendChild(input);
    });
    var save = global.document.createElement('button');
    save.type = 'submit'; save.className = 'btn primary'; save.textContent = 'Lưu thay đổi';
    form.appendChild(save);
    var cancel = global.document.createElement('button');
    cancel.type = 'button'; cancel.className = 'btn'; cancel.textContent = 'Hủy';
    cancel.addEventListener('click', function () { closeEditor(section); });
    form.appendChild(cancel);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var patch = {};
      form.children.forEach(function (input) {
        if (!input._field) return;
        patch[input._field] = input._type === 'number'
          ? H.roundMoney(Number(input.value) || 0) : String(input.value || '');
      });
      if (patch.date && H.isLocked(ctx.key, patch.date)) {
        ctx.foot('Không chuyển bản ghi vào kỳ đã khóa.');
        return;
      }
      var write = updateRow(ctx, source, row.id, patch);
      if (!write || !H.commit(ctx.key, [write], ctx, 'Đã lưu thay đổi.')) return;
      H.audit(ctx.key, 'Sửa ' + source.label, labelOf(row));
      closeEditor(section);
      renderAll(ctx, section);
      ctx.sync(source.name);
      ctx.sync('baocao');
    });
    host.appendChild(form);
  }

  function renderRows(ctx, section, source) {
    var body = section.querySelector('[data-ql-body="list"]');
    var q = String((section.querySelector('.ql-search') || {}).value || '').trim().toLowerCase();
    var rows = rowsOf(ctx, source).filter(function (r) {
      return !q || [labelOf(r), r.date, r.note].join(' ').toLowerCase().indexOf(q) >= 0;
    });
    body.innerHTML = '';
    rows.forEach(function (row) {
      var tr = global.document.createElement('tr');
      tr.dataset.qlId = row.id;
      tr.innerHTML = '<td>' + H.esc(labelOf(row)) + '</td><td>' + H.esc(row.date || '') + '</td>' +
        '<td class="num">' + H.money(amountOf(row)) + '</td><td>' + H.esc(row.note || row.partner || '') + '</td><td></td>';
      var cell = tr.children[tr.children.length - 1];
      var edit = global.document.createElement('button');
      edit.className = 'btn btn-icon'; edit.textContent = 'Sửa';
      edit.addEventListener('click', function () { openEditor(ctx, section, source, row); });
      var del = global.document.createElement('button');
      del.className = 'btn btn-icon danger'; del.textContent = 'Xóa';
      del.addEventListener('click', function () {
        if (row.date && !H.guard(ctx, row.date, 'Xóa ' + source.label)) return;
        if (global.confirm && !global.confirm('Xóa bản ghi ' + labelOf(row) + '?')) return;
        var write = removeRow(ctx, source, row.id);
        if (!write || !H.commit(ctx.key, [write], ctx, 'Đã xóa bản ghi.')) return;
        H.audit(ctx.key, 'Xóa ' + source.label, labelOf(row));
        closeEditor(section);
        renderAll(ctx, section);
        ctx.sync(source.name);
        ctx.sync('baocao');
      });
      cell.appendChild(edit); cell.appendChild(del);
      body.appendChild(tr);
    });
    if (!rows.length) {
      var empty = global.document.createElement('tr');
      empty.innerHTML = '<td colspan="5" class="muted">Không có bản ghi phù hợp</td>';
      body.appendChild(empty);
    }
  }

  function renderAudit(ctx, section) {
    var host = section.querySelector('[data-ql-body="audit"]');
    var logs = (H.data(ctx.key, mod).audit || []).slice(0, 50);
    host.innerHTML = logs.length
      ? logs.map(function (l) {
          return '<div class="ql-log"><time>' + H.esc(l.at || '') + '</time><b>' + H.esc(l.action) + '</b><span>' + H.esc(l.detail) + '</span></div>';
        }).join('')
      : '<p class="muted">Chưa có thay đổi nào được ghi nhận.</p>';
  }

  function renderAll(ctx, section) {
    var select = section.querySelector('.ql-branch');
    renderRows(ctx, section, sourceOf(select.value || 'chungtu'));
    renderAudit(ctx, section);
  }

  function exportCsv(ctx, section, source) {
    var rows = rowsOf(ctx, source);
    var keys = [];
    rows.forEach(function (r) {
      Object.keys(r).forEach(function (k) {
        if (!CSV_SKIP[k] && typeof r[k] !== 'object' && keys.indexOf(k) < 0) keys.push(k);
      });
    });
    if (!keys.length) keys = ['id'];
    var cell = function (v) { return '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [keys.map(cell).join(',')].concat(rows.map(function (r) {
      return keys.map(function (k) { return cell(r[k]); }).join(',');
    }));
    try {
      var blob = new global.Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      var url = global.URL.createObjectURL(blob);
      var a = global.document.createElement('a');
      a.href = url; a.download = source.name + '.csv'; a.click();
      global.URL.revokeObjectURL(url);
      ctx.foot('Đã xuất ' + rows.length + ' bản ghi ra CSV.');
    } catch (err) {
      ctx.foot('Trình duyệt không cho xuất tệp CSV.');
    }
  }

  function parseCsv(text) {
    var table = [], row = [], cell = '', quoted = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); table.push(row); row = []; cell = ''; }
      else if (ch !== '\r') cell += ch;
    }
    if (cell || row.length) { row.push(cell); table.push(row); }
    return table;
  }

  function importCsv(ctx, section, source, file) {
    if (!file || !H.can('import')) {
      ctx.foot('Người dùng này không có quyền nhập dữ liệu.'); return;
    }
    function read(done) {
      if (file.text && typeof file.text === 'function') {
        file.text().then(done).catch(function () { ctx.foot('Không đọc được tệp CSV.'); });
        return;
      }
      var reader = new global.FileReader();
      reader.onload = function () { done(String(reader.result || '')); };
      reader.onerror = function () { ctx.foot('Không đọc được tệp CSV.'); };
      reader.readAsText(file, 'UTF-8');
    }
    read(function (text) {
      var table = parseCsv(String(text || '').replace(/^\ufeff/, ''));
      if (table.length < 2) { ctx.foot('Tệp CSV không có dữ liệu để nhập.'); return; }
      var header = table.shift();
      var store = storeOf(ctx, source.name);
      var rows = Array.isArray(store[source.field]) ? store[source.field].slice() : [];
      var seen = {};
      rows.forEach(function (r) { seen[String(r && r.id)] = true; });
      var added = 0;
      table.forEach(function (cols) {
        if (!cols.some(function (v) { return String(v || '').trim(); })) return;
        var row = {};
        cols.forEach(function (value, i) {
          var key = String(header[i] || '').trim();
          if (!key || CSV_SKIP[key]) return;
          row[key] = /^(qty|price|amount|total|cost|gross|paid|tax|taxAmount|discount|rate|employer|net|hold|accumulated)$/.test(key)
            ? Number(value) || 0 : String(value);
        });
        if (!row.id) row.id = H.uid(source.name);
        if (!seen[String(row.id)]) { rows.push(row); seen[String(row.id)] = true; added++; }
      });
      if (!added) { ctx.foot('Không có bản ghi mới trong tệp CSV.'); return; }
      store[source.field] = rows;
      store.updatedAt = new Date().toISOString();
      if (!H.commit(ctx.key, [{ module: source.name, value: store }], ctx, 'Đã nhập ' + added + ' bản ghi.')) return;
      H.audit(ctx.key, 'Nhập CSV ' + source.label, added + ' bản ghi');
      renderAll(ctx, section);
      ctx.sync(source.name);
      ctx.sync('baocao');
    });
  }

  function bind(ctx, section) {
    var select = section.querySelector('.ql-branch');
    var search = section.querySelector('.ql-search');
    select.addEventListener('change', function () {
      closeEditor(section);
      renderAll(ctx, section);
    });
    ['input', 'change'].forEach(function (type) {
      search.addEventListener(type, function () { renderAll(ctx, section); });
    });
    section.querySelector('[data-ql-export]').addEventListener('click', function () {
      exportCsv(ctx, section, sourceOf(select.value || 'chungtu'));
    });
    var file = section.querySelector('.ql-file');
    section.querySelector('[data-ql-import]').addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      if (file.files && file.files[0]) importCsv(ctx, section, sourceOf(select.value || 'chungtu'), file.files[0]);
      file.value = '';
    });
  }

  function patch(ctx, section, data, initial) {
    var s = H.sig({
      a: data.audit || [],
      ds: SOURCES.map(function (src) {
        var store = storeOf(ctx, src.name);
        return [src.name, store[src.field] || []];
      })
    });
    if (ctx.pane.sigs['quanly.data'] === s) return;
    ctx.pane.sigs['quanly.data'] = s;
    renderAll(ctx, section);
    if (!initial) ctx.bumpPatch();
  }

  var mod = {
    label: 'Quản lý dữ liệu',
    order: 110,
    branch: 'quanly',
    defaults: defaults,
    mount: mount,
    bind: bind,
    patch: patch
  };
  K.register('quanly', mod);
})(typeof window !== 'undefined' ? window : this);

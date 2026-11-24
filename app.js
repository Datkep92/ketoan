(function () {
  'use strict';

  var NS = 'ketoan.v1';
  var K_TENANTS = NS + ':tenants';
  var K_META = function (id) { return NS + ':tenant:' + id + ':meta'; };
  var K_DATA = function (id) { return NS + ':tenant:' + id + ':data'; };

  // Nếu trình duyệt chặn localStorage (chế độ riêng tư / file://), dùng bộ nhớ phiên và báo cho người dùng.
  var backend = (function () {
    try {
      var probe = '__ketoan_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    } catch (e) {
      var mem = {};
      return {
        __memory: true,
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
        setItem: function (k, v) { mem[k] = String(v); },
        removeItem: function (k) { delete mem[k]; }
      };
    }
  })();

  function readJSON(key, fallback) {
    var raw = backend.getItem(key);
    if (raw === null || raw === '') return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  }
  function writeJSON(key, value) { backend.setItem(key, JSON.stringify(value)); }
  function sig(value) { try { return JSON.stringify(value); } catch (e) { return String(value); } }
  function uid(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function money(n) { return new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + ' đ'; }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var DEFAULT_ACCOUNTS = [
    { code: '111', name: 'Tiền mặt' },
    { code: '112', name: 'Tiền gửi ngân hàng' },
    { code: '331', name: 'Phải trả người bán' },
    { code: '511', name: 'Doanh thu bán hàng' },
    { code: '642', name: 'Chi phí quản lý' }
  ];
  function newData() { return { rev: 0, vouchers: [], accounts: DEFAULT_ACCOUNTS.slice() }; }

  var state = {
    tenants: [],
    activeId: null,
    panes: {},                       // id -> pane DOM được cache lại, mỗi công ty một pane riêng
    counters: { full: 0, patch: 0 }
  };

  var list = document.getElementById('tenant-list');
  var count = document.getElementById('tenant-count');
  var crumb = document.getElementById('crumb');
  var workspace = document.getElementById('workspace');
  var empty = document.getElementById('empty');
  var counterFull = document.getElementById('counter-full');
  var counterPatch = document.getElementById('counter-patch');

  if (backend.__memory) {
    document.getElementById('side-foot').textContent = 'Trình duyệt chặn lưu cục bộ — dữ liệu chỉ tồn tại đến khi đóng trang';
  }

  function updateCounters() {
    counterFull.textContent = 'Render toàn bộ: ' + state.counters.full;
    counterPatch.textContent = 'Cập nhật phần: ' + state.counters.patch;
  }
  function bumpPatch() { state.counters.patch++; updateCounters(); }

  // ---------- Sidebar: chỉ thêm/xóa đúng một nút, không render lại toàn danh sách ----------
  function makeTenantButton(meta) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tenant-item';
    btn.dataset.id = meta.id;

    var dot = document.createElement('span');
    dot.className = 'dot' + (meta.type === 'hkd' ? ' hkd' : '');
    var name = document.createElement('span');
    name.className = 'tname';
    name.textContent = meta.name;
    var kind = document.createElement('small');
    kind.textContent = meta.type === 'hkd' ? 'HKD' : 'CTY';

    btn.appendChild(dot);
    btn.appendChild(name);
    btn.appendChild(kind);
    btn.addEventListener('click', function () { openTenant(meta.id); });
    return btn;
  }

  function appendTenantButton(meta) {
    list.appendChild(makeTenantButton(meta));
    count.textContent = String(state.tenants.length);
    empty.hidden = true;
  }

  function renderSidebar() {
    list.innerHTML = '';
    state.tenants.forEach(appendTenantButton);
    count.textContent = String(state.tenants.length);
    empty.hidden = state.tenants.length > 0;
  }

  // ---------- Tạo công ty ----------
  function createTenant(name, type) {
    var now = new Date().toISOString();
    var meta = { id: uid('t'), name: name, type: type, createdAt: now, updatedAt: now };
    writeJSON(K_META(meta.id), meta);
    writeJSON(K_DATA(meta.id), newData());
    state.tenants.push(meta);
    writeJSON(K_TENANTS, state.tenants);
    return meta;
  }

  // ---------- Pane riêng cho từng công ty ----------
  function accountOptions(accounts) {
    return accounts.map(function (a) {
      return '<option value="' + a.code + '">' + a.code + ' — ' + a.name + '</option>';
    }).join('');
  }

  function createPane(meta, data) {
    var root = document.createElement('section');
    root.className = 'tenant-pane';
    root.id = 'pane-' + meta.id;
    root.dataset.id = meta.id;
    root.innerHTML =
      '<div class="pane-head">' +
        '<div><h2 class="pane-title"></h2><p class="pane-sub"></p></div>' +
        '<button class="btn ghost btn-rename" type="button">Đổi tên</button>' +
      '</div>' +
      '<div class="stats">' +
        '<div class="stat"><label>Số chứng từ</label><b data-stat="count">0</b></div>' +
        '<div class="stat"><label>Tổng thu</label><b data-stat="in">0 đ</b></div>' +
        '<div class="stat"><label>Tổng chi</label><b data-stat="out">0 đ</b></div>' +
      '</div>' +
      '<div class="card">' +
        '<h3>Chứng từ</h3>' +
        '<form class="voucher-form">' +
          '<input type="date" name="date" required>' +
          '<input name="note" placeholder="Diễn giải" required maxlength="120">' +
          '<select name="account">' + accountOptions(data.accounts) + '</select>' +
          '<select name="kind"><option value="in">Thu</option><option value="out">Chi</option></select>' +
          '<input name="amount" type="number" min="0" step="1000" placeholder="Số tiền" required>' +
          '<button class="btn primary" type="submit">Thêm</button>' +
        '</form>' +
        '<table class="vtable"><thead><tr><th>Ngày</th><th>Diễn giải</th><th>Tài khoản</th><th>Số tiền</th></tr></thead>' +
          '<tbody></tbody></table>' +
      '</div>';
    workspace.appendChild(root);

    var pane = { id: meta.id, root: root, sigs: {} };

    var form = root.querySelector('.voucher-form');
    form.elements['date'].value = today();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.currentTarget.elements;
      var voucher = {
        id: uid('v'),
        date: f['date'].value,
        note: f['note'].value.trim(),
        account: f['account'].value,
        kind: f['kind'].value,
        amount: Number(f['amount'].value)
      };
      if (!voucher.note || !voucher.date || !(voucher.amount > 0)) return;

      // Đọc lại từ nơi lưu, ghi rồi chỉ vá hai phần thay đổi.
      var current = readJSON(K_DATA(pane.id), newData());
      current.rev = (current.rev || 0) + 1;
      current.vouchers.push(voucher);
      writeJSON(K_DATA(pane.id), current);

      e.currentTarget.reset();
      form.elements['date'].value = today();

      patchStats(pane, current);
      patchVouchers(pane, current);
    });

    root.querySelector('.btn-rename').addEventListener('click', function () {
      var currentMeta = readJSON(K_META(pane.id), null);
      if (!currentMeta) return;
      var next = window.prompt('Tên mới', currentMeta.name);
      if (next === null || !next.trim()) return;
      currentMeta.name = next.trim();
      currentMeta.updatedAt = new Date().toISOString();
      writeJSON(K_META(pane.id), currentMeta);
      state.tenants.forEach(function (t, i) { if (t.id === pane.id) state.tenants[i] = currentMeta; });
      writeJSON(K_TENANTS, state.tenants);
      patchMeta(pane, currentMeta);
    });

    // Lần đầu tạo pane: render đầy đủ một lần, các lần sau chỉ patch.
    patchMeta(pane, meta, true);
    patchStats(pane, data, true);
    patchVouchers(pane, data, true);
    state.counters.full++;
    updateCounters();
    return pane;
  }

  // ---------- Các hàm vá theo từng phần ----------
  function patchMeta(pane, meta, initial) {
    var s = sig(meta);
    if (pane.sigs.meta === s) return;
    pane.sigs.meta = s;
    pane.root.querySelector('.pane-title').textContent = meta.name;
    pane.root.querySelector('.pane-sub').textContent =
      (meta.type === 'hkd' ? 'Hộ kinh doanh' : 'Công ty') + ' · id: ' + meta.id;
    var label = list.querySelector('[data-id="' + meta.id + '"] .tname');
    if (label) label.textContent = meta.name;
    if (!initial) bumpPatch();
  }

  function patchStats(pane, data, initial) {
    var vouchers = data.vouchers || [];
    var s = sig(vouchers);
    if (pane.sigs.stats === s) return;
    pane.sigs.stats = s;
    var income = 0, expense = 0;
    vouchers.forEach(function (v) {
      if (v.kind === 'in') income += Number(v.amount) || 0;
      else expense += Number(v.amount) || 0;
    });
    pane.root.querySelector('[data-stat="count"]').textContent = String(vouchers.length);
    pane.root.querySelector('[data-stat="in"]').textContent = money(income);
    pane.root.querySelector('[data-stat="out"]').textContent = money(expense);
    if (!initial) bumpPatch();
  }

  function makeVoucherRow(v) {
    var tr = document.createElement('tr');
    tr.dataset.vid = v.id;
    [v.date, v.note, v.account, money(v.amount)].forEach(function (text) {
      var td = document.createElement('td');
      td.textContent = text;
      tr.appendChild(td);
    });
    return tr;
  }

  function patchVouchers(pane, data, initial) {
    var vouchers = data.vouchers || [];
    var s = sig(vouchers);
    if (pane.sigs.vouchers === s) return;
    pane.sigs.vouchers = s;

    var tbody = pane.root.querySelector('.vtable tbody');
    var rows = Array.prototype.slice.call(tbody.children);
    if (rows.length !== vouchers.length) {
      // Thêm mới: chỉ nối thêm một hàng. Xóa/thay đổi số lượng: chỉ dựng lại riêng tbody này.
      if (vouchers.length < rows.length || vouchers.length - rows.length > 1) tbody.innerHTML = '';
      for (var i = tbody.children.length; i < vouchers.length; i++) {
        tbody.appendChild(makeVoucherRow(vouchers[i]));
      }
    }
    for (var j = 0; j < vouchers.length; j++) {
      var row = tbody.children[j];
      if (row && row.dataset.vid !== vouchers[j].id) {
        tbody.replaceChild(makeVoucherRow(vouchers[j]), row);
      }
    }
    if (!initial) bumpPatch();
  }

  // ---------- Chuyển công ty: tái dùng pane có sẵn ----------
  function openTenant(id) {
    if (state.activeId === id) return;
    var meta = readJSON(K_META(id), null);
    if (!meta) return;

    var oldBtn = list.querySelector('.tenant-item.active');
    if (oldBtn) oldBtn.classList.remove('active');
    var btn = list.querySelector('[data-id="' + id + '"]');
    if (btn) btn.classList.add('active');
    state.activeId = id;

    var pane = state.panes[id];
    if (pane) {
      Object.keys(state.panes).forEach(function (k) { state.panes[k].root.hidden = (k !== id); });
      pane.root.hidden = false;
    } else {
      pane = createPane(meta, readJSON(K_DATA(id), newData()));
      state.panes[id] = pane;
    }

    crumb.textContent = meta.name + ' · ' + (meta.type === 'hkd' ? 'Hộ kinh doanh' : 'Công ty');

    // Mỗi lần click đều đọc lại từ nơi lưu, rồi vá metadata và dữ liệu của đúng công ty này.
    patchMeta(pane, readJSON(K_META(id), meta));
    var data = readJSON(K_DATA(id), newData());
    patchStats(pane, data);
    patchVouchers(pane, data);
  }

  // ---------- Điều khiển thêm công ty ----------
  var formNew = document.getElementById('form-new-tenant');
  document.getElementById('btn-add-tenant').addEventListener('click', function () {
    formNew.hidden = false;
    document.getElementById('new-name').focus();
  });
  document.getElementById('btn-cancel-tenant').addEventListener('click', function () {
    formNew.hidden = true;
    formNew.reset();
  });
  formNew.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = document.getElementById('new-name').value.trim();
    if (!name) return;
    var meta = createTenant(name, document.getElementById('new-type').value);
    formNew.hidden = true;
    formNew.reset();
    appendTenantButton(meta);
    crumb.textContent = '';
    openTenant(meta.id);
  });

  // ---------- Khởi động ----------
  state.tenants = readJSON(K_TENANTS, []);
  if (!Array.isArray(state.tenants)) state.tenants = [];
  renderSidebar();
  updateCounters();
  if (state.tenants.length) openTenant(state.tenants[0].id);
})();

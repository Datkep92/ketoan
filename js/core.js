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
    if (!DB || !mod || !mod.branch) return null;
    return DB.saveBranch(key, mod.branch, value);
  }

  // Danh mục là nguồn tài khoản duy nhất cho form chứng từ.
  function accounts(key) {
    var dm = modules.danhmuc;
    var value = dm ? data(key, dm) : null;
    if (value && value.accounts && value.accounts.length) return value.accounts.slice();
    return DB && DB.defaultAccounts ? DB.defaultAccounts() : [];
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
      accounts: accounts
    }
  };
})(typeof window !== 'undefined' ? window : this);

// Dữ liệu mẫu một chạm: tạo một công ty và điền đủ mười bốn phần để xem thử giao diện.
// Chỉ ghi vào nhánh của công ty mới; không đụng đến dữ liệu có sẵn.
(function (global) {
  'use strict';

  var DB = global.KetoanDB;
  var K = global.Ketoan;
  if (!DB || !K) return;
  var H = K.helpers;

  var MST = '0102030405';
  var NAME = 'Công ty TNHH Dịch vụ Minh Khang';
  var STAMP = new Date().toISOString();

  function at(day) { return day + 'T09:00:00.000Z'; }

  function write(key, name, value) {
    var mod = K.modules[name];
    return !!(mod && H.save(key, mod, value));
  }

  function build(key) {
    var accounts = DB.defaultAccounts();

    var danhmuc = {
      accounts: accounts,
      customers: [
        { id: 'dm-kh1', code: 'KH01', name: 'Công ty TNHH Thương mại Hà Nội', extra: '0987654321', price: 0 },
        { id: 'dm-kh2', code: 'KH02', name: 'Công ty CP Dịch vụ Việt Trung', extra: '0912345678', price: 0 },
        { id: 'dm-kh3', code: 'KH03', name: 'Hộ kinh doanh Lan Anh', extra: '0909123456', price: 0 }
      ],
      suppliers: [
        { id: 'dm-ncc1', code: 'NCC01', name: 'Công ty TNHH Văn phòng phẩm Sài Gòn', extra: '02838212345', price: 0 },
        { id: 'dm-ncc2', code: 'NCC02', name: 'Công ty CP Thiết bị Vina', extra: '02438234567', price: 0 }
      ],
      items: [
        { id: 'sp-dv1', code: 'DV01', name: 'Dịch vụ kế toán trọn gói', extra: 'tháng', price: 2500000 },
        { id: 'sp-dv2', code: 'DV02', name: 'Tư vấn thuế', extra: 'giờ', price: 600000 },
        { id: 'sp-hh1', code: 'HH01', name: 'Giấy in A4 (ram)', extra: 'ram', price: 45000 },
        { id: 'sp-hh2', code: 'HH02', name: 'Mực in HP 83A', extra: 'cái', price: 1250000 }
      ],
      updatedAt: STAMP
    };

    var tonkho = {
      stock: { 'sp-dv1': 0, 'sp-dv2': 0, 'sp-hh1': 112, 'sp-hh2': 2 },
      movements: [
        { id: 'k-demo-1', type: 'nhap', itemId: 'sp-hh1', qty: 120, note: 'Nhập kho giấy A4', at: at('2026-11-08') },
        { id: 'k-demo-2', type: 'nhap', itemId: 'sp-hh2', qty: 2, note: 'Nhập kho mực in', at: at('2026-11-18') },
        { id: 'k-demo-3', type: 'xuat', itemId: 'sp-hh1', qty: 10, note: 'Bán cho Hộ kinh doanh Lan Anh', at: at('2026-11-22') },
        { id: 'k-demo-4', type: 'nhap', itemId: 'sp-hh1', qty: 2, note: 'Khách trả hàng', at: at('2026-11-23') }
      ],
      updatedAt: STAMP
    };

    var congno = {
      records: [
        { id: 'cn-demo-1', type: 'phaiThu', partner: 'Công ty TNHH Thương mại Hà Nội', amount: 5000000, paid: 5000000, due: '2026-12-15', voucherIds: ['v-demo-1', 'v-demo-2'] },
        { id: 'cn-demo-2', type: 'phaiThu', partner: 'Công ty CP Dịch vụ Việt Trung', amount: 2400000, paid: 0, due: '2026-12-31', voucherIds: [], source: 'banhang:bh-demo-2' },
        { id: 'cn-demo-3', type: 'phaiTra', partner: 'Công ty TNHH Văn phòng phẩm Sài Gòn', amount: 860000, paid: 0, due: '2026-12-20', voucherIds: [], source: 'muahang:mh-demo-1' },
        { id: 'cn-demo-4', type: 'phaiTra', partner: 'Công ty CP Thiết bị Vina', amount: 2700000, paid: 0, due: '2026-12-10', voucherIds: [], source: 'muahang:mh-demo-2' }
      ],
      updatedAt: STAMP
    };

    var chungtu = {
      rev: 9,
      accounts: accounts,
      vouchers: [
        { id: 'v-demo-1', date: '2026-11-05', note: 'Thu khách Hà Nội', account: '111', kind: 'in', amount: 3000000, linkId: 'cn-demo-1' },
        { id: 'v-demo-2', date: '2026-11-12', note: 'Thu khách Hà Nội', account: '112', kind: 'in', amount: 2000000, linkId: 'cn-demo-1' },
        { id: 'v-demo-3', date: '2026-11-08', note: 'Trả công ty giấy A4', account: '111', kind: 'out', amount: 4000000, linkId: '', source: 'muahang:mh-demo-1' },
        { id: 'v-demo-4', date: '2026-11-15', note: 'Thu bán dịch vụ kế toán', account: '111', kind: 'in', amount: 4750000, linkId: '', source: 'banhang:bh-demo-1' },
        { id: 'v-demo-5', date: '2026-11-22', note: 'Thu bán giấy A4', account: '111', kind: 'in', amount: 360000, linkId: '', source: 'banhang:bh-demo-3' },
        { id: 'v-demo-6', date: '2026-11-23', note: 'Hoàn khách giấy A4', account: '111', kind: 'out', amount: 90000, linkId: '', source: 'banhang-return:bh-demo-3' },
        { id: 'v-demo-7', date: '2026-11-16', note: 'Thu khách lẻ', account: '111', kind: 'in', amount: 1500000, linkId: '', source: 'cashbank:cb-demo-1' },
        { id: 'v-demo-8', date: '2026-11-20', note: 'Chi điện nước', account: '111', kind: 'out', amount: 1200000, linkId: '', source: 'cashbank:cb-demo-2' },
        { id: 'v-demo-9', date: '2026-11-21', note: 'Chi lương nhân viên', account: '111', kind: 'out', amount: 6000000, linkId: '', source: 'cashbank:cb-demo-3' }
      ]
    };

    var banhang = {
      orders: [
        { id: 'bh-demo-1', ma: 'BH-0001', date: '2026-11-15', customer: 'Công ty TNHH Thương mại Hà Nội', customerId: 'dm-kh1', itemId: 'sp-dv1', itemName: 'Dịch vụ kế toán trọn gói', qty: 2, price: 2500000, gross: 5000000, discount: 5, discountAmount: 250000, amount: 4750000, paid: 4750000, returned: 0, returnedQty: 0, returns: [], note: 'Kế toán tháng 11', source: 'banhang', at: at('2026-11-15') },
        { id: 'bh-demo-2', ma: 'BH-0002', date: '2026-11-19', customer: 'Công ty CP Dịch vụ Việt Trung', customerId: 'dm-kh2', itemId: 'sp-dv2', itemName: 'Tư vấn thuế', qty: 4, price: 600000, gross: 2400000, discount: 0, discountAmount: 0, amount: 2400000, paid: 0, returned: 0, returnedQty: 0, returns: [], note: 'Tư vấn 4 buổi', source: 'banhang', at: at('2026-11-19') },
        { id: 'bh-demo-3', ma: 'BH-0003', date: '2026-11-22', customer: 'Hộ kinh doanh Lan Anh', customerId: 'dm-kh3', itemId: 'sp-hh1', itemName: 'Giấy in A4 (ram)', qty: 10, price: 45000, gross: 450000, discount: 0, discountAmount: 0, amount: 450000, paid: 450000, returned: 90000, returnedQty: 2, returns: [{ id: 'bhr-demo-1', date: '2026-11-23', qty: 2, amount: 90000, refund: 90000, note: 'Hàng bị lỗi', at: at('2026-11-23') }], note: 'Khách lẻ', source: 'banhang', at: at('2026-11-22') }
      ],
      updatedAt: STAMP
    };

    var muahang = {
      purchases: [
        { id: 'mh-demo-1', ma: 'MH-0001', date: '2026-11-08', supplier: 'Công ty TNHH Văn phòng phẩm Sài Gòn', supplierId: 'dm-ncc1', itemId: 'sp-hh1', itemName: 'Giấy in A4 (ram)', qty: 100, price: 45000, amount: 4500000, tax: 8, taxAmount: 360000, total: 4860000, paid: 4000000, note: 'Nhập giấy in', source: 'muahang', at: at('2026-11-08') },
        { id: 'mh-demo-2', ma: 'MH-0002', date: '2026-11-18', supplier: 'Công ty CP Thiết bị Vina', supplierId: 'dm-ncc2', itemId: 'sp-hh2', itemName: 'Mực in HP 83A', qty: 2, price: 1250000, amount: 2500000, tax: 8, taxAmount: 200000, total: 2700000, paid: 0, note: 'Nhập mực in', source: 'muahang', at: at('2026-11-18') }
      ],
      bills: [
        { id: 'mhb-demo-1', so: 'HH/26-001', date: '2026-11-08', supplier: 'Công ty TNHH Văn phòng phẩm Sài Gòn', purchaseId: 'mh-demo-1', amount: 4500000, tax: 8, taxAmount: 360000, total: 4860000, paid: 4000000, note: '', at: at('2026-11-08') },
        { id: 'mhb-demo-2', so: 'HH/26-002', date: '2026-11-18', supplier: 'Công ty CP Thiết bị Vina', purchaseId: 'mh-demo-2', amount: 2500000, tax: 8, taxAmount: 200000, total: 2700000, paid: 0, note: '', at: at('2026-11-18') }
      ],
      updatedAt: STAMP
    };

    var hoadon = {
      invoices: [
        { id: 'hd-demo-1', so: 'HD/2026-001', date: '2026-11-15', customer: 'Công ty TNHH Thương mại Hà Nội', saleId: 'bh-demo-1', amount: 4750000, tax: 8, taxAmount: 380000, total: 5130000, paid: 5130000, note: '', at: at('2026-11-15') },
        { id: 'hd-demo-2', so: 'HD/2026-002', date: '2026-11-19', customer: 'Công ty CP Dịch vụ Việt Trung', saleId: 'bh-demo-2', amount: 2400000, tax: 8, taxAmount: 192000, total: 2592000, paid: 0, note: '', at: at('2026-11-19') },
        { id: 'hd-demo-3', so: 'HD/2026-003', date: '2026-11-22', customer: 'Hộ kinh doanh Lan Anh', saleId: 'bh-demo-3', amount: 450000, tax: 8, taxAmount: 36000, total: 486000, paid: 486000, note: '', at: at('2026-11-22') }
      ],
      updatedAt: STAMP
    };

    var cashbank = {
      entries: [
        { id: 'cb-demo-1', ma: 'QB-0001', date: '2026-11-16', type: 'in', account: '111', amount: 1500000, note: 'Thu khách lẻ', source: 'cashbank', at: at('2026-11-16') },
        { id: 'cb-demo-2', ma: 'QB-0002', date: '2026-11-20', type: 'out', account: '111', amount: 1200000, note: 'Chi điện nước', source: 'cashbank', at: at('2026-11-20') },
        { id: 'cb-demo-3', ma: 'QB-0003', date: '2026-11-21', type: 'out', account: '111', amount: 6000000, note: 'Chi lương nhân viên', source: 'cashbank', at: at('2026-11-21') }
      ],
      updatedAt: STAMP
    };

    var taisan = {
      assets: [
        { id: 'ts-demo-1', name: 'Máy tính Dell OptiPlex', date: '2026-01-10', cost: 25000000, years: 5, accumulated: 1250000, depreciation: [{ id: 'kh-demo-1', months: 3, amount: 1250000, date: '2026-11-01', at: at('2026-11-01') }], note: 'Dùng cho kế toán', at: at('2026-01-10') },
        { id: 'ts-demo-2', name: 'Máy in HP LaserJet', date: '2026-04-05', cost: 8000000, years: 4, accumulated: 1166667, depreciation: [{ id: 'kh-demo-2', months: 7, amount: 1166667, date: '2026-11-01', at: at('2026-11-01') }], note: 'In hóa đơn', at: at('2026-04-05') }
      ],
      updatedAt: STAMP
    };

    var dinhkhoan = {
      entries: [
        { id: 'dk-demo-1', so: 'DK/26-001', date: '2026-11-10', note: 'Chi phí thuê văn phòng', lines: [
          { account: '641', debit: 5000000, credit: 0 }, { account: '111', debit: 0, credit: 5000000 }
        ], updatedAt: STAMP },
        { id: 'dk-demo-2', so: 'DK/26-002', date: '2026-11-19', note: 'Doanh thu tư vấn chưa thu', lines: [
          { account: '131', debit: 3000000, credit: 0 }, { account: '511', debit: 0, credit: 3000000 }
        ], updatedAt: STAMP },
        { id: 'dk-demo-3', so: 'DK/26-003', date: '2026-11-25', note: 'Thu đa công nợ và doanh thu', lines: [
          { account: '111', debit: 10000000, credit: 0 },
          { account: '131', debit: 0, credit: 6000000 },
          { account: '511', debit: 0, credit: 4000000 }
        ], updatedAt: STAMP }
      ],
      updatedAt: STAMP
    };

    var khoaky = {
      lockedUntil: '',
      openings: [
        { id: 'kk-demo-1', account: '111', side: 'no', amount: 20000000, note: 'Số dư tiền đầu năm', createdAt: STAMP },
        { id: 'kk-demo-2', account: '331', side: 'co', amount: 15000000, note: 'Số dư phải trả đầu năm', createdAt: STAMP }
      ],
      updatedAt: STAMP
    };

    var quanly = {
      branches: ['chungtu', 'danhmuc', 'congno', 'baocao', 'caidat', 'tonkho', 'banhang', 'hoadon', 'muahang', 'cashbank', 'taisan', 'dinhkhoan', 'khoaky', 'quanly'],
      audit: [
        { id: 'log-demo-1', at: STAMP, action: 'Tạo công ty mẫu', detail: NAME },
        { id: 'log-demo-2', at: STAMP, action: 'Tạo dữ liệu mẫu', detail: 'mười bốn phần' }
      ],
      updatedAt: STAMP
    };

    var writes = [
      ['caidat', { donViTien: 'VNĐ', kyHieu: 'HD/2026', nam: 2026, ghiChu: 'Dữ liệu mẫu để xem giao diện' }],
      ['danhmuc', danhmuc],
      ['tonkho', tonkho],
      ['congno', congno],
      ['chungtu', chungtu],
      ['banhang', banhang],
      ['muahang', muahang],
      ['hoadon', hoadon],
      ['cashbank', cashbank],
      ['taisan', taisan],
      ['dinhkhoan', dinhkhoan],
      ['khoaky', khoaky],
      ['quanly', quanly],
      ['baocao', { updatedAt: STAMP }]
    ];

    for (var i = 0; i < writes.length; i++) {
      if (!write(key, writes[i][0], writes[i][1])) return false;
    }
    return true;
  }

  function seed() {
    if (H.isReadOnly()) return { error: 'Dữ liệu đang ở chế độ chỉ đọc, không tạo được dữ liệu mẫu.' };
    var found = DB.list().filter(function (meta) { return meta.mst === MST || H.nodeKey(meta) === MST; })[0];
    if (found) return { key: H.nodeKey(found), existing: true };
    var made = DB.create(MST, NAME, 'company');
    if (!made || made.error || !made.meta) return { error: 'Không tạo được công ty mẫu.' };
    var key = H.nodeKey(made.meta);
    if (!build(key)) return { error: 'Không ghi được dữ liệu mẫu.' };
    return { key: key, existing: false };
  }

  global.KetoanDemo = { seed: seed, mst: MST, name: NAME };
})(typeof window !== 'undefined' ? window : this);

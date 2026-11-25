# Kế toán dịch vụ

Phần mềm kế toán chạy hoàn toàn trong trình duyệt, không cần cài đặt hay máy chủ. Dùng để quản lý nhiều công ty, hộ kinh doanh nhỏ trên cùng một thiết bị.

## Web tĩnh

- Trang công khai: https://datkep92.github.io/ketoan/
- Có thể mở trực tiếp `index.html` bằng trình duyệt, hoặc phục vụ cục bộ:

```sh
python3 -m http.server 8899 --bind 0.0.0.0 --directory .
```

Rồi mở `http://127.0.0.1:8899/index.html`.

Không dùng thư viện ngoài, không có bước biên dịch.

## Bắt đầu dùng

1. Đăng nhập bằng một trong ba tài khoản mẫu: `admin/admin` (quản trị), `ketoan/123456` (kế toán), `xem/123456` (chỉ xem). Đổi mật khẩu mặc định trong phần **Thiết lập** trước khi dùng thật.
2. Bấm **Dữ liệu mẫu** để có một công ty mẫu đầy đủ, hoặc thêm công ty mới kèm mã số thuế.
3. Mỗi công ty có mười bốn phần riêng: chứng từ, định khoản, danh mục, công nợ, báo cáo, khóa kỳ, thiết lập, kho, bán hàng, hóa đơn, mua hàng, quỹ / ngân hàng, tài sản, quản lý dữ liệu. Báo cáo có bảy tab, gồm cả báo cáo tài chính và lưu chuyển tiền tệ.

## Dữ liệu

Dữ liệu lưu trong trình duyệt, tách riêng theo từng công ty. Dùng chức năng xuất/nhập trong **Thiết lập** hoặc **Quản lý dữ liệu** để sao lưu và mang sang máy khác. Xóa dữ liệu trình duyệt sẽ mất dữ liệu kế toán, nên xuất bản sao lưu thường xuyên.

## Phạm vi

Đây là bản rút gọn: chưa nối ngân hàng, hóa đơn điện tử hay tờ khai thuế tự động; báo cáo cần được kế toán đối chiếu trước khi dùng cho mục đích pháp lý.

## Kiểm tra cho người phát triển

- `node.real --jitless Scripts/check-logic.js` — 172 ca đạt.
- `node.real --jitless Scripts/check-demo.js` — 27 ca đạt.

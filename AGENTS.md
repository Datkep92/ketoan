# Kế toán dịch vụ — hướng dẫn dự án

## Chạy
- Mở trực tiếp `index.html` bằng trình duyệt, hoặc phục vụ cục bộ:
  `python3 -m http.server 8899 --bind 0.0.0.0 --directory .` trong thư mục dự án rồi mở `http://127.0.0.1:8899/index.html`.
- Không có bước build, không dùng thư viện ngoài: HTML/CSS/JS thuần.

## Cấu trúc
- `index.html`: khung sidebar và vùng làm việc.
- `styles.css`: giao diện.
- `app.js`: toàn bộ logic (lưu trữ, sidebar, pane, cập nhật tăng dần).

## Dữ liệu lưu cục bộ
- Prefix `ketoan.v1` trong `localStorage`.
- `ketoan.v1:tenants`: danh sách công ty / HKD.
- `ketoan.v1:tenant:<id>:meta`: thông tin riêng của từng công ty.
- `ketoan.v1:tenant:<id>:data`: chứng từ và tài khoản của từng công ty.
- Nếu trình duyệt chặn `localStorage`, ứng dụng tự dùng bộ nhớ phiên và báo ở chân sidebar.

## Nguyên tắc render
- Mỗi công ty có một vùng `.tenant-pane` riêng, được cache trong `state.panes`.
- Click sidebar: tạo pane lần đầu; các lần sau chỉ đổi `hidden` và vá metadata.
- Có dữ liệu mới: chỉ vá phần tương ứng (`stats` / `vouchers`), không render lại toàn pane hay toàn sidebar.
- Bộ đếm trên thanh trên cùng: “Render toàn bộ” chỉ tăng khi tạo công ty; “Cập nhật phần” tăng khi vá dữ liệu.

## Kiểm tra
- Chạy server cục bộ, mở trình duyệt: thêm công ty, chuyển giữa các công ty, thêm chứng từ.
- Kỳ vọng: bộ đếm “Cập nhật phần” tăng, “Render toàn bộ” đứng yên khi thêm chứng từ và khi chuyển công ty cũ.
- Kiểm cú pháp: `node --check app.js` (nếu máy có node).
- Kiểm logic không cần trình duyệt: `node Scripts/check-logic.js`.
  Kỳ vọng 18 dòng PASS: tách dữ liệu 2 công ty, click lại không render lại, thêm chứng từ chỉ vá 2 phần.

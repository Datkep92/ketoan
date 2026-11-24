# Kế toán dịch vụ — hướng dẫn dự án

## Chạy
- Mở trực tiếp `index.html` bằng trình duyệt, hoặc phục vụ cục bộ:
  `python3 -m http.server 8899 --bind 0.0.0.0 --directory .` trong thư mục dự án rồi mở `http://127.0.0.1:8899/index.html`.
- Không có bước build, không dùng thư viện ngoài: HTML/CSS/JS thuần.

## Cấu trúc
- `index.html`: khung sidebar, form thêm công ty có ô mã số thuế và vùng làm việc.
- `styles.css`: giao diện.
- `db.js`: kho dữ liệu chung dạng cây, có số phiên bản và cơ chế chuyển dữ liệu cũ.
- `app.js`: logic giao diện, sidebar, pane và cập nhật tăng dần; đọc/ghi qua kho dữ liệu.

## Dữ liệu lưu cục bộ
- Một khóa duy nhất `ketoan.v1:store`, bên trong có `schemaVersion` và `nodes`.
- Mỗi mã số thuế là một `nodes[<mst>]`, chứa `meta` và `branches`.
- `branches.chungtu` giữ chứng từ/tài khoản; có thể thêm `danhmuc`, `congno`, `baocao` sau này mà không đổi cấu trúc.
- Không nhập MST thì hệ thống tự tạo khóa riêng; MST trùng bị từ chối, không ghi đè nhánh có sẵn.
- Dữ liệu phẳng cũ `ketoan.v1:*` được chuyển sang cây khi mở trang, sau đó khóa cũ được dọn.
- Nếu gặp kho phiên bản mới hơn, hệ thống sao lưu và chuyển sang chế độ chỉ đọc, không ghi đè.
- Nếu trình duyệt chặn `localStorage`, ứng dụng tự dùng bộ nhớ phiên và báo ở chân sidebar.

## Nguyên tắc render
- Mỗi công ty có một vùng `.tenant-pane` riêng, cache trong `state.panes` theo khóa MST.
- Click sidebar: tạo pane lần đầu; các lần sau chỉ đổi `hidden` và vá metadata.
- Có dữ liệu mới: chỉ vá phần tương ứng (`stats` / `vouchers`) trong đúng nhánh MST, không render lại toàn pane hay toàn sidebar.
- Bộ đếm trên thanh trên cùng: “Render toàn bộ” chỉ tăng khi tạo công ty; “Cập nhật phần” tăng khi vá dữ liệu.

## Kiểm tra
- Chạy server cục bộ, mở trình duyệt: thêm công ty có MST, thêm chứng từ, sang công ty khác rồi quay lại.
- Kỳ vọng: bộ đếm “Cập nhật phần” tăng, “Render toàn bộ” đứng yên khi thêm chứng từ và khi chuyển công ty cũ.
- Kiểm cú pháp: `node --check app.js` và `node --check db.js` (nếu máy có node).
- Kiểm logic không cần trình duyệt: `node Scripts/check-logic.js`.
  Kỳ vọng 31 dòng PASS: gồm tách nhánh theo MST, mở rộng thêm nhánh, MST trùng/trống, chuyển dữ liệu cũ và bộ đếm render tăng dần.

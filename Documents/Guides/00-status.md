# Trạng thái dự án

## 2026-11-24
- Nhiệm vụ: dựng nền tảng phần mềm kế toán dịch vụ cho nhiều công ty / hộ kinh doanh nhỏ, HTML/CSS/JS thuần, dữ liệu lưu cục bộ.
- Nhánh: `main`.
- Yêu cầu đã chốt: danh sách công ty bên trái; mỗi công ty một vùng giao diện riêng; click vào đúng công ty thì nạp metadata và dữ liệu của công ty đó; có dữ liệu mới chỉ tải phần mới, không render toàn bộ; tạo được nhiều công ty.
- Đã xong: khung giao diện, lưu trữ riêng từng công ty, cơ chế cập nhật tăng dần theo phần (metadata / thống kê / bảng chứng từ).
- Kiểm chứng bằng lệnh: `node Scripts/check-logic.js` — 18/18 PASS (tạo 2 công ty, dữ liệu không lẫn, click lại không render lại, thêm chứng từ chỉ vá 2 phần).
- Kiểm chứng máy chủ: `http://127.0.0.1:8899/index.html` trả HTTP 200, 1796 byte.
- Chưa kiểm chứng bằng mắt trên trình duyệt thiết bị: công cụ điều khiển trình duyệt bị chặn khi Apelin đang ở trước. Có thể tự mở đường dẫn ở trên để xem giao diện.

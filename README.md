# DoraeChat Backend API

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-green)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7.0+-red)](https://redis.io/)

Backend API cho ứng dụng nhắn tin DoraeChat với các tính năng hiện đại như chat 1-1, nhóm, gọi điện, gửi file và tích hợp đăng nhập bằng QR code.

## 📌 Tính năng chính

- **Xác thực người dùng**: Đăng ký, đăng nhập, OTP qua email, refresh token
- **Quản lý người dùng**: CRUD user, cập nhật profile, avatar
- **Trò chuyện**: Tin nhắn 1-1, nhóm, kênh (channel)
- **Đa phương tiện**: Hỗ trợ gửi hình ảnh, video, file
- **Quản lý nhóm**: Thêm/xóa thành viên, phân quyền, yêu cầu tham gia
- **Tin nhắn ghim**: Ghim tin nhắn quan trọng trong hội thoại
- **Bình chọn**: Tạo và quản lý bình chọn trong nhóm
- **Kết bạn**: Gửi/lời mời kết bạn, gợi ý bạn bè
- **Đăng nhập QR**: Quét QR code để đăng nhập
- **Phân loại**: Nhóm hội thoại theo danh mục tùy chỉnh
- **Lưu trữ đám mây**: Upload file lên Cloudinary

## 🛠 Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Cache**: Redis
- **Realtime**: Socket.IO
- **Lưu trữ file**: Cloudinary
- **Xác thực**: JWT, OTP
- **Email**: Nodemailer

## 🔧 Cài đặt

1. Clone repository:
```bash
git clone https://github.com/minhducn14/DoraeChat_BE
```
2. Cài đặt dependencies:
```bash
npm install
```
3. Tạo file .env dựa trên .env.example và điền các biến môi trường cần thiết
4. Chạy server:
```bash
npm run start
```
🔒 Quy trình xác thực
1. Đăng ký
  sequenceDiagram
    User->>+Backend: POST /register
    Backend->>+DB: Lưu user tạm
    Backend->>+Email: Gửi OTP
    User->>+Backend: POST /verify-otp
    Backend->>+DB: Kích hoạt tài khoản
2. Đăng nhập
  sequenceDiagram
    User->>+Backend: POST /login
    Backend->>+DB: Xác thực credentials
    Backend->>User: Trả về access & refresh token
    User->>+Backend: Gọi API với access token
    Backend->>User: Trả về dữ liệu
3. Refresh token
  sequenceDiagram
    User->>+Backend: POST /refresh-token
    Backend->>+DB: Xác thực refresh token
    Backend->>User: Trả về access token mới
   
⚠️ Xử lý lỗi
Hệ thống sử dụng HTTP status codes chuẩn:

200 OK: Thành công

201 Created: Tạo mới thành công

400 Bad Request: Dữ liệu không hợp lệ

401 Unauthorized: Chưa xác thực

403 Forbidden: Không có quyền truy cập

404 Not Found: Tài nguyên không tồn tại

500 Internal Server Error: Lỗi server 

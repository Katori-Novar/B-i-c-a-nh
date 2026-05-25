# NestJS Firebase Auth Backend

Backend starter theo NestJS với flow chính:

```text
Client -> Middleware -> Guard (Firebase Auth) -> Controller -> Service -> Database
```

## Cài đặt

```bash
pnpm install
cp .env.example .env
pnpm prisma:migrate -- --name init
pnpm start:dev
```

Trên Windows PowerShell nếu `pnpm` bị chặn bởi execution policy, dùng `pnpm.cmd` thay cho `pnpm`.

## Biến môi trường

```env
PORT=3000
DATABASE_URL="file:./dev.db"
FIREBASE_SERVICE_ACCOUNT={"project_id":"...","client_email":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"}
```

Bạn cũng có thể bỏ `FIREBASE_SERVICE_ACCOUNT` và dùng `GOOGLE_APPLICATION_CREDENTIALS` trỏ tới file service account JSON.

## Flow xử lý request

### 1. Client

Client đăng nhập bằng Firebase Authentication ở frontend, nhận Firebase ID token, rồi gọi API:

```http
GET /users/me
Authorization: Bearer <firebase-id-token>
```

### 2. Middleware

`RequestContextMiddleware` chạy trước guard/controller. Middleware gắn `requestId` cho request, trả lại header `x-request-id`, và log method, URL, status code, thời gian xử lý.

File chính: `src/common/middleware/request-context.middleware.ts`

### 3. Guard (Firebase Auth)

`FirebaseAuthGuard` đọc header `Authorization`, lấy Bearer token, gọi Firebase Admin SDK để verify token. Nếu token hợp lệ, guard gắn thông tin Firebase user vào `request.user`. Nếu thiếu hoặc sai token, request dừng ở đây với `401 Unauthorized`.

File chính: `src/auth/firebase-auth.guard.ts`

### 4. Controller

`UsersController` chỉ nhận request đã qua guard. Controller lấy user hiện tại bằng decorator `@CurrentUser()` và chuyển dữ liệu vào service.

Endpoints mẫu:

- `GET /users/me`: đồng bộ Firebase user vào database rồi trả về profile.
- `PATCH /users/me`: cập nhật `displayName` cho profile hiện tại.

File chính: `src/users/users.controller.ts`

### 5. Service

`UsersService` chứa nghiệp vụ. Ở starter này service đồng bộ user từ Firebase vào bảng `User`, hoặc cập nhật profile.

File chính: `src/users/users.service.ts`

### 6. Database

`PrismaService` quản lý kết nối database. Schema mặc định dùng SQLite để chạy local nhanh, có thể đổi sang PostgreSQL/MySQL bằng cách sửa `prisma/schema.prisma` và `DATABASE_URL`.

File chính:

- `src/database/prisma.service.ts`
- `prisma/schema.prisma`

## Test nhanh

Sau khi chạy server:

```bash
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer <firebase-id-token>"
```

Không có token hoặc token sai sẽ nhận `401 Unauthorized`, đúng với flow bảo vệ API bằng guard.

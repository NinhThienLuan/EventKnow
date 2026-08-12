# EventKnow — AI-Powered Event Knowledge Base

EventKnow helper to guide you on how to start the Backend and Frontend services.

---

## 1. Backend (BE_EventKnow)

### Yêu cầu tối thiểu (Prerequisites)
- Java 21+
- Maven 3.x+
- Docker (để chạy database)

### Khởi động dữ liệu (Database Setup)
Chạy container PostgreSQL `eventknow-db` biệt lập tại port `5435`:
```bash
docker run -d --name eventknow-db -p 5435:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=eventknow postgres:15-alpine
```

### Hướng dẫn chạy (Run Application)
Cung cấp `GEMINI_API_KEY` (nếu cần xử lý AI) và thực thi:
```bash
cd BE_EventKnow && mvn spring-boot:run
```
*Flyway sẽ tự động chạy migration tại mốc khởi động đầu tiên để khởi tạo bảng dữ liệu.*

---

## 2. Frontend (React Applet)

### Yêu cầu tối thiểu (Prerequisites)
- Node.js (v18+) hoặc Bun

### Hướng dẫn chạy (Run Application)
Cài đặt thư viện dependencies và khởi động chế độ phát triển (Cwd tại thư mục gốc chứa `package.json`):
```bash
# Cài đặt Packages
npm install

# Khởi chạy Client Dev Server
npm run dev
```

Server Client sẽ được khởi chạy tại website hoặc địa chỉ IP mặc định: `http://localhost:5173`.

\# Hệ thống quản lý món ăn



Đề tài: Xây dựng và triển khai hệ thống quản lý món ăn trên nền tảng đám mây (môn Điện toán đám mây).



\## Công nghệ

React (Vite), Node.js, Express, MongoDB Atlas, Git/GitHub, Docker, Docker Hub, Render.



\## Cấu trúc dự án

\- backend/: API Node.js + Express + MongoDB Atlas

\- frontend/: Giao diện React



\## Hướng dẫn cài đặt và chạy



\### Backend

&#x20;   cd backend

&#x20;   npm install

&#x20;   npm start

Tạo file `.env` trong thư mục backend (xem `.env.example`) với PORT và MONGODB\_URI.



\### Frontend

&#x20;   cd frontend

&#x20;   npm install

&#x20;   npm run dev

Tạo file `.env` trong thư mục frontend (xem `.env.example`) với VITE\_API\_URL.

## Chạy backend bằng Docker

Docker image backend: https://hub.docker.com/r/phuvanhiep236390/backend

Build image:

```
cd backend
docker build -t phuvanhiep236390/backend:latest .
```

Chạy container (truyền biến môi trường từ file .env, không nhúng vào image):

```
docker run -d --name backend -p 5000:5000 --env-file .env phuvanhiep236390/backend:latest
```

Các biến môi trường cần có: `PORT` và `MONGODB_URI` (xem `backend/.env.example`).

Kiểm tra: http://localhost:5000/health

Lấy image từ Docker Hub:

```
docker pull phuvanhiep236390/backend:latest
```
## Chạy frontend bằng Docker

Docker image frontend: https://hub.docker.com/r/phuvanhiep236390/frontend

Build image (địa chỉ backend được nhúng lúc build qua VITE_API_URL):

```
cd frontend
docker build --build-arg VITE_API_URL=http://localhost:5000 -t phuvanhiep236390/frontend:latest .
```

Chạy container:

```
docker run -d --name frontend -p 8080:80 phuvanhiep236390/frontend:latest
```

Truy cập: http://localhost:8080 (cần backend đang chạy ở địa chỉ đã cấu hình).

Lấy image từ Docker Hub:

```
docker pull phuvanhiep236390/frontend:latest
```

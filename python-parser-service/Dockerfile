FROM python:3.11-slim

# Thiết lập thư mục làm việc trong container
WORKDIR /app

# Copy file requirements.txt vào container
COPY requirements.txt .

# Cài đặt các thư viện Python
RUN pip install --no-cache-dir -r requirements.txt

# (Tuỳ chọn) Nếu sau này bạn cần dùng OCR (Tesseract) theo yêu cầu trong scan.md thì bỏ comment dòng dưới:
# RUN apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-vie && rm -rf /var/lib/apt/lists/*

# Copy toàn bộ code vào container
COPY . .

# Expose port 8000
EXPOSE 8000

# Lệnh khởi chạy server FastAPI (Hỗ trợ Render tự động gán Port)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

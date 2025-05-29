# Base image nhẹ cho production
FROM node:18-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Copy file package.json và lock trước để tận dụng cache layer Docker
COPY package*.json ./

# Cài dependencies
RUN npm install --production

# Copy toàn bộ mã nguồn
COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]

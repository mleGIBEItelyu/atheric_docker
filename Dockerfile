# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/fe
COPY FE/package*.json ./
RUN npm ci
COPY FE/ ./
RUN npm run build

# Stage 2: Build Golang Backend Binary
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app/be
COPY BE/ ./
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server main.go

# Stage 3: Single Production Container (atheric)
FROM alpine:latest
WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

# Copy built backend binary
COPY --from=backend-builder /app/be/server /app/server

# Copy built frontend static files into ./public directory
COPY --from=frontend-builder /app/fe/dist /app/public

EXPOSE 5000

ENV PORT=5000
ENV DB_PATH=/app/data/atheric.db
ENV JWT_SECRET=atheric_ai_super_secret_jwt_key_2026_change_in_prod
ENV ALLOWED_ORIGINS=*

CMD ["/app/server"]

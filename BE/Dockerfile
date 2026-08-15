# Stage 1: Build binary using Golang Alpine
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install git and ca-certificates if needed
RUN apk add --no-cache git ca-certificates

# Copy go mod dependencies
COPY go.mod ./
# If go.sum exists, copy it as well
COPY go.* ./
RUN go mod download || true

# Copy backend source code
COPY . .
RUN go mod tidy

# Build lightweight statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server main.go

# Stage 2: Minimal Production Image using Alpine
FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

# Create data directory for SQLite database storage
RUN mkdir -p /app/data

# Copy compiled binary from builder
COPY --from=builder /app/server /app/server

EXPOSE 5000

ENV PORT=5000
ENV DB_PATH=/app/data/atheric.db

CMD ["/app/server"]

FROM golang:1.25.5-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download || true
COPY . .
RUN go build -o server ./cmd/server

FROM alpine:3.21
WORKDIR /app
RUN mkdir -p /app/data
RUN apk add --no-cache python3 py3-pip && \
    pip3 install --no-cache-dir --break-system-packages garminconnect python-dotenv
COPY --from=build /app/server ./server
COPY scripts/ ./scripts/
EXPOSE 8080
CMD ["/app/server"]

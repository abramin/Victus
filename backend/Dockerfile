FROM golang:1.25.5-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download || true
COPY . .
RUN go build -o server ./cmd/server

FROM alpine:3.21
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=build /app/server ./server
EXPOSE 8080
CMD ["/app/server"]

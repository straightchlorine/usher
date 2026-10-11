# --- Build stage ---
FROM golang:1.26-alpine AS build

# set working dir
WORKDIR /src

# copy the module files
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# copy the rest of the application and build
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -o /usher .

# --- Runtime stage ---
FROM alpine:3.22

# user for the runtime
RUN adduser -D -u 10001 usher
USER usher
COPY --from=build /usher /usr/local/bin/usher

# expose the port and run
EXPOSE 8080
CMD ["usher", "--populate"]

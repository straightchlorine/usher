# --- build ---
FROM --platform=$BUILDPLATFORM golang:1.27-alpine@sha256:70bd7ddea8b6cbe5d6943cde279d6b67feb10cc924fb9100d1d8757c1575b280 AS build

# set working dir
WORKDIR /src

# copy the module files
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# copy the rest of the application and cross-compile for the target
COPY . .
ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH \
    go build -trimpath -ldflags="-s -w" -o /out/usher .

# --- runtime ---
FROM gcr.io/distroless/static-debian12:nonroot@sha256:afa5c872c891853ca7fcf1f12c3edb23f7eeef36189728842dd51042ff57f7ab

COPY --from=build /out/usher /usr/local/bin/usher
USER nonroot:nonroot

# expose the port and run (no seeding unless started with --populate)
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/usher"]

# --- build ---
FROM --platform=$BUILDPLATFORM golang:1.26-alpine@sha256:27f2d3b83cfc5803c8078f8e730af0f7c431bf067afaec8f60a36fb763187cba AS build

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

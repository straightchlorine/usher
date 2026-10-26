---
title: "Usher container images, tags and signatures"
description: "Pull the Usher api and web images from GHCR or Docker Hub, see the tags and environment variables of each, and verify the cosign signature of a release."
---

# Images

Two images, built for `linux/amd64` and `linux/arm64`, running as a non-root user and listening on `8080`. Every image is signed with cosign (keyless).

```bash
docker pull ghcr.io/straightchlorine/usher/api:latest
docker pull ghcr.io/straightchlorine/usher/web:latest
docker pull docker.io/straightchlorine/usher-api:latest
docker pull docker.io/straightchlorine/usher-web:latest
```

Tags: `X.Y.Z` and `X.Y` (and `latest` for stable releases). Pre-releases only get their full version.

## api

`JWT_SECRET` and `ROOT_PASSWORD` are required for real deployments. The API refuses to start without `JWT_SECRET`. Without `ROOT_PASSWORD` it logs a warning and creates no admin account. The demo account is skipped when `DEMO_PASSWORD` is empty.

The image does not seed any data. Start it with `--populate` to load the fake demo events, locations and users (demo only, compose does this for you).

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign tokens (required) |
| `ROOT_NAME` | Admin username |
| `ROOT_PASSWORD` | Admin password (required to get an admin account) |
| `DEMO_USERNAME` | Demo account username |
| `DEMO_PASSWORD` | Demo account password (empty skips the demo account) |
| `TOKEN_VALID_HOURS` | Token validity in hours |
| `API_PORT` | Listen port inside the container, defaults to `8080` |

## web

| Variable | Description | Default |
|----------|-------------|---------|
| `USHER_API_URL` | Upstream the nginx proxy forwards `/api/` to | `http://usher:8080` |

The web image is environment-agnostic: the SPA calls the relative `/api`, nginx forwards it to `USHER_API_URL`.

`USHER_API_URL` is `scheme://host:port` with no path and no trailing slash. The host must be directly resolvable by DNS: nginx resolves it at request time with its own resolver, which ignores search domains. nginx starts even if the host does not resolve yet. In Kubernetes use the FQDN, for example `http://usher.<namespace>.svc.cluster.local:8080`.

## Verify a signature

```bash
cosign verify ghcr.io/straightchlorine/usher/api:1.0.0 \
  --certificate-identity-regexp '^https://github.com/straightchlorine/usher/\.github/workflows/release\.yml@refs/tags/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Images also carry provenance and SBOM attestations.

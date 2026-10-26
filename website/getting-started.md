---
title: "Run Usher locally with Docker Compose and Postgres"
description: "Start Usher with Docker Compose: PostgreSQL, the Go API, the React web app, NocoDB and Swagger UI. Ports, demo login and every environment variable listed."
---

# Getting started

Install [Docker Compose](https://docs.docker.com/compose/), then:

```bash
git clone https://github.com/straightchlorine/usher.git && cd usher
docker compose up --build
```

Optionally copy `.env.example` to `.env` and adjust it. Every value has a default in `docker-compose.yml`, so the stack also runs without a `.env`. The defaults are for local demos only. Set your own secrets for anything else.

Demo login: `demo` / `matchday`.

## Services

| Service | Address | Port variable |
|---------|---------|---------------|
| Web | [http://localhost](http://localhost) | `WEB_PORT` (default `80`) |
| API | [http://localhost:8080/api](http://localhost:8080/api) | `API_PORT` (default `8080`) |
| NocoDB | [http://localhost:8081](http://localhost:8081) | `NC_DB_PORT` (default `8081`) |
| Swagger | [http://localhost:81/docs](http://localhost:81/docs) | `SWAGGER_PORT` (default `81`) |

PostgreSQL 17 runs as the `db` service. NocoDB is a visual database explorer with its own metadata database. Swagger UI serves `docs/swagger.yaml`. The compose file starts the API with `--populate`, which loads the fake demo events, locations and users.

## Environment variables

Compose reads these from `.env` (see `.env.example`).

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL database host | `database` |
| `DB_HOST_PORT` | Host port of PostgreSQL. Inside the container it listens on 5432 | `5432` |
| `DB_USER` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_NAME` | Name of the PostgreSQL database | `event_api` |
| `NC_DB_USER` | NocoDB database username | `nocodb` |
| `NC_DB_PASSWORD` | NocoDB database password | `password` |
| `NC_DB_NAME` | NocoDB database name | `nocodb_metadata` |
| `NC_DB_PORT` | NocoDB port | `8081` |
| `NC_AUTH_JWT` | JWT secret for NocoDB authentication | `569a1821-0a93-45e8-87ab-eb857f20a010` |
| `API_PORT` | Host port of the API in compose. Inside the container it listens on 8080 | `8080` |
| `API_JWT_SECRET` | JWT secret for API authentication | `803f6f39-fa46-4993-bbc0-f595e78f2aef` |
| `API_ROOT_NAME` | Admin username for API setup | `root` |
| `API_ROOT_PASSWORD` | Admin password for API setup | `root` |
| `API_TOKEN_VALID_HOURS` | Token validity duration (in hours) | `24` |
| `DEMO_USERNAME` | Demo account username | `demo` |
| `DEMO_PASSWORD` | Demo account password | `matchday` |
| `SWAGGER_PORT` | Host port for the Swagger documentation | `81` |
| `WEB_PORT` | Host port for the web frontend | `80` |

Compose maps these onto the API container as `DATABASE_URL`, `JWT_SECRET`, `ROOT_NAME`, `ROOT_PASSWORD`, `TOKEN_VALID_HOURS`, `DEMO_USERNAME` and `DEMO_PASSWORD`. The variables of the standalone images are listed on the [Images](images.md) page.

## Tests

`just test` vets the Go code and runs the frontend tests.

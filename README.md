# Usher

[![CI](https://github.com/straightchlorine/usher/actions/workflows/ci.yml/badge.svg)](https://github.com/straightchlorine/usher/actions/workflows/ci.yml)
[![Release](https://github.com/straightchlorine/usher/actions/workflows/release.yml/badge.svg)](https://github.com/straightchlorine/usher/actions/workflows/release.yml)

This project is a university exercise designed to simulate a ticket reservation system for sports events. **It does not include payment processing or other real-world functionalities.**

---

## Features

- **RESTful API** for managing:
  - Users
  - Events
  - Locations
  - Reservations
- **Authentication** for routes with sensitive data.
- **NocoDB** for visual database exploration.
- **Swagger Documentation** for testing and exploring endpoints.

## Prerequisites

- Install [Docker Compose](https://docs.docker.com/compose/).

---

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/straightchlorine/usher.git && cd usher
   ```

2. Optionally configure environment variables, see `.env.example` (copy it to `.env`). Defaults work as is.

3. Build and run:
   ```bash
   docker compose up --build
   ```

Demo login: `demo` / `matchday`.

## Services

| **Service** | **Address** | **Port variable** |
|-------------|-------------|-------------------|
| Web | [http://localhost](http://localhost) | `WEB_PORT` (default `80`) |
| API | [http://localhost:8080/api](http://localhost:8080/api) | `API_PORT` (default `8080`) |
| NocoDB | [http://localhost:8081](http://localhost:8081) | `NC_DB_PORT` (default `8081`) |
| Swagger | [http://localhost:81/docs](http://localhost:81/docs) | `SWAGGER_PORT` (default `81`) |

## Images

Two images, built for `linux/amd64` and `linux/arm64`, running as a non-root user and listening on `8080`. Every image is signed with cosign (keyless).

```bash
docker pull ghcr.io/straightchlorine/usher/api:latest
docker pull ghcr.io/straightchlorine/usher/web:latest
docker pull docker.io/straightchlorine/usher-api:latest
docker pull docker.io/straightchlorine/usher-web:latest
```

Tags: `X.Y.Z` and `X.Y` (and `latest` for stable releases). Pre-releases only get their full version.

**api**

`JWT_SECRET` and `ROOT_PASSWORD` are required for real deployments. The API refuses to start without `JWT_SECRET`. Without `ROOT_PASSWORD` it logs a warning and creates no admin account. The demo account is skipped when `DEMO_PASSWORD` is empty.

The image does not seed any data. Start it with `--populate` to load the fake demo events, locations and users (demo only, compose does this for you).

| **Variable**        | **Description**                                                  |
|---------------------|------------------------------------------------------------------|
| `DATABASE_URL`      | PostgreSQL connection string                                     |
| `JWT_SECRET`        | Secret used to sign tokens (required)                            |
| `ROOT_NAME`         | Admin username                                                   |
| `ROOT_PASSWORD`     | Admin password (required to get an admin account)                |
| `DEMO_USERNAME`     | Demo account username                                            |
| `DEMO_PASSWORD`     | Demo account password (empty skips the demo account)             |
| `TOKEN_VALID_HOURS` | Token validity in hours                                          |
| `API_PORT`          | Listen port inside the container, defaults to `8080`             |

**web**

| **Variable**    | **Description**                                         | **Default**          |
|-----------------|---------------------------------------------------------|----------------------|
| `USHER_API_URL` | Upstream the nginx proxy forwards `/api/` to            | `http://usher:8080`  |

The web image is environment-agnostic: the SPA calls the relative `/api`, nginx forwards it to `USHER_API_URL`.

`USHER_API_URL` is `scheme://host:port` with no path and no trailing slash. The host must be directly resolvable by DNS: nginx resolves it at request time with its own resolver, which ignores search domains. nginx starts even if the host does not resolve yet. In Kubernetes use the FQDN, for example `http://usher.<namespace>.svc.cluster.local:8080`.

Verify a signature:

```bash
cosign verify ghcr.io/straightchlorine/usher/api:1.0.0 \
  --certificate-identity-regexp '^https://github.com/straightchlorine/usher/\.github/workflows/release\.yml@refs/tags/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## Releasing

The version lives in `frontend/package.json`. The tag must point at a commit that is already on `master`, so bump after the release changes are merged:

```bash
git switch master && git pull
just bump-version v1.0.0-rc.1
git push origin master v1.0.0-rc.1
```

`bump-version` refuses to run unless you are on `master` with an empty index and clean `frontend/package*.json`. It updates `package.json` and the lockfile, commits only those two files (signed) and creates a signed tag. With a protected `master` and squash merges, either push the bump commit through a pull request and then tag the merged commit (`git tag -s vX.Y.Z <sha>` and `git push origin vX.Y.Z`), or run the bump on `master` after merging.

Pushing a `vX.Y.Z` (or `vX.Y.Z-rc.N`) tag runs the release workflow:

1. runs the full CI,
2. checks the tag is on `master` and matches `package.json`,
3. checks `DOCKERHUB_USERNAME` equals the GitHub owner,
4. builds both images from clean layers for amd64 and arm64, pushes them to GHCR and Docker Hub with provenance and SBOM attestations,
5. signs both registry refs by digest with cosign,
6. creates the GitHub release (marked pre-release when the tag has a suffix).

Use `v1.0.0-rc.1` as the first tag to exercise the pipeline, then `v1.0.0`.

### Repository settings (one time)

- Create the GitHub environment `docker` with the variable `DOCKERHUB_USERNAME` (equal to the GitHub owner, which is the Docker Hub namespace) and the secret `DOCKERHUB_TOKEN` (Docker Hub access token, read/write).
- Restrict the `docker` environment's deployment branches and tags to the tag pattern `v*`.
- Add a tag ruleset for `v*` limiting tag creation and updates to maintainers.
- After the first release, set both GHCR packages (`usher/api`, `usher/web`) to public and link them to the repository.

## API Endpoints

### Events
- `GET /events` - Retrieve all events.
- `PUT /events` - Create a new event (admin).
- `DELETE /events/{id}` - Delete an event (admin).
- `GET /events/{id}` - Retrieve an event by ID.
- `PUT /events/{id}` - Update an event (admin).

### Locations
- `GET /locations` - Retrieve all locations.
- `PUT /locations` - Create a new location (admin).
- `DELETE /locations/{id}` - Delete a location (admin).
- `GET /locations/{id}` - Retrieve a location by ID.
- `PUT /locations/{id}` - Update a location (admin).

### Authentication
- `POST /login` - Log in to the API.
- `POST /logout` - Log out from the API.

### Reservations
- `GET /reservations` - List all reservations (admin).
- `DELETE /reservations/{id}` - Delete a reservation by ID (admin).
- `GET /reservations/{id}` - Retrieve a reservation by ID (admin/resource owner).
- `POST /reservations/{id}/cancel` - Cancel a reservation (admin/resource owner).
- `GET /reservations/{id}/tickets` - List tickets for a reservation (admin/resource owner).
- `PUT /reservations` - Create a reservation (at least registered).
- `GET /reservations/user` - List reservations for the current user.
- `GET /reservations/user/{id}` - List reservations for a user by ID (admin/resource owner).
- `GET /reservations/user/{id}/tickets` - List tickets for a user by ID (admin/resource owner).
- `GET /reservations/user/tickets` - List tickets for the current user.

### Users
- `GET /users` - List all users (admin).
- `PUT /users` - Create a new user.
- `DELETE /users/{id}` - Delete a user by ID (admin/resource owner).
- `GET /users/{id}` - Retrieve a user by ID (admin).
- `PUT /users/{id}` - Update a user by ID.

---

## Environment Variables

Compose reads these from `.env` (see `.env.example`).

| **Variable Name**       | **Description**                                                          | **Default Value**                          |
|-------------------------|--------------------------------------------------------------------------|--------------------------------------------|
| `DB_HOST`               | PostgreSQL database host                                                 | `database`                                 |
| `DB_PORT`               | PostgreSQL database port                                                 | `5432`                                     |
| `DB_USER`               | Database username                                                        | `postgres`                                 |
| `DB_PASSWORD`           | Database password                                                        | `password`                                 |
| `DB_NAME`               | Name of the PostgreSQL database                                          | `event_api`                                |
| `NC_DB_USER`            | NocoDB database username                                                 | `nocodb`                                   |
| `NC_DB_PASSWORD`        | NocoDB database password                                                 | `password`                                 |
| `NC_DB_NAME`            | NocoDB database name                                                     | `nocodb_metadata`                          |
| `NC_DB_PORT`            | NocoDB port                                                              | `8081`                                     |
| `NC_AUTH_JWT`           | JWT secret for NocoDB authentication                                     | `569a1821-0a93-45e8-87ab-eb857f20a010`     |
| `API_PORT`              | Host port of the API in compose. Inside the container it listens on 8080 | `8080`                                     |
| `API_JWT_SECRET`        | JWT secret for API authentication                                        | `803f6f39-fa46-4993-bbc0-f595e78f2aef`     |
| `API_ROOT_NAME`         | Admin username for API setup                                             | `root`                                     |
| `API_ROOT_PASSWORD`     | Admin password for API setup                                             | `root`                                     |
| `API_TOKEN_VALID_HOURS` | Token validity duration (in hours)                                       | `24`                                       |
| `DEMO_USERNAME`         | Demo account username                                                    | `demo`                                     |
| `DEMO_PASSWORD`         | Demo account password                                                    | `matchday`                                 |
| `SWAGGER_PORT`          | Host port for the Swagger documentation                                  | `81`                                       |
| `WEB_PORT`              | Host port for the web frontend                                           | `80`                                       |

The defaults are for local demos only. Set your own secrets for anything else.

---

## Notes

- **Authentication:** Many routes require authentication with role-based permissions (e.g., admin, owner).
- **Dynamic IDs:** Routes using `{id}` operate on a specific resource identified by its ID.

---

<div align="center">

To the only God, be honour and glory for ever and ever.

</div>

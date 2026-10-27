<p align="center">
  <a href="https://usher.piotrkrzysztof.dev"><img src="frontend/public/favicon.svg" alt="Usher" width="96"></a>
</p>

<div align="center">

[Live demo](https://usher.piotrkrzysztof.dev) &middot; [Documentation](https://docs.usher.piotrkrzysztof.dev)

[![CI](https://img.shields.io/github/actions/workflow/status/straightchlorine/usher/ci.yml?branch=master&label=CI)](https://github.com/straightchlorine/usher/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/straightchlorine/usher?include_prereleases&sort=semver)](https://github.com/straightchlorine/usher/releases)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-api%20%7C%20web-blue?logo=github)](https://github.com/straightchlorine?tab=packages&repo_name=usher)
[![usher-api pulls](https://img.shields.io/docker/pulls/straightchlorine/usher-api?logo=docker&label=usher-api)](https://hub.docker.com/r/straightchlorine/usher-api)
[![usher-web pulls](https://img.shields.io/docker/pulls/straightchlorine/usher-web?logo=docker&label=usher-web)](https://hub.docker.com/r/straightchlorine/usher-web)

Demo football ticket reservation system: Go REST API, PostgreSQL and a React app.

</div>

Browse upcoming fixtures, reserve tickets and cancel; admins manage fixtures,
venues and reservations. It is a university project, revived and deployed as a demo.

**There is no payment processing.**

The API runs on Kubernetes, the web app on a Cloudflare Worker that proxies `/api/*` to it.

## Quick start

```bash
git clone https://github.com/straightchlorine/usher.git && cd usher
docker compose up --build
```

Web at [http://localhost](http://localhost), API at [http://localhost:8080/api](http://localhost:8080/api), Swagger at [http://localhost:81/docs](http://localhost:81/docs), NocoDB at [http://localhost:8081](http://localhost:8081). Demo login: `demo` / `matchday`.

## Documentation

Docs at <https://docs.usher.piotrkrzysztof.dev/>. Build them locally with:

```
uv run --with-requirements website/requirements.txt mkdocs serve
```

---

<div align="center">

To the only God, be honour and glory for ever and ever.

</div>

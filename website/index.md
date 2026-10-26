---
title: "Football ticket reservation system in Go and React"
description: "Usher is a football ticket reservation demo: a Go REST API, PostgreSQL and a React app. Browse fixtures, book tickets and cancel. Try it live or self-host."
---

# Usher

<p align="center">
  <a href="https://usher.piotrkrzysztof.dev"><img src="assets/favicon.svg" alt="Usher" width="96"></a>
</p>

<div align="center" markdown>

[Live demo](https://usher.piotrkrzysztof.dev)

[![CI](https://img.shields.io/github/actions/workflow/status/straightchlorine/usher/ci.yml?branch=master&label=CI)](https://github.com/straightchlorine/usher/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/straightchlorine/usher?include_prereleases&sort=semver)](https://github.com/straightchlorine/usher/releases)
[![ghcr.io](https://img.shields.io/badge/ghcr.io-api%20%7C%20web-blue?logo=github)](https://github.com/straightchlorine?tab=packages&repo_name=usher)
[![usher-api pulls](https://img.shields.io/docker/pulls/straightchlorine/usher-api?logo=docker&label=usher-api)](https://hub.docker.com/r/straightchlorine/usher-api)
[![usher-web pulls](https://img.shields.io/docker/pulls/straightchlorine/usher-web?logo=docker&label=usher-web)](https://hub.docker.com/r/straightchlorine/usher-web)

</div>

Demo football ticket reservation system: Go REST API, PostgreSQL and a React app.

Browse upcoming fixtures, reserve tickets and cancel; admins manage fixtures,
venues and reservations. It is a university project, revived and deployed as a demo.

**There is no payment processing.**

The API runs on Kubernetes, the web app on a Cloudflare Worker that proxies `/api/*` to it.

## Try it

Open [usher.piotrkrzysztof.dev](https://usher.piotrkrzysztof.dev) and log in with the demo account:

| Field | Value |
|-------|-------|
| Username | `demo` |
| Password | `matchday` |

The public demo data is reset daily at 04:00 UTC.

## How it behaves

- Tickets are general admission per fixture. There are no seats or sections.
- One reservation can mix ticket types: Standard (full price), Student (-20%) and Senior (-15%), all off the fixture's base price.
- The available count is what can be booked. A reservation locks the fixture row, so concurrent bookings never oversell. Integration tests cover it.
- Roles: unregistered visitors browse, registered users book and manage their own reservations, admins manage everything.
- Authentication is a JWT bearer token, valid 24 hours by default. Logout blacklists the token.

## Where to go next

- [Getting started](getting-started.md): run the whole stack with Docker Compose.
- [Architecture](architecture.md): the API, the database, the web app and the Cloudflare Worker in front.
- [API](api.md): every endpoint and who may call it.
- [Images](images.md): published container images, tags and environment variables.
- [About](about.md): who built it.

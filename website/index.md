---
title: "Football ticket reservation system in Go and React"
description: "Usher is a football ticket reservation demo: a Go REST API, PostgreSQL and a React app. Browse fixtures, book tickets and cancel. Try it live or self-host."
---

# Usher

[Live demo](https://usher.piotrkrzysztof.dev) &middot; [Source](https://github.com/straightchlorine/usher) &middot; [Swagger spec](https://github.com/straightchlorine/usher/blob/master/docs/swagger.yaml)

Usher is a ticket reservation system for football matches. Fans browse upcoming fixtures, reserve one or more tickets in a single reservation, see their tickets and cancel. Admins manage fixtures, venues and all reservations.

It started as a university exercise and was revived as a working demo. **There is no payment step**: a reservation confirms immediately.

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
- [Deployment](deployment.md): self-hosting on Kubernetes with a Cloudflare Worker.
- [Releasing](releasing.md): cutting a version and what the release workflow does.
- [About](about.md): who built it.

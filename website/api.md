---
title: "Usher REST API endpoints, roles and Swagger spec"
description: "Every Usher REST endpoint for events, locations, reservations, users and login, with the role each one needs. The full Swagger spec is linked from the page."
---

# API

The base path is `/api`. The full OpenAPI spec is [`docs/swagger.yaml`](https://github.com/straightchlorine/usher/blob/master/docs/swagger.yaml) (`docs/swagger.json` is the same spec as JSON). Locally, Swagger UI serves it at [http://localhost:81/docs](http://localhost:81/docs).

Many routes require authentication with role-based permissions (admin, resource owner). Routes using `{id}` operate on a specific resource identified by its ID.

## Events

- `GET /events` - Retrieve all events.
- `PUT /events` - Create a new event (admin).
- `DELETE /events/{id}` - Delete an event (admin).
- `GET /events/{id}` - Retrieve an event by ID.
- `PUT /events/{id}` - Update an event (admin).

## Locations

- `GET /locations` - Retrieve all locations.
- `PUT /locations` - Create a new location (admin).
- `DELETE /locations/{id}` - Delete a location (admin).
- `GET /locations/{id}` - Retrieve a location by ID.
- `PUT /locations/{id}` - Update a location (admin).

## Authentication

- `POST /login` - Log in to the API.
- `POST /logout` - Log out from the API.

## Reservations

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

## Users

- `GET /users` - List all users (admin).
- `PUT /users` - Create a new user.
- `DELETE /users/{id}` - Delete a user by ID (admin/resource owner).
- `GET /users/{id}` - Retrieve a user by ID (admin).
- `PUT /users/{id}` - Update a user by ID.

## Not in the Swagger spec

- `POST /api/register` - Public sign-up, used by the web app.
- `GET /api/health` - Health check, answers `{"status":"ok"}`. It needs no proxy key.

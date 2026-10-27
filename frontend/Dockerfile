# --- build ---
FROM --platform=$BUILDPLATFORM node:24-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS build

# set working dir and copy the lockfile
WORKDIR /app
COPY package.json package-lock.json ./

# install the deps and copy the rest of the application
RUN npm ci
COPY . .

# REACT_APP_* is baked into the bundle at build time, not read at runtime;
# the api sits behind the nginx reverse proxy, so the url stays relative
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# keep all js in files so the CSP can use script-src 'self'; no source maps
ENV INLINE_RUNTIME_CHUNK=false
ENV GENERATE_SOURCEMAP=false

# build
RUN npm run build

# --- runtime (nginx) ---
FROM nginxinc/nginx-unprivileged:stable-alpine-slim@sha256:5d8bb9437d74a600ec5dbf90c035451c724dc33eac8d3a71078f6f8612c345f6

# the build, and the config rendered by the entrypoint (envsubst) at start
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf

# USHER_API_URL: scheme://host:port
# since proxy_pass uses it as a variable, nginx resolves the host per request and
# starts before the API exists.
ENV USHER_API_URL=http://usher:8080

# since such case would lead to host being not found in upstream and using outdated
# ips, system's DNS lookup is necessary.
#
# This var makes the entrypint copy the nameservers from /etc/resolv.conf into
# NGINX_LOCAL_RESOLVERS for the template.
# NOTE: search domains are ignored - use fqdn!
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# only these are substituted, nginx's own $variables survive
ENV NGINX_ENVSUBST_FILTER="^(USHER_API_URL|NGINX_LOCAL_RESOLVERS)$"

# expose the port (unprivileged)
EXPOSE 8080

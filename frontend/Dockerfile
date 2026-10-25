# --- Build stage ---
FROM node:18-alpine AS build

# set working dir and copy the lockfile
WORKDIR /app
COPY package.json package-lock.json ./

# install the deps and copy the rest of the application
RUN npm ci
COPY . .

# define and set the api url
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# build
RUN npm run build

# --- Runtime stage (via nginx) ---
FROM nginx:alpine

# copying the build and the config
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# expose the port and run
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

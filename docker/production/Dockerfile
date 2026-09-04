# Production is a two stage build. Node is present to run the build and is thrown away, and
# what ships is a static directory behind nginx. This matches the decision that the build
# output owes nothing to Docker, so the same dist/ could be dropped on any static host and
# this image would stop being needed.

# Build.
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Same layering as docker/local/Dockerfile. Dependencies are their own layer so a source edit
# does not reinstall 508 packages.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve.
FROM nginx:1-alpine

# The single docker-compose.yml publishes ${APP_PORT:-5173}:5173 for every environment, so
# this container has to listen on 5173 rather than nginx's default 80. The config carries
# that, along with the cache rules the service worker needs.
COPY docker/production/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]

# Walk

A morning walk audio app. Right now this repo holds the development environment and a hello
world page. There is no audio in it yet and it is not a PWA yet.

## What is here

Vue 3 with Vite and Tailwind, running in Docker. Vitest for the tests. No backend, no database,
no API keys. The build output is static files and that is the whole deployment.

## Running it

You do not need Node installed. Every command runs inside the container.

Copy the example environment file.

```
cp .env.example .env
```

Generate the lock file. This runs once, the first time only.

```
docker run --rm -v "$PWD":/app -w /app node:24-bookworm-slim \
  sh -c "npm install --package-lock-only vue && npm install --package-lock-only -D vite @vitejs/plugin-vue tailwindcss @tailwindcss/vite vitest @vue/test-utils jsdom"
```

Build the image and start it.

```
docker compose up -d --build
```

The page is at http://localhost:5173. Change APP_PORT in .env if that port is already taken.

Read the output.

```
docker compose logs -f
```

Run the tests.

```
docker compose exec app npm run test
```

Build the static output.

```
docker compose exec app npm run build
```

Stop it.

```
docker compose down
```

Avoid docker compose down -v unless you mean it. It destroys the node_modules volume and the
next start reinstalls everything from scratch.

## Adding a dependency

Install it from inside the container so the volume and the lock file both stay correct.

```
docker compose exec app npm install some-package
```

## Docker layout

The container definition is versioned with the application. Each environment gets a directory
under docker/, and a single docker-compose.yml picks one by interpolating APP_ENV into the
build path. Adding an environment is adding a directory. No override files, no second compose
file, no -f chains. Every value that varies between environments comes from .env.

Only local is built. production/ exists so the structure is settled, and adding staging is one
directory with no change to the compose file.

## Testing on a phone

A phone on the same network cannot reach localhost, and a service worker will not register
without a secure context. A tunnel solves both at once by giving a public HTTPS URL with a
certificate the phone already trusts.

```
docker compose up -d cloudflared
docker compose logs cloudflared
```

The log prints the URL. Take it down when the check is finished.

```
docker compose stop cloudflared
```

The tunnel publishes the dev server to the internet for as long as it runs. Bring it up for a
check and take it down after.

## Notes on the setup

node_modules lives in a named volume and is never bind mounted from the host. Across a Windows
to container boundary a bind mount makes installs crawl and mismatches native binaries.

File watching uses polling. inotify does not cross the same boundary, so without polling hot
reload silently never fires and it looks like broken code.

The environment variable is APP_ENV and not NODE_ENV. NODE_ENV already has a fixed meaning that
Vite and its libraries depend on, and overloading it to name a directory breaks that.

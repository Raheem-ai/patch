# FROM node:16
FROM node:14

WORKDIR app

# Setup yarn env
COPY .yarnrc.yml .
COPY .yarn/releases .yarn/releases

# /app/backend/infra
WORKDIR backend/infra

# Make sure infra dependencies are cached until changed(infrequently)
COPY backend/infra/package.json .
COPY backend/infra/yarn.lock .
RUN yarn install

# copy in infra src (frequent changes)
COPY backend/infra/tsconfig.json .
COPY backend/infra/src ./src
COPY backend/infra/bin ./bin
RUN yarn run build

# /app/backend
WORKDIR .. 

# Make sure service dependencies are cached until changed(infrequently)
COPY backend/package.json .
COPY backend/yarn.lock .
RUN yarn install

# copy in src (frequent changes)
COPY backend/tsconfig.json .
COPY backend/src ./src
COPY backend/static ./static 
COPY common ../common/

RUN yarn run build

# /app/frontend
WORKDIR ../frontend

COPY frontend/package.json .
COPY frontend/yarn.lock .
# TODO: get this to only install the locked expo-cli
RUN yarn install

COPY frontend .

RUN yarn run test

# /app
WORKDIR ..

# copy in build scripts + config
COPY ci ./ci

# /app/backend
WORKDIR backend

# Build locally with > docker build -f api.dockerfile .
# Run locally with > docker run --rm -it --env-file ./backend/env/.env.local <imageId>
CMD yarn node lib/backend/src/index.js
# FROM node:16
FROM node:12

WORKDIR app

# Setup yarn env
COPY .yarnrc.yml .
COPY .yarn/releases .yarn/releases

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

WORKDIR ..

# Make sure service dependencies are cached until changed(infrequently)
COPY backend/package.json .
COPY backend/yarn.lock .
RUN yarn install

# copy in src (frequent changes)
COPY backend/tsconfig.json .
COPY backend/src ./src
COPY common ../common/

RUN yarn run build

# Run locally with > docker run --rm --env-file ./backend/env/.env.local <imageId>
CMD yarn node lib/backend/src/index.js
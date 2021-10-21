FROM node:12

WORKDIR app/backend/functions/infra

# Make sure infra dependencies are cached until changed(infrequently)
COPY backend/functions/infra/package.json .
COPY backend/functions/infra/package-lock.json .
RUN npm install

# copy in infra src (frequent changes)
COPY backend/functions/infra/tsconfig.json .
COPY backend/functions/infra/src ./src
COPY backend/functions/infra/bin ./bin
RUN npm run build

WORKDIR ..

# Make sure service dependencies are cached until changed(infrequently)
COPY backend/functions/package.json .
COPY backend/functions/package-lock.json .
RUN npm install

# copy in src (frequent changes)
COPY backend/functions/tsconfig.json .
COPY backend/functions/src ./src
COPY common ../../common/

RUN npm run build

# Run locally with > docker run --rm --env-file ./backend/functions/env/.env.local <imageId>
CMD node lib/backend/functions/src/index.js
FROM oven/bun:1.3-alpine AS base

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN bun install --frozen-lockfile
RUN bun run build --filter @namuh/ingester

FROM base
COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app/packages/ingester
EXPOSE 3016
CMD ["bun", "dist/index.js"]

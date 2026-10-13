# Debian rather than Alpine: better-sqlite3 is a native module with glibc prebuilds
FROM node:24-slim AS base
# Prisma's migration engine needs OpenSSL, which the slim image leaves out
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# prebuild generates the Prisma client, which the server build compiles into dist-server
RUN npm run build

FROM base
ENV NODE_ENV=production
ENV PORT=3100
ENV DATABASE_URL=file:/data/habits.db
ENV PATH=/app/node_modules/.bin:$PATH
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
VOLUME ["/data"]
EXPOSE 3100
# Pending migrations are applied on every start; it is a no-op when there are none
CMD ["sh", "-c", "prisma migrate deploy && exec node dist-server/index.js"]

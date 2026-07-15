# syntax=docker/dockerfile:1

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/otok/package.json packages/otok/package.json
COPY packages/vite-plugin-otok/package.json packages/vite-plugin-otok/package.json
COPY packages/create-otok/package.json packages/create-otok/package.json
COPY apps/playground/package.json apps/playground/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter otok build \
  && pnpm --filter @otok/vite-plugin build \
  && pnpm --filter playground build

FROM node:22-slim AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/otok/package.json ./packages/otok/package.json
COPY --from=build /app/packages/otok/dist ./packages/otok/dist
COPY --from=build /app/apps/playground/package.json ./apps/playground/package.json
COPY --from=build /app/apps/playground/dist ./apps/playground/dist
RUN pnpm install --prod --frozen-lockfile --filter playground...
WORKDIR /app/apps/playground
EXPOSE 3000
CMD ["node", "dist/server/server.js"]

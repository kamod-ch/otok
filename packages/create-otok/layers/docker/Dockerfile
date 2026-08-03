FROM node:22-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml* package-lock.json* ./
RUN corepack enable && (pnpm install --frozen-lockfile || npm install)
COPY . .
RUN (pnpm build || npm run build)

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/server/server.js"]

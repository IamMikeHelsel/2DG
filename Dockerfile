# fly.io multi-stage build for server
FROM node:20-alpine as build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
RUN pnpm i --frozen-lockfile
RUN pnpm -F @toodee/shared build && pnpm -F @toodee/server build

FROM node:20-alpine as runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/server/dist ./dist
COPY --from=build /app/packages/server/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 2567
CMD ["node", "dist/index.js"]

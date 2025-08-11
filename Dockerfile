# fly.io multi-stage build for server
FROM node:20-alpine as build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
RUN pnpm i --no-frozen-lockfile
RUN pnpm -F @toodee/shared build && pnpm -F @toodee/server build

FROM node:20-alpine as runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/packages/server/dist ./dist
COPY --from=build /app/packages/server/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
# Provide @toodee/shared at runtime by copying its built files into node_modules
RUN mkdir -p node_modules/@toodee/shared && \
    printf '{"name":"@toodee/shared","version":"0.0.0","type":"module","main":"index.js"}' > node_modules/@toodee/shared/package.json
COPY --from=build /app/packages/shared/dist/ ./node_modules/@toodee/shared/
EXPOSE 2567
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1:2567/health || exit 1
CMD ["node", "dist/index.js"]

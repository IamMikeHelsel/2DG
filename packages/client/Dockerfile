FROM node:20-alpine as build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY packages ./packages
# Pass through VITE_SERVER_URL at build-time so the client uses the right server
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=${VITE_SERVER_URL}
RUN pnpm i --no-frozen-lockfile
RUN pnpm -F @toodee/client build

FROM node:20-alpine as runtime
WORKDIR /app
RUN npm i -g http-server@14
COPY --from=build /app/packages/client/dist ./dist
EXPOSE 5173
CMD ["http-server", "dist", "-p", "5173", "-a", "0.0.0.0"]


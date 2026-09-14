# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma
COPY backend/src ./src

RUN npx prisma generate
RUN npm run build
# tsc solo compila .ts a .js: el binario del query engine que "prisma generate"
# deja en src/generated/prisma (ej. libquery_engine-*.so.node) no se copia solo
RUN cp src/generated/prisma/*.node dist/generated/prisma/

# ---- production ----
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# node:20-alpine ya trae un usuario sin privilegios llamado "node"
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]

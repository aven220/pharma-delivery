FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/backend ./apps/backend
RUN cat apps/backend/.docker-build-id
RUN npm ci --workspace=@pharma/backend --workspace=@pharma/types --workspace=@pharma/utils
RUN npm run build -w @pharma/types && npm run build -w @pharma/utils
WORKDIR /app/apps/backend
RUN npx prisma generate
# Verificar que el código desplegado incluye los fixes de producción
RUN grep -q "routeParam" src/modules/assignments/routes/assignment.routes.ts \
  && grep -q "expiresIn: 900" src/modules/auth/service/auth.service.ts \
  || (echo "ERROR: Codigo desactualizado. Ejecute git pull en el servidor." && exit 1)
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/package.json ./
COPY --from=builder /app/apps/backend/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
RUN mkdir -p uploads
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

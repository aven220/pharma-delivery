FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/web-admin ./apps/web-admin
RUN npm ci --workspace=@pharma/web-admin --workspace=@pharma/types --workspace=@pharma/api-client
RUN npm run build -w @pharma/types && npm run build -w @pharma/api-client
WORKDIR /app/apps/web-admin
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web-admin/dist /usr/share/nginx/html
COPY apps/web-admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

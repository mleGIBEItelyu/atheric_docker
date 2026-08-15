# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency declarations and install
COPY package*.json ./
RUN npm ci

# Copy application source code and build
COPY . .
RUN npm run build

# Production Stage with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

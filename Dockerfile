# Stage 1: build the React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY postcss.config.js tailwind.config.js vite.config.ts ./
COPY index.html ./
COPY src ./src
RUN npm ci
RUN npm run build

# Stage 2: serve the static files with nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

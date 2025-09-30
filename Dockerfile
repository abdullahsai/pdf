# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

# Runtime stage
#
# The Brotli dynamic module distributed with Alpine currently targets Nginx
# 1.26.x. Using the newer 1.27 base image causes a fatal version mismatch when
# the module is loaded ("module ... version 1026003 instead of 1027005"). To
# keep Brotli enabled we align the runtime image with the module's supported
# version.
FROM nginx:1.26-alpine
RUN apk add --no-cache nginx-mod-http-brotli
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

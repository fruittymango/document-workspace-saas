FROM node:22-alpine AS build

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

ARG VITE_NODE_ENV
ARG VITE_BASE_URL
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_BASE_URL=$VITE_BASE_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

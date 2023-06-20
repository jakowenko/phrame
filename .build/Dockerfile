FROM ubuntu:22.04 as build
ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y curl bash
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs gcc g++ make libpixman-1-dev libcairo2-dev libpango1.0-dev libjpeg8-dev libgif-dev

WORKDIR /app/api
COPY /api/package.json .
COPY /api/tsconfig.json .
RUN npm install

WORKDIR /app/frontend
COPY /frontend/index.html .
COPY /frontend/package.json .
COPY /frontend/tsconfig.json .
COPY /frontend/tsconfig.vite-config.json .
COPY /frontend/vite.config.ts .
COPY /frontend/.eslintrc.js .
COPY /frontend/.prettierrc.js .
COPY /frontend/.eslintignore .
COPY /frontend/.prettierignore .
COPY /frontend/types ./types
RUN npm install

WORKDIR /app/api
COPY /api/server.ts .
COPY /api/src ./src
COPY /api/prisma ./prisma

RUN npx prisma generate
RUN npx tsc
RUN mv node_modules /tmp/node_modules && mv dist /tmp/dist-api && rm -r * && mv /tmp/dist-api/* . && mv /tmp/node_modules node_modules
COPY /api/prisma .

WORKDIR /app/frontend
COPY /frontend/src ./src
COPY /frontend/public ./public

RUN npm run build
RUN mv dist /tmp/dist-frontend && rm -r * && mv /tmp/dist-frontend/* .

WORKDIR /
RUN mkdir /.storage
RUN ln -s /.storage /app/.storage

WORKDIR /app
RUN npm install nodemon -g
COPY /.build/entrypoint.sh .
COPY /package.json .

FROM ubuntu:22.04
COPY --from=build . .
ENV NODE_ENV=production
WORKDIR /app
ENTRYPOINT ["/bin/bash", "./entrypoint.sh"]
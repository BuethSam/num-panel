FROM node:18-buster as build

WORKDIR /app

COPY package.json /app
COPY yarn.lock /app

RUN yarn install

COPY . /app

RUN yarn run build

FROM node:18-buster

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libudev-dev

COPY package.json /app
COPY yarn.lock /app
COPY LICENSE /app/LICENSE

RUN yarn install --production

COPY --from=build /app/dist /app/dist

CMD [ "/app/dist/index.js" ]

FROM node:buster

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libudev-dev build-essential

COPY package.json /app
COPY yarn.lock /app

RUN yarn

COPY . /app

RUN yarn run build

CMD [ "/app/dist/index.js" ]

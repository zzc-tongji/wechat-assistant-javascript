FROM node:lts-alpine

WORKDIR /usr/src/app

COPY ./runtime/ ./runtime/
COPY ./src/ ./src/
COPY ./package.json ./
COPY ./yarn.lock ./

EXPOSE 3000

RUN yarn install --production

CMD [ "yarn", "start" ]

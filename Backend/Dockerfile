FROM node:latest

WORKDIR /app

COPY package.json package-lock.json

COPY . .

RUN npm install

EXPOSE 8080

CMD [ "node", "app.js" ]
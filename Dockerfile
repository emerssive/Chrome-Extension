FROM node:latest

WORKDIR /Backend

COPY . .

RUN npm install

EXPOSE 8080

CMD [ "node", "app.js" ]
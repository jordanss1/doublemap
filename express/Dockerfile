FROM node:latest

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chown node:node -R /app

USER node

CMD ["npm", "run", "dev"]
FROM node:22-alpine

RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000
CMD ["npm", "start"]

FROM node:18-alpine

WORKDIR /app

# Instala dependências nativas necessárias para o sqlite3
RUN apk add --no-cache python3 make g++ sqlite

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"] 
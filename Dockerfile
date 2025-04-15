FROM node:18-slim

WORKDIR /app

# Instala dependências necessárias
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copia os arquivos de dependência
COPY package*.json ./

# Instala as dependências
RUN npm install --production

# Copia o resto do código
COPY . .

EXPOSE 3000

CMD ["npm", "start"] 
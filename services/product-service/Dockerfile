FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
ENV NODE_ENV=production
EXPOSE 3002
USER node
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]

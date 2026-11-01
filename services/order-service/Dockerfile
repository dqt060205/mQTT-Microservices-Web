FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3004
USER node

# Apply committed migrations, then start the API
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]

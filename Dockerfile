FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/aisha-runtime-pack1/package.json ./packages/aisha-runtime-pack1/package.json
COPY packages/aisha-runtime-pack1/dist ./packages/aisha-runtime-pack1/dist
RUN npm ci --omit=dev

COPY . .

ENV SILVA_DB_PATH=/tmp/silva.db

EXPOSE 8080

CMD ["npm", "start"]

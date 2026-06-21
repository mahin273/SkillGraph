FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY package*.json ./
COPY packages/database/package.json ./packages/database/package.json
COPY gateway/package.json ./gateway/package.json
COPY graph-service/package.json ./graph-service/package.json
COPY notification-service/package.json ./notification-service/package.json
COPY decay-worker/package.json ./decay-worker/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install
COPY packages/database ./packages/database
COPY gateway ./gateway
RUN npm --workspace @skillgraph/database run prisma:generate
RUN npm --workspace @skillgraph/database run build
WORKDIR /app/gateway
EXPOSE 3000
CMD ["npm", "run", "dev"]

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY packages/database/package.json ./packages/database/package.json
COPY gateway/package.json ./gateway/package.json
COPY graph-service/package.json ./graph-service/package.json
COPY notification-service/package.json ./notification-service/package.json
COPY decay-worker/package.json ./decay-worker/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install
COPY packages/database ./packages/database
COPY decay-worker ./decay-worker
RUN npm --workspace @skillgraph/database run prisma:generate
RUN npm --workspace @skillgraph/database run build
WORKDIR /app/decay-worker
CMD ["npm", "run", "dev"]

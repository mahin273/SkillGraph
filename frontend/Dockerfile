FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/database/package.json ./packages/database/package.json
COPY gateway/package.json ./gateway/package.json
COPY graph-service/package.json ./graph-service/package.json
COPY notification-service/package.json ./notification-service/package.json
COPY decay-worker/package.json ./decay-worker/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install
COPY frontend ./frontend
WORKDIR /app/frontend
EXPOSE 5173
CMD ["npm", "run", "dev"]

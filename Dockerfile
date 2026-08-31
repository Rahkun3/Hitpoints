FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY public ./public
COPY data ./data
COPY seed ./seed
ENV NODE_ENV=production PORT=3000 CONTENT_DIR=/data/content UPLOADS_DIR=/data/uploads
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/server.js"]

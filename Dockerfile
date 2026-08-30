FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
COPY public ./public
COPY data ./data
COPY seed ./seed
ENV NODE_ENV=production
ENV PORT=3000
ENV CONTENT_DIR=/data/content
ENV UPLOADS_DIR=/data/uploads
EXPOSE 3000
CMD ["node", "src/server.js"]

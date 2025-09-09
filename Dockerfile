FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY tsconfig.json ./
COPY fraud.rules.json ./
COPY src ./src

RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]



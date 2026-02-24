FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Copy standalone output and static files
RUN cp -r .next/static .next/standalone/.next/static || true
RUN cp -r public .next/standalone/public || true

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]

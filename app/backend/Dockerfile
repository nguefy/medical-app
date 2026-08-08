FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

# Utilisateur non-root pour la sécurité
USER node

EXPOSE 3000
CMD ["node", "src/app.js"]

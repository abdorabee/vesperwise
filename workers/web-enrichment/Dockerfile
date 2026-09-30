FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --chown=node:node workers/web-enrichment ./workers/web-enrichment
COPY --chown=node:node workers/shared ./workers/shared
RUN chown -R node:node /app

ENV NODE_ENV=production
USER node
CMD ["node", "workers/web-enrichment/worker.mjs"]

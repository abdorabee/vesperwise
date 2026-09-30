FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY workers/hiring-refresh/requirements.txt ./workers/hiring-refresh/requirements.txt
RUN mkdir -p "$PLAYWRIGHT_BROWSERS_PATH" \
    && pip3 install --no-cache-dir --break-system-packages -r workers/hiring-refresh/requirements.txt \
    && scrapling install

COPY --chown=node:node workers/hiring-refresh ./workers/hiring-refresh
COPY --chown=node:node workers/shared ./workers/shared
RUN chown -R node:node /app "$PLAYWRIGHT_BROWSERS_PATH"

ENV NODE_ENV=production
USER node
CMD ["node", "workers/hiring-refresh/worker.mjs"]

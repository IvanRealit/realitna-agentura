# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Optional CA mount for managed cloud environments. TLS verification stays on.
# The package-lock integrity hashes still verify every npm artifact.
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then \
      NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci --ignore-scripts --strict-ssl=true; \
    else npm ci --ignore-scripts --strict-ssl=true; fi
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 UPLOAD_DIR=/app/data/uploads
RUN mkdir -p /app/data/uploads && chown -R node:node /app
# Copy the verified build in one layer. This also avoids repeated 1 GB layer
# copies on development daemons that use the VFS storage driver.
# .dockerignore excludes credentials, runtime uploads and local artifacts.
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["npm", "start"]

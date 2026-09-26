FROM node:20-slim

# Install the real, native ffmpeg binary (not WebAssembly) — this is what makes
# processing fast: full CPU (and on some hosts, hardware) acceleration.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]

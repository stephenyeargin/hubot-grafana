FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install the npm packages globally
RUN npm install -g npm@10.7.0 \
    && npm install -g npm-check-updates

COPY ./startup.sh /
RUN chmod +x /startup.sh

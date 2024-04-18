FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install the npm packages globally
RUN npm install -g npm \
    && npm install -g npm-check-updates

COPY ./startup.sh /
RUN chmod +x /startup.sh

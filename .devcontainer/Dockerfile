FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye

# Install the npm packages globally
RUN npm install -g npm@10.9.2 \
    && npm install -g npm-check-updates

COPY ./startup.sh /
RUN chmod +x /startup.sh

# Append the profile to the current .bashrc and .zshrc files
# this makes sure we keep the current behavior like colors and aliases
COPY ./.profile /tmp/.profile
RUN cat /tmp/.profile >> /home/node/.bashrc && \
    cat /tmp/.profile >> /home/node/.zshrc && \
    rm /tmp/.profile

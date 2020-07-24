# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# FROM node:12-slim

# # Install Chrome
# RUN apt-get update \
#     && apt-get install -y wget gnupg \
#     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
#     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >/etc/apt/sources.list.d/google.list' \
#     && apt-get update && apt-get install -y google-chrome-stable


# # Install app dependencies
# COPY package*.json ./
# RUN npm install

# # Bundle app source
# COPY . .

# ENTRYPOINT [ "node", "../index.js" ]

FROM ubuntu:16.04
CMD "/bin/ls -l"

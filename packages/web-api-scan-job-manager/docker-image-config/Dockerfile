# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
FROM node:12-slim

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

ENTRYPOINT [ "node", "../index.js" ]

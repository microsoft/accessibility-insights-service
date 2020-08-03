# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
FROM node:12-slim

# Set Environment variables
ENV AZURE_STORAGE_SCAN_QUEUE=ondemand-scanrequest

# Copy configuration
COPY runtime-config*.json ./

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

ENTRYPOINT [ "node", "./sender.js.js" ]

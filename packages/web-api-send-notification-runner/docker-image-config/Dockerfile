# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
FROM node:12.21-slim

# Bundle app source
COPY . .

# Install app dependencies
RUN npm install

ENTRYPOINT [ "node", "./web-api-send-notification-runner.js" ]

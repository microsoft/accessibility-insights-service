# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
FROM mcr.microsoft.com/windows:1903

# install node
RUN powershell Invoke-WebRequest -OutFile nodejs.zip -UseBasicParsing "https://nodejs.org/dist/v12.4.0/node-v12.4.0-win-x64.zip"; Expand-Archive nodejs.zip -DestinationPath C:\; Rename-Item "C:\node-v12.4.0-win-x64" C:\nodejs
RUN SETX PATH C:\nodejs

# Bundle app source
COPY . .

# Install app dependencies
RUN npm install

ENTRYPOINT [ "node", "./web-api-scan-job-manager.js" ]

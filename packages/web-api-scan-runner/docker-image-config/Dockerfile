# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
FROM mcr.microsoft.com/windows:1809-amd64

ENV NODE_VERSION 12.20.2

USER ContainerAdministrator
RUN route -p add 169.254.169.0 mask 255.255.255.0 0.0.0.0
USER ContainerUser

RUN setx /m PATH "%PATH%;C:\nodejs"

RUN powershell -Command \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    Expand-Archive node.zip -DestinationPath C:\ ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs'

# Bundle app source
COPY . .

# Install app dependencies
RUN npm install

ENTRYPOINT [ "node", "./web-api-scan-runner.js" ]

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

FROM mcr.microsoft.com/windows/servercore:ltsc2025-amd64

ENV NODE_VERSION 20.15.0
ENV USER_KEY=

WORKDIR /app

# Install Node.js
RUN powershell Set-ExecutionPolicy RemoteSigned
RUN powershell -Command \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    Expand-Archive node.zip -DestinationPath / ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs'
RUN setx /m PATH "%PATH%;C:\nodejs"

# Bundle app package
COPY . .

# Install app dependencies
RUN npm install
RUN npx patch-package
RUN npx playwright install msedge

# Install a11y agent dependencies
RUN powershell -Command \
    if (Test-Path -Path ".\a11y_agent") { Write-Host "Install a11y agent dependencies" ; .\a11y_agent\docker-install.ps1 ; }

CMD ["powershell", "./web-api-scan-runner.ps1"]

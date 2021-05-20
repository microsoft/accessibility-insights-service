# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# Multi-stage build

FROM mcr.microsoft.com/windows:1809-amd64 as source

# Copy Windows fonts to use in core image
RUN powershell -Command \
    Copy-Item -Path C:\Windows\Fonts -Exclude lucon.ttf -Destination C:\Fonts -Recurse

FROM mcr.microsoft.com/windows/servercore:1809-amd64

ENV NODE_VERSION 12.21.0

USER ContainerAdministrator

# Install Node.js
RUN powershell Set-ExecutionPolicy RemoteSigned
RUN powershell -Command \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    Expand-Archive node.zip -DestinationPath C:\ ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs'
RUN setx /m PATH "%PATH%;C:\nodejs"

# Install fonts to enable browser rendering
COPY --from=source /Fonts/ /Fonts/
COPY Add-Font.ps1 .
RUN powershell -Command \
    .\Add-Font.ps1 Fonts >$null

# Bundle app package
COPY . .

# Install app dependencies
RUN npm install

ENTRYPOINT ["powershell.exe", "./web-api-scan-runner.ps1"]

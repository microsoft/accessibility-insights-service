# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

FROM mcr.microsoft.com/windows/servercore:1809-amd64

ENV NODE_VERSION 16.14.0

USER ContainerAdministrator

WORKDIR /app

# Install Node.js
RUN powershell Set-ExecutionPolicy RemoteSigned
RUN powershell -Command \
    Invoke-WebRequest $('https://nodejs.org/dist/v{0}/node-v{0}-win-x64.zip' -f $env:NODE_VERSION) -OutFile 'node.zip' -UseBasicParsing ; \
    Expand-Archive node.zip -DestinationPath / ; \
    Rename-Item -Path $('C:\node-v{0}-win-x64' -f $env:NODE_VERSION) -NewName 'C:\nodejs'
RUN setx /m PATH "%PATH%;C:\nodejs"

# Install fonts to enable browser rendering
ADD Fonts.tar /Fonts/
COPY Add-Font.ps1 .
RUN powershell -Command \
    .\Add-Font.ps1 /Fonts/ > nul

# Bundle app package
COPY . .

# Install app dependencies
RUN npm install

ENTRYPOINT ["powershell.exe", "./privacy-scan-runner.ps1"]

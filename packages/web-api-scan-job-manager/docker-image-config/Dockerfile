# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.
FROM mcr.microsoft.com/windows/servercore:2004-amd64

SHELL ["powershell", "-Command", "$ErrorActionPreference = 'Stop';$ProgressPreference='silentlyContinue';"]

# install node
RUN netsh interface ipv4 set subinterface 18 mtu=1460 store=persistent ; \
	Invoke-WebRequest -OutFile nodejs.zip -UseBasicParsing "https://nodejs.org/dist/v12.4.0/node-v12.4.0-win-x64.zip"; \
	Expand-Archive nodejs.zip -DestinationPath C:\; \
	Rename-Item "C:\\node-v12.4.0-win-x64" c:\nodejs

RUN SETX PATH C:\nodejs

# Bundle app source
COPY . .

# Install app dependencies
RUN npm install

ENTRYPOINT [ "node", "./web-api-scan-job-manager.js" ]

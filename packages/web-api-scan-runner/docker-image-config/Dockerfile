# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

FROM mcr.microsoft.com/windows/servercore:ltsc2022-amd64

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

# TODO: Remove the following workaround once the Playwright CLI supports installing specific versions of Playwright.
#
# Temporary workaround for installing Playwright versions that are not yet available in the Playwright CLI.
# This workaround will be removed once the Playwright CLI supports installing specific versions of Playwright.
# To install a specific version of Playwright, set the PLAYWRIGHT_VERSION environment variable to the desired version
# and rebuild the Docker image.
ENV PLAYWRIGHT_VERSION 1155
RUN powershell -Command \
    Invoke-WebRequest $('https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/{0}/chromium-win64.zip' -f $env:PLAYWRIGHT_VERSION) -OutFile 'chromium-win64.zip' -UseBasicParsing ; \
    Expand-Archive 'chromium-win64.zip' -DestinationPath $('C:\Users\ContainerAdministrator\AppData\Local\ms-playwright\chromium-{0}' -f $env:PLAYWRIGHT_VERSION) -Force
RUN powershell -Command \
    Invoke-WebRequest $('https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/{0}/chromium-headless-shell-win64.zip' -f $env:PLAYWRIGHT_VERSION) -OutFile 'chromium-headless-shell-win64.zip' -UseBasicParsing ; \
    Expand-Archive 'chromium-headless-shell-win64.zip' -DestinationPath $('C:\Users\ContainerAdministrator\AppData\Local\ms-playwright\chromium_headless_shell-{0}' -f $env:PLAYWRIGHT_VERSION) -Force

CMD ["powershell", "./web-api-scan-runner.ps1"]

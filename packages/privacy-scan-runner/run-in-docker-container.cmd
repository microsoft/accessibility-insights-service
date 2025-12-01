rem Copyright (c) Microsoft Corporation. All rights reserved.
rem Licensed under the MIT License.

echo off

rem The script builds and runs the docker image

SET DOCKER_CLI_HINTS=false

copy ..\resource-deployment\runtime-config\runtime-config.dev.json .\dist\runtime-config.json &&^
cd ..\scanner-global-library &&^
yarn build &&^
cd ..\privacy-scan-runner &&^
yarn build &&^
cd .\dist &&^
docker build --tag mcr.microsoft.com/windows/privacy-scan-runner:prescanner . &&^
cd ..\..\resource-deployment\scripts\docker-scanner-image &&^
powershell .\build-scanner-image.ps1 -InstallHostFonts &&^
cd ..\..\..\privacy-scan-runner &&^
docker run --init --shm-size=2gb --ipc=host --env-file .env mcr.microsoft.com/windows/privacy-scan-runner

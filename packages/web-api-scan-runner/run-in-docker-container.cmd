rem Copyright (c) Microsoft Corporation. All rights reserved.
rem Licensed under the MIT License.

echo off

rem The script builds and runs the docker image

SET DOCKER_CLI_HINTS=false

copy ..\resource-deployment\runtime-config\runtime-config.dev.json .\dist\runtime-config.json &&^
copy /y .\docker-image-config\Dockerfile.debug .\dist\Dockerfile.debug &&^
cd ..\scanner-global-library &&^
yarn build &&^
cd ..\web-api-scan-runner &&^
yarn build &&^
cd .\dist &&^
docker build --tag mcr.microsoft.com/windows/web-api-scan-runner:prescanner . &&^
docker build --tag mcr.microsoft.com/windows/web-api-scan-runner:prescanner -f Dockerfile.debug . &&^
cd ..\..\resource-deployment\scripts\docker-scanner-image &&^
powershell .\build-scanner-image.ps1 -InstallHostFonts &&^
cd ..\..\..\web-api-scan-runner &&^
docker run --isolation=process --cpus=2 --init --shm-size=2gb --ipc=host -p 9229:9229 --env-file .env mcr.microsoft.com/windows/web-api-scan-runner

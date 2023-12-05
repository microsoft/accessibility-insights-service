rem Copyright (c) Microsoft Corporation. All rights reserved.
rem Licensed under the MIT License.

echo off

rem The script builds and runs the docker image

copy ..\resource-deployment\runtime-config\runtime-config.dev.json .\dist\runtime-config.json &&^
copy /y .\docker-image-config\Dockerfile.debug .\dist\Dockerfile.debug &&^
yarn build &&^
cd .\dist &&^
docker build --tag web-api-scan-runner:prescanner . &&^
docker build --tag web-api-scan-runner:prescanner -f Dockerfile.debug . &&^
cd ..\..\resource-deployment\scripts\docker-scanner-image &&^
powershell .\build-scanner-image.ps1 &&^
cd ..\..\..\web-api-scan-runner &&^
docker run --init --ipc=host -p 9229:9229 --env-file .env web-api-scan-runner

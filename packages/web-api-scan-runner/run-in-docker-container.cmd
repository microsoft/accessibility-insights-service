rem Copyright (c) Microsoft Corporation. All rights reserved.
rem Licensed under the MIT License.

echo off

rem The script builds and runs the docker image

copy ..\resource-deployment\runtime-config\runtime-config.dev.json .\dist\runtime-config.json &&^
yarn build &&^
cd .\dist &&^
docker build --tag web-api-scan-runner:prescanner . &&^
cd ..\..\resource-deployment\scripts\docker-scanner-image &&^
powershell .\build-scanner-image.ps1 &&^
cd ..\..\..\web-api-scan-runner &&^
docker run --init --ipc=host --env-file .env web-api-scan-runner

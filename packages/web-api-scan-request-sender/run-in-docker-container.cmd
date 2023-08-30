rem Copyright (c) Microsoft Corporation. All rights reserved.
rem Licensed under the MIT License.

echo off

rem The script builds and runs the docker image

copy ..\resource-deployment\runtime-config\runtime-config.dev.json .\dist\runtime-config.json &&^
yarn build &&^
cd .\dist &&^
docker build --tag web-api-scan-request-sender . &&^
docker run --init --ipc=host --env-file .env web-api-scan-request-sender &&^
cd ..

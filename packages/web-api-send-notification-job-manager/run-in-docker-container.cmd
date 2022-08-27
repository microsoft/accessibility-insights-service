rem Copyright (c) Microsoft Corporation. All rights reserved.
rem Licensed under the MIT License.

echo off

rem The script builds and runs the docker image

copy ..\..\..\accessibility-insights-service-private\docker-image\*.* .\dist\
copy ..\resource-deployment\runtime-config\runtime-config.dev.json .\dist\runtime-config.json
copy .\.env .\dist\

wsl yarn build &&^
cd .\dist &&^
docker build --tag web-api-send-notification-job-manager . &&^
docker run --init --cap-add=SYS_ADMIN --ipc=host --env-file .env web-api-send-notification-job-manager

rem Copyright (c) Microsoft Corporation. All rights reserved.
rem Licensed under the MIT License.

echo off

rem The script builds and runs the docker image

copy ..\resource-deployment\runtime-config\runtime-config.dev.json .\dist\runtime-config.json
copy .\.env .\dist\

yarn build &&^
cd .\dist &&^
docker build --tag privacy-scan-runner . &&^
docker run --init --ipc=host --env-file .env privacy-scan-runner &&^
cd ..

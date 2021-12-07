#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script builds runner package and corresponding docker image, and then runs the scan runner package in a docker container
cp ../resource-deployment/runtime-config/runtime-config.dev.json ./dist/runtime-config.json
cp ./.env ./dist/
yarn build &&
    cd ./dist &&
    docker build --tag runner . &&
    docker run --init --cap-add=SYS_ADMIN --ipc=host -e id="'1ec570df-6ba0-6421-85ef-81ec2263f760'" -e url='https://teststorage57bzoqjjclekk.z13.web.core.windows.net/2021-05-04/' runner

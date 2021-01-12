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
    docker run --init --cap-add=SYS_ADMIN --ipc=host runner

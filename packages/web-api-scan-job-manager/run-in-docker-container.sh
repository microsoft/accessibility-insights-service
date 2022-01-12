#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

set -eo pipefail

# The script builds package and corresponding docker image, and then runs in a docker container
cp ../resource-deployment/runtime-config/runtime-config.dev.json ./dist/runtime-config.json
cp ./.env ./dist/
yarn build &&
    cd ./dist &&
    docker build --tag job-manager . &&
    docker run job-manager

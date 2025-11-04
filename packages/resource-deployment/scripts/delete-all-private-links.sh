#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

# shellcheck disable=SC1090
set -eo pipefail

"${0%/*}"/delete-private-link.sh -r maxl-a11y-eu-2 -g blob
"${0%/*}"/delete-private-link.sh -r maxl-a11y-eu-2 -g queue
"${0%/*}"/delete-private-link.sh -r maxl-a11y-eu-2 -g table
"${0%/*}"/delete-private-link.sh -r maxl-a11y-eu-2 -g file
"${0%/*}"/delete-private-link.sh -r maxl-a11y-eu-2 -g vault
"${0%/*}"/delete-private-link.sh -r maxl-a11y-eu-2 -g sql

echo "[delete-all-private-link] Completed deletion of all private links"

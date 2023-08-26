# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

FROM base-scanner

ARG BUILD_KEY=

COPY install-fonts.ps1 .
COPY enable-fonts.ps1 .

RUN powershell .\install-fonts.ps1

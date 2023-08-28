# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

FROM prescanner

ARG BUILD_KEY=

COPY install-font-packages.ps1 .
COPY add-font-resources.ps1 .

RUN powershell .\install-font-packages.ps1
RUN powershell .\add-font-resources.ps1

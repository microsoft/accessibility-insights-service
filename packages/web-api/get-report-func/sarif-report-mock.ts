// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// tslint:disable: max-func-body-length max-line-length

export function getSarifReportMock(): object {
    return {
        version: '2.1.0',
        runs: [
            {
                artifacts: [
                    {
                        location: {
                            uri: 'https://www.microsoft.com/france/office/project/',
                        },
                    },
                ],
                results: [
                    {
                        ruleId: 'aria-allowed-role',
                        level: 'error',
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'https://www.microsoft.com/france/office/project/',
                                    },
                                    region: {
                                        snippet: {
                                            text: '<li id="section-3" data-f-theme="dark" role="tabpanel" class="f-active">',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '#section-3',
                            },
                        ],
                    },
                    {
                        ruleId: 'heading-order',
                        level: 'error',
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'https://www.microsoft.com/france/office/project/',
                                    },
                                    region: {
                                        snippet: {
                                            text: '<h4 class="c-heading-4">Nouveautés\n</h4>',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '.c-uhff-nav-row:nth-child(1) > .c-uhff-nav-group:nth-child(1) > h4',
                            },
                        ],
                    },
                    {
                        ruleId: 'region',
                        level: 'error',
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'https://www.microsoft.com/france/office/project/',
                                    },
                                    region: {
                                        snippet: {
                                            text: '<html dir="ltr" lang="fr-FR" class="js picture eventlistener">',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: 'html',
                            },
                        ],
                    },
                    {
                        ruleId: 'tabindex',
                        level: 'error',
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'https://www.microsoft.com/france/office/project/',
                                    },
                                    region: {
                                        snippet: {
                                            text:
                                                '<a id="uhfSkipToMain" class="m-skip-to-main" href="#mainContent" tabindex="1" style="z-index:3000002" data-m="{&quot;cN&quot;:&quot;Skip to content_nonnav&quot;,&quot;id&quot;:&quot;nn2m1r1a1&quot;,&quot;sN&quot;:2,&quot;aN&quot;:&quot;m1r1a1&quot;}">Passer directement au contenu principal</a>',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '#uhfSkipToMain',
                            },
                        ],
                    },
                    {
                        ruleId: 'tabindex',
                        level: 'error',
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'https://www.microsoft.com/france/office/project/',
                                    },
                                    region: {
                                        snippet: {
                                            text:
                                                '<button type="button" class="c-action-trigger c-glyph glyph-global-nav-button" aria-label="Développer tout Microsoft pour voir la liste des produits et services Microsoft" aria-expanded="false" data-m="{&quot;cN&quot;:&quot;Mobile menu button_nonnav&quot;,&quot;id&quot;:&quot;nn1c3m1r1a1&quot;,&quot;sN&quot;:1,&quot;aN&quot;:&quot;c3m1r1a1&quot;}" tabindex="2">',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '.glyph-global-nav-button',
                            },
                        ],
                    },
                    {
                        ruleId: 'tabindex',
                        level: 'error',
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'https://www.microsoft.com/france/office/project/',
                                    },
                                    region: {
                                        snippet: {
                                            text:
                                                '<a id="uhfLogo" class="c-logo c-sgl-stk-uhfLogo" itemprop="url" href="https://www.microsoft.com" aria-label="Microsoft" data-m="{&quot;cN&quot;:&quot;GlobalNav_Logo_cont&quot;,&quot;cT&quot;:&quot;Container&quot;,&quot;id&quot;:&quot;c3c3m1r1a1&quot;,&quot;sN&quot;:3,&quot;aN&quot;:&quot;c3m1r1a1&quot;}" tabindex="6">',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '#uhfLogo',
                            },
                        ],
                    },
                    {
                        ruleId: 'tabindex',
                        level: 'error',
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'https://www.microsoft.com/france/office/project/',
                                    },
                                    region: {
                                        snippet: {
                                            text:
                                                '<button type="button" id="uhfCatLogoButton" class="c-cat-logo-button x-hidden" aria-expanded="false" aria-label="Project" data-m="{&quot;cN&quot;:&quot;Project_nonnav&quot;,&quot;id&quot;:&quot;nn7c3m1r1a1&quot;,&quot;sN&quot;:7,&quot;aN&quot;:&quot;c3m1r1a1&quot;}" tabindex="3">',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '#uhfCatLogoButton',
                            },
                        ],
                    },
                    {
                        ruleId: 'tabindex',
                        level: 'error',
                        locations: [
                            {
                                physicalLocation: {
                                    fileLocation: {
                                        uri: 'https://www.microsoft.com/france/office/project/',
                                    },
                                    region: {
                                        snippet: {
                                            text:
                                                '<button id="search" aria-label="Rechercher" class="c-glyph" data-m="{&quot;cN&quot;:&quot;Search_nav&quot;,&quot;id&quot;:&quot;n2c3c1c9c3m1r1a1&quot;,&quot;sN&quot;:2,&quot;aN&quot;:&quot;c3c1c9c3m1r1a1&quot;}" data-bi-dnt="true" data-bi-mto="true" aria-expanded="false" tabindex="5">',
                                        },
                                    },
                                },
                                fullyQualifiedLogicalName: '#search',
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// import { System } from 'common';
import { inject, injectable } from 'inversify';
import { GlobalLogger } from 'logger';
import { AxeScanResults, Page } from 'scanner-global-library';
import { OnDemandPageScanResult } from 'storage-documents';
// import { AxeScanner } from '../scanner/axe-scanner';
import { ScanMetadata } from '../types/scan-metadata';
import { DeepScanner } from './deep-scanner';

@injectable()
export class PageScanProcessor {
    public constructor(
        @inject(Page) private readonly page: Page,
        // @inject(AxeScanner) private readonly axeScanner: AxeScanner,
        @inject(DeepScanner) private readonly deepScanner: DeepScanner,
        @inject(GlobalLogger) private readonly logger: GlobalLogger,
    ) {}

    public async scan(scanMetadata: ScanMetadata, pageScanResult: OnDemandPageScanResult): Promise<AxeScanResults> {
        let axeScanResults: AxeScanResults;
        try {
            // await this.openPage(scanMetadata.url);

            // axeScanResults = await this.axeScanner.scan(this.page);
            axeScanResults = JSON.parse(this.axeScanResultConst()) as AxeScanResults;

            this.logger.logInfo('The axe scanner completed a page scan.');

            if (scanMetadata.deepScan) {
                if (this.page.isOpen()) {
                    await this.deepScanner.runDeepScan(scanMetadata, pageScanResult, this.page);
                    this.logger.logInfo('The deep scanner completed a page scan.');
                } else {
                    this.logger.logError('Page is not ready. Unable to perform deep scan.');
                }
            }
        } finally {
            // await this.closePage();
        }

        return axeScanResults;
    }

    // private async openPage(url: string): Promise<void> {
    //     await this.page.create();
    //     await this.page.navigateToUrl(url);
    // }

    // private async closePage(): Promise<void> {
    //     try {
    //         await this.page.close();
    //     } catch (error) {
    //         this.logger.logError('An error occurred while closing web browser.', { error: System.serializeError(error) });
    //     }
    // }

    private axeScanResultConst(): string {
        return `{
            "results": {
                "testEngine": {
                    "name": "axe-core",
                    "version": "4.3.2"
                },
                "testRunner": {
                    "name": "axe"
                },
                "testEnvironment": {
                    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4298.0 Safari/537.36",
                    "windowWidth": 1920,
                    "windowHeight": 1080,
                    "orientationAngle": 0,
                    "orientationType": "portrait-primary"
                },
                "timestamp": "2021-11-19T01:33:36.906Z",
                "url": "https://www.citusdata.com/",
                "toolOptions": {
                    "rules": {
                        "accesskeys": {
                            "enabled": false
                        },
                        "aria-allowed-role": {
                            "enabled": false
                        },
                        "aria-dialog-name": {
                            "enabled": false
                        },
                        "aria-text": {
                            "enabled": false
                        },
                        "aria-treeitem-name": {
                            "enabled": false
                        },
                        "bypass": {
                            "enabled": false
                        },
                        "css-orientation-lock": {
                            "enabled": false
                        },
                        "duplicate-id": {
                            "enabled": false
                        },
                        "empty-heading": {
                            "enabled": false
                        },
                        "focus-order-semantics": {
                            "enabled": false
                        },
                        "form-field-multiple-labels": {
                            "enabled": false
                        },
                        "frame-tested": {
                            "enabled": false
                        },
                        "frame-title-unique": {
                            "enabled": false
                        },
                        "heading-order": {
                            "enabled": false
                        },
                        "hidden-content": {
                            "enabled": false
                        },
                        "identical-links-same-purpose": {
                            "enabled": false
                        },
                        "image-redundant-alt": {
                            "enabled": false
                        },
                        "label-content-name-mismatch": {
                            "enabled": false
                        },
                        "label-title-only": {
                            "enabled": false
                        },
                        "landmark-banner-is-top-level": {
                            "enabled": false
                        },
                        "landmark-complementary-is-top-level": {
                            "enabled": false
                        },
                        "landmark-contentinfo-is-top-level": {
                            "enabled": false
                        },
                        "landmark-main-is-top-level": {
                            "enabled": false
                        },
                        "landmark-no-duplicate-banner": {
                            "enabled": false
                        },
                        "landmark-no-duplicate-contentinfo": {
                            "enabled": false
                        },
                        "landmark-no-duplicate-main": {
                            "enabled": false
                        },
                        "landmark-one-main": {
                            "enabled": false
                        },
                        "landmark-unique": {
                            "enabled": false
                        },
                        "link-in-text-block": {
                            "enabled": false
                        },
                        "meta-viewport": {
                            "enabled": false
                        },
                        "meta-viewport-large": {
                            "enabled": false
                        },
                        "no-autoplay-audio": {
                            "enabled": false
                        },
                        "p-as-heading": {
                            "enabled": false
                        },
                        "page-has-heading-one": {
                            "enabled": false
                        },
                        "presentation-role-conflict": {
                            "enabled": false
                        },
                        "region": {
                            "enabled": false
                        },
                        "scope-attr-valid": {
                            "enabled": false
                        },
                        "scrollable-region-focusable": {
                            "enabled": false
                        },
                        "skip-link": {
                            "enabled": false
                        },
                        "tabindex": {
                            "enabled": false
                        },
                        "table-duplicate-name": {
                            "enabled": false
                        },
                        "table-fake-caption": {
                            "enabled": false
                        },
                        "td-has-header": {
                            "enabled": false
                        }
                    },
                    "reporter": "v1"
                },
                "violations": [
                    {
                        "id": "color-contrast",
                        "impact": "serious",
                        "tags": [
                            "cat.color",
                            "wcag2aa",
                            "wcag143"
                        ],
                        "description": "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds",
                        "help": "Elements must have sufficient color contrast",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/color-contrast?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1e873d",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 2.26,
                                            "fontSize": "10.8pt (14.4px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [
                                            {
                                                "html": "<footer class='new-footer pg-section'>",
                                                "target": [
                                                    "footer"
                                                ]
                                            }
                                        ],
                                        "impact": "serious",
                                        "message": "Element has insufficient color contrast of 2.26 (foreground color: #1e873d, background color: #09436a, font size: 10.8pt (14.4px), font weight: normal). Expected contrast ratio of 4.5:1"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": "serious",
                                "html": "<a href='https://www.citusdata.com/privacy' target='_blank' class='underline'>Privacy Policy</a>",
                                "target": [
                                    ".underline[target='_blank']"
                                ],
                                "failureSummary": "Fix any of the following:|n  Element has insufficient color contrast of 2.26 (foreground color: #1e873d, background color: #09436a, font size: 10.8pt (14.4px), font weight: normal). Expected contrast ratio of 4.5:1"
                            }
                        ]
                    }
                ],
                "passes": [
                    {
                        "id": "aria-allowed-attr",
                        "impact": "serious",
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures ARIA attributes are allowed for an element's role",
                        "help": "Elements must only use allowed ARIA attributes",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-allowed-attr?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<button aria-label='Close Topbar notification button' id='hideTop' onclick=';'> <i aria-hidden='true' class='icon'> <svg alt='close icon' style='transform: scale(1.4)' width='13'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-times-circle'></use> </svg> </i> </button>",
                                "target": [
                                    "#hideTop"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='link to homepage' class='logo' href='/' name='header-logo-link'>",
                                "target": [
                                    "a[aria-label='link to homepage']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop' class='menu expander-content expander-hidden' id='menu1' role='menu'>",
                                "target": [
                                    "#menu1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<button aria-controls='menu2' aria-expanded='false' class='toggle' id='drop-1'>Product</button>",
                                "target": [
                                    "#drop-1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<button aria-controls='menu4' aria-expanded='false' class='toggle' id='drop-3'>Use Cases</button>",
                                "target": [
                                    "#drop-3"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<button aria-controls='menu5' aria-expanded='false' class='toggle' id='drop-4'>Resources</button>",
                                "target": [
                                    "#drop-4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<button aria-controls='menu3' aria-expanded='false' class='toggle' id='drop-2'>About</button>",
                                "target": [
                                    "#drop-2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Citus GitHub repo' class='nav-link' data-github='citusdata/citus' href='https://github.com/citusdata/citus' rel='noopener' target='_blank'>",
                                "target": [
                                    ".github-stars > a[aria-label='Citus GitHub repo'][data-github='citusdata/citus'][rel='noopener']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<div aria-label='Postgres icon' class='anyscale-postgres' role='img'>",
                                "target": [
                                    ".anyscale-postgres"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<div aria-labelledby='multi-tenant' class='tab-content is-open' id='multi-tenant-content' role='tabpanel' style='display: block;'>",
                                "target": [
                                    "#multi-tenant-content"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<div aria-label='Click for performance demo video' class='youtube-video-place video-wrapper' data-yt-id='W_3e07nGFxY' data-yt-title='Video: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' data-yt-url='https://www.youtube-nocookie.com/embed/W_3e07nGFxY?enablejsapi=1&amp;rel=0&amp;autoplay=1' role='button' tabindex='0'>",
                                "target": [
                                    ".youtube-video-place"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Learn more about Citus Open Source' class='btn' href='/product/community'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='community']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Download Citus Open Source' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Download Citus Open Source']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Learn more about Hyperscale (Citus)' class='btn' href='/product/hyperscale-citus/'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='hyperscale-citus/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Hyperscale (Citus) available now on Azure' class='external-link' href='https://docs.microsoft.com/azure/postgresql/hyperscale/' target='_blank'>Available Now</a>",
                                "target": [
                                    ".external-link"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-label='Resources' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Resources']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Getting Started' class='footer-list__link' href='/getting-started/'>Getting Started</a>",
                                "target": [
                                    "a[aria-label='Resources, Getting Started']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, FAQ' class='footer-list__link' href='/faq'>FAQ</a>",
                                "target": [
                                    "a[aria-label='Resources, FAQ']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Documentation' class='footer-list__link' href='https://docs.citusdata.com'>Documentation</a>",
                                "target": [
                                    "a[aria-label='Resources, Documentation']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Products' class='footer-list__link' href='/product'>Products</a>",
                                "target": [
                                    "a[aria-label='Resources, Products']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Product Comparison' class='footer-list__link' href='/product/comparison'>Product Comparison</a>",
                                "target": [
                                    "a[aria-label='Resources, Product Comparison']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Use Cases' class='footer-list__link' href='/use-cases'>Use Cases</a>",
                                "target": [
                                    "a[aria-label='Resources, Use Cases']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Customer Stories' class='footer-list__link' href='/customers/'>Customer Stories</a>",
                                "target": [
                                    "a[aria-label='Resources, Customer Stories']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Blog' class='footer-list__link' href='/blog/'>Blog</a>",
                                "target": [
                                    "a[aria-label='Resources, Blog']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-label='About' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='About']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Contact us' class='footer-list__link' href='/about/contact_us'>Contact Us</a>",
                                "target": [
                                    "a[aria-label='About, Contact us']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Our Story' class='footer-list__link' href='/about/our-story/'>Our Story</a>",
                                "target": [
                                    "a[aria-label='About, Our Story']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Events' class='footer-list__link' href='/events'>Events</a>",
                                "target": [
                                    "a[aria-label='About, Events']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Careers' class='footer-list__link' href='/jobs'>Careers</a>",
                                "target": [
                                    "a[aria-label='About, Careers']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Newsroom' class='footer-list__link' href='/newsroom/'>Newsroom</a>",
                                "target": [
                                    "a[aria-label='About, Newsroom']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Pricing' class='footer-list__link' href='/pricing'>Pricing</a>",
                                "target": [
                                    "a[aria-label='About, Pricing']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-label='Support' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Support']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Support' class='footer-list__link' href='/support'>Support</a>",
                                "target": [
                                    "a[aria-label='Support, Support']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud' class='footer-list__link' href='/product/cloud'>Citus Cloud</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud Status' class='footer-list__link' href='https://status.citusdata.com'>Citus Cloud Status</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud Status']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Enterprise' class='footer-list__link' href='/product/enterprise'>Citus Enterprise</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Enterprise']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Security' class='footer-list__link' href='/security'>Security</a>",
                                "target": [
                                    "a[aria-label='Support, Security']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, SLA' class='footer-list__link' href='/sla'>SLA</a>",
                                "target": [
                                    "a[aria-label='Support, SLA']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Terms of Service' class='footer-list__link' href='/tos'>Terms of Service</a>",
                                "target": [
                                    "a[aria-label='Support, Terms of Service']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Privacy Policy' class='footer-list__link' href='/privacy'>Privacy Policy</a>",
                                "target": [
                                    "a[aria-label='Support, Privacy Policy']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-label='Community' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Community']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Community, Download' class='footer-list__link' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Community, Download']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Community, GitHub repo' class='footer-list__link' href='https://github.com/citusdata/citus' rel='noopener'>GitHub repo</a>",
                                "target": [
                                    "a[aria-label='Community, GitHub repo']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Community, Citus Slack' class='footer-list__link' href='https://slack.citusdata.com'>Citus Slack</a>",
                                "target": [
                                    "a[aria-label='Community, Citus Slack']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Community, Newsletters' class='footer-list__link' href='/join-newsletter'>Newsletters</a>",
                                "target": [
                                    "a[aria-label='Community, Newsletters']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<input id='Email_16372856148870.7842018902471566' name='Email' placeholder='Your Email...' maxlength='255' aria-labelledby='LblEmail__16372856148870.7842018902471566' type='email' class='mktoField mktoEmailField mktoHasWidth mktoRequired' aria-required='true'>",
                                "target": [
                                    "#Email_16372856148870.7842018902471566"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-twitter-desc' href='https://www.twitter.com/citusdata' rel='noopener' target='_blank'> <svg alt='Twitter icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-twitter'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-twitter-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-slack-desc' href='https://slack.citusdata.com/' target='_blank'> <svg alt='Slack icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-slack'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-slack-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-youtube-desc' href='https://www.youtube.com/playlist?list=PLixnExCn6lRq261O0iwo4ClYxHpM9qfVy' rel='noopener' target='_blank'> <svg alt='YouTube icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-youtube'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-youtube-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-rss-desc' href='https://www.citusdata.com/feed.xml' target='_blank'> <svg alt='RSS icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-feed'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-rss-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-linkedin-desc' href='https://www.linkedin.com/company/5356039/' rel='noopener' target='_blank'> <svg alt='LinkedIn icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-linkedin'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-linkedin-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-allowed-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attributes are used correctly for the defined role"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-unsupported-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute is supported"
                                    },
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is allowed"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-github-desc' href='https://github.com/citusdata/citus' rel='noopener' target='_blank'> <svg alt='GitHub icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-github'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-github-desc']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-command-name",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures every ARIA button, link and menuitem has an accessible name",
                        "help": "ARIA commands must have an accessible name",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-command-name?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown first' role='menuitem'>",
                                "target": [
                                    ".first"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(5)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li role='menuitem'> <a class='nav-link' href='/blog/'>Blog</a> </li>",
                                "target": [
                                    "li[role='menuitem']:nth-child(6)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li role='menuitem'> <a class='nav-link' href='https://docs.citusdata.com/'>Docs</a> </li>",
                                "target": [
                                    "li[role='menuitem']:nth-child(7)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='github-stars' role='menuitem'>",
                                "target": [
                                    ".github-stars"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='button' role='menuitem'> <a class='btn btn-block nav-btn' href='/download/'>Download</a> </li>",
                                "target": [
                                    ".button[role='menuitem']:nth-child(10)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Click for performance demo video' class='youtube-video-place video-wrapper' data-yt-id='W_3e07nGFxY' data-yt-title='Video: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' data-yt-url='https://www.youtube-nocookie.com/embed/W_3e07nGFxY?enablejsapi=1&amp;rel=0&amp;autoplay=1' role='button' tabindex='0'>",
                                "target": [
                                    ".youtube-video-place"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-hidden-body",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures aria-hidden='true' is not present on the document body.",
                        "help": "aria-hidden='true' must not be present on the document body",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-hidden-body?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "aria-hidden-body",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "No aria-hidden attribute is present on document body"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<body class='index safari'>",
                                "target": [
                                    "body"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-hidden-focus",
                        "impact": null,
                        "tags": [
                            "cat.name-role-value",
                            "wcag2a",
                            "wcag412",
                            "wcag131"
                        ],
                        "description": "Ensures aria-hidden elements do not contain focusable elements",
                        "help": "ARIA hidden element must not contain focusable elements",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-hidden-focus?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon'> <svg alt='close icon' style='transform: scale(1.4)' width='13'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-times-circle'></use> </svg> </i>",
                                "target": [
                                    "#hideTop > i"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon icon-lg'> <svg alt='GitHub icon'> <title>GitHub icon</title> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-github'></use> </svg> </i>",
                                "target": [
                                    ".tagline > a[aria-label='Citus GitHub repo'][data-github='citusdata/citus'][rel='noopener'] > .icon-lg"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<span aria-hidden='true'>Contact Us</span>",
                                "target": [
                                    "a[aria-label='contact us'] > span[aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon icon-lg'> <svg alt='GitHub icon'> <title>GitHub icon</title> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-github'></use> </svg> </i>",
                                "target": [
                                    ".github-stars > a[aria-label='Citus GitHub repo'][data-github='citusdata/citus'][rel='noopener'] > .icon-lg"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-hidden='true' class='g-recaptcha' id='recaptchaBox'></div>",
                                "target": [
                                    "#recaptchaBox"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<img aria-hidden='true' class='osprey-shadow' height='200' src='assets/images/citus10-2-osprey-shadow-1x-001ea90f.png' srcset='assets/images/citus10-2-osprey-shadow-974a6fca.png 2x, assets/images/citus10-2-osprey-shadow-1x-001ea90f.png 1x' width='743'>",
                                "target": [
                                    ".osprey-shadow"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<img aria-hidden='true' class='osprey-speedlines' height='243' src='assets/images/citus10-2-osprey-speedlines-a2f47427.svg' width='228'>",
                                "target": [
                                    ".osprey-speedlines"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-hidden='true' class='parallelogram'> <svg> <use xlink:href='assets/images/sprites/feature-icons-0194d156.svg#parallelogram'></use> </svg> </div>",
                                "target": [
                                    ".parallelogram"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-hidden='true' class='anyscale-slant'></div>",
                                "target": [
                                    ".anyscale-slant"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-hidden='true' class='floaters3'>",
                                "target": [
                                    ".floaters3"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-hidden='true' class='video-base'></div>",
                                "target": [
                                    ".video-base"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon'><svg alt='arrow circle right icon'><use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-arrow-circle-right'></use></svg></i>",
                                "target": [
                                    "a[href$='pex'] > i"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon'><svg alt='arrow circle right icon'><use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-arrow-circle-right'></use></svg></i>",
                                "target": [
                                    "a[href$='copper'] > i"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon'><svg alt='arrow circle right icon'><use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-arrow-circle-right'></use></svg></i>",
                                "target": [
                                    "a[href$='pushowl'] > i"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon'><svg alt='arrow circle right icon'><use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-arrow-circle-right'></use></svg></i>",
                                "target": [
                                    "a[href$='algolia'] > i"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon'><svg alt='arrow circle right icon'><use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-arrow-circle-right'></use></svg></i>",
                                "target": [
                                    "a[href$='heap'] > i"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<i aria-hidden='true' class='icon'><svg alt='arrow circle right icon'><use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-arrow-circle-right'></use></svg></i>",
                                "target": [
                                    "a[href$='convertflow'] > i"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>Resources</li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>About</li>",
                                "target": [
                                    "ul[aria-label='About'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>Support</li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>Community</li>",
                                "target": [
                                    "ul[aria-label='Community'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>Subscribe to our newsletter</li>",
                                "target": [
                                    ".footer-list[role='presentation'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div class='mktoOffset' aria-hidden='true'></div>",
                                "target": [
                                    ".mktoFormCol.mktoFieldDescriptor > .mktoOffset[aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<span aria-hidden='true'>Your Email</span>",
                                "target": [
                                    ".show-for-sr > span[aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "focusable-modal-open",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements while a modal is open"
                                    },
                                    {
                                        "id": "focusable-disabled",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    },
                                    {
                                        "id": "focusable-not-tabbable",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No focusable elements contained within element"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div class='mktoOffset mktoHasWidth' aria-hidden='true'></div>",
                                "target": [
                                    ".mktoOffset.mktoHasWidth[aria-hidden='true']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-required-attr",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures elements with ARIA roles have all required ARIA attributes",
                        "help": "Required ARIA attributes must be provided",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-required-attr?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a href='javascript:void(0)' id='skipToMain' role='button' tabindex='0' style='top: 39.5938px;'>Skip navigation</a>",
                                "target": [
                                    "#skipToMain"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<nav role='navigation'>",
                                "target": [
                                    "nav"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop' class='menu expander-content expander-hidden' id='menu1' role='menu'>",
                                "target": [
                                    "#menu1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown first' role='menuitem'>",
                                "target": [
                                    ".first"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(5)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li role='menuitem'> <a class='nav-link' href='/blog/'>Blog</a> </li>",
                                "target": [
                                    "li[role='menuitem']:nth-child(6)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li role='menuitem'> <a class='nav-link' href='https://docs.citusdata.com/'>Docs</a> </li>",
                                "target": [
                                    "li[role='menuitem']:nth-child(7)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='github-stars' role='menuitem'>",
                                "target": [
                                    ".github-stars"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li role='presentation'> <a class='btn btn-ghost' href='javascript:void(0)' id='closeMobileMenu' role='button' tabindex='0'>Close Menu</a> </li>",
                                "target": [
                                    "#menu1 > li[role='presentation']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='button' role='menuitem'> <a class='btn btn-block nav-btn' href='/download/'>Download</a> </li>",
                                "target": [
                                    ".button[role='menuitem']:nth-child(10)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<header class='main-marquee new pg-section' role='banner'>",
                                "target": [
                                    ".main-marquee"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<main role='main'>",
                                "target": [
                                    "main"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Postgres icon' class='anyscale-postgres' role='img'>",
                                "target": [
                                    ".anyscale-postgres"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul class='accordion-tabs-minimal' role='tablist'>",
                                "target": [
                                    ".accordion-tabs-minimal"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='tab-header-and-content' id='multi-tenant-uc' role='presentation'>",
                                "target": [
                                    "#multi-tenant-uc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-labelledby='multi-tenant' class='tab-content is-open' id='multi-tenant-content' role='tabpanel' style='display: block;'>",
                                "target": [
                                    "#multi-tenant-content"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='tab-header-and-content' id='analytics-uc' role='presentation'>",
                                "target": [
                                    "#analytics-uc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='tab-header-and-content' id='time-series-uc' role='presentation'>",
                                "target": [
                                    "#time-series-uc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Click for performance demo video' class='youtube-video-place video-wrapper' data-yt-id='W_3e07nGFxY' data-yt-title='Video: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' data-yt-url='https://www.youtube-nocookie.com/embed/W_3e07nGFxY?enablejsapi=1&amp;rel=0&amp;autoplay=1' role='button' tabindex='0'>",
                                "target": [
                                    ".youtube-video-place"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul class='footer-list' role='presentation'>",
                                "target": [
                                    ".footer-list[role='presentation']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item' role='presentation'>",
                                "target": [
                                    ".footer-list__item[role='presentation']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__careers' role='presentation'> <a href='https://slack.citusdata.com/' target='_blank'>Join our Slack!</a> </li>",
                                "target": [
                                    ".footer-list__careers"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "All required ARIA attributes are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__social' role='presentation'>",
                                "target": [
                                    ".footer-list__social"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-required-children",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag131"
                        ],
                        "description": "Ensures elements with an ARIA role that require child roles contain them",
                        "help": "Certain ARIA roles must contain particular children",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-required-children?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "aria-required-children",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA children are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop' class='menu expander-content expander-hidden' id='menu1' role='menu'>",
                                "target": [
                                    "#menu1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-children",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA children are present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul class='accordion-tabs-minimal' role='tablist'>",
                                "target": [
                                    ".accordion-tabs-minimal"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-required-parent",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag131"
                        ],
                        "description": "Ensures elements with an ARIA role that require parent roles are contained by them",
                        "help": "Certain ARIA roles must be contained by particular parents",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-required-parent?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown first' role='menuitem'>",
                                "target": [
                                    ".first"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(5)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li role='menuitem'> <a class='nav-link' href='/blog/'>Blog</a> </li>",
                                "target": [
                                    "li[role='menuitem']:nth-child(6)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li role='menuitem'> <a class='nav-link' href='https://docs.citusdata.com/'>Docs</a> </li>",
                                "target": [
                                    "li[role='menuitem']:nth-child(7)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='github-stars' role='menuitem'>",
                                "target": [
                                    ".github-stars"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='button' role='menuitem'> <a class='btn btn-block nav-btn' href='/download/'>Download</a> </li>",
                                "target": [
                                    ".button[role='menuitem']:nth-child(10)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-required-parent",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Required ARIA parent role present"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-roles",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures all elements with a role attribute use a valid value",
                        "help": "ARIA roles used must conform to valid values",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-roles?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<a href='javascript:void(0)' id='skipToMain' role='button' tabindex='0' style='top: 39.5938px;'>Skip navigation</a>",
                                "target": [
                                    "#skipToMain"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<nav role='navigation'>",
                                "target": [
                                    "nav"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop' class='menu expander-content expander-hidden' id='menu1' role='menu'>",
                                "target": [
                                    "#menu1"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='dropdown first' role='menuitem'>",
                                "target": [
                                    ".first"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(3)"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(4)"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='dropdown' role='menuitem'>",
                                "target": [
                                    ".dropdown[role='menuitem']:nth-child(5)"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li role='menuitem'> <a class='nav-link' href='/blog/'>Blog</a> </li>",
                                "target": [
                                    "li[role='menuitem']:nth-child(6)"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li role='menuitem'> <a class='nav-link' href='https://docs.citusdata.com/'>Docs</a> </li>",
                                "target": [
                                    "li[role='menuitem']:nth-child(7)"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='github-stars' role='menuitem'>",
                                "target": [
                                    ".github-stars"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li role='presentation'> <a class='btn btn-ghost' href='javascript:void(0)' id='closeMobileMenu' role='button' tabindex='0'>Close Menu</a> </li>",
                                "target": [
                                    "#menu1 > li[role='presentation']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='button' role='menuitem'> <a class='btn btn-block nav-btn' href='/download/'>Download</a> </li>",
                                "target": [
                                    ".button[role='menuitem']:nth-child(10)"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<header class='main-marquee new pg-section' role='banner'>",
                                "target": [
                                    ".main-marquee"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<main role='main'>",
                                "target": [
                                    "main"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<div aria-label='Postgres icon' class='anyscale-postgres' role='img'>",
                                "target": [
                                    ".anyscale-postgres"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul class='accordion-tabs-minimal' role='tablist'>",
                                "target": [
                                    ".accordion-tabs-minimal"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='tab-header-and-content' id='multi-tenant-uc' role='presentation'>",
                                "target": [
                                    "#multi-tenant-uc"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<div aria-labelledby='multi-tenant' class='tab-content is-open' id='multi-tenant-content' role='tabpanel' style='display: block;'>",
                                "target": [
                                    "#multi-tenant-content"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='tab-header-and-content' id='analytics-uc' role='presentation'>",
                                "target": [
                                    "#analytics-uc"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='tab-header-and-content' id='time-series-uc' role='presentation'>",
                                "target": [
                                    "#time-series-uc"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<div aria-label='Click for performance demo video' class='youtube-video-place video-wrapper' data-yt-id='W_3e07nGFxY' data-yt-title='Video: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' data-yt-url='https://www.youtube-nocookie.com/embed/W_3e07nGFxY?enablejsapi=1&amp;rel=0&amp;autoplay=1' role='button' tabindex='0'>",
                                "target": [
                                    ".youtube-video-place"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul class='footer-list' role='presentation'>",
                                "target": [
                                    ".footer-list[role='presentation']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='footer-list__item' role='presentation'>",
                                "target": [
                                    ".footer-list__item[role='presentation']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='footer-list__careers' role='presentation'> <a href='https://slack.citusdata.com/' target='_blank'>Join our Slack!</a> </li>",
                                "target": [
                                    ".footer-list__careers"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "fallbackrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Only one role value used"
                                    },
                                    {
                                        "id": "invalidrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is valid"
                                    },
                                    {
                                        "id": "abstractrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Abstract roles are not used"
                                    },
                                    {
                                        "id": "unsupportedrole",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA role is supported"
                                    }
                                ],
                                "impact": null,
                                "html": "<li class='footer-list__social' role='presentation'>",
                                "target": [
                                    ".footer-list__social"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-valid-attr-value",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures all ARIA attributes have valid values",
                        "help": "ARIA attributes must conform to valid values",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-valid-attr-value?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-label='Close Topbar notification button' id='hideTop' onclick=';'> <i aria-hidden='true' class='icon'> <svg alt='close icon' style='transform: scale(1.4)' width='13'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-times-circle'></use> </svg> </i> </button>",
                                "target": [
                                    "#hideTop"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='link to homepage' class='logo' href='/' name='header-logo-link'>",
                                "target": [
                                    "a[aria-label='link to homepage']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop' class='menu expander-content expander-hidden' id='menu1' role='menu'>",
                                "target": [
                                    "#menu1"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu2' aria-expanded='false' class='toggle' id='drop-1'>Product</button>",
                                "target": [
                                    "#drop-1"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu4' aria-expanded='false' class='toggle' id='drop-3'>Use Cases</button>",
                                "target": [
                                    "#drop-3"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu5' aria-expanded='false' class='toggle' id='drop-4'>Resources</button>",
                                "target": [
                                    "#drop-4"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu3' aria-expanded='false' class='toggle' id='drop-2'>About</button>",
                                "target": [
                                    "#drop-2"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Citus GitHub repo' class='nav-link' data-github='citusdata/citus' href='https://github.com/citusdata/citus' rel='noopener' target='_blank'>",
                                "target": [
                                    ".github-stars > a[aria-label='Citus GitHub repo'][data-github='citusdata/citus'][rel='noopener']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='marquee' class='main-carousel dark-bk'>",
                                "target": [
                                    ".main-carousel"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Postgres icon' class='anyscale-postgres' role='img'>",
                                "target": [
                                    ".anyscale-postgres"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-labelledby='multi-tenant' class='tab-content is-open' id='multi-tenant-content' role='tabpanel' style='display: block;'>",
                                "target": [
                                    "#multi-tenant-content"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Click for performance demo video' class='youtube-video-place video-wrapper' data-yt-id='W_3e07nGFxY' data-yt-title='Video: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' data-yt-url='https://www.youtube-nocookie.com/embed/W_3e07nGFxY?enablejsapi=1&amp;rel=0&amp;autoplay=1' role='button' tabindex='0'>",
                                "target": [
                                    ".youtube-video-place"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Learn more about Citus Open Source' class='btn' href='/product/community'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='community']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Download Citus Open Source' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Download Citus Open Source']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Learn more about Hyperscale (Citus)' class='btn' href='/product/hyperscale-citus/'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='hyperscale-citus/']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Hyperscale (Citus) available now on Azure' class='external-link' href='https://docs.microsoft.com/azure/postgresql/hyperscale/' target='_blank'>Available Now</a>",
                                "target": [
                                    ".external-link"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-label='Resources' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Resources']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Getting Started' class='footer-list__link' href='/getting-started/'>Getting Started</a>",
                                "target": [
                                    "a[aria-label='Resources, Getting Started']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, FAQ' class='footer-list__link' href='/faq'>FAQ</a>",
                                "target": [
                                    "a[aria-label='Resources, FAQ']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Documentation' class='footer-list__link' href='https://docs.citusdata.com'>Documentation</a>",
                                "target": [
                                    "a[aria-label='Resources, Documentation']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Products' class='footer-list__link' href='/product'>Products</a>",
                                "target": [
                                    "a[aria-label='Resources, Products']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Product Comparison' class='footer-list__link' href='/product/comparison'>Product Comparison</a>",
                                "target": [
                                    "a[aria-label='Resources, Product Comparison']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Use Cases' class='footer-list__link' href='/use-cases'>Use Cases</a>",
                                "target": [
                                    "a[aria-label='Resources, Use Cases']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Customer Stories' class='footer-list__link' href='/customers/'>Customer Stories</a>",
                                "target": [
                                    "a[aria-label='Resources, Customer Stories']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Blog' class='footer-list__link' href='/blog/'>Blog</a>",
                                "target": [
                                    "a[aria-label='Resources, Blog']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-label='About' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='About']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Contact us' class='footer-list__link' href='/about/contact_us'>Contact Us</a>",
                                "target": [
                                    "a[aria-label='About, Contact us']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Our Story' class='footer-list__link' href='/about/our-story/'>Our Story</a>",
                                "target": [
                                    "a[aria-label='About, Our Story']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Events' class='footer-list__link' href='/events'>Events</a>",
                                "target": [
                                    "a[aria-label='About, Events']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Careers' class='footer-list__link' href='/jobs'>Careers</a>",
                                "target": [
                                    "a[aria-label='About, Careers']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Newsroom' class='footer-list__link' href='/newsroom/'>Newsroom</a>",
                                "target": [
                                    "a[aria-label='About, Newsroom']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Pricing' class='footer-list__link' href='/pricing'>Pricing</a>",
                                "target": [
                                    "a[aria-label='About, Pricing']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-label='Support' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Support']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Support' class='footer-list__link' href='/support'>Support</a>",
                                "target": [
                                    "a[aria-label='Support, Support']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud' class='footer-list__link' href='/product/cloud'>Citus Cloud</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud Status' class='footer-list__link' href='https://status.citusdata.com'>Citus Cloud Status</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud Status']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Enterprise' class='footer-list__link' href='/product/enterprise'>Citus Enterprise</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Enterprise']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Security' class='footer-list__link' href='/security'>Security</a>",
                                "target": [
                                    "a[aria-label='Support, Security']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, SLA' class='footer-list__link' href='/sla'>SLA</a>",
                                "target": [
                                    "a[aria-label='Support, SLA']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Terms of Service' class='footer-list__link' href='/tos'>Terms of Service</a>",
                                "target": [
                                    "a[aria-label='Support, Terms of Service']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Privacy Policy' class='footer-list__link' href='/privacy'>Privacy Policy</a>",
                                "target": [
                                    "a[aria-label='Support, Privacy Policy']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-label='Community' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Community']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Download' class='footer-list__link' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Community, Download']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, GitHub repo' class='footer-list__link' href='https://github.com/citusdata/citus' rel='noopener'>GitHub repo</a>",
                                "target": [
                                    "a[aria-label='Community, GitHub repo']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Citus Slack' class='footer-list__link' href='https://slack.citusdata.com'>Citus Slack</a>",
                                "target": [
                                    "a[aria-label='Community, Citus Slack']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Newsletters' class='footer-list__link' href='/join-newsletter'>Newsletters</a>",
                                "target": [
                                    "a[aria-label='Community, Newsletters']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<input id='Email_16372856148870.7842018902471566' name='Email' placeholder='Your Email...' maxlength='255' aria-labelledby='LblEmail__16372856148870.7842018902471566' type='email' class='mktoField mktoEmailField mktoHasWidth mktoRequired' aria-required='true'>",
                                "target": [
                                    "#Email_16372856148870.7842018902471566"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-twitter-desc' href='https://www.twitter.com/citusdata' rel='noopener' target='_blank'> <svg alt='Twitter icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-twitter'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-twitter-desc']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-slack-desc' href='https://slack.citusdata.com/' target='_blank'> <svg alt='Slack icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-slack'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-slack-desc']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-youtube-desc' href='https://www.youtube.com/playlist?list=PLixnExCn6lRq261O0iwo4ClYxHpM9qfVy' rel='noopener' target='_blank'> <svg alt='YouTube icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-youtube'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-youtube-desc']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-rss-desc' href='https://www.citusdata.com/feed.xml' target='_blank'> <svg alt='RSS icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-feed'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-rss-desc']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-linkedin-desc' href='https://www.linkedin.com/company/5356039/' rel='noopener' target='_blank'> <svg alt='LinkedIn icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-linkedin'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-linkedin-desc']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "aria-valid-attr-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute values are valid"
                                    },
                                    {
                                        "id": "aria-errormessage",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "aria-errormessage exists and references elements visible to screen readers that use a supported aria-errormessage technique"
                                    },
                                    {
                                        "id": "aria-level",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-level values are valid"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-github-desc' href='https://github.com/citusdata/citus' rel='noopener' target='_blank'> <svg alt='GitHub icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-github'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-github-desc']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "aria-valid-attr",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures attributes that begin with aria- are valid ARIA attributes",
                        "help": "ARIA attributes must conform to valid names",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-valid-attr?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-label='Close Topbar notification button' id='hideTop' onclick=';'> <i aria-hidden='true' class='icon'> <svg alt='close icon' style='transform: scale(1.4)' width='13'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-times-circle'></use> </svg> </i> </button>",
                                "target": [
                                    "#hideTop"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='link to homepage' class='logo' href='/' name='header-logo-link'>",
                                "target": [
                                    "a[aria-label='link to homepage']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop' class='menu expander-content expander-hidden' id='menu1' role='menu'>",
                                "target": [
                                    "#menu1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu2' aria-expanded='false' class='toggle' id='drop-1'>Product</button>",
                                "target": [
                                    "#drop-1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu4' aria-expanded='false' class='toggle' id='drop-3'>Use Cases</button>",
                                "target": [
                                    "#drop-3"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu5' aria-expanded='false' class='toggle' id='drop-4'>Resources</button>",
                                "target": [
                                    "#drop-4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu3' aria-expanded='false' class='toggle' id='drop-2'>About</button>",
                                "target": [
                                    "#drop-2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Citus GitHub repo' class='nav-link' data-github='citusdata/citus' href='https://github.com/citusdata/citus' rel='noopener' target='_blank'>",
                                "target": [
                                    ".github-stars > a[aria-label='Citus GitHub repo'][data-github='citusdata/citus'][rel='noopener']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='marquee' class='main-carousel dark-bk'>",
                                "target": [
                                    ".main-carousel"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Postgres icon' class='anyscale-postgres' role='img'>",
                                "target": [
                                    ".anyscale-postgres"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-labelledby='multi-tenant' class='tab-content is-open' id='multi-tenant-content' role='tabpanel' style='display: block;'>",
                                "target": [
                                    "#multi-tenant-content"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Click for performance demo video' class='youtube-video-place video-wrapper' data-yt-id='W_3e07nGFxY' data-yt-title='Video: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' data-yt-url='https://www.youtube-nocookie.com/embed/W_3e07nGFxY?enablejsapi=1&amp;rel=0&amp;autoplay=1' role='button' tabindex='0'>",
                                "target": [
                                    ".youtube-video-place"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Learn more about Citus Open Source' class='btn' href='/product/community'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='community']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Download Citus Open Source' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Download Citus Open Source']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Learn more about Hyperscale (Citus)' class='btn' href='/product/hyperscale-citus/'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='hyperscale-citus/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Hyperscale (Citus) available now on Azure' class='external-link' href='https://docs.microsoft.com/azure/postgresql/hyperscale/' target='_blank'>Available Now</a>",
                                "target": [
                                    ".external-link"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-label='Resources' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Resources']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Getting Started' class='footer-list__link' href='/getting-started/'>Getting Started</a>",
                                "target": [
                                    "a[aria-label='Resources, Getting Started']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, FAQ' class='footer-list__link' href='/faq'>FAQ</a>",
                                "target": [
                                    "a[aria-label='Resources, FAQ']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Documentation' class='footer-list__link' href='https://docs.citusdata.com'>Documentation</a>",
                                "target": [
                                    "a[aria-label='Resources, Documentation']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Products' class='footer-list__link' href='/product'>Products</a>",
                                "target": [
                                    "a[aria-label='Resources, Products']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Product Comparison' class='footer-list__link' href='/product/comparison'>Product Comparison</a>",
                                "target": [
                                    "a[aria-label='Resources, Product Comparison']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Use Cases' class='footer-list__link' href='/use-cases'>Use Cases</a>",
                                "target": [
                                    "a[aria-label='Resources, Use Cases']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Customer Stories' class='footer-list__link' href='/customers/'>Customer Stories</a>",
                                "target": [
                                    "a[aria-label='Resources, Customer Stories']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Blog' class='footer-list__link' href='/blog/'>Blog</a>",
                                "target": [
                                    "a[aria-label='Resources, Blog']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-label='About' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='About']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Contact us' class='footer-list__link' href='/about/contact_us'>Contact Us</a>",
                                "target": [
                                    "a[aria-label='About, Contact us']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Our Story' class='footer-list__link' href='/about/our-story/'>Our Story</a>",
                                "target": [
                                    "a[aria-label='About, Our Story']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Events' class='footer-list__link' href='/events'>Events</a>",
                                "target": [
                                    "a[aria-label='About, Events']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Careers' class='footer-list__link' href='/jobs'>Careers</a>",
                                "target": [
                                    "a[aria-label='About, Careers']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Newsroom' class='footer-list__link' href='/newsroom/'>Newsroom</a>",
                                "target": [
                                    "a[aria-label='About, Newsroom']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Pricing' class='footer-list__link' href='/pricing'>Pricing</a>",
                                "target": [
                                    "a[aria-label='About, Pricing']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-label='Support' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Support']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Support' class='footer-list__link' href='/support'>Support</a>",
                                "target": [
                                    "a[aria-label='Support, Support']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud' class='footer-list__link' href='/product/cloud'>Citus Cloud</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud Status' class='footer-list__link' href='https://status.citusdata.com'>Citus Cloud Status</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud Status']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Enterprise' class='footer-list__link' href='/product/enterprise'>Citus Enterprise</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Enterprise']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Security' class='footer-list__link' href='/security'>Security</a>",
                                "target": [
                                    "a[aria-label='Support, Security']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, SLA' class='footer-list__link' href='/sla'>SLA</a>",
                                "target": [
                                    "a[aria-label='Support, SLA']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Terms of Service' class='footer-list__link' href='/tos'>Terms of Service</a>",
                                "target": [
                                    "a[aria-label='Support, Terms of Service']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Privacy Policy' class='footer-list__link' href='/privacy'>Privacy Policy</a>",
                                "target": [
                                    "a[aria-label='Support, Privacy Policy']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-label='Community' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Community']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Download' class='footer-list__link' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Community, Download']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, GitHub repo' class='footer-list__link' href='https://github.com/citusdata/citus' rel='noopener'>GitHub repo</a>",
                                "target": [
                                    "a[aria-label='Community, GitHub repo']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Citus Slack' class='footer-list__link' href='https://slack.citusdata.com'>Citus Slack</a>",
                                "target": [
                                    "a[aria-label='Community, Citus Slack']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Newsletters' class='footer-list__link' href='/join-newsletter'>Newsletters</a>",
                                "target": [
                                    "a[aria-label='Community, Newsletters']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<input id='Email_16372856148870.7842018902471566' name='Email' placeholder='Your Email...' maxlength='255' aria-labelledby='LblEmail__16372856148870.7842018902471566' type='email' class='mktoField mktoEmailField mktoHasWidth mktoRequired' aria-required='true'>",
                                "target": [
                                    "#Email_16372856148870.7842018902471566"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-twitter-desc' href='https://www.twitter.com/citusdata' rel='noopener' target='_blank'> <svg alt='Twitter icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-twitter'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-twitter-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-slack-desc' href='https://slack.citusdata.com/' target='_blank'> <svg alt='Slack icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-slack'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-slack-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-youtube-desc' href='https://www.youtube.com/playlist?list=PLixnExCn6lRq261O0iwo4ClYxHpM9qfVy' rel='noopener' target='_blank'> <svg alt='YouTube icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-youtube'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-youtube-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-rss-desc' href='https://www.citusdata.com/feed.xml' target='_blank'> <svg alt='RSS icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-feed'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-rss-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-linkedin-desc' href='https://www.linkedin.com/company/5356039/' rel='noopener' target='_blank'> <svg alt='LinkedIn icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-linkedin'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-linkedin-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-valid-attr",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "ARIA attribute name is valid"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-github-desc' href='https://github.com/citusdata/citus' rel='noopener' target='_blank'> <svg alt='GitHub icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-github'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-github-desc']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "avoid-inline-spacing",
                        "impact": null,
                        "tags": [
                            "cat.structure",
                            "wcag21aa",
                            "wcag1412"
                        ],
                        "description": "Ensure that text spacing set through style attributes can be adjusted with custom stylesheets",
                        "help": "Inline text spacing must be adjustable with custom stylesheets",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/avoid-inline-spacing?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div id='topbar' style='display: block;'>",
                                "target": [
                                    "#topbar"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<a href='javascript:void(0)' id='skipToMain' role='button' tabindex='0' style='top: 39.5938px;'>Skip navigation</a>",
                                "target": [
                                    "#skipToMain"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div class='benefit-image' style='width: 2.833em'> <img alt='performance icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#performance' width='60'> </div>",
                                "target": [
                                    "#forget-db > .benefit-image"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div class='benefit-image' style='width: 3.889em'> <img alt='Citus elicorn icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#citus-elicorn-green' width='70'> </div>",
                                "target": [
                                    ".benefit:nth-child(5) > .benefit-image"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div class='benefit-image' style='width: 3.889em'> <img alt='managed database service cloud icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#managed-db-service' width='70'> </div>",
                                "target": [
                                    ".benefit:nth-child(6) > .benefit-image"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-labelledby='multi-tenant' class='tab-content is-open' id='multi-tenant-content' role='tabpanel' style='display: block;'>",
                                "target": [
                                    "#multi-tenant-content"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<div class='randomize chosen' style=''>",
                                "target": [
                                    ".chosen"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<svg alt='Pex logo' class='short' style='max-width:4.723em' width='120'> <use xlink:href='assets/images/sprites/client-logos-transparent-76d7a76a.svg#pex'></use> </svg>",
                                "target": [
                                    "svg[alt='Pex logo']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "avoid-inline-spacing",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "No inline styles with '!important' that affect text spacing has been specified"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='Microsoft logo' height='21' loading='lazy' src='assets/images/microsoft-logo-white-56fd3229.svg' style='height:21px' width='98'>",
                                "target": [
                                    "img[alt='Microsoft logo']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "button-name",
                        "impact": null,
                        "tags": [
                            "cat.name-role-value",
                            "wcag2a",
                            "wcag412",
                            "section508",
                            "section508.22.a",
                            "ACT"
                        ],
                        "description": "Ensures buttons have discernible text",
                        "help": "Buttons must have discernible text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/button-name?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-label='Close Topbar notification button' id='hideTop' onclick=';'> <i aria-hidden='true' class='icon'> <svg alt='close icon' style='transform: scale(1.4)' width='13'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-times-circle'></use> </svg> </i> </button>",
                                "target": [
                                    "#hideTop"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "button-has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has inner text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu2' aria-expanded='false' class='toggle' id='drop-1'>Product</button>",
                                "target": [
                                    "#drop-1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "button-has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has inner text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu4' aria-expanded='false' class='toggle' id='drop-3'>Use Cases</button>",
                                "target": [
                                    "#drop-3"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "button-has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has inner text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu5' aria-expanded='false' class='toggle' id='drop-4'>Resources</button>",
                                "target": [
                                    "#drop-4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "button-has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has inner text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu3' aria-expanded='false' class='toggle' id='drop-2'>About</button>",
                                "target": [
                                    "#drop-2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "button-has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has inner text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button type='submit' class='mktoButton' disabled=''>Go</button>",
                                "target": [
                                    ".mktoButton"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "color-contrast",
                        "impact": "serious",
                        "tags": [
                            "cat.color",
                            "wcag2aa",
                            "wcag143"
                        ],
                        "description": "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds",
                        "help": "Elements must have sufficient color contrast",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/color-contrast?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "10.8pt (14.4px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>Citus 10.2 is out! 10.2 brings you new columnar &amp; time series features—and is ready to support Postgres 14. <a href='/blog/2021/09/17/citus-10-2-extension-to-postgres-whats-new/'>Read the new Citus 10.2 blog</a>.</p>",
                                "target": [
                                    ".promo-text > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "10.8pt (14.4px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a href='/blog/2021/09/17/citus-10-2-extension-to-postgres-whats-new/'>Read the new Citus 10.2 blog</a>",
                                "target": [
                                    ".promo-text > p > a"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "10.1pt (13.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu2' aria-expanded='false' class='toggle' id='drop-1'>Product</button>",
                                "target": [
                                    "#drop-1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "10.1pt (13.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu4' aria-expanded='false' class='toggle' id='drop-3'>Use Cases</button>",
                                "target": [
                                    "#drop-3"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "10.1pt (13.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu5' aria-expanded='false' class='toggle' id='drop-4'>Resources</button>",
                                "target": [
                                    "#drop-4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "10.1pt (13.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu3' aria-expanded='false' class='toggle' id='drop-2'>About</button>",
                                "target": [
                                    "#drop-2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "10.1pt (13.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='nav-link' href='/blog/'>Blog</a>",
                                "target": [
                                    ".nav-link[href$='blog/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "10.1pt (13.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='nav-link' href='https://docs.citusdata.com/'>Docs</a>",
                                "target": [
                                    "li[role='menuitem']:nth-child(7) > .nav-link[href$='docs.citusdata.com/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "10.1pt (13.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<strong data-stars='' title='Citus GitHub stargazers'>5,474</strong>",
                                "target": [
                                    ".github-stars > a[aria-label='Citus GitHub repo'][data-github='citusdata/citus'][rel='noopener'] > strong[data-stars=''][title='Citus GitHub stargazers']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#1e873d",
                                            "contrastRatio": 4.57,
                                            "fontSize": "10.1pt (13.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 4.57"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='btn btn-block nav-btn' href='/download/'>Download</a>",
                                "target": [
                                    ".button[role='menuitem']:nth-child(10) > .btn-block.nav-btn[href$='download/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#000000",
                                            "contrastRatio": 21,
                                            "fontSize": "45.5pt (60.6057px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 21"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h1>The Speed You Need, <br>The Database You Love</h1>",
                                "target": [
                                    "h1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#e7e7e7",
                                            "bgColor": "#000000",
                                            "contrastRatio": 16.98,
                                            "fontSize": "16.5pt (22.05px)",
                                            "fontWeight": "normal",
                                            "messageKey": "fgOnShadowColor",
                                            "expectedContrastRatio": "4.5:1",
                                            "shadowColor": "#000000"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 16.98"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p class='lead text-lightergray'> Citus transforms Postgres into a distributed database, to&nbsp;give your application high performance—at any&nbsp;scale. </p>",
                                "target": [
                                    ".text-lightergray.lead"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#1e873d",
                                            "contrastRatio": 4.57,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 4.57"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='btn' href='/getting-started/'>GET STARTED</a>",
                                "target": [
                                    "p > .btn[href$='getting-started/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#000000",
                                            "contrastRatio": 21,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 21"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='btn btn-ghost-white-o' href='/blog/2021/09/17/citus-10-2-extension-to-postgres-whats-new/'>ABOUT CITUS 10.2</a>",
                                "target": [
                                    ".btn-ghost-white-o"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "18.0pt (23.994px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h5>Distributed Scale</h5>",
                                "target": [
                                    ".benefit:nth-child(1) > .benefit-content > h5"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>Scale out Postgres by distributing your data &amp; queries across a cluster. And it’s simple to add nodes &amp; rebalance shards when you need to&nbsp;grow.</p>",
                                "target": [
                                    ".benefit:nth-child(1) > .benefit-content > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "18.0pt (23.994px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h5>Parallelized Performance</h5>",
                                "target": [
                                    "#forget-db > .benefit-content > h5"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>Speed up queries by 20x to 300x (or more) through parallelism, keeping more data in memory, higher I/O bandwidth, and columnar compression.</p>",
                                "target": [
                                    "#forget-db > .benefit-content > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "18.0pt (23.994px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h5>Power of Postgres</h5>",
                                "target": [
                                    ".benefit:nth-child(3) > .benefit-content > h5"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>Citus is an extension (not a fork) to the latest Postgres versions, so you can use your familiar SQL toolset &amp; leverage your Postgres expertise.</p>",
                                "target": [
                                    ".benefit:nth-child(3) > .benefit-content > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "18.0pt (23.994px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h5>Simplified Architecture</h5>",
                                "target": [
                                    ".benefit:nth-child(4) > .benefit-content > h5"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>Reduce your infrastructure headaches by using a single database for both your transactional and analytical workloads.</p>",
                                "target": [
                                    ".benefit:nth-child(4) > .benefit-content > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "18.0pt (23.994px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h5>Open Source</h5>",
                                "target": [
                                    ".benefit:nth-child(5) > .benefit-content > h5"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>Download and use Citus open source for free. You can manage Citus yourself, embrace open source, and help us improve Citus via&nbsp;GitHub.</p>",
                                "target": [
                                    ".benefit:nth-child(5) > .benefit-content > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "18.0pt (23.994px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h5>Managed Database Service</h5>",
                                "target": [
                                    ".benefit:nth-child(6) > .benefit-content > h5"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>Focus on your application and forget about your database. Run Citus in the cloud as a <nobr>built-in</nobr> option on Azure Database for PostgreSQL.</p>",
                                "target": [
                                    ".benefit:nth-child(6) > .benefit-content > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<nobr>built-in</nobr>",
                                "target": [
                                    ".benefit-content > p > nobr"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#000000",
                                            "contrastRatio": 21,
                                            "fontSize": "42.6pt (56.832px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 21"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h2 class='text-white'>Citus = Postgres At Any&nbsp;Scale</h2>",
                                "target": [
                                    ".anyscale-content > h2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#e7e7e7",
                                            "bgColor": "#000000",
                                            "contrastRatio": 16.98,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 16.98"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p class='text-lightergray'>",
                                "target": [
                                    ".anyscale-content > .text-lightergray"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#e7e7e7",
                                            "bgColor": "#000000",
                                            "contrastRatio": 16.98,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 16.98"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<nobr>single-node</nobr>",
                                "target": [
                                    ".text-lightergray > nobr:nth-child(1)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#e7e7e7",
                                            "bgColor": "#000000",
                                            "contrastRatio": 16.98,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 16.98"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<nobr>single-node</nobr>",
                                "target": [
                                    "nobr:nth-child(2)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#1e873d",
                                            "contrastRatio": 4.57,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 4.57"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='btn' href='/product#capabilities'>FEATURES OF CITUS</a>",
                                "target": [
                                    "a[href$='product#capabilities']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "42.6pt (56.832px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h2>Applications That Love&nbsp;Citus</h2>",
                                "target": [
                                    ".homepage-use-cases > .page-content-wrapper > header > h2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>SaaS apps often have a natural dimension on which to distribute data across nodes—dimensions such as tenant, customer, or account_id. Which means SaaS apps have a data model that is a good fit for a distributed database like Citus: just shard by tenant_id.</p>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > p:nth-child(1)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "16.5pt (22.05px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h5 class='lead'>Features for Multi-tenant SaaS applications</h5>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > h5"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li>Transparent sharding in the database layer</li>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > .bulleted-list > li:nth-child(1)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li>SQL query &amp; transaction routing</li>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > .bulleted-list > li:nth-child(2)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li>Easy to add nodes &amp; rebalance shards</li>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > .bulleted-list > li:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li>Able to scale out without giving up Postgres</li>",
                                "target": [
                                    ".bulleted-list > li:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#1e873d",
                                            "contrastRatio": 4.57,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 4.57"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='btn' href='/use-cases/multi-tenant-apps/'>ABOUT MULTI-TENANT APPS</a>",
                                "target": [
                                    ".use-case-content > .usecase-btn > .btn[href$='multi-tenant-apps/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#000000",
                                            "bgColor": "#f1f1f1",
                                            "contrastRatio": 18.59,
                                            "fontSize": "11.0pt (14.625px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 18.59"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span>REAL-TIME ANALYTICS</span>",
                                "target": [
                                    "#analytics > span"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#000000",
                                            "bgColor": "#f1f1f1",
                                            "contrastRatio": 18.59,
                                            "fontSize": "11.0pt (14.625px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 18.59"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span>TIME SERIES</span>",
                                "target": [
                                    "#time-series > span"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#1e873d",
                                            "contrastRatio": 4.57,
                                            "fontSize": "32.0pt (42.6347px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 4.57"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h3 class='text-center text-white'>Ready to get started?</h3>",
                                "target": [
                                    "h3"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#1e873d",
                                            "contrastRatio": 4.57,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 4.57"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='btn btn-ghost-white' href='/getting-started/'>Get Started</a>",
                                "target": [
                                    ".btn-ghost-white"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#1a1b1c",
                                            "contrastRatio": 17.24,
                                            "fontSize": "42.6pt (56.832px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h2 class='text-white'>Why Shard Postgres? Performance</h2>",
                                "target": [
                                    ".title-box > h2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#dddddd",
                                            "bgColor": "#1a1b1c",
                                            "contrastRatio": 12.69,
                                            "fontSize": "16.5pt (22.05px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.69"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p class='lead font-light text-lightgray'>See how Citus gives this application ~20X faster transactions and <nobr>300X –</nobr> 150,000X faster analytics queries.</p>",
                                "target": [
                                    ".font-light"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#dddddd",
                                            "bgColor": "#1a1b1c",
                                            "contrastRatio": 12.69,
                                            "fontSize": "16.5pt (22.05px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.69"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<nobr>300X –</nobr>",
                                "target": [
                                    ".font-light > nobr"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#e7e7e7",
                                            "bgColor": "#1a1b1c",
                                            "contrastRatio": 13.94,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 13.94"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p class='video-desc'>A side-by-side comparison of Citus vs. single-node Postgres, comparing the performance of transactions, analytical queries, and analytical queries with rollups.</p>",
                                "target": [
                                    ".video-desc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "18.7pt (24.975px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p class='lead'>The speed change of Citus is a game changer. With Citus, we can make indexes in minutes that used to take hours.</p>",
                                "target": [
                                    ".chosen > blockquote > .lead"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "15.2pt (20.25px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<cite> <strong>Jesse Willett,</strong> Principal Architect, Copper </cite>",
                                "target": [
                                    ".chosen > blockquote > cite"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#333333",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 12.63,
                                            "fontSize": "15.2pt (20.25px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 12.63"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<strong>Jesse Willett,</strong>",
                                "target": [
                                    ".chosen > blockquote > cite > strong"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1e873d",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 4.57,
                                            "fontSize": "16.9pt (22.5px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 4.57"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<strong class='underline'>Read the full story</strong>",
                                "target": [
                                    "a[href$='copper'] > .underline"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#000000",
                                            "contrastRatio": 21,
                                            "fontSize": "42.6pt (56.832px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 21"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h2 class='text-white'>How to <nobr>Get Citus</nobr></h2>",
                                "target": [
                                    ".page-content-wrapper > h2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#000000",
                                            "contrastRatio": 21,
                                            "fontSize": "42.6pt (56.832px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 21"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<nobr>Get Citus</nobr>",
                                "target": [
                                    "h2 > nobr"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#000000",
                                            "contrastRatio": 21,
                                            "fontSize": "24.0pt (31.984px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 21"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h4 class='text-white'> Citus Open Source </h4>",
                                "target": [
                                    "#citus-community > .card-header > h4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#e7e7e7",
                                            "bgColor": "#000000",
                                            "contrastRatio": 16.98,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 16.98"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>With Citus, you extend Postgres with superpowers like distributed tables, distributed SQL query engine, columnar, &amp; more.</p>",
                                "target": [
                                    "#citus-community > .card-copy > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#000000",
                                            "contrastRatio": 21,
                                            "fontSize": "24.0pt (31.984px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 21"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<h4 class='text-white'> Citus on Azure </h4>",
                                "target": [
                                    "#citus-on-azure > .card-header > h4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#e7e7e7",
                                            "bgColor": "#000000",
                                            "contrastRatio": 16.98,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 16.98"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<p>You can also spin up a Citus cluster in the cloud on Azure, with Hyperscale&nbsp;(Citus) in Azure Database for PostgreSQL.</p>",
                                "target": [
                                    "#citus-on-azure > .card-copy > p"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#1e873d",
                                            "contrastRatio": 4.57,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 4.57"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a class='btn' href='/download/'>DOWNLOAD</a>",
                                "target": [
                                    ".cta:nth-child(1) > .btn[href$='download/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>Resources</li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Getting Started' class='footer-list__link' href='/getting-started/'>Getting Started</a>",
                                "target": [
                                    "a[aria-label='Resources, Getting Started']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, FAQ' class='footer-list__link' href='/faq'>FAQ</a>",
                                "target": [
                                    "a[aria-label='Resources, FAQ']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Documentation' class='footer-list__link' href='https://docs.citusdata.com'>Documentation</a>",
                                "target": [
                                    "a[aria-label='Resources, Documentation']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Products' class='footer-list__link' href='/product'>Products</a>",
                                "target": [
                                    "a[aria-label='Resources, Products']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Product Comparison' class='footer-list__link' href='/product/comparison'>Product Comparison</a>",
                                "target": [
                                    "a[aria-label='Resources, Product Comparison']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Use Cases' class='footer-list__link' href='/use-cases'>Use Cases</a>",
                                "target": [
                                    "a[aria-label='Resources, Use Cases']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Customer Stories' class='footer-list__link' href='/customers/'>Customer Stories</a>",
                                "target": [
                                    "a[aria-label='Resources, Customer Stories']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Resources, Blog' class='footer-list__link' href='/blog/'>Blog</a>",
                                "target": [
                                    "a[aria-label='Resources, Blog']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>About</li>",
                                "target": [
                                    "ul[aria-label='About'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Contact us' class='footer-list__link' href='/about/contact_us'>Contact Us</a>",
                                "target": [
                                    "a[aria-label='About, Contact us']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Our Story' class='footer-list__link' href='/about/our-story/'>Our Story</a>",
                                "target": [
                                    "a[aria-label='About, Our Story']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Events' class='footer-list__link' href='/events'>Events</a>",
                                "target": [
                                    "a[aria-label='About, Events']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Careers' class='footer-list__link' href='/jobs'>Careers</a>",
                                "target": [
                                    "a[aria-label='About, Careers']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Newsroom' class='footer-list__link' href='/newsroom/'>Newsroom</a>",
                                "target": [
                                    "a[aria-label='About, Newsroom']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='About, Pricing' class='footer-list__link' href='/pricing'>Pricing</a>",
                                "target": [
                                    "a[aria-label='About, Pricing']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>Support</li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Support' class='footer-list__link' href='/support'>Support</a>",
                                "target": [
                                    "a[aria-label='Support, Support']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud' class='footer-list__link' href='/product/cloud'>Citus Cloud</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud Status' class='footer-list__link' href='https://status.citusdata.com'>Citus Cloud Status</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud Status']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Enterprise' class='footer-list__link' href='/product/enterprise'>Citus Enterprise</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Enterprise']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Security' class='footer-list__link' href='/security'>Security</a>",
                                "target": [
                                    "a[aria-label='Support, Security']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, SLA' class='footer-list__link' href='/sla'>SLA</a>",
                                "target": [
                                    "a[aria-label='Support, SLA']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Terms of Service' class='footer-list__link' href='/tos'>Terms of Service</a>",
                                "target": [
                                    "a[aria-label='Support, Terms of Service']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Support, Privacy Policy' class='footer-list__link' href='/privacy'>Privacy Policy</a>",
                                "target": [
                                    "a[aria-label='Support, Privacy Policy']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>Community</li>",
                                "target": [
                                    "ul[aria-label='Community'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Download' class='footer-list__link' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Community, Download']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, GitHub repo' class='footer-list__link' href='https://github.com/citusdata/citus' rel='noopener'>GitHub repo</a>",
                                "target": [
                                    "a[aria-label='Community, GitHub repo']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Citus Slack' class='footer-list__link' href='https://slack.citusdata.com'>Citus Slack</a>",
                                "target": [
                                    "a[aria-label='Community, Citus Slack']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16.002px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-label='Community, Newsletters' class='footer-list__link' href='/join-newsletter'>Newsletters</a>",
                                "target": [
                                    "a[aria-label='Community, Newsletters']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li aria-hidden='true' class='footer-list__heading' role='presentation'>Subscribe to our newsletter</li>",
                                "target": [
                                    ".footer-list[role='presentation'] > .footer-list__heading[role='presentation'][aria-hidden='true']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "bgColor": "#ffffff",
                                            "contrastRatio": 17.24,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 17.24"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<input id='Email_16372856148870.7842018902471566' name='Email' placeholder='Your Email...' maxlength='255' aria-labelledby='LblEmail__16372856148870.7842018902471566' type='email' class='mktoField mktoEmailField mktoHasWidth mktoRequired' aria-required='true'>",
                                "target": [
                                    "#Email_16372856148870.7842018902471566"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "10.8pt (14.4px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div class='mktoHtmlText mktoHasWidth'>I have read the <a href='https://www.citusdata.com/privacy' target='_blank' class='underline'>Privacy Policy</a>.</div>",
                                "target": [
                                    ".mktoHtmlText"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a href='https://slack.citusdata.com/' target='_blank'>Join our Slack!</a>",
                                "target": [
                                    ".footer-list__careers > a[href$='slack.citusdata.com/'][target='_blank']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "12.0pt (16px)",
                                            "fontWeight": "bold",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<strong>Citus Data is now part of</strong>",
                                "target": [
                                    ".logo-group > strong"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#ffffff",
                                            "bgColor": "#09436a",
                                            "contrastRatio": 10.38,
                                            "fontSize": "10.5pt (14.004px)",
                                            "fontWeight": "normal",
                                            "messageKey": null,
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has sufficient color contrast of 10.38"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span> ©2021 Citus Data, a Microsoft Company. All rights reserved. </span>",
                                "target": [
                                    ".footer-copyright > span"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "document-title",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag242",
                            "ACT"
                        ],
                        "description": "Ensures each HTML document contains a non-empty <title> element",
                        "help": "Documents must have <title> element to aid in navigation",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/document-title?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "doc-has-title",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Document has a non-empty <title> element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<html class='  webp webp-alpha webp-animation webp-lossless' lang='en' xml:lang='en'>",
                                "target": [
                                    "html"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "duplicate-id-active",
                        "impact": null,
                        "tags": [
                            "cat.parsing",
                            "wcag2a",
                            "wcag411"
                        ],
                        "description": "Ensures every id attribute value of active elements is unique",
                        "help": "IDs of active elements must be unique",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/duplicate-id-active?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-active",
                                        "data": "hideTop",
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Document has no active elements that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-label='Close Topbar notification button' id='hideTop' onclick=';'> <i aria-hidden='true' class='icon'> <svg alt='close icon' style='transform: scale(1.4)' width='13'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-times-circle'></use> </svg> </i> </button>",
                                "target": [
                                    "#hideTop"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-active",
                                        "data": "skipToMain",
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Document has no active elements that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a href='javascript:void(0)' id='skipToMain' role='button' tabindex='0' style='top: 39.5938px;'>Skip navigation</a>",
                                "target": [
                                    "#skipToMain"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-active",
                                        "data": "InstructEmail_16372856148870.7842018902471566",
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Document has no active elements that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span id='InstructEmail_16372856148870.7842018902471566' tabindex='-1' class='mktoInstruction'></span>",
                                "target": [
                                    "#InstructEmail_16372856148870.7842018902471566"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "duplicate-id-aria",
                        "impact": null,
                        "tags": [
                            "cat.parsing",
                            "wcag2a",
                            "wcag411"
                        ],
                        "description": "Ensures every id attribute value used in ARIA and in labels is unique",
                        "help": "IDs used in ARIA and labels must be unique",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/duplicate-id-aria?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "drop",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu1' aria-expanded='false' aria-label='mobile menu toggle' class='toggle expander-trigger' id='drop'> <span id='nav-icon'> <span></span> <span></span> <span></span> <span></span> </span> </button>",
                                "target": [
                                    "#drop"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "menu1",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop' class='menu expander-content expander-hidden' id='menu1' role='menu'>",
                                "target": [
                                    "#menu1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "drop-1",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu2' aria-expanded='false' class='toggle' id='drop-1'>Product</button>",
                                "target": [
                                    "#drop-1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "menu2",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop-1' id='menu2' role='menu' style='display: none;'>",
                                "target": [
                                    "#menu2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "drop-3",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu4' aria-expanded='false' class='toggle' id='drop-3'>Use Cases</button>",
                                "target": [
                                    "#drop-3"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "menu4",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop-3' id='menu4' role='menu' style='display: none;'>",
                                "target": [
                                    "#menu4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "drop-4",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu5' aria-expanded='false' class='toggle' id='drop-4'>Resources</button>",
                                "target": [
                                    "#drop-4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "menu5",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop-4' id='menu5' role='menu' style='display: none;'>",
                                "target": [
                                    "#menu5"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "drop-2",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu3' aria-expanded='false' class='toggle' id='drop-2'>About</button>",
                                "target": [
                                    "#drop-2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "menu3",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<ul aria-labelledby='drop-2' id='menu3' role='menu' style='display: none;'>",
                                "target": [
                                    "#menu3"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "multi-tenant",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "multi-tenant-content",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-labelledby='multi-tenant' class='tab-content is-open' id='multi-tenant-content' role='tabpanel' style='display: block;'>",
                                "target": [
                                    "#multi-tenant-content"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "analytics",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "analytics-content",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-labelledby='analytics' class='tab-content' id='analytics-content' role='tabpanel'>",
                                "target": [
                                    "#analytics-content"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "time-series",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "time-series-content",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-labelledby='time-series' class='tab-content' id='time-series-content' role='tabpanel'>",
                                "target": [
                                    "#time-series-content"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "LblEmail__16372856148870.7842018902471566",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<label for='Email_16372856148870.7842018902471566' id='LblEmail__16372856148870.7842018902471566' class='mktoLabel mktoHasWidth'>",
                                "target": [
                                    "#LblEmail__16372856148870.7842018902471566"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "Email_16372856148870.7842018902471566",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<input id='Email_16372856148870.7842018902471566' name='Email' placeholder='Your Email...' maxlength='255' aria-labelledby='LblEmail__16372856148870.7842018902471566' type='email' class='mktoField mktoEmailField mktoHasWidth mktoRequired' aria-required='true'>",
                                "target": [
                                    "#Email_16372856148870.7842018902471566"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "footer-twitter-desc",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span class='noselect bottom-left' id='footer-twitter-desc' role='tooltip'>Twitter</span>",
                                "target": [
                                    "#footer-twitter-desc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "footer-slack-desc",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span class='noselect' id='footer-slack-desc' role='tooltip'>Slack</span>",
                                "target": [
                                    "#footer-slack-desc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "footer-youtube-desc",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span class='noselect' id='footer-youtube-desc' role='tooltip'>YouTube</span>",
                                "target": [
                                    "#footer-youtube-desc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "footer-rss-desc",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span class='noselect' id='footer-rss-desc' role='tooltip'>RSS feed</span>",
                                "target": [
                                    "#footer-rss-desc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "footer-linkedin-desc",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span class='noselect' id='footer-linkedin-desc' role='tooltip'>LinkedIn</span>",
                                "target": [
                                    "#footer-linkedin-desc"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "duplicate-id-aria",
                                        "data": "footer-github-desc",
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Document has no elements referenced with ARIA or labels that share the same id attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<span class='noselect bottom-right' id='footer-github-desc' role='tooltip'>GitHub</span>",
                                "target": [
                                    "#footer-github-desc"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "html-has-lang",
                        "impact": null,
                        "tags": [
                            "cat.language",
                            "wcag2a",
                            "wcag311",
                            "ACT"
                        ],
                        "description": "Ensures every HTML document has a lang attribute",
                        "help": "<html> element must have a lang attribute",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/html-has-lang?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "has-lang",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "The <html> element has a lang attribute"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<html class='  webp webp-alpha webp-animation webp-lossless' lang='en' xml:lang='en'>",
                                "target": [
                                    "html"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "html-lang-valid",
                        "impact": null,
                        "tags": [
                            "cat.language",
                            "wcag2a",
                            "wcag311",
                            "ACT"
                        ],
                        "description": "Ensures the lang attribute of the <html> element has a valid value",
                        "help": "<html> element must have a valid value for the lang attribute",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/html-lang-valid?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "valid-lang",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Value of lang attribute is included in the list of valid languages"
                                    }
                                ],
                                "impact": null,
                                "html": "<html class='  webp webp-alpha webp-animation webp-lossless' lang='en' xml:lang='en'>",
                                "target": [
                                    "html"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "html-xml-lang-mismatch",
                        "impact": null,
                        "tags": [
                            "cat.language",
                            "wcag2a",
                            "wcag311",
                            "ACT"
                        ],
                        "description": "Ensure that HTML elements with both valid lang and xml:lang attributes agree on the base language of the page",
                        "help": "HTML elements with lang and xml:lang must have the same base language",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/html-xml-lang-mismatch?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [],
                                "all": [
                                    {
                                        "id": "xml-lang-mismatch",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "moderate",
                                        "message": "Lang and xml:lang attributes have the same base language"
                                    }
                                ],
                                "none": [],
                                "impact": null,
                                "html": "<html class='  webp webp-alpha webp-animation webp-lossless' lang='en' xml:lang='en'>",
                                "target": [
                                    "html"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "image-alt",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag111",
                            "section508",
                            "section508.22.a",
                            "ACT"
                        ],
                        "description": "Ensures <img> elements have alternate text or a role of none or presentation",
                        "help": "Images must have alternate text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/image-alt?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='Citus elicorn in flying osprey' class='citus10-2-osprey' height='550' src='assets/images/citus10-2-osprey-774px-0a237d34.svg' width='774'>",
                                "target": [
                                    ".citus10-2-osprey"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='distributed scale icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#distributed-scale' width='60'>",
                                "target": [
                                    "img[alt='distributed scale icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='performance icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#performance' width='60'>",
                                "target": [
                                    "img[alt='performance icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='Postgres elephant outline icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#postgres-outline' width='60'>",
                                "target": [
                                    "img[alt='Postgres elephant outline icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='simplified architecture icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#simplified-architecture' width='60'>",
                                "target": [
                                    "img[alt='simplified architecture icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='Citus elicorn icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#citus-elicorn-green' width='70'>",
                                "target": [
                                    "img[alt='Citus elicorn icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='managed database service cloud icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#managed-db-service' width='70'>",
                                "target": [
                                    ".benefit:nth-child(6) > .benefit-image > img[width='37 0'][loading='lazy']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='elicorn' height='468' loading='lazy' src='assets/images/elicorn-celeb-grid-green3-1x-c04352af.png' srcset='assets/images/elicorn-celeb-grid-green3-1x-c04352af.png 1x, assets/images/elicorn-celeb-grid-green3-d7c38484.png 2x' width='645'>",
                                "target": [
                                    "img[alt='elicorn']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='diagram of SaaS app connected to multiple users' height='254' loading='lazy' src='assets/images/diagrams/multitenant-saas.svg' width='500'>",
                                "target": [
                                    "img[height='32 54']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='YouTube video still: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' class='play-youtube-video' height='450' loading='lazy' src='assets/images/srcset/sigmod-video-still2-1x-c8e159c0.jpg' srcset='assets/images/srcset/sigmod-video-still2-1x-c8e159c0.jpg 1x, assets/images/srcset/sigmod-video-still2-08bdf3ac.jpg 2x' width='800'>",
                                "target": [
                                    ".play-youtube-video"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='Jesse Willett pic' height='137' loading='lazy' src='assets/images/customers/jesse-willett-fdf2ecf5.jpg' width='137'>",
                                "target": [
                                    "img[alt='Jesse Willett pic']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-alt",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has an alt attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "alt-space-value",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Element has a valid alt attribute value"
                                    }
                                ],
                                "impact": null,
                                "html": "<img alt='Microsoft logo' height='21' loading='lazy' src='assets/images/microsoft-logo-white-56fd3229.svg' style='height:21px' width='98'>",
                                "target": [
                                    "img[alt='Microsoft logo']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "label",
                        "impact": null,
                        "tags": [
                            "cat.forms",
                            "wcag2a",
                            "wcag412",
                            "wcag131",
                            "section508",
                            "section508.22.n",
                            "ACT"
                        ],
                        "description": "Ensures every form element has a label",
                        "help": "Form elements must have labels",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/label?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "explicit-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Form element has an explicit <label>"
                                    },
                                    {
                                        "id": "aria-labelledby",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-labelledby attribute exists and references elements that are visible to screen readers"
                                    },
                                    {
                                        "id": "non-empty-placeholder",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element has a placeholder attribute"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "hidden-explicit-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "critical",
                                        "message": "Form element has a visible explicit <label>"
                                    }
                                ],
                                "impact": null,
                                "html": "<input id='Email_16372856148870.7842018902471566' name='Email' placeholder='Your Email...' maxlength='255' aria-labelledby='LblEmail__16372856148870.7842018902471566' type='email' class='mktoField mktoEmailField mktoHasWidth mktoRequired' aria-required='true'>",
                                "target": [
                                    "#Email_16372856148870.7842018902471566"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "link-name",
                        "impact": null,
                        "tags": [
                            "cat.name-role-value",
                            "wcag2a",
                            "wcag412",
                            "wcag244",
                            "section508",
                            "section508.22.a",
                            "ACT"
                        ],
                        "description": "Ensures links have discernible text",
                        "help": "Links must have discernible text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/link-name?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a href='/blog/2021/09/17/citus-10-2-extension-to-postgres-whats-new/'>Read the new Citus 10.2 blog</a>",
                                "target": [
                                    ".promo-text > p > a"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a href='javascript:void(0)' id='skipToMain' role='button' tabindex='0' style='top: 39.5938px;'>Skip navigation</a>",
                                "target": [
                                    "#skipToMain"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='link to homepage' class='logo' href='/' name='header-logo-link'>",
                                "target": [
                                    "a[aria-label='link to homepage']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='nav-link' href='/blog/'>Blog</a>",
                                "target": [
                                    ".nav-link[href$='blog/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='nav-link' href='https://docs.citusdata.com/'>Docs</a>",
                                "target": [
                                    "li[role='menuitem']:nth-child(7) > .nav-link[href$='docs.citusdata.com/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Citus GitHub repo' class='nav-link' data-github='citusdata/citus' href='https://github.com/citusdata/citus' rel='noopener' target='_blank'>",
                                "target": [
                                    ".github-stars > a[aria-label='Citus GitHub repo'][data-github='citusdata/citus'][rel='noopener']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='btn btn-block nav-btn' href='/download/'>Download</a>",
                                "target": [
                                    ".button[role='menuitem']:nth-child(10) > .btn-block.nav-btn[href$='download/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='btn' href='/getting-started/'>GET STARTED</a>",
                                "target": [
                                    "p > .btn[href$='getting-started/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='btn btn-ghost-white-o' href='/blog/2021/09/17/citus-10-2-extension-to-postgres-whats-new/'>ABOUT CITUS 10.2</a>",
                                "target": [
                                    ".btn-ghost-white-o"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='btn' href='/product#capabilities'>FEATURES OF CITUS</a>",
                                "target": [
                                    "a[href$='product#capabilities']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='btn' href='/use-cases/multi-tenant-apps/'>ABOUT MULTI-TENANT APPS</a>",
                                "target": [
                                    ".use-case-content > .usecase-btn > .btn[href$='multi-tenant-apps/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='btn btn-ghost-white' href='/getting-started/'>Get Started</a>",
                                "target": [
                                    ".btn-ghost-white"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a href='/customers/copper'><strong class='underline'>Read the full story</strong>&nbsp;&nbsp;<i aria-hidden='true' class='icon'><svg alt='arrow circle right icon'><use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-arrow-circle-right'></use></svg></i></a>",
                                "target": [
                                    "a[href$='copper']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Learn more about Citus Open Source' class='btn' href='/product/community'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='community']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Download Citus Open Source' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Download Citus Open Source']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Learn more about Hyperscale (Citus)' class='btn' href='/product/hyperscale-citus/'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='hyperscale-citus/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Hyperscale (Citus) available now on Azure' class='external-link' href='https://docs.microsoft.com/azure/postgresql/hyperscale/' target='_blank'>Available Now</a>",
                                "target": [
                                    ".external-link"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='btn' href='/download/'>DOWNLOAD</a>",
                                "target": [
                                    ".cta:nth-child(1) > .btn[href$='download/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a class='btn btn-ghost' href='/getting-started/'>GET STARTED</a>",
                                "target": [
                                    ".btn-ghost.btn[href$='getting-started/']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Getting Started' class='footer-list__link' href='/getting-started/'>Getting Started</a>",
                                "target": [
                                    "a[aria-label='Resources, Getting Started']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, FAQ' class='footer-list__link' href='/faq'>FAQ</a>",
                                "target": [
                                    "a[aria-label='Resources, FAQ']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Documentation' class='footer-list__link' href='https://docs.citusdata.com'>Documentation</a>",
                                "target": [
                                    "a[aria-label='Resources, Documentation']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Products' class='footer-list__link' href='/product'>Products</a>",
                                "target": [
                                    "a[aria-label='Resources, Products']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Product Comparison' class='footer-list__link' href='/product/comparison'>Product Comparison</a>",
                                "target": [
                                    "a[aria-label='Resources, Product Comparison']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Use Cases' class='footer-list__link' href='/use-cases'>Use Cases</a>",
                                "target": [
                                    "a[aria-label='Resources, Use Cases']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Customer Stories' class='footer-list__link' href='/customers/'>Customer Stories</a>",
                                "target": [
                                    "a[aria-label='Resources, Customer Stories']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Resources, Blog' class='footer-list__link' href='/blog/'>Blog</a>",
                                "target": [
                                    "a[aria-label='Resources, Blog']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Contact us' class='footer-list__link' href='/about/contact_us'>Contact Us</a>",
                                "target": [
                                    "a[aria-label='About, Contact us']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Our Story' class='footer-list__link' href='/about/our-story/'>Our Story</a>",
                                "target": [
                                    "a[aria-label='About, Our Story']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Events' class='footer-list__link' href='/events'>Events</a>",
                                "target": [
                                    "a[aria-label='About, Events']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Careers' class='footer-list__link' href='/jobs'>Careers</a>",
                                "target": [
                                    "a[aria-label='About, Careers']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Newsroom' class='footer-list__link' href='/newsroom/'>Newsroom</a>",
                                "target": [
                                    "a[aria-label='About, Newsroom']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='About, Pricing' class='footer-list__link' href='/pricing'>Pricing</a>",
                                "target": [
                                    "a[aria-label='About, Pricing']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Support' class='footer-list__link' href='/support'>Support</a>",
                                "target": [
                                    "a[aria-label='Support, Support']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud' class='footer-list__link' href='/product/cloud'>Citus Cloud</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Cloud Status' class='footer-list__link' href='https://status.citusdata.com'>Citus Cloud Status</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Cloud Status']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Citus Enterprise' class='footer-list__link' href='/product/enterprise'>Citus Enterprise</a>",
                                "target": [
                                    "a[aria-label='Support, Citus Enterprise']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Security' class='footer-list__link' href='/security'>Security</a>",
                                "target": [
                                    "a[aria-label='Support, Security']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, SLA' class='footer-list__link' href='/sla'>SLA</a>",
                                "target": [
                                    "a[aria-label='Support, SLA']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Terms of Service' class='footer-list__link' href='/tos'>Terms of Service</a>",
                                "target": [
                                    "a[aria-label='Support, Terms of Service']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Support, Privacy Policy' class='footer-list__link' href='/privacy'>Privacy Policy</a>",
                                "target": [
                                    "a[aria-label='Support, Privacy Policy']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Community, Download' class='footer-list__link' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Community, Download']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Community, GitHub repo' class='footer-list__link' href='https://github.com/citusdata/citus' rel='noopener'>GitHub repo</a>",
                                "target": [
                                    "a[aria-label='Community, GitHub repo']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Community, Citus Slack' class='footer-list__link' href='https://slack.citusdata.com'>Citus Slack</a>",
                                "target": [
                                    "a[aria-label='Community, Citus Slack']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    },
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-label='Community, Newsletters' class='footer-list__link' href='/join-newsletter'>Newsletters</a>",
                                "target": [
                                    "a[aria-label='Community, Newsletters']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a href='https://www.citusdata.com/privacy' target='_blank' class='underline'>Privacy Policy</a>",
                                "target": [
                                    ".underline[target='_blank']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "has-visible-text",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "minor",
                                        "message": "Element has text that is visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a href='https://slack.citusdata.com/' target='_blank'>Join our Slack!</a>",
                                "target": [
                                    ".footer-list__careers > a[href$='slack.citusdata.com/'][target='_blank']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-labelledby",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-labelledby attribute exists and references elements that are visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-twitter-desc' href='https://www.twitter.com/citusdata' rel='noopener' target='_blank'> <svg alt='Twitter icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-twitter'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-twitter-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-labelledby",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-labelledby attribute exists and references elements that are visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-slack-desc' href='https://slack.citusdata.com/' target='_blank'> <svg alt='Slack icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-slack'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-slack-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-labelledby",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-labelledby attribute exists and references elements that are visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-youtube-desc' href='https://www.youtube.com/playlist?list=PLixnExCn6lRq261O0iwo4ClYxHpM9qfVy' rel='noopener' target='_blank'> <svg alt='YouTube icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-youtube'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-youtube-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-labelledby",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-labelledby attribute exists and references elements that are visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-rss-desc' href='https://www.citusdata.com/feed.xml' target='_blank'> <svg alt='RSS icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-feed'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-rss-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-labelledby",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-labelledby attribute exists and references elements that are visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-linkedin-desc' href='https://www.linkedin.com/company/5356039/' rel='noopener' target='_blank'> <svg alt='LinkedIn icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-linkedin'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-linkedin-desc']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "aria-labelledby",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-labelledby attribute exists and references elements that are visible to screen readers"
                                    }
                                ],
                                "all": [],
                                "none": [
                                    {
                                        "id": "focusable-no-name",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element is not in tab order or has accessible text"
                                    }
                                ],
                                "impact": null,
                                "html": "<a aria-labelledby='footer-github-desc' href='https://github.com/citusdata/citus' rel='noopener' target='_blank'> <svg alt='GitHub icon'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-github'></use> </svg> </a>",
                                "target": [
                                    "a[aria-labelledby='footer-github-desc']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "list",
                        "impact": null,
                        "tags": [
                            "cat.structure",
                            "wcag2a",
                            "wcag131"
                        ],
                        "description": "Ensures that lists are structured correctly",
                        "help": "<ul> and <ol> must only directly contain <li>, <script> or <template> elements",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/list?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "only-listitems",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List element only has direct children that are allowed inside <li> elements"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul class='bulleted-list'> <li>Transparent sharding in the database layer</li> <li>SQL query &amp; transaction routing</li> <li>Easy to add nodes &amp; rebalance shards</li> <li>Able to scale out without giving up Postgres</li> </ul>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > .bulleted-list"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "only-listitems",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List element only has direct children that are allowed inside <li> elements"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-label='Resources' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Resources']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "only-listitems",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List element only has direct children that are allowed inside <li> elements"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-label='About' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='About']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "only-listitems",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List element only has direct children that are allowed inside <li> elements"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-label='Support' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Support']"
                                ]
                            },
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "only-listitems",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List element only has direct children that are allowed inside <li> elements"
                                    }
                                ],
                                "impact": null,
                                "html": "<ul aria-label='Community' class='footer-list'>",
                                "target": [
                                    "ul[aria-label='Community']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "listitem",
                        "impact": null,
                        "tags": [
                            "cat.structure",
                            "wcag2a",
                            "wcag131"
                        ],
                        "description": "Ensures <li> elements are used semantically",
                        "help": "<li> elements must be contained in a <ul> or <ol>",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/listitem?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li>Transparent sharding in the database layer</li>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > .bulleted-list > li:nth-child(1)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li>SQL query &amp; transaction routing</li>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > .bulleted-list > li:nth-child(2)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li>Easy to add nodes &amp; rebalance shards</li>",
                                "target": [
                                    "#multi-tenant-content > .content-wrapper > .use-case-content > .bulleted-list > li:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li>Able to scale out without giving up Postgres</li>",
                                "target": [
                                    ".bulleted-list > li:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Resources, Getting Started' class='footer-list__link' href='/getting-started/'>Getting Started</a> </li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__item:nth-child(2)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Resources, FAQ' class='footer-list__link' href='/faq'>FAQ</a> </li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__item:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Resources, Documentation' class='footer-list__link' href='https://docs.citusdata.com'>Documentation</a> </li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__item:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Resources, Products' class='footer-list__link' href='/product'>Products</a> </li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__item:nth-child(5)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Resources, Product Comparison' class='footer-list__link' href='/product/comparison'>Product Comparison</a> </li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__item:nth-child(6)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Resources, Use Cases' class='footer-list__link' href='/use-cases'>Use Cases</a> </li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__item:nth-child(7)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Resources, Customer Stories' class='footer-list__link' href='/customers/'>Customer Stories</a> </li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__item:nth-child(8)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Resources, Blog' class='footer-list__link' href='/blog/'>Blog</a> </li>",
                                "target": [
                                    "ul[aria-label='Resources'] > .footer-list__item:nth-child(9)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='About, Contact us' class='footer-list__link' href='/about/contact_us'>Contact Us</a> </li>",
                                "target": [
                                    "ul[aria-label='About'] > .footer-list__item:nth-child(2)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='About, Our Story' class='footer-list__link' href='/about/our-story/'>Our Story</a> </li>",
                                "target": [
                                    "ul[aria-label='About'] > .footer-list__item:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='About, Events' class='footer-list__link' href='/events'>Events</a> </li>",
                                "target": [
                                    "ul[aria-label='About'] > .footer-list__item:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='About, Careers' class='footer-list__link' href='/jobs'>Careers</a> </li>",
                                "target": [
                                    "ul[aria-label='About'] > .footer-list__item:nth-child(5)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='About, Newsroom' class='footer-list__link' href='/newsroom/'>Newsroom</a> </li>",
                                "target": [
                                    "ul[aria-label='About'] > .footer-list__item:nth-child(6)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='About, Pricing' class='footer-list__link' href='/pricing'>Pricing</a> </li>",
                                "target": [
                                    "ul[aria-label='About'] > .footer-list__item:nth-child(7)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Support, Support' class='footer-list__link' href='/support'>Support</a> </li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__item:nth-child(2)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Support, Citus Cloud' class='footer-list__link' href='/product/cloud'>Citus Cloud</a> </li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__item:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Support, Citus Cloud Status' class='footer-list__link' href='https://status.citusdata.com'>Citus Cloud Status</a> </li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__item:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Support, Citus Enterprise' class='footer-list__link' href='/product/enterprise'>Citus Enterprise</a> </li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__item:nth-child(5)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Support, Security' class='footer-list__link' href='/security'>Security</a> </li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__item:nth-child(6)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Support, SLA' class='footer-list__link' href='/sla'>SLA</a> </li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__item:nth-child(7)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Support, Terms of Service' class='footer-list__link' href='/tos'>Terms of Service</a> </li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__item:nth-child(8)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Support, Privacy Policy' class='footer-list__link' href='/privacy'>Privacy Policy</a> </li>",
                                "target": [
                                    "ul[aria-label='Support'] > .footer-list__item:nth-child(9)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Community, Download' class='footer-list__link' href='/download/'>Download</a> </li>",
                                "target": [
                                    "ul[aria-label='Community'] > .footer-list__item:nth-child(2)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Community, GitHub repo' class='footer-list__link' href='https://github.com/citusdata/citus' rel='noopener'>GitHub repo</a> </li>",
                                "target": [
                                    "ul[aria-label='Community'] > .footer-list__item:nth-child(3)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Community, Citus Slack' class='footer-list__link' href='https://slack.citusdata.com'>Citus Slack</a> </li>",
                                "target": [
                                    "ul[aria-label='Community'] > .footer-list__item:nth-child(4)"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "listitem",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "List item has a <ul>, <ol> or role='list' parent element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<li class='footer-list__item'> <a aria-label='Community, Newsletters' class='footer-list__link' href='/join-newsletter'>Newsletters</a> </li>",
                                "target": [
                                    "ul[aria-label='Community'] > .footer-list__item:nth-child(5)"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "nested-interactive",
                        "impact": null,
                        "tags": [
                            "cat.keyboard",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Nested interactive controls are not announced by screen readers",
                        "help": "Ensure interactive controls are not nested",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/nested-interactive?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-label='Close Topbar notification button' id='hideTop' onclick=';'> <i aria-hidden='true' class='icon'> <svg alt='close icon' style='transform: scale(1.4)' width='13'> <use xlink:href='assets/images/sprites/font-icons-main-dc58d8ca.svg#icon-times-circle'></use> </svg> </i> </button>",
                                "target": [
                                    "#hideTop"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a href='javascript:void(0)' id='skipToMain' role='button' tabindex='0' style='top: 39.5938px;'>Skip navigation</a>",
                                "target": [
                                    "#skipToMain"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu2' aria-expanded='false' class='toggle' id='drop-1'>Product</button>",
                                "target": [
                                    "#drop-1"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu4' aria-expanded='false' class='toggle' id='drop-3'>Use Cases</button>",
                                "target": [
                                    "#drop-3"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu5' aria-expanded='false' class='toggle' id='drop-4'>Resources</button>",
                                "target": [
                                    "#drop-4"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button aria-controls='menu3' aria-expanded='false' class='toggle' id='drop-2'>About</button>",
                                "target": [
                                    "#drop-2"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='Citus elicorn in flying osprey' class='citus10-2-osprey' height='550' src='assets/images/citus10-2-osprey-774px-0a237d34.svg' width='774'>",
                                "target": [
                                    ".citus10-2-osprey"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='distributed scale icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#distributed-scale' width='60'>",
                                "target": [
                                    "img[alt='distributed scale icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='performance icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#performance' width='60'>",
                                "target": [
                                    "img[alt='performance icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='Postgres elephant outline icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#postgres-outline' width='60'>",
                                "target": [
                                    "img[alt='Postgres elephant outline icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='simplified architecture icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#simplified-architecture' width='60'>",
                                "target": [
                                    "img[alt='simplified architecture icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='Citus elicorn icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#citus-elicorn-green' width='70'>",
                                "target": [
                                    "img[alt='Citus elicorn icon']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='managed database service cloud icon' loading='lazy' src='assets/images/sprites/feature-icons-0194d156.svg#managed-db-service' width='70'>",
                                "target": [
                                    ".benefit:nth-child(6) > .benefit-image > img[width='37 0'][loading='lazy']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='elicorn' height='468' loading='lazy' src='assets/images/elicorn-celeb-grid-green3-1x-c04352af.png' srcset='assets/images/elicorn-celeb-grid-green3-1x-c04352af.png 1x, assets/images/elicorn-celeb-grid-green3-d7c38484.png 2x' width='645'>",
                                "target": [
                                    "img[alt='elicorn']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Postgres icon' class='anyscale-postgres' role='img'>",
                                "target": [
                                    ".anyscale-postgres"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                "target": [
                                    "#multi-tenant"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='diagram of SaaS app connected to multiple users' height='254' loading='lazy' src='assets/images/diagrams/multitenant-saas.svg' width='500'>",
                                "target": [
                                    "img[height='32 54']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='analytics-content' class='tab-link' href='javascript:void(0)' id='analytics' role='tab'> <span>REAL-TIME ANALYTICS</span> </a>",
                                "target": [
                                    "#analytics"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<a aria-controls='time-series-content' class='tab-link' href='javascript:void(0)' id='time-series' role='tab'> <span>TIME SERIES</span> </a>",
                                "target": [
                                    "#time-series"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Click for performance demo video' class='youtube-video-place video-wrapper' data-yt-id='W_3e07nGFxY' data-yt-title='Video: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' data-yt-url='https://www.youtube-nocookie.com/embed/W_3e07nGFxY?enablejsapi=1&amp;rel=0&amp;autoplay=1' role='button' tabindex='0'>",
                                "target": [
                                    ".youtube-video-place"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='YouTube video still: High performance PostgreSQL with Postgres &amp; Hyperscale (Citus)' class='play-youtube-video' height='450' loading='lazy' src='assets/images/srcset/sigmod-video-still2-1x-c8e159c0.jpg' srcset='assets/images/srcset/sigmod-video-still2-1x-c8e159c0.jpg 1x, assets/images/srcset/sigmod-video-still2-08bdf3ac.jpg 2x' width='800'>",
                                "target": [
                                    ".play-youtube-video"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='Jesse Willett pic' height='137' loading='lazy' src='assets/images/customers/jesse-willett-fdf2ecf5.jpg' width='137'>",
                                "target": [
                                    "img[alt='Jesse Willett pic']"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<button type='submit' class='mktoButton' disabled=''>Go</button>",
                                "target": [
                                    ".mktoButton"
                                ]
                            },
                            {
                                "any": [
                                    {
                                        "id": "no-focusable-content",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "Element does not have focusable descendants"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<img alt='Microsoft logo' height='21' loading='lazy' src='assets/images/microsoft-logo-white-56fd3229.svg' style='height:21px' width='98'>",
                                "target": [
                                    "img[alt='Microsoft logo']"
                                ]
                            }
                        ]
                    },
                    {
                        "id": "role-img-alt",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag111",
                            "section508",
                            "section508.22.a",
                            "ACT"
                        ],
                        "description": "Ensures [role='img'] elements have alternate text",
                        "help": "[role='img'] elements have an alternative text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/role-img-alt?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "aria-label",
                                        "data": null,
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "aria-label attribute exists and is not empty"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": null,
                                "html": "<div aria-label='Postgres icon' class='anyscale-postgres' role='img'>",
                                "target": [
                                    ".anyscale-postgres"
                                ]
                            }
                        ]
                    }
                ],
                "incomplete": [
                    {
                        "id": "aria-allowed-attr",
                        "impact": "serious",
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures ARIA attributes are allowed for an element's role",
                        "help": "Elements must only use allowed ARIA attributes",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-allowed-attr?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [],
                                "all": [],
                                "none": [
                                    {
                                        "id": "aria-prohibited-attr",
                                        "data": [
                                            "aria-label"
                                        ],
                                        "relatedNodes": [],
                                        "impact": "serious",
                                        "message": "ARIA attribute is not well supported on the element and the text content will be used instead: aria-label"
                                    }
                                ],
                                "impact": "serious",
                                "html": "<div aria-label='marquee' class='main-carousel dark-bk'>",
                                "target": [
                                    ".main-carousel"
                                ],
                                "failureSummary": "Fix all of the following:|n  ARIA attribute is not well supported on the element and the text content will be used instead: aria-label"
                            }
                        ]
                    },
                    {
                        "id": "color-contrast",
                        "impact": "serious",
                        "tags": [
                            "cat.color",
                            "wcag2aa",
                            "wcag143"
                        ],
                        "description": "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds",
                        "help": "Elements must have sufficient color contrast",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/color-contrast?application=axe-puppeteer",
                        "nodes": [
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "messageKey": "pseudoContent"
                                        },
                                        "relatedNodes": [
                                            {
                                                "html": "<a aria-controls='multi-tenant-content' class='tab-link is-active' href='javascript:void(0)' id='multi-tenant' role='tab' aria-selected='true'> <span>MULTI-TENANT SAAS</span> </a>",
                                                "target": [
                                                    "#multi-tenant"
                                                ]
                                            }
                                        ],
                                        "impact": "serious",
                                        "message": "Element's background color could not be determined due to a pseudo element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": "serious",
                                "html": "<span>MULTI-TENANT SAAS</span>",
                                "target": [
                                    "#multi-tenant > span"
                                ],
                                "failureSummary": "Fix any of the following:|n  Element's background color could not be determined due to a pseudo element"
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "messageKey": "pseudoContent"
                                        },
                                        "relatedNodes": [
                                            {
                                                "html": "<div class='card' id='citus-community'>",
                                                "target": [
                                                    "#citus-community"
                                                ]
                                            }
                                        ],
                                        "impact": "serious",
                                        "message": "Element's background color could not be determined due to a pseudo element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": "serious",
                                "html": "<a aria-label='Learn more about Citus Open Source' class='btn' href='/product/community'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='community']"
                                ],
                                "failureSummary": "Fix any of the following:|n  Element's background color could not be determined due to a pseudo element"
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "messageKey": "pseudoContent"
                                        },
                                        "relatedNodes": [
                                            {
                                                "html": "<div class='card' id='citus-community'>",
                                                "target": [
                                                    "#citus-community"
                                                ]
                                            }
                                        ],
                                        "impact": "serious",
                                        "message": "Element's background color could not be determined due to a pseudo element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": "serious",
                                "html": "<a aria-label='Download Citus Open Source' href='/download/'>Download</a>",
                                "target": [
                                    "a[aria-label='Download Citus Open Source']"
                                ],
                                "failureSummary": "Fix any of the following:|n  Element's background color could not be determined due to a pseudo element"
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "messageKey": "pseudoContent"
                                        },
                                        "relatedNodes": [
                                            {
                                                "html": "<div class='card' id='citus-on-azure'>",
                                                "target": [
                                                    "#citus-on-azure"
                                                ]
                                            }
                                        ],
                                        "impact": "serious",
                                        "message": "Element's background color could not be determined due to a pseudo element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": "serious",
                                "html": "<a aria-label='Learn more about Hyperscale (Citus)' class='btn' href='/product/hyperscale-citus/'>LEARN MORE</a>",
                                "target": [
                                    ".btn[href$='hyperscale-citus/']"
                                ],
                                "failureSummary": "Fix any of the following:|n  Element's background color could not be determined due to a pseudo element"
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "messageKey": "pseudoContent"
                                        },
                                        "relatedNodes": [
                                            {
                                                "html": "<div class='card' id='citus-on-azure'>",
                                                "target": [
                                                    "#citus-on-azure"
                                                ]
                                            }
                                        ],
                                        "impact": "serious",
                                        "message": "Element's background color could not be determined due to a pseudo element"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": "serious",
                                "html": "<a aria-label='Hyperscale (Citus) available now on Azure' class='external-link' href='https://docs.microsoft.com/azure/postgresql/hyperscale/' target='_blank'>Available Now</a>",
                                "target": [
                                    ".external-link"
                                ],
                                "failureSummary": "Fix any of the following:|n  Element's background color could not be determined due to a pseudo element"
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1a1b1c",
                                            "contrastRatio": 0,
                                            "fontSize": "42.6pt (56.832px)",
                                            "fontWeight": "normal",
                                            "messageKey": "bgImage",
                                            "expectedContrastRatio": "3:1"
                                        },
                                        "relatedNodes": [
                                            {
                                                "html": "<section class='homepage-contact new pg-section'>",
                                                "target": [
                                                    ".homepage-contact"
                                                ]
                                            }
                                        ],
                                        "impact": "serious",
                                        "message": "Element's background color could not be determined due to a background image"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": "serious",
                                "html": "<h2 class='section-heading'>Ready To Get Started With Citus?</h2>",
                                "target": [
                                    ".section-heading"
                                ],
                                "failureSummary": "Fix any of the following:|n  Element's background color could not be determined due to a background image"
                            },
                            {
                                "any": [
                                    {
                                        "id": "color-contrast",
                                        "data": {
                                            "fgColor": "#1e873d",
                                            "contrastRatio": 0,
                                            "fontSize": "13.5pt (18px)",
                                            "fontWeight": "bold",
                                            "messageKey": "bgImage",
                                            "expectedContrastRatio": "4.5:1"
                                        },
                                        "relatedNodes": [
                                            {
                                                "html": "<section class='homepage-contact new pg-section'>",
                                                "target": [
                                                    ".homepage-contact"
                                                ]
                                            }
                                        ],
                                        "impact": "serious",
                                        "message": "Element's background color could not be determined due to a background image"
                                    }
                                ],
                                "all": [],
                                "none": [],
                                "impact": "serious",
                                "html": "<a class='btn btn-ghost' href='/getting-started/'>GET STARTED</a>",
                                "target": [
                                    ".btn-ghost.btn[href$='getting-started/']"
                                ],
                                "failureSummary": "Fix any of the following:|n  Element's background color could not be determined due to a background image"
                            }
                        ]
                    }
                ],
                "inapplicable": [
                    {
                        "id": "area-alt",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag111",
                            "wcag244",
                            "wcag412",
                            "section508",
                            "section508.22.a",
                            "ACT"
                        ],
                        "description": "Ensures <area> elements of image maps have alternate text",
                        "help": "Active <area> elements must have alternate text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/area-alt?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "aria-input-field-name",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412",
                            "ACT"
                        ],
                        "description": "Ensures every ARIA input field has an accessible name",
                        "help": "ARIA input fields must have an accessible name",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-input-field-name?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "aria-meter-name",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag111"
                        ],
                        "description": "Ensures every ARIA meter node has an accessible name",
                        "help": "ARIA meter nodes must have an accessible name",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-meter-name?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "aria-progressbar-name",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag111"
                        ],
                        "description": "Ensures every ARIA progressbar node has an accessible name",
                        "help": "ARIA progressbar nodes must have an accessible name",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-progressbar-name?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "aria-roledescription",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensure aria-roledescription is only used on elements with an implicit or explicit role",
                        "help": "Use aria-roledescription on elements with a semantic role",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-roledescription?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "aria-toggle-field-name",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412",
                            "ACT"
                        ],
                        "description": "Ensures every ARIA toggle field has an accessible name",
                        "help": "ARIA toggle fields have an accessible name",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-toggle-field-name?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "aria-tooltip-name",
                        "impact": null,
                        "tags": [
                            "cat.aria",
                            "wcag2a",
                            "wcag412"
                        ],
                        "description": "Ensures every ARIA tooltip node has an accessible name",
                        "help": "ARIA tooltip nodes must have an accessible name",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/aria-tooltip-name?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "autocomplete-valid",
                        "impact": null,
                        "tags": [
                            "cat.forms",
                            "wcag21aa",
                            "wcag135"
                        ],
                        "description": "Ensure the autocomplete attribute is correct and suitable for the form field",
                        "help": "autocomplete attribute must be used correctly",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/autocomplete-valid?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "blink",
                        "impact": null,
                        "tags": [
                            "cat.time-and-media",
                            "wcag2a",
                            "wcag222",
                            "section508",
                            "section508.22.j"
                        ],
                        "description": "Ensures <blink> elements are not used",
                        "help": "<blink> elements are deprecated and must not be used",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/blink?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "definition-list",
                        "impact": null,
                        "tags": [
                            "cat.structure",
                            "wcag2a",
                            "wcag131"
                        ],
                        "description": "Ensures <dl> elements are structured correctly",
                        "help": "<dl> elements must only directly contain properly-ordered <dt> and <dd> groups, <script>, <template> or <div> elements",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/definition-list?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "dlitem",
                        "impact": null,
                        "tags": [
                            "cat.structure",
                            "wcag2a",
                            "wcag131"
                        ],
                        "description": "Ensures <dt> and <dd> elements are contained by a <dl>",
                        "help": "<dt> and <dd> elements must be contained by a <dl>",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/dlitem?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "empty-table-header",
                        "impact": null,
                        "tags": [
                            "wcag131",
                            "cat.aria"
                        ],
                        "description": "Ensures table headers have discernible text",
                        "help": "Table header text must not be empty",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/empty-table-header?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "frame-focusable-content",
                        "impact": null,
                        "tags": [
                            "cat.keyboard",
                            "wcag2a",
                            "wcag211"
                        ],
                        "description": "Ensures <frame> and <iframe> elements with focusable content do not have tabindex=-1",
                        "help": "Frames with focusable content must not have tabindex=-1",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/frame-focusable-content?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "frame-title",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag241",
                            "wcag412",
                            "section508",
                            "section508.22.i"
                        ],
                        "description": "Ensures <iframe> and <frame> elements have an accessible name",
                        "help": "Frames must have an accessible name",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/frame-title?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "input-button-name",
                        "impact": null,
                        "tags": [
                            "cat.name-role-value",
                            "wcag2a",
                            "wcag412",
                            "section508",
                            "section508.22.a"
                        ],
                        "description": "Ensures input buttons have discernible text",
                        "help": "Input buttons must have discernible text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/input-button-name?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "input-image-alt",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag111",
                            "section508",
                            "section508.22.a",
                            "ACT"
                        ],
                        "description": "Ensures <input type='image'> elements have alternate text",
                        "help": "Image buttons must have alternate text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/input-image-alt?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "marquee",
                        "impact": null,
                        "tags": [
                            "cat.parsing",
                            "wcag2a",
                            "wcag222"
                        ],
                        "description": "Ensures <marquee> elements are not used",
                        "help": "<marquee> elements are deprecated and must not be used",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/marquee?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "meta-refresh",
                        "impact": null,
                        "tags": [
                            "cat.time-and-media",
                            "wcag2a",
                            "wcag2aaa",
                            "wcag221",
                            "wcag224",
                            "wcag325"
                        ],
                        "description": "Ensures <meta http-equiv='refresh'> is not used",
                        "help": "Timed refresh must not exist",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/meta-refresh?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "object-alt",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag111",
                            "section508",
                            "section508.22.a"
                        ],
                        "description": "Ensures <object> elements have alternate text",
                        "help": "<object> elements must have alternate text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/object-alt?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "select-name",
                        "impact": null,
                        "tags": [
                            "cat.forms",
                            "wcag2a",
                            "wcag412",
                            "wcag131",
                            "section508",
                            "section508.22.n",
                            "ACT"
                        ],
                        "description": "Ensures select element has an accessible name",
                        "help": "Select element must have an accessible name",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/select-name?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "server-side-image-map",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag211",
                            "section508",
                            "section508.22.f"
                        ],
                        "description": "Ensures that server-side image maps are not used",
                        "help": "Server-side image maps must not be used",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/server-side-image-map?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "svg-img-alt",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag111",
                            "section508",
                            "section508.22.a",
                            "ACT"
                        ],
                        "description": "Ensures svg elements with an img, graphics-document or graphics-symbol role have an accessible text",
                        "help": "svg elements with an img role have an alternative text",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/svg-img-alt?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "td-headers-attr",
                        "impact": null,
                        "tags": [
                            "cat.tables",
                            "wcag2a",
                            "wcag131",
                            "section508",
                            "section508.22.g"
                        ],
                        "description": "Ensure that each cell in a table using the headers refers to another cell in that table",
                        "help": "All cells in a table element that use the headers attribute must only refer to other cells of that same table",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/td-headers-attr?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "th-has-data-cells",
                        "impact": null,
                        "tags": [
                            "cat.tables",
                            "wcag2a",
                            "wcag131",
                            "section508",
                            "section508.22.g"
                        ],
                        "description": "Ensure that each table header in a data table refers to data cells",
                        "help": "All th elements and elements with role=columnheader/rowheader must have data cells they describe",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/th-has-data-cells?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "valid-lang",
                        "impact": null,
                        "tags": [
                            "cat.language",
                            "wcag2aa",
                            "wcag312"
                        ],
                        "description": "Ensures lang attributes have valid values",
                        "help": "lang attribute must have a valid value",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/valid-lang?application=axe-puppeteer",
                        "nodes": []
                    },
                    {
                        "id": "video-caption",
                        "impact": null,
                        "tags": [
                            "cat.text-alternatives",
                            "wcag2a",
                            "wcag122",
                            "section508",
                            "section508.22.a"
                        ],
                        "description": "Ensures <video> elements have captions",
                        "help": "<video> elements must have captions",
                        "helpUrl": "https://dequeuniversity.com/rules/axe/4.3/video-caption?application=axe-puppeteer",
                        "nodes": []
                    }
                ]
            },
            "pageTitle": "Citus Data | Distributed Postgres. At any scale.",
            "browserSpec": "HeadlessChrome/88.0.4298.0",
            "pageResponseCode": 200,
            "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4298.0 Safari/537.36",
            "browserResolution": "1920x1080"
        }`;
    }
}

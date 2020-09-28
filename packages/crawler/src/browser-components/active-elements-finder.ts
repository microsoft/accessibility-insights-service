// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import { injectable } from 'inversify';
import { Page } from 'puppeteer';
import * as utilities from '../utility/crypto';

export interface ActiveElement {
    html: string;
    selector: string;
    hash: string;
}

interface ElementData {
    html: string;
    selector: string;
}

@injectable()
export class ActiveElementsFinder {
    public async getActiveElements(page: Page, selectors: string[]): Promise<ActiveElement[]> {
        const selector = selectors.join(',');

        await this.importLibToPage(page);
        const elements = await this.getPageActiveElements(page, selector);

        return elements.map((e) => {
            return { ...e, hash: utilities.generateHash(e.html, e.selector) };
        });
    }

    private async getPageActiveElements(page: Page, selector: string): Promise<ElementData[]> {
        return page.evaluate((elementSelector) => {
            const activeElements: ElementData[] = [];
            function visible(element: HTMLElement): boolean {
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
            }

            function getElementSelector(element: HTMLElement): string {
                try {
                    // @ts-ignore
                    return finder.getCssSelector(element);
                } catch {
                    return undefined;
                }
            }

            function findElements(document: Document): void {
                document.querySelectorAll(elementSelector).forEach((element: HTMLElement) => {
                    if (visible(element) === true) {
                        const uniqueSelector = getElementSelector(element);
                        if (uniqueSelector !== undefined) {
                            const end = element.outerHTML.search(/>/);
                            const html = element.outerHTML.substr(0, end + 1);
                            activeElements.push({
                                html,
                                selector: uniqueSelector,
                            });
                        }
                    }
                });

                document.querySelectorAll('iframe,frame').forEach((frame: HTMLFrameElement) => {
                    if (frame.contentWindow !== undefined) {
                        let frameDocument: Document;

                        // Skipping cross-origin frame
                        try {
                            frameDocument = frame.contentWindow.document;
                            // eslint-disable-next-line no-empty,@typescript-eslint/no-empty-function
                        } catch {}

                        if (frameDocument !== undefined) {
                            findElements(frame.contentWindow.document);
                        }
                    }
                });
            }

            findElements(window.document);

            return activeElements;
        }, selector);
    }

    private async importLibToPage(page: Page): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        const rootDir = path.dirname(require.main.filename || process.mainModule.filename);
        await page.addScriptTag({ path: path.resolve(rootDir, 'browser-imports.js') });
    }
}

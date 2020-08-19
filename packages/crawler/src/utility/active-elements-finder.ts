// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as path from 'path';
import { Page } from 'puppeteer';
import * as utilities from './utilities';

// tslint:disable: no-unsafe-any

export interface ActiveElement {
    html: string;
    selector: string;
    hash: string;
}

interface ElementData {
    html: string;
    selector: string;
}

export class ActiveElementsFinder {
    public async getActiveElements(page: Page, selectors: string[]): Promise<ActiveElement[]> {
        const selector = selectors.join(',');
        const elements = await this.getPageActiveElements(page, selector);

        return elements.map((e) => {
            return { ...e, hash: utilities.generateHash(e.html, e.selector) };
        });
    }

    private async getPageActiveElements(page: Page, selector: string): Promise<ElementData[]> {
        await this.importLibToPage(page);

        return page.evaluate((elementSelector) => {
            const activeElements: ElementData[] = [];
            function visible(element: HTMLElement): boolean {
                // tslint:disable-next-line: strict-boolean-expressions
                return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
            }

            function findElements(document: Document): void {
                document.querySelectorAll(elementSelector).forEach((element: HTMLElement) => {
                    if (visible(element) === true) {
                        const end = element.outerHTML.search(/>/);
                        const html = element.outerHTML.substr(0, end + 1);
                        // @ts-ignore
                        const uniqueSelector = finder(element);
                        activeElements.push({
                            html,
                            selector: uniqueSelector,
                        });
                    }
                });

                document.querySelectorAll('iframe,frame').forEach((frame: HTMLFrameElement) => {
                    if (frame.contentDocument !== undefined) {
                        findElements(frame.contentDocument);
                    }
                });
            }

            findElements(window.document);

            return activeElements;
        }, selector);
    }

    private async importLibToPage(page: Page): Promise<void> {
        // tslint:disable-next-line: strict-boolean-expressions
        const rootDir = path.dirname(require.main.filename || process.mainModule.filename);
        await page.addScriptTag({ path: path.resolve(rootDir, 'browser-imports.js') });
    }
}

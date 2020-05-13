// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Page } from 'puppeteer';
import * as utilities from '../utilities';

export interface ActiveElement {
    html: string;
    hash: string;
}

export class ActiveElementFinder {
    public async getActiveElements(page: Page, selectors: string[]): Promise<ActiveElement[]> {
        const selector = selectors.join(',');
        const elements = await this.getPageActiveElements(page, selector);

        return elements.map((e) => {
            return { html: e, hash: utilities.generateHash(e) };
        });
    }

    private async getPageActiveElements(page: Page, selector: string): Promise<string[]> {
        return page.evaluate((elementSelector) => {
            const activeElements: string[] = [];
            function visible(element: HTMLElement): boolean {
                // tslint:disable-next-line: strict-boolean-expressions
                return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
            }

            function findElements(document: Document): void {
                document.querySelectorAll(elementSelector).forEach((element: HTMLElement) => {
                    if (visible(element) === true) {
                        const end: number = element.outerHTML.search(/>/);
                        activeElements.push(element.outerHTML.substr(0, end + 1));
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
}

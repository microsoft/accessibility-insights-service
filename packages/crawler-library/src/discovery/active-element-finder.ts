// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ElementHandle, Frame, Page } from 'puppeteer';
import * as utilities from '../utilities';

// tslint:disable: no-unsafe-any

export interface ActiveElement {
    handle: ElementHandle;
    html: string;
    hash: string;
}

export class ActiveElementFinder {
    public async getActiveElements(page: Page, selectors: string[]): Promise<ActiveElement[]> {
        const selector = selectors.join(',');
        const elements: ActiveElement[] = [];
        await this.getElements(page.mainFrame(), selector, elements);

        return elements;
    }

    private async getElements(frame: Frame, selector: string, elements: ActiveElement[]): Promise<void> {
        await Promise.all(frame.childFrames().map(async (childFrame) => this.getElements(childFrame, selector, elements)));
        const frameElements = await frame.$$(selector);
        const activeElement = await this.getActiveElement(frame, frameElements);
        elements.push(...activeElement);
    }

    private async getActiveElement(frame: Frame, elements: ElementHandle[]): Promise<ActiveElement[]> {
        const visibleElements = elements.filter(async (e) => this.isVisible(frame, e));

        const activeElement: ActiveElement[] = [];
        await Promise.all(
            visibleElements.map(async (element) => {
                const html = await this.getElementHtml(frame, element);
                activeElement.push({
                    handle: element,
                    html,
                    hash: utilities.generateBase64Hash(html),
                });
            }),
        );

        return activeElement;
    }

    private async getElementHtml(frame: Frame, element: ElementHandle): Promise<string> {
        return frame.evaluate((e) => {
            const end: number = e.outerHTML.search(/>/);

            return e.outerHTML.substr(0, end + 1);
        }, element);
    }

    private async isVisible(frame: Frame, element: ElementHandle): Promise<boolean> {
        return frame.evaluate((e) => {
            return !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        }, element);
    }
}

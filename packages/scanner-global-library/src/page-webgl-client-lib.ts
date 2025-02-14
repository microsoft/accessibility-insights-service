// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as Puppeteer from 'puppeteer';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function injectWebglOptimizations(page: Puppeteer.Page): Promise<void> {
    // Inject WebGL optimizations before page loads
    await page.evaluateOnNewDocument(() => {
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type: string, attributes?: any): any {
            if (type && type.includes('webgl')) {
                const modifiedAttributes = {
                    ...attributes,
                    powerPreference: 'low-power',
                    antialias: false,
                    depth: false,
                    stencil: false,
                    preserveDrawingBuffer: false,
                };

                return originalGetContext.call(this, type, modifiedAttributes);
            } else {
                return originalGetContext.call(this, type, attributes);
            }
        };

        // Reduce Canvas Resolution to Lower Rendering Load
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('canvas').forEach((canvas) => {
                canvas.width = Math.floor(canvas.width * 0.75); // Reduce by 25%
                canvas.height = Math.floor(canvas.height * 0.75);
                console.log('[Injected] Canvas Resolution Reduced:', canvas.width, canvas.height);
            });
        });

        // Throttle WebGL Animation Frame Rate
        const originalRAF = window.requestAnimationFrame;
        window.requestAnimationFrame = function (callback): number {
            return window.setTimeout(() => originalRAF(callback), 16 * 2); // Lock to ~30 FPS
        };

        // Reduce CPU Load by Skipping Redundant Draw Calls
        const originalDrawArrays = WebGLRenderingContext.prototype.drawArrays;
        WebGLRenderingContext.prototype.drawArrays = function (mode: number, first: number, count: number): void {
            if (performance.now() % 2 === 0) {
                return;
            } // Skip ~50% frames

            return originalDrawArrays.apply(this, [mode, first, count]);
        };
    });
}

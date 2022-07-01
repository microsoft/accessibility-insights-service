// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PuppeteerExtraPlugin } from 'puppeteer-extra-plugin';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface StealthPluginType extends PuppeteerExtraPlugin {
    /**
     * Get all available evasions.
     *
     * Please look into the [evasions directory](./evasions/) for an up to date list.
     *
     * @type {Set<string>} - A Set of all available evasions.
     *
     * @example
     * const pluginStealth = require('puppeteer-extra-plugin-stealth')()
     * console.log(pluginStealth.availableEvasions) // => Set { 'user-agent', 'console.debug' }
     * puppeteer.use(pluginStealth)
     */
    availableEvasions: Set<string>;

    /**
     * Get all enabled evasions.
     *
     * Enabled evasions can be configured either through `opts` or by modifying this property.
     *
     * @type {Set<string>} - A Set of all enabled evasions.
     *
     * @example
     * // Remove specific evasion from enabled ones dynamically
     * const pluginStealth = require('puppeteer-extra-plugin-stealth')()
     * pluginStealth.enabledEvasions.delete('console.debug')
     * puppeteer.use(pluginStealth)
     */
    enabledEvasions: Set<string>;
}

<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# Webpack support

-   Add the [copy-webpack-plugin](https://www.npmjs.com/package/copy-webpack-plugin) webpack plugin:

```js
const copyWebpackPlugin = require('copy-webpack-plugin');

new copyWebpackPlugin({
    patterns: [
        {
            context: '../../packages/parallel-workers/dist',
            from: '**/*.js',
            to: '',
        },
    ],
}),
```

-   Add the [webpack-ignore-dynamic-require](https://www.npmjs.com/package/webpack-ignore-dynamic-require) webpack plugin:

```js
const ignoreDynamicRequire = require('webpack-ignore-dynamic-require');

new ignoreDynamicRequire();
```

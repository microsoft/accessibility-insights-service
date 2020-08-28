<!--
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.
-->

# ai-scan

AI-Scan is a Command Line Interface (CLI) tool that implements automated web accessibility checks in a local environment. The tool currently provides the following capabilities:

-   Run automated checks against one URL.
-   Run automated checks against a file that has list of URLs separated by new line.
-   Run automated checks against one URL, crawl that URL and run automated checks against the crawled URLs.

## Installation

This package is available on [npm](http://npmjs.com) as `ai-scan`.

```sh
  npm install -g accessibility-insights-scan
```

## Example usage

if crawling is not enabled (disabled by default), you should provide either --url or --inputFile option, if you provide both, -url only will be used.

```sh
  ai-scan --url https://www.microsoft.com/
```

```sh
  ai-scan --inputFile 'input file path'
```

if crawling is not enabled, you should provide either --url or --inputFile option, if you provide both, -url only will be used.

```sh
  ai-scan --crawl true --url https://www.microsoft.com/
```

## Usage

As a prelude, see the help:

```sh
  Usage: ai-scan --crawl <crawl> --url <url> --simulate <simulate> [--selectors <selector1 ...>] --output <output> --maxUrls <maxUrls> --restart <restart> --snapshot <snapshot> --memoryMBytes <memoryMBytes> --silentMode <silentMode> [--existingUrls <url1 ...>] [--discoveryPatterns <pattern1 ...>]
```

## Options

### crawl: --crawl

```sh
type: boolean
describe: Crawl web site under the provided URL.
default: false
```

### url: --url

```sh
type: boolean
describe: The URL to scan (and crawl if --crawl option is selected) for accessibility issues.
```

### simulate: --simulate

```sh
type: boolean
describe: Simulate user click on elements that match to the specified selectors.
default: false
```

### selectors: ---selectors

```sh
type: array
describe: List of CSS selectors to match against, separated by space. Default selector is 'button'.
default: ['button']
```

### output: --output

```sh
type: string
describe: Output directory. Defaults to the value of APIFY_LOCAL_STORAGE_DIR, if set, or ./crawler_storage, if not.
```

### maxUrls: --maxUrls

```sh
type: number
describe: Maximum number of pages that the crawler will open. The crawl will stop when this limit is reached.
Default is 100.
Note that in cases of parallel crawling, the actual number of pages visited might be slightly higher than this value.
default: 100,
```

### restart: --restart

```sh
type: boolean
describe: Clear the pending crawl queue and start crawl from the provided URL when set to true, otherwise resume the crawl from the last request in the queue.
default: false
```

### snapshot: --snapshot

```sh
type: boolean
describe: Save snapshot of the crawled page. Enabled by default if simulation option is selected, otherwise false.
```

### memoryMBytes: --memoryMBytes

```sh
type: number
describe: The maximum number of megabytes to be used by the crawler.
```

### silentMode: --silentMode

```sh
type: boolean
describe: Open browser window while crawling when set to true.
default: true
```

### inputFile: --inputFile

```sh
type: string
describe: List of URLs to crawl in addition to URLs discovered from crawling the provided URL.
```

### existingUrls: --existingUrls

```sh
type: array
describe: List of URLs to crawl in addition to URLs discovered from crawling the provided URL, separated by space.
```

### discoveryPatterns: --discoveryPatterns

```sh
type: array
describe: List of RegEx patterns to crawl in addition to the provided URL, separated by space.
```

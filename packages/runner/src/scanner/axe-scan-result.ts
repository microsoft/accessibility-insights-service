import { AxeResults } from 'axe-core';

export interface AxeScanResult {
    results?: AxeResults;
    error?: string;
}

export interface ScanRequest {
    id: string;
    count: number;
    websites: WebSite[];
}
export interface WebSite {
    id: string;
    name: string;
    baseUrl: string;
    scanUrl: string;
    serviceTreeId: string;
}

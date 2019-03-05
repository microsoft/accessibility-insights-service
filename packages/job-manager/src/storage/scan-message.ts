export class ScanMessage {
    public id: string;
    public name: string;
    public baseUrl: string;
    public scanUrl: string;
    public serviceTreeId: string;

    constructor(messageText?: string) {
        if (messageText) {
            const scanMessage = JSON.parse(messageText);
            this.id = scanMessage.id;
            this.name = scanMessage.name;
            this.baseUrl = scanMessage.baseUrl;
            this.scanUrl = scanMessage.scanUrl;
            this.serviceTreeId = scanMessage.serviceTreeId;
        }
    }
}

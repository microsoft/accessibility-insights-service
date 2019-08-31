import { StorageDocument } from '.';
import { ItemType } from './item-type';

export interface UnProcessedPageScanRequest extends StorageDocument {
    url: string;
    priority: number;
    itemType: ItemType.UnProcessedPageScanRequests;
}

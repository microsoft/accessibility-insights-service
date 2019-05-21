import { isNil } from 'lodash';

export namespace StringUtils {
    export function isNullOrEmptyString(str: string): boolean {
        return isNil(str) || str.length === 0;
    }
}

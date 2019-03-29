import { defineGlobalVariables } from '../test-utilities/common-mock-methods';
import { WebDriver } from './web-driver';
describe('WebDriver', () => {
    let testSubject: WebDriver;

    beforeEach(() => {
        defineGlobalVariables();
        testSubject = new WebDriver();
    });

    it('should create instance', () => {
        expect(testSubject).not.toBeNull();
    });

    it('should launch puppteer browser', async () => {
        const newBrowser = await testSubject.launch();
        expect(newBrowser).not.toBeNull();
        // tslint:disable-next-line: no-floating-promises
        testSubject.close(newBrowser);
    });
});

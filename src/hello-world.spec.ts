import { message } from './hello-world';

describe('Hello world', () => {
    it('should expose message', () => {
        expect(message).toBe('hello world');
    });
});

import { message } from './hello-world';

describe('Hello world', () => {
    it('should expose message', async () => {
        expect(message).toBe('hello world');
    });
});

// tslint:disable: no-any no-unsafe-any no-require-imports
declare global {
    function cout(message?: any, ...optionalParams: any[]): void;
    function coutd(message?: any, ...optionalParams: any[]): void;
    function cause(value: any): Error | { info: { [key: string]: any } };
    const isDebug: boolean;
}

const node = global as any;

node.isDebug = /--debug|--inspect/.test(process.execArgv.join(' '));

node.cause = (error: any): Error | { info: { [key: string]: any } } => (error instanceof Error ? error : { info: { error: error } });

node.cout = (message?: any, ...optionalParams: any[]): void => {
    process.stdout.write(`[${new Date().toJSON()}] `);

    let out: any;
    if (typeof message === 'string') {
        out = message;
    } else {
        const util = require('util');
        out = util.inspect(message, { depth: undefined });
    }

    if (optionalParams.length > 0) {
        console.log(out, optionalParams);
    } else {
        console.log(out);
    }
};

node.coutd = node.runnerContext = (message?: any, ...optionalParams: any[]): void => {
    if (node.isDebug) {
        node.cout(message, ...optionalParams);
    }
};

process.on('unhandledRejection', (reason, promise) => {
    node.cout('Unhandled rejection', { reason: reason, promise: promise });
});

export {};

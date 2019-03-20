// tslint:disable: no-any no-unsafe-any
declare global {
    const runnerContext: RunnerContext;
    function cout(message?: any, ...optionalParams: any[]): void;
}

const node = global as any;
node.cout = (message?: any, ...optionalParams: any[]) => {
    process.stdout.write(`[${new Date().toJSON()}] `);
    if (optionalParams.length > 0) {
        console.log(message, optionalParams);
    } else {
        console.log(message);
    }
};
node.runnerContext = {};

export {};

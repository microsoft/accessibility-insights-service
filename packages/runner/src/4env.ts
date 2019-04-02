import * as dotenv from 'dotenv';

export let config = dotenv.config();

if (config !== undefined && config.error !== undefined) {
    console.log(`Warning: An error occurred while loading the config file. ${config.error}`);
}

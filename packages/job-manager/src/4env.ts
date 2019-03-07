import * as dotenv from 'dotenv';
import * as _ from 'lodash';

export let config = dotenv.config();

if (!_.isNil(config) && !_.isNil(config.error)) {
    console.log(`[${new Date().toJSON()}] Warning: An error occurred while loading the config file. ${config.error}`);
}

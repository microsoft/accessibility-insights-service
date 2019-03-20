import * as dotenv from 'dotenv';
import * as _ from 'lodash';

export let config = dotenv.config();

if (!_.isNil(config) && !_.isNil(config.error)) {
    console.log(`Warning: An error occurred while loading the config file. ${config.error}`);
}

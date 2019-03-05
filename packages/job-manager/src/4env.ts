import * as dotenv from 'dotenv';
import { VError } from 'verror';

const config = dotenv.config();
if (config.error) {
    throw new VError(`An error occurred while loading the config file .env ${config.error}`);
}

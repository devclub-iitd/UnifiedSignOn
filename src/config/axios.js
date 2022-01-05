import * as keys from './keys';

const HttpsProxyAgent = require('https-proxy-agent');

const axiosDefaultConfig = {
    proxy: false,
    httpsAgent: !keys.isDev
        ? new HttpsProxyAgent('http://devclub.iitd.ac.in:3128')
        : null,
};
const axios = require('axios').create(axiosDefaultConfig);

export default axios;

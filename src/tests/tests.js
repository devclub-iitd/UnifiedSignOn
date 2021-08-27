import express from 'express';
import util from 'util';
import rtoken from '../data/resourceToken';
import { makeid } from '../utils/utils';

const router = express.Router();

// api route to check whether current requestToken exists or not

router.post('/checkFunction', async (req, res) => {
    let { requestToken } = req.body;
    let exists = 1;
    rtoken.exists = util.promisify(rtoken.exists);
    while (exists) {
        // eslint-disable-next-line no-await-in-loop
        exists = await rtoken.exists(requestToken.toString());
        requestToken = makeid(64, true);
        console.log(exists);
    }
    res.send(requestToken);
});

// route to check all the data stored in redis

router.get('/rediData', (req, res) => {
    rtoken.keys('*', (err, keys) => {
        // eslint-disable-next-line array-callback-return
        keys.map((key) => {
            console.log(key);
            console.log(rtoken.hmget(key, ['cId', 'uId']));
        });
    });
    res.send(200);
});
export default router;

import redis from 'redis';
import { isDev } from './keys';

const redisURl = isDev
    ? 'redis://127.0.0.1:6379'
    : `redis://:${process.env.REDIS_PASS}@redis:6379`;
const rtokens = redis.createClient({
    url: redisURl,
});

rtokens.on('error', (err) => {
    console.error(err);
});

export default rtokens;

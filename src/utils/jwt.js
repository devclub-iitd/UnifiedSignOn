import jwt from 'jsonwebtoken';
import { secretkey } from '../config/keys';

export const generate_token = async (payload) => {

    const token = jwt.sign(payload, secretkey, { expiresIn: 60 * 15 });

    return token;
}
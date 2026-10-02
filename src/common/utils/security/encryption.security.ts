// Node.js crypto:

import crypto from 'crypto';
import { ENCRYPTION_KEY, IV_LENGTH } from '../../../config/config';
import { BadRequestException } from '../../exceptions';

const ENCRYPTION_SECRET_KEY = Buffer.from(ENCRYPTION_KEY);//must be 32

export const encrypt = (text : string) : string => {
const iv = crypto.randomBytes (IV_LENGTH);
const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_SECRET_KEY, iv);
let encryptedData = cipher.update(text, 'utf-8', 'hex');
encryptedData += cipher.final('hex');
return `${iv.toString('hex')}:${encryptedData}`
}

export const decrypt = (encryptedData : string) : string => {
    const [iv, encryptedText] = encryptedData.split(":") || []
    if (!iv || !encryptedText) {
        throw new BadRequestException("Fail to encrypt")
    }
const binaryLikeIv = Buffer.from(iv, 'hex');
const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_SECRET_KEY, binaryLikeIv);
let decryptedData = decipher.update(encryptedText.trim(), 'hex', 'utf8');
decryptedData += decipher.final('utf-8');
return decryptedData;
}

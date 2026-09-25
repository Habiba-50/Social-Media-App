import { resolve } from 'node:path'
import { config } from 'dotenv'
// import { log } from 'node:console';

export const NODE_ENV = (process.env.NODE_ENV ?? 'development') as 'development' | 'production'

const envPath = {
    development: `.env.development`,
    production: `.env.production`,
}
// console.log({ en: envPath[NODE_ENV] });

config({ path: resolve(process.cwd(), envPath[NODE_ENV]) })
// config({ path: resolve(`./config/${envPath[NODE_ENV]}`) })
// console.log({ path: resolve(`./${envPath[NODE_ENV]}`) })

export const port = process.env.PORT ?? 7000

export const APPLICATION_NAME = process.env.APPLICATION_NAME as string

export const DB_URI = process.env.DB_URI as string
export const REDIS_URL = process.env.REDIS_URL  as string

// Encryption
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY as string
export const IV_LENGTH = parseInt(process.env.IV_LENGTH ?? "16"); 


// Email
export const EMAIL_APP = process.env.EMAIL_APP;
export const EMAIL_APP_PASS = process.env.EMAIL_PASS as string;

// JWT
export const System_JWT_SECRET = process.env.System_JWT_SECRET as string;
export const System_REFRESH_JWT_SECRET = process.env.System_REFRESH_JWT_SECRET as string;
export const User_JWT_SECRET = process.env.User_JWT_SECRET as string
export const User_REFRESH_JWT_SECRET = process.env.User_REFRESH_JWT_SECRET as string

export const ACCESS_TOKEN_EXPIRY = parseInt(process.env.ACCESS_EXPIRES_IN ?? '3600') 
export const REFRESH_TOKEN_EXPIRY = parseInt(process.env.REFRESH_EXPIRES_IN ?? '86400') 

export const WEB_CLIENT_ID = process.env.WEB_CLIENT_ID



export const SALT_ROUND = parseInt(process.env.SALT_ROUND ?? '10')
console.log({SALT_ROUND});


export const FACEBOOK = process.env.FACEBOOK as string

export const INSTAGRAM = process.env.INSTAGRAM as string

export const TWITTER = process.env.TWITTER as string

export const ORIGINS = (process.env.ORIGINS?.split(",") ||[]) as string[]

export const AWS_REGION = process.env.AWS_REGION as string
export const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME as string
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID as string
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY as string
export const AWS_EXPIRES_IN = process.env.AWS_EXPIRES_IN as unknown as number 


export const LOGO_URL = process.env.LOGO_URL as string
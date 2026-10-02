"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SALT_ROUND = exports.WEB_CLIENT_ID = exports.REFRESH_TOKEN_EXPIRY = exports.ACCESS_TOKEN_EXPIRY = exports.User_REFRESH_JWT_SECRET = exports.User_JWT_SECRET = exports.System_REFRESH_JWT_SECRET = exports.System_JWT_SECRET = exports.EMAIL_APP_PASS = exports.EMAIL_APP = exports.ENCRYPTION_KEY = exports.REDIS_URL = exports.DB_URI = exports.APPLICATION_NAME = exports.port = exports.NODE_ENV = void 0;
const node_path_1 = require("node:path");
const dotenv_1 = require("dotenv");
exports.NODE_ENV = process.env.NODE_ENV;
const envPath = {
    development: `.env.development`,
    production: `.env.production`,
};
console.log({ en: envPath[exports.NODE_ENV] });
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(`./config/${envPath[exports.NODE_ENV]}`) });
exports.port = process.env.PORT ?? 7000;
exports.APPLICATION_NAME = process.env.APPLICATION_NAME ?? "Saraha App";
exports.DB_URI = process.env.DB_URI ?? 'mongodb://127.0.0.1:27017/Saraha_App';
exports.REDIS_URL = process.env.REDIS_URL;
exports.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
exports.EMAIL_APP = process.env.EMAIL_APP;
exports.EMAIL_APP_PASS = process.env.EMAIL_PASS;
exports.System_JWT_SECRET = process.env.System_JWT_SECRET;
exports.System_REFRESH_JWT_SECRET = process.env.System_REFRESH_JWT_SECRET;
exports.User_JWT_SECRET = process.env.User_JWT_SECRET;
exports.User_REFRESH_JWT_SECRET = process.env.User_REFRESH_JWT_SECRET;
exports.ACCESS_TOKEN_EXPIRY = parseInt(process.env.ACCESS_EXPIRES_IN);
exports.REFRESH_TOKEN_EXPIRY = parseInt(process.env.REFRESH_EXPIRES_IN);
exports.WEB_CLIENT_ID = process.env.WEB_CLIENT_ID;
exports.SALT_ROUND = parseInt(process.env.SALT_ROUND ?? '10');
console.log({ SALT_ROUND: exports.SALT_ROUND });

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUserValidation = exports.profileGQL = void 0;
const zod_1 = __importDefault(require("zod"));
const validation_1 = require("../../common/validation");
exports.profileGQL = zod_1.default.strictObject({
    search: zod_1.default.string().min(2, "Search query must be at least 2 character long").optional(),
});
exports.searchUserValidation = {
    query: validation_1.paginationValidationSchema.query.extend({
        search: zod_1.default.string().min(1, "Search query must be at least 1 character long").max(10, "Search query must be less than 100 character").optional(),
    })
};

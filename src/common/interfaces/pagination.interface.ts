import { HydratedDocument } from "mongoose";

export interface IPaginate<TRawDocument> {
    docs: HydratedDocument<TRawDocument>[],
    currentPage?: number | string | undefined;
    pageSize?: number | string | undefined;
    pages?: number | string | undefined;
}
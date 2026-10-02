import type { NextFunction, Request, Response } from "express";
import { BadRequestException, MapGraphQLError } from "../common/exceptions";
import { ZodError, ZodType } from "zod";


type keyReqType = "body" | "query" | "params" | "files"
// type schemaType = Record<keyReqType, ZodType>
type schemaType = Partial<Record<keyReqType, ZodType>>

type IssuesType = Array<{
            key: keyReqType;
            issues: Array<{
                path: (symbol |string | number | null | undefined)[];
                message: string
            }>
}>


export const validation = (schema: schemaType) => { 

    return (req: Request, res: Response, next: NextFunction) => {
        // console.log(Object.keys(schema));

        const issues: IssuesType = []

        for (const key of Object.keys(schema) as keyReqType[]) {

           if(!schema[key]) continue;  // Skip this iteration if the schema for the current key is not defined

            if (key === 'body' && req.file) {
                req.body.file = req.file;
            }
            
            // For 'files' key, validate req.files directly (multer populates req.files, not req[files])
            const reqValue = key === 'files' ? req.files : (req as any)[key];
            const validationResult = schema[key].safeParse(reqValue);
            if (!validationResult.success) {
                const error = validationResult.error as ZodError;
                console.log({error});
                issues.push({
                    key,
                    issues: error.issues.map((issue) => ({
                        path: [key, ...issue.path],
                        message: issue.message,
                    }))
                })
            }
        }

        if (issues.length > 0) {
            throw new BadRequestException("Validation failed", { error: issues });
        }

        
        next()
    }
}

export const GQLValidation = async <T>(schema: ZodType, args: T): Promise<boolean> => {

    const validationResult = schema.safeParse(args)
    if (!validationResult.success) {
        throw MapGraphQLError(new BadRequestException("Validation Error", {
            issues: validationResult.error.issues.map(issue => { return { path: issue.path, message: issue.message } })
        }))
    }
    return true
}


export const SocketValidation = async <T>(schema: ZodType, args: T): Promise<boolean> => {
    const validationResult = schema.safeParse(args)
    if (!validationResult.success) {
        throw new BadRequestException("Validation Error", {
            issues: validationResult.error.issues.map(issue => { return { path: issue.path, message: issue.message } })
        })
    }
    return true
}


export const normalizePostUpdate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {

    if (
        req.body.removeFiles &&
        typeof req.body.removeFiles === "string"
    ) {
        try {

            req.body.removeFiles = JSON.parse(
                req.body.removeFiles
            );

        } catch {

            req.body.removeFiles = [
                req.body.removeFiles
            ];
        }
    }

    console.log(req.body.removeFiles);

    next();
};
import type { NextFunction, Request, Response } from "express";

interface IError extends Error {
    statusCode?: number;
    cause?: any;
}

export const globalErrorHandler = (err: IError, req: Request, res: Response, next: NextFunction) => {

    if (err.name == "MulterError") {
        err.statusCode = 400
    }
    const status = err.statusCode || 500; // Default to 500 if statusCode is not provided
    res.status(status).json({
        message: err.message || "Internal Server Error",
        cause: err.cause,
        stack: err.stack,
        error: err,
    });
}
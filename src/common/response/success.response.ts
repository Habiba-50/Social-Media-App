import express from "express";
export const successResponse = <T = any> ({
    res , message = "Done", statusCode = 200, data 
}: {
    res: express.Response,
    message?: string,
    statusCode?: number,
    data?: T,
    }) => {
    
    return res.status(statusCode).json({
        message,
        status: statusCode,
        data
    });
}
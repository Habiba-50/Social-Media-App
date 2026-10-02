
export class ApplicationException extends Error { 

    constructor(message: string, public statusCode: number , cause?: unknown) {
        super(message, { cause });
        
        this.name = this.constructor.name; // Set the error name to the class name
        Error.captureStackTrace(this, this.constructor); // Capture the stack trace
    }
}



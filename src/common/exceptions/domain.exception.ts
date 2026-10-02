import { ApplicationException } from "./application.exception";
import { GraphQLError } from "graphql";

export const MapGraphQLError = (error: ApplicationException) => {
    throw new GraphQLError(
        error.message || "Internal Server Error",
        {
        extensions: {
            statusCode: error.statusCode || 500,
            cause: error.cause,
        },
    });
}

export class BadRequestException extends ApplicationException { 

    constructor(message: string = "BadRequest", cause?: unknown) {
        super(message , 400 , cause);
    }
}

export class conflictException extends ApplicationException { 

    constructor(message: string = "Conflict", cause?: unknown) {
        super(message , 409 , cause);
    }
}

export class NotFoundException extends ApplicationException { 

    constructor(message: string = "Not Found", cause?: unknown) {
        super(message , 404 , cause);
    }
}

export class unauthorizedException extends ApplicationException { 

    constructor(message: string = "Unauthorized", cause?: unknown) {
        super(message , 401 , cause);
    }
}


export class ForbiddenException extends ApplicationException { 

    constructor(message: string = "Forbidden", cause?: unknown) {
        super(message , 403 , cause);
    }
}
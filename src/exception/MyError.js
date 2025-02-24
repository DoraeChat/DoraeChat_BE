class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CustomError';
        this.status = 400;

        Error.captureStackTrace(this, CustomError);
    }
}

module.exports = CustomError;

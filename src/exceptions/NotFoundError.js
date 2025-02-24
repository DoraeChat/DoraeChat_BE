class NotFoundError extends Error {
    constructor(message = 'Resource') {
        super(`${message} not found`);
        this.name = 'NotFoundError';
        this.status = 404;
    }
}

module.exports = NotFoundError;
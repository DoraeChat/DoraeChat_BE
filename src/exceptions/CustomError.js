class CustomError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "CustomError";
    this.status = status;

    Object.setPrototypeOf(this, CustomError.prototype);
  }

  get cleanMessage() {
    return this.message;
  }
}

module.exports = CustomError;

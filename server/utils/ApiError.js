class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
const bad = (m, e) => new ApiError(400, m, e);
const unauthorized = (m = 'Please log in to continue') => new ApiError(401, m);
const forbidden = (m = 'You do not have permission to do that') => new ApiError(403, m);
const notFound = (m = 'Resource not found') => new ApiError(404, m);
const conflict = (m) => new ApiError(409, m);

module.exports = { ApiError, bad, unauthorized, forbidden, notFound, conflict };

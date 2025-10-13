class AppError extends Error {
  constructor(message, statusCode, firebaseCode = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.firebaseCode = firebaseCode;  // For FirebaseError codes like 'auth/invalid-user'
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;

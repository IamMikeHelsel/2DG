import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation rule sets
export const registerValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('displayName')
    .isLength({ min: 2, max: 32 })
    .matches(/^[a-zA-Z0-9_\- ]+$/)
    .withMessage('Display name must be 2-32 characters and contain only letters, numbers, spaces, hyphens, and underscores')
];

export const loginValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('rememberMe must be a boolean')
];

export const passwordResetValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

export const chatValidation: ValidationChain[] = [
  body('text')
    .isLength({ min: 1, max: 140 })
    .withMessage('Chat message must be 1-140 characters')
    .matches(/^[^<>]*$/)
    .withMessage('Chat message contains invalid characters')
];

export const gameInputValidation: ValidationChain[] = [
  body('seq')
    .isInt({ min: 0 })
    .withMessage('Sequence number must be a non-negative integer'),
  body('up')
    .isBoolean()
    .withMessage('up must be a boolean'),
  body('down')
    .isBoolean()
    .withMessage('down must be a boolean'),
  body('left')
    .isBoolean()
    .withMessage('left must be a boolean'),
  body('right')
    .isBoolean()
    .withMessage('right must be a boolean')
];

export const shopValidation: ValidationChain[] = [
  body('id')
    .isString()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Item ID must be alphanumeric'),
  body('qty')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('Quantity must be between 1 and 99')
];

export const bugReportValidation: ValidationChain[] = [
  body('description')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Bug report must be 10-1000 characters')
    .matches(/^[^<>]*$/)
    .withMessage('Bug report contains invalid characters')
];

export const referralValidation: ValidationChain[] = [
  body('referredPlayerId')
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Referred player ID is required')
];

// Middleware to handle validation results
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors: Record<string, string[]> = {};
    
    errors.array().forEach(error => {
      if (error.type === 'field') {
        if (!formattedErrors[error.path]) {
          formattedErrors[error.path] = [];
        }
        formattedErrors[error.path].push(error.msg);
      }
    });

    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      fields: formattedErrors
    });
  }

  next();
};

// Combine validation rules with error handling
export const validateRegistration = [...registerValidation, handleValidationErrors];
export const validateLogin = [...loginValidation, handleValidationErrors];
export const validatePasswordReset = [...passwordResetValidation, handleValidationErrors];
export const validateChatMessage = [...chatValidation, handleValidationErrors];
export const validateGameInput = [...gameInputValidation, handleValidationErrors];
export const validateShopPurchase = [...shopValidation, handleValidationErrors];
export const validateBugReport = [...bugReportValidation, handleValidationErrors];
export const validateReferral = [...referralValidation, handleValidationErrors];
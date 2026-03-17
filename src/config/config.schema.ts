import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).optional(), // defaults to JWT_SECRET if not set
  OPENAI_API_KEY: Joi.string().allow('').optional(),
  DEEPSEEK_API_KEY: Joi.string().allow('').optional(),
  QR_MENU_BASE_URL: Joi.string().uri().allow('').optional(),
  FRONTEND_URL: Joi.string().uri().allow('').optional(),
  CORS_ORIGINS: Joi.string().allow('').optional(),
  PEXELS_API_KEY: Joi.string().allow('').optional(),
  RATE_LIMIT_TTL: Joi.number().optional(),
  RATE_LIMIT_MAX: Joi.number().optional(),
});

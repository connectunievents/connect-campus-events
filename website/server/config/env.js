const requiredInProduction = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];

function getConfig(env = process.env) {
  const config = {
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT || 3000),
    supabaseUrl: env.SUPABASE_URL || '',
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || '',
    groqApiKey: env.GROQ_API_KEY || '',
    groqModel: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    jwtSecret: env.JWT_SECRET || '',
    frontendUrl: env.FRONTEND_URL || 'http://localhost:8080',
    paymentProvider: env.PAYMENT_PROVIDER || 'mock',
    paymentWebhookSecret: env.PAYMENT_WEBHOOK_SECRET || '',
    emailProvider: env.EMAIL_PROVIDER || 'console',
    emailApiKey: env.EMAIL_API_KEY || '',
    emailFrom: env.EMAIL_FROM || ''
  };
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('PORT must be a valid TCP port');
  if (config.nodeEnv === 'production') {
    const missing = requiredInProduction.filter((key) => !env[key]);
    if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config;
}

module.exports = { getConfig };

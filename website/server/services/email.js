function emailService(config) {
  return {
    async send(message) {
      if (config.emailProvider === 'console' && config.nodeEnv !== 'production') {
        console.info(`[Connect email preview] ${message.type} -> ${message.to}`);
        return { delivered: false, previewed: true };
      }
      return { delivered: false, reason: 'Email provider credentials are not configured.' };
    }
  };
}

module.exports = { emailService };

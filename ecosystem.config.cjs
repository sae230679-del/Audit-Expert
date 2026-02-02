module.exports = {
  apps: [{
    name: 'help152fz',
    script: 'dist/index.cjs',
    cwd: '/var/www/help152fz.ru',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: '3001',
      DOMAIN: 'https://help152fz.ru',
      DATABASE_URL: 'postgresql://help152fz:YOUR_DB_PASSWORD@localhost:5432/help152fz',
      SESSION_SECRET: 'GENERATE_WITH_openssl_rand_hex_32',
      YOOKASSA_SHOP_ID: '',
      YOOKASSA_SECRET_KEY: '',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
      OPENAI_API_KEY: '',
      GIGACHAT_API_KEY: '',
      DADATA_API_KEY: '',
    }
  }]
};

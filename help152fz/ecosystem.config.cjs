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
      PORT: '5000',
      DOMAIN: 'https://help152fz.ru',
      SITE_URL: 'https://help152fz.ru',
      DATABASE_URL: 'postgresql://help152fz:Help152fz2024@localhost:5432/help152fz',
      SESSION_SECRET: 'ЗАМЕНИТЬ_НА_СГЕНЕРИРОВАННЫЙ_СЕКРЕТ',
      TELEGRAM_BOT_TOKEN: 'ЗАМЕНИТЬ_НА_ТОКЕН_БОТА',
      TELEGRAM_CHAT_ID: 'ЗАМЕНИТЬ_НА_CHAT_ID',
      SUPERADMIN_EMAIL: 'sae230679@yandex.ru',
      SUPERADMIN_PASSWORD: 'De230679@#$',
      MASTER_ADMIN_PIN: '212379',
      MASTER_ADMIN_EMAIL: 'sae230679@yandex.ru'
    }
  }]
};

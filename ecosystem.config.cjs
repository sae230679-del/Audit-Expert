module.exports = {
  apps: [{
    name: 'help152fz',
    script: 'dist/index.cjs',
    cwd: '/var/www/help152fz.ru',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env_file: '.env'
  }]
};

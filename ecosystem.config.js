module.exports = {
  apps: [
    {
      name: 'cnerp-api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
    })
  );

  app.use(
    '/orthanc',
    createProxyMiddleware({
      target: 'http://localhost:8042',
      changeOrigin: true,
      pathRewrite: { '^/orthanc': '' },
    })
  );
};

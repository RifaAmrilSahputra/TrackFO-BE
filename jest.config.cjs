/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/test/helpers/'],
  transformIgnorePatterns: ['/node_modules/(?!(supertest|@prisma)/)'],
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};

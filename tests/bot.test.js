const assert = require('assert');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const config = require('../config.yaml');

describe('Bot Tests', () => {
  let db;
  let testDb;

  before(async () => {
    // Setup test database
    testDb = new Database(':memory:');
  });

  after(async () => {
    // Cleanup
    await testDb.close();
  });

  describe('Database Operations', () => {
    it('should add and retrieve strikes correctly', async () => {
      const userId = 'test_user@c.us';
      
      // Add strike
      await testDb.addStrike(userId);
      let strikes = await testDb.getStrikes(userId);
      assert.strictEqual(strikes, 1);

      // Add another strike
      await testDb.addStrike(userId);
      strikes = await testDb.getStrikes(userId);
      assert.strictEqual(strikes, 2);

      // Reset strikes
      await testDb.resetStrikes(userId);
      strikes = await testDb.getStrikes(userId);
      assert.strictEqual(strikes, 0);
    });
  });

  describe('Configuration', () => {
    it('should load configuration correctly', () => {
      assert.ok(config.bot);
      assert.ok(config.moderation);
      assert.ok(config.groups);
      assert.ok(config.admins);
      assert.ok(config.rate_limit);
    });

    it('should have valid regex pattern', () => {
      const regex = new RegExp(config.moderation.link_regex, "i");
      assert.ok(regex.test('http://example.com'));
      assert.ok(regex.test('www.example.com'));
      assert.ok(regex.test('example.com'));
      assert.ok(!regex.test('just text'));
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const requests = Array(110).fill().map(() => 
        axios.get('http://localhost:3000/')
      );

      try {
        await Promise.all(requests);
        assert.fail('Should have hit rate limit');
      } catch (error) {
        assert.ok(error.response);
        assert.strictEqual(error.response.status, 429);
      }
    });
  });

  describe('Admin Endpoints', () => {
    it('should reject unauthorized access to /reset-strikes', async () => {
      try {
        await axios.post('http://localhost:3000/reset-strikes', {
          userId: 'test@c.us',
          adminId: 'unauthorized@c.us'
        });
        assert.fail('Should have rejected unauthorized access');
      } catch (error) {
        assert.strictEqual(error.response.status, 403);
      }
    });

    it('should reject unauthorized access to /strikes', async () => {
      try {
        await axios.get('http://localhost:3000/strikes?adminId=unauthorized@c.us');
        assert.fail('Should have rejected unauthorized access');
      } catch (error) {
        assert.strictEqual(error.response.status, 403);
      }
    });
  });
}); 
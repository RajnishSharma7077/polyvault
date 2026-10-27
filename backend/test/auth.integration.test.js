const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Customer = require('../models/customer.model');
const Asset = require('../models/asset.model');
const { demoAccounts, seedDemoAccounts } = require('../seed/demoAccounts');

let mongo;
let server;
let api;

const credentials = {
  fullName: 'PolyVault Test User',
  email: 'creator@example.com',
  password: 'a-secure-password',
  phone: '9876543210',
};

before(async () => {
  process.env.JWT_SECRET = 'test-only-secret-that-is-long-enough';
  process.env.NODE_ENV = 'test';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const app = require('../index');
  server = app.listen(0);
  api = request(server);
});

after(async () => {
  if (server) await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

test('registers a buyer, protects the profile, and rejects duplicate email', async () => {
  const agent = request.agent(server);
  const response = await agent.post('/customers/register').send(credentials);

  assert.equal(response.status, 201);
  assert.equal(response.body.customer.email, credentials.email);
  assert.equal(response.body.customer.isCreator, false);
  assert.equal(Object.hasOwn(response.body.customer, 'password'), false);

  const profile = await agent.get('/customers/me');
  assert.equal(profile.status, 200);
  assert.equal(profile.body.customer.email, credentials.email);

  const duplicate = await api.post('/customers/register').send({
    ...credentials,
    email: credentials.email.toUpperCase(),
  });
  assert.equal(duplicate.status, 409);

  const storedCustomer = await Customer.findOne({ email: credentials.email }).select('+password');
  assert.notEqual(storedCustomer.password, credentials.password);
});

test('login sets an HttpOnly cookie and rejects invalid credentials', async () => {
  const response = await api.post('/customers/login').send({
    email: credentials.email,
    password: credentials.password,
  });

  assert.equal(response.status, 200);
  assert.match(response.headers['set-cookie'][0], /HttpOnly/i);
  assert.equal(Object.hasOwn(response.body.customer, 'password'), false);

  const invalid = await api.post('/customers/login').send({
    email: credentials.email,
    password: 'incorrect-password',
  });
  assert.equal(invalid.status, 401);
});

test('rejects profile access without a valid cookie', async () => {
  const response = await api.get('/customers/me');
  assert.equal(response.status, 401);
});

test('enables creator access only for the authenticated customer', async () => {
  const agent = request.agent(server);
  const login = await agent.post('/customers/login').send({
    email: credentials.email,
    password: credentials.password,
  });
  assert.equal(login.status, 200);

  const response = await agent.patch('/customers/become-creator');
  assert.equal(response.status, 200);
  assert.equal(response.body.customer.isCreator, true);

  const repeated = await agent.patch('/customers/become-creator');
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.customer.isCreator, true);
});

test('lists published assets with filters and never exposes private file paths', async () => {
  const creator = await Customer.findOne({ email: credentials.email });
  const [published, unpublished] = await Asset.create([
    {
      title: 'Weathered stone arch',
      description: 'A modular stone arch for fantasy scenes.',
      creator: creator._id,
      category: 'Props',
      fileFormats: ['blend', 'fbx'],
      polycount: 4200,
      thumbnailImage: 'https://assets.example.test/arch.jpg',
      previewModelUrl: 'https://assets.example.test/arch.glb',
      filePath: '/private/originals/arch.blend',
      licenseTiers: [
        { name: 'Personal', price: 99.5, remainingLicenses: null },
        { name: 'Commercial', price: 249, remainingLicenses: 2 },
      ],
      isPublished: true,
    },
    {
      title: 'Unpublished draft',
      description: 'A draft asset.',
      creator: creator._id,
      category: 'Environments',
      fileFormats: ['obj'],
      polycount: 1200,
      thumbnailImage: 'https://assets.example.test/draft.jpg',
      filePath: '/private/originals/draft.obj',
      licenseTiers: [{ name: 'Personal', price: 50 }],
      isPublished: false,
    },
  ]);

  const categories = await api.get('/assets/categories');
  assert.equal(categories.status, 200);
  assert.ok(categories.body.categories.includes('Characters'));

  const filtered = await api.get('/assets').query({
    category: 'Props',
    format: '.FBX',
    search: 'weathered',
    minPolycount: 1000,
    maxPolycount: 5000,
    minPrice: 90,
    maxPrice: 100,
  });
  assert.equal(filtered.status, 200);
  assert.equal(filtered.body.assets.length, 1);
  assert.equal(filtered.body.assets[0]._id, String(published._id));
  assert.equal(Object.hasOwn(filtered.body.assets[0], 'filePath'), false);

  const details = await api.get(`/assets/${published._id}`);
  assert.equal(details.status, 200);
  assert.equal(Object.hasOwn(details.body.asset, 'filePath'), false);

  const hidden = await api.get(`/assets/${unpublished._id}`);
  assert.equal(hidden.status, 404);

  const invalidFilter = await api.get('/assets').query({ maxPrice: 'invalid' });
  assert.equal(invalidFilter.status, 400);
});

test('creates the documented demo buyer and creator only when explicitly enabled', async () => {
  const previousEnabled = process.env.ENABLE_DEMO_ACCOUNTS;
  try {
    process.env.ENABLE_DEMO_ACCOUNTS = 'false';
    await seedDemoAccounts();
    assert.equal(
      await Customer.countDocuments({ email: { $in: demoAccounts.map((account) => account.email) } }),
      0,
    );

    process.env.ENABLE_DEMO_ACCOUNTS = 'true';
    await seedDemoAccounts();
    await seedDemoAccounts();

    const buyerAgent = request.agent(server);
    const buyerLogin = await buyerAgent.post('/customers/login').send({
      email: 'buyer.demo@example.com',
      password: 'VaultDemo#2026',
    });
    assert.equal(buyerLogin.status, 200);
    assert.equal(buyerLogin.body.customer.isCreator, false);

    const creatorLogin = await api.post('/customers/login').send({
      email: 'creator.demo@example.com',
      password: 'VaultDemo#2026',
    });
    assert.equal(creatorLogin.status, 200);
    assert.equal(creatorLogin.body.customer.isCreator, true);

    assert.equal(
      await Customer.countDocuments({ email: { $in: demoAccounts.map((account) => account.email) } }),
      2,
    );
  } finally {
    if (previousEnabled === undefined) delete process.env.ENABLE_DEMO_ACCOUNTS;
    else process.env.ENABLE_DEMO_ACCOUNTS = previousEnabled;
  }
});

test('refuses to seed demo accounts when production mode is set', async () => {
  const previousEnabled = process.env.ENABLE_DEMO_ACCOUNTS;
  const previousNodeEnv = process.env.NODE_ENV;
  try {
    process.env.ENABLE_DEMO_ACCOUNTS = 'true';
    process.env.NODE_ENV = 'production';
    await assert.rejects(seedDemoAccounts, /cannot be enabled in production/);
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousEnabled === undefined) delete process.env.ENABLE_DEMO_ACCOUNTS;
    else process.env.ENABLE_DEMO_ACCOUNTS = previousEnabled;
  }
});

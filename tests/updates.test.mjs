import assert from 'node:assert/strict';
import test from 'node:test';
import updateHandler from '../api/updates.js';

const validManifest = {
  version: '1.2.3',
  checksum: 'a'.repeat(64),
};

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function callHandler({ method = 'POST', body } = {}) {
  const response = createResponse();
  await updateHandler({ method, body }, response);
  return response;
}

test('returns a checksummed update for a supported older app version', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => validManifest,
  });

  try {
    const response = await callHandler({
      body: { app_id: 'com.chatimall.app', version_name: '1.2.2' },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      checksum: validManifest.checksum,
      url: 'https://praisecyber-chatimall-frontend.vercel.app/updates/1.2.3.zip',
      version: '1.2.3',
    });
    assert.equal(response.headers['Cache-Control'], 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('offers the first update to a built-in bundle', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => validManifest,
  });

  try {
    const response = await callHandler({
      body: { app_id: 'com.chatimall.app', version_name: 'builtin' },
    });

    assert.equal(response.body.version, validManifest.version);
    assert.equal(response.body.checksum, validManifest.checksum);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not offer an update to an equal, newer, or unrecognized version', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => validManifest,
  });

  try {
    for (const version_name of ['1.2.3', '1.2.4', 'unknown']) {
      const response = await callHandler({
        body: { app_id: 'com.chatimall.app', version_name },
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.body.error, 'no_new_version_available');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('compares numeric version components instead of their string form', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ ...validManifest, version: '1.10.0' }),
  });

  try {
    const response = await callHandler({
      body: { app_id: 'com.chatimall.app', version_name: '1.9.9' },
    });

    assert.equal(response.body.version, '1.10.0');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns no update for other app IDs without fetching the manifest', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    assert.fail('Manifest must not be fetched for an unsupported app');
  };

  try {
    const response = await callHandler({
      body: { app_id: 'com.example.other', version_name: '1.0.0' },
    });

    assert.equal(response.body.error, 'no_new_version_available');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns an explicit service error for an invalid manifest', async () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ ...validManifest, checksum: 'not-a-checksum' }),
  });
  console.error = () => {};

  try {
    const response = await callHandler({
      body: { app_id: 'com.chatimall.app', version_name: 'builtin' },
    });

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.error, 'invalid_update_manifest');
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test('returns an explicit service error when the manifest cannot be fetched', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('network unavailable');
  };
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const response = await callHandler({
      body: { app_id: 'com.chatimall.app', version_name: 'builtin' },
    });

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.error, 'update_manifest_unavailable');
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test('rejects methods other than POST', async () => {
  const response = await callHandler({ method: 'GET' });

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
});

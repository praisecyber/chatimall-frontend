const APP_ID = 'com.chatimall.app';
const PRODUCTION_ORIGIN = 'https://praisecyber-chatimall-frontend.vercel.app';
const UPDATE_MANIFEST_URL = `${PRODUCTION_ORIGIN}/updates/latest.json`;
const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:\+[0-9A-Za-z.-]+)?$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/i;

function parseVersion(version) {
  const match = VERSION_PATTERN.exec(version);
  return match ? match.slice(1, 4).map(BigInt) : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

function noUpdate(response) {
  return response.status(200).json({
    error: 'no_new_version_available',
    message: 'No new version available',
  });
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'method_not_allowed' });
  }

  const payload = request.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return response.status(400).json({ error: 'invalid_request' });
  }

  if (payload.app_id !== APP_ID || typeof payload.version_name !== 'string') {
    return noUpdate(response);
  }

  let manifest;
  try {
    const manifestResponse = await fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' });
    if (!manifestResponse.ok) {
      throw new Error(`Manifest request returned HTTP ${manifestResponse.status}`);
    }
    manifest = await manifestResponse.json();
  } catch (error) {
    console.error('Unable to load the self-hosted Android update manifest.', error);
    return response.status(503).json({
      error: 'update_manifest_unavailable',
      message: 'The update service is temporarily unavailable',
    });
  }

  if (
    !manifest ||
    typeof manifest.version !== 'string' ||
    !parseVersion(manifest.version) ||
    typeof manifest.checksum !== 'string' ||
    !CHECKSUM_PATTERN.test(manifest.checksum)
  ) {
    console.error('The self-hosted Android update manifest is invalid.');
    return response.status(503).json({
      error: 'invalid_update_manifest',
      message: 'The update service is temporarily unavailable',
    });
  }

  if (payload.version_name !== 'builtin') {
    const currentVersion = parseVersion(payload.version_name);
    if (!currentVersion || compareVersions(currentVersion, parseVersion(manifest.version)) >= 0) {
      return noUpdate(response);
    }
  }

  return response.status(200).json({
    checksum: manifest.checksum,
    url: `${PRODUCTION_ORIGIN}/updates/${manifest.version}.zip`,
    version: manifest.version,
  });
}

/**
 * Earth Engine authentication and initialization.
 *
 * Uses a Google Cloud service account JSON key to authenticate with Earth Engine.
 * The key file is loaded from either:
 *   - GOOGLE_APPLICATION_CREDENTIALS env var (path to JSON file), or
 *   - EE_SERVICE_ACCOUNT_JSON env var (inline JSON string — useful for Render)
 *
 * The service account must have the "Earth Engine Resource Viewer" role (or
 * equivalent) and be registered at https://code.earthengine.google.com.
 */
const ee = require('@google/earthengine');

let initialized = false;
let initPromise = null;

function getCredentials() {
  // Option 1: inline JSON string (for Render / cloud deploys)
  if (process.env.EE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.EE_SERVICE_ACCOUNT_JSON);
    } catch (err) {
      console.error('EE_SERVICE_ACCOUNT_JSON is not valid JSON:', err.message);
      return null;
    }
  }

  // Option 2: file path (for local dev)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } catch (err) {
      console.error('Failed to load GOOGLE_APPLICATION_CREDENTIALS:', err.message);
      return null;
    }
  }

  return null;
}

/**
 * Initialize Earth Engine if credentials are available.
 * Returns a promise that resolves to true if EE is ready, false if not configured.
 * Safe to call multiple times — caches the init result.
 */
function init() {
  if (initialized) return Promise.resolve(true);
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    const credentials = getCredentials();
    if (!credentials) {
      console.log('Earth Engine: no credentials configured — satellite tiles will use free fallback');
      resolve(false);
      return;
    }

    try {
      ee.authenticateViaPrivateKey(
        credentials,
        () => {
          ee.initialize(
            null,
            null,
            () => {
              initialized = true;
              console.log('Earth Engine: initialized successfully');
              resolve(true);
            },
            (err) => {
              console.error('Earth Engine: initialization failed:', err.message);
              resolve(false);
            }
          );
        },
        (err) => {
          console.error('Earth Engine: authentication failed:', err.message);
          resolve(false);
        }
      );
    } catch (err) {
      console.error('Earth Engine: setup error:', err.message);
      resolve(false);
    }
  });

  return initPromise;
}

/**
 * Check if Earth Engine is initialized and ready.
 */
function isReady() {
  return initialized;
}

module.exports = { init, isReady, ee };

/**
 * app.json is the static config. The web shell is hosted at /app, so
 * experiments.baseUrl is "/app". A native preview must not bake that prefix
 * into its routes, or the first screen never matches.
 */
module.exports = ({ config }) => {
  const platform = process.env.EAS_BUILD_PLATFORM;
  if (platform === 'ios' || platform === 'android') {
    const experiments = { ...(config.experiments ?? {}) };
    delete experiments.baseUrl;
    config.experiments = experiments;
  }
  return config;
};

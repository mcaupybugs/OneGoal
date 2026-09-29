export const buildId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const nowIso = () => new Date().toISOString();

export const requireEnv = (name, defaultValue) => {
  const value = process.env[name] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Expected ${name} in environment`);
  }
  return value;
};

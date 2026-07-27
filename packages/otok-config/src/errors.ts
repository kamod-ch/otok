export class OtokConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtokConfigError";
  }
}

export function pluginError(pluginName: string, message: string): OtokConfigError {
  return new OtokConfigError(`[otok:${pluginName}] ${message}`);
}

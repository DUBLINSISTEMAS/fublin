export function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL);
}

export function usesRemoteDatabase(): boolean {
  const url = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  return /^(libsql|https):\/\//i.test(url);
}

export function usesCloudStorage(): boolean {
  return process.env.STORAGE_DRIVER === "blob" || isVercelRuntime();
}

export function localBackupsAvailable(): boolean {
  return !isVercelRuntime() && !usesRemoteDatabase() && !usesCloudStorage();
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBasePath(path) {
  if (!path) {
    return BASE_PATH || "";
  }
  if (!BASE_PATH) {
    return path;
  }
  if (path.startsWith("/")) {
    return `${BASE_PATH}${path}`;
  }
  return `${BASE_PATH}/${path}`;
}

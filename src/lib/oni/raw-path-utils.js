function isIndexSegment(segment) {
  return /^\d+$/.test(segment);
}

function asContainerForNext(segment) {
  return isIndexSegment(segment) ? [] : {};
}

export function isObjectLike(value) {
  return value !== null && typeof value === "object";
}

export function getPathValue(root, path) {
  if (!Array.isArray(path) || path.length === 0) {
    return root;
  }
  let cursor = root;
  for (const segment of path) {
    if (!isObjectLike(cursor)) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

export function setPathValue(root, path, value) {
  if (!Array.isArray(path) || path.length === 0) {
    return value;
  }

  const [head, ...tail] = path;
  const source = isObjectLike(root) ? root : asContainerForNext(head);
  const current = source[head];
  const next = setPathValue(current, tail, value);

  if (current === next) {
    return root;
  }

  if (Array.isArray(source)) {
    const clone = [...source];
    clone[Number(head)] = next;
    return clone;
  }

  return {
    ...source,
    [head]: next,
  };
}

export function getPrimitiveType(value) {
  if (typeof value === "string") {
    return "string";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  return null;
}

function isPathMatch(path, matcher) {
  if (path.length !== matcher.length) {
    return false;
  }
  for (let index = 0; index < path.length; index += 1) {
    if (matcher[index] !== "*" && matcher[index] !== path[index]) {
      return false;
    }
  }
  return true;
}

export function getRawSegmentName(saveGame, path) {
  const last = path[path.length - 1];
  if (!last) {
    return "root";
  }

  if (isPathMatch(path, ["gameObjects", "*"])) {
    const group = getPathValue(saveGame, path);
    return group?.name || last;
  }

  if (isPathMatch(path, ["gameObjects", "*", "gameObjects", "*", "behaviors", "*"])) {
    const behavior = getPathValue(saveGame, path);
    return behavior?.name || last;
  }

  return last;
}

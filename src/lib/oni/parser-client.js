"use client";

const WORKER_URL = new URL(
  "../../workers/oni-parser.worker.js",
  import.meta.url
);

let sharedClient = null;

function createWorker() {
  return new Worker(WORKER_URL, { type: "module" });
}

function normalizeBuffer(data) {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (ArrayBuffer.isView(data)) {
    return data.buffer;
  }
  throw new Error("Expected ArrayBuffer or TypedArray.");
}

function createClient() {
  const worker = createWorker();
  let nextId = 1;
  const pending = new Map();
  const progressHandlers = new Map();

  worker.onmessage = (event) => {
    const message = event.data;
    if (!message || typeof message !== "object") {
      return;
    }

    if (message.type === "progress") {
      const handler = progressHandlers.get(message.id);
      if (handler) {
        handler(message.message);
      }
      return;
    }

    const entry = pending.get(message.id);
    if (!entry) {
      return;
    }
    pending.delete(message.id);
    progressHandlers.delete(message.id);

    if (message.type === "error") {
      const err = new Error(message.error?.message || "Parser error");
      if (message.error?.code) {
        err.code = message.error.code;
      }
      if (message.error?.stack) {
        err.stack = message.error.stack;
      }
      entry.reject(err);
      return;
    }

    entry.resolve(message.payload);
  };

  worker.onerror = (event) => {
    const error = new Error(event?.message || "Worker error");
    for (const entry of pending.values()) {
      entry.reject(error);
    }
    pending.clear();
    progressHandlers.clear();
  };

  function request(type, payload, options = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      if (options.onProgress) {
        progressHandlers.set(id, options.onProgress);
      }
      worker.postMessage({ id, type, payload }, options.transfer || []);
    });
  }

  return {
    parseSave(buffer, options = {}) {
      const data = normalizeBuffer(buffer);
      return request(
        "parse",
        { buffer: data, options },
        {
          transfer: [data],
          onProgress: options.onProgress,
        }
      );
    },
    writeSave(saveGame, options = {}) {
      return request("write", { saveGame, options }, { onProgress: options.onProgress });
    },
    terminate() {
      worker.terminate();
    },
  };
}

export function getParserClient() {
  if (!sharedClient) {
    sharedClient = createClient();
  }
  return sharedClient;
}

export function parseSaveInWorker(buffer, options = {}) {
  return getParserClient().parseSave(buffer, options);
}

export function writeSaveInWorker(saveGame, options = {}) {
  return getParserClient().writeSave(saveGame, options);
}

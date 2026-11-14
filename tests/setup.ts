import "@testing-library/jest-dom/vitest";

// Newer Node versions (24+) ship their own `localStorage` global that is
// undefined unless Node is started with --localstorage-file, and it hides
// jsdom's. Tests that use localStorage then crash with "Cannot read properties
// of undefined (reading 'clear')". Give them a plain in-memory one instead.
if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
  const data = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(String(key)) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(String(key)),
    setItem: (key, value) => void data.set(String(key), String(value)),
  };
  Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, configurable: true });
}

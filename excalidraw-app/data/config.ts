import { fetchEnv } from "./env";
// import {
//   isSavedToFirebase,
//   loadFilesFromFirebase,
//   loadFromFirebase,
//   saveFilesToFirebase,
//   saveToFirebase,
// } from "./firebase";
import {
  isSavedToHttpStorage,
  loadFilesFromHttpStorage,
  loadFromHttpStorage,
  saveFilesToHttpStorage,
  saveToHttpStorage,
} from "./httpStorage";
import type { StorageBackend } from "./StorageBackend";

export enum EnvVar {
  BACKEND_V2_GET_URL = "BACKEND_V2_GET_URL",
  BACKEND_V2_POST_URL = "BACKEND_V2_POST_URL",
  LIBRARY_URL = "LIBRARY_URL",
  LIBRARY_BACKEND = "LIBRARY_BACKEND",
  SOCKET_SERVER_URL = "SOCKET_SERVER_URL",
  FIREBASE_CONFIG = "FIREBASE_CONFIG",
  STORAGE_BACKEND = "STORAGE_BACKEND",
  HTTP_STORAGE_BACKEND_URL = "HTTP_STORAGE_BACKEND_URL",
}

const configMap = new Map<string, string>();
const loadingConfigPromise = loadConfig();

export async function loadConfig(): Promise<void> {
  return fetchEnv().then((res) => {
    for (const [key, val] of Object.entries(res)) {
      configMap.set(key, val as string);
    }
    console.info("Loaded config: ", configMap);
  });
}

export async function getEnv(variable: EnvVar): Promise<string> {
  if (configMap.size === 0) {
    await loadingConfigPromise;
  }

  const result = configMap.get(variable);
  if (result === undefined) {
    console.warn(`Unknown config: ${variable}`);
    return "";
  }

  return result;
}

// const firebaseStorage: StorageBackend = {
//   isSaved: isSavedToFirebase,
//   saveToStorageBackend: saveToFirebase,
//   loadFromStorageBackend: loadFromFirebase,
//   saveFilesToStorageBackend: saveFilesToFirebase,
//   loadFilesFromStorageBackend: loadFilesFromFirebase,
// };

const httpStorage: StorageBackend = {
  isSaved: isSavedToHttpStorage,
  saveToStorageBackend: saveToHttpStorage,
  loadFromStorageBackend: loadFromHttpStorage,
  saveFilesToStorageBackend: saveFilesToHttpStorage,
  loadFilesFromStorageBackend: loadFilesFromHttpStorage,
};

const storageBackends = new Map<string, StorageBackend>()
  // .set("firebase", firebaseStorage)
  .set("http", httpStorage);

export let storageBackend: StorageBackend | null = null;

export async function getStorageBackend() {
  if (storageBackend) {
    return storageBackend;
  }

  const storageBackendName = await getEnv(EnvVar.STORAGE_BACKEND);

  if (storageBackends.has(storageBackendName)) {
    storageBackend = storageBackends.get(storageBackendName) as StorageBackend;
  } else {
    console.warn("No storage backend found, default to firebase");
    // storageBackend = firebaseStorage;
  }

  return storageBackend;
}

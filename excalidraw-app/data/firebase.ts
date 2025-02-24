// import { reconcileElements } from "../../packages/excalidraw";
import type {
  ExcalidrawElement,
  // FileId,
  // OrderedExcalidrawElement,
} from "../../packages/excalidraw/element/types";
// import { getSceneVersion } from "../../packages/excalidraw/element";
// import type Portal from "../collab/Portal";
// import { restoreElements } from "../../packages/excalidraw/data/restore";
// import type {
//   AppState,
//   BinaryFileData,
//   BinaryFileMetadata,
//   DataURL,
// } from "../../packages/excalidraw/types";
// import { FILE_CACHE_MAX_AGE_SEC } from "../app_constants";
// import { decompressData } from "../../packages/excalidraw/data/encode";
import {
  encryptData,
  decryptData,
} from "../../packages/excalidraw/data/encryption";
// import { MIME_TYPES } from "../../packages/excalidraw/constants";
// import type { SyncableExcalidrawElement } from ".";
// import { getSyncableElements } from ".";
// import type { Socket } from "socket.io-client";
// import type { RemoteExcalidrawElement } from "../../packages/excalidraw/data/reconcile";
// import { initializeApp } from "firebase/app";
// import type { Bytes } from "firebase/firestore";
// import { getStorage, ref, uploadBytes } from "firebase/storage";
// import { EnvVar, getEnv } from "./config";

// // private
// // -----------------------------------------------------------------------------

// const FIREBASE_CONFIG: Record<string, any> = JSON.parse(
//   process.env.REACT_APP_FIREBASE_CONFIG || "{}",
// );

// let firebaseApp: ReturnType<typeof initializeApp> | null = null;
// let firestore: ReturnType<typeof getFirestore> | null = null;
// let firebaseStorage: ReturnType<typeof getStorage> | null = null;

// const storage = await getEnv(EnvVar.STORAGE_BACKEND);
// const useFirebase = storage === "firebase";

// //if (useFirebase && !isFirebaseInitialized) {

// const _initializeFirebase = () => {
//   if (useFirebase && !firebaseApp) {
//     firebaseApp = initializeApp(FIREBASE_CONFIG);
//   }
//   return firebaseApp;
// };

// const _getFirestore = () => {
//   if (useFirebase && !firestore) {
//     firestore = getFirestore(_initializeFirebase());
//   }
//   return firestore;
// };

// const _getStorage = () => {
//   if (useFirebase && !firebaseStorage) {
//     firebaseStorage = getStorage(_initializeFirebase());
//   }
//   return firebaseStorage;
// };

// // -----------------------------------------------------------------------------

// export const loadFirebaseStorage = async () => {
//   return _getStorage();
// };

// type FirebaseStoredScene = {
//   sceneVersion: number;
//   iv: Uint8Array;
//   ciphertext: Uint8Array;
// };

export const encryptElements = async (
  key: string,
  elements: readonly ExcalidrawElement[],
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> => {
  const json = JSON.stringify(elements);
  const encoded = new TextEncoder().encode(json);
  const { encryptedBuffer, iv } = await encryptData(key, encoded);

  return { ciphertext: encryptedBuffer, iv };
};

export const decryptElements = async (
  key: string,
  iv: Uint8Array,
  ciphertext: ArrayBuffer | Uint8Array,
): Promise<readonly ExcalidrawElement[]> => {
  const decrypted = await decryptData(iv, ciphertext, key);
  const decodedData = new TextDecoder("utf-8").decode(
    new Uint8Array(decrypted),
  );
  return JSON.parse(decodedData);
};
// class FirebaseSceneVersionCache {
//   private static cache = new WeakMap<Socket, number>();
//   static get = (socket: Socket) => {
//     return FirebaseSceneVersionCache.cache.get(socket);
//   };
//   static set = (
//     socket: Socket,
//     elements: readonly SyncableExcalidrawElement[],
//   ) => {
//     FirebaseSceneVersionCache.cache.set(socket, getSceneVersion(elements));
//   };
// }

// export const isSavedToFirebase = (
//   portal: Portal,
//   elements: readonly ExcalidrawElement[],
// ): boolean => {
//   if (portal.socket && portal.roomId && portal.roomKey) {
//     const sceneVersion = getSceneVersion(elements);

//     return FirebaseSceneVersionCache.get(portal.socket) === sceneVersion;
//   }
//   // if no room exists, consider the room saved so that we don't unnecessarily
//   // prevent unload (there's nothing we could do at that point anyway)
//   return true;
// };

// export const saveFilesToFirebase = async ({
//   prefix,
//   files,
// }: {
//   prefix: string;
//   files: { id: FileId; buffer: Uint8Array }[];
// }) => {
//   const storage = await loadFirebaseStorage();

//   const erroredFiles: FileId[] = [];
//   const savedFiles: FileId[] = [];

//   await Promise.all(
//     files.map(async ({ id, buffer }) => {
//       try {
//         const storageRef = ref(storage, `${prefix}/${id}`);
//         await uploadBytes(storageRef, buffer, {
//           cacheControl: `public, max-age=${FILE_CACHE_MAX_AGE_SEC}`,
//         });
//         savedFiles.push(id);
//       } catch (error: any) {
//         erroredFiles.push(id);
//       }
//     }),
//   );

//   return { savedFiles, erroredFiles };
// };

// const createFirebaseSceneDocument = async (
//   elements: readonly SyncableExcalidrawElement[],
//   roomKey: string,
// ) => {
//   const sceneVersion = getSceneVersion(elements);
//   const { ciphertext, iv } = await encryptElements(roomKey, elements);
//   return {
//     sceneVersion,
//     ciphertext: Bytes.fromUint8Array(new Uint8Array(ciphertext)),
//     iv: Bytes.fromUint8Array(iv),
//   } as FirebaseStoredScene;
// };

// export const saveToFirebase = async (
//   portal: Portal,
//   elements: readonly SyncableExcalidrawElement[],
//   appState: AppState,
// ) => {
//   const { roomId, roomKey, socket } = portal;
//   if (
//     // bail if no room exists as there's nothing we can do at this point
//     !roomId ||
//     !roomKey ||
//     !socket ||
//     isSavedToFirebase(portal, elements)
//   ) {
//     return null;
//   }

//   const firestore = _getFirestore();
//   const docRef = doc(firestore, "scenes", roomId);

//   const storedScene = await runTransaction(firestore, async (transaction) => {
//     const snapshot = await transaction.get(docRef);

//     if (!snapshot.exists()) {
//       const storedScene = await createFirebaseSceneDocument(elements, roomKey);

//       transaction.set(docRef, storedScene);

//       return storedScene;
//     }

//     const prevStoredScene = snapshot.data() as FirebaseStoredScene;
//     const prevStoredElements = getSyncableElements(
//       restoreElements(await decryptElements(prevStoredScene, roomKey), null),
//     );
//     const reconciledElements = getSyncableElements(
//       reconcileElements(
//         elements,
//         prevStoredElements as OrderedExcalidrawElement[] as RemoteExcalidrawElement[],
//         appState,
//       ),
//     );

//     const storedScene = await createFirebaseSceneDocument(
//       reconciledElements,
//       roomKey,
//     );

//     transaction.update(docRef, storedScene);

//     // Return the stored elements as the in memory `reconciledElements` could have mutated in the meantime
//     return storedScene;
//   });

//   const storedElements = getSyncableElements(
//     restoreElements(await decryptElements(storedScene, roomKey), null),
//   );

//   FirebaseSceneVersionCache.set(socket, storedElements);

//   return storedElements;
// };

// export const loadFromFirebase = async (
//   roomId: string,
//   roomKey: string,
//   socket: Socket | null,
// ): Promise<readonly SyncableExcalidrawElement[] | null> => {
//   const firestore = _getFirestore();
//   const docRef = doc(firestore, "scenes", roomId);
//   const docSnap = await getDoc(docRef);
//   if (!docSnap.exists()) {
//     return null;
//   }
//   const storedScene = docSnap.data() as FirebaseStoredScene;
//   const elements = getSyncableElements(
//     restoreElements(await decryptElements(storedScene, roomKey), null),
//   );

//   if (socket) {
//     FirebaseSceneVersionCache.set(socket, elements);
//   }

//   return elements;
// };

// export const loadFilesFromFirebase = async (
//   prefix: string,
//   decryptionKey: string,
//   filesIds: readonly FileId[],
// ) => {
//   const loadedFiles: BinaryFileData[] = [];
//   const erroredFiles = new Map<FileId, true>();

//   await Promise.all(
//     [...new Set(filesIds)].map(async (id) => {
//       try {
//         const url = `https://firebasestorage.googleapis.com/v0/b/${
//           FIREBASE_CONFIG.storageBucket
//         }/o/${encodeURIComponent(prefix.replace(/^\//, ""))}%2F${id}`;
//         const response = await fetch(`${url}?alt=media`);
//         if (response.status < 400) {
//           const arrayBuffer = await response.arrayBuffer();

//           const { data, metadata } = await decompressData<BinaryFileMetadata>(
//             new Uint8Array(arrayBuffer),
//             {
//               decryptionKey,
//             },
//           );

//           const dataURL = new TextDecoder().decode(data) as DataURL;

//           loadedFiles.push({
//             mimeType: metadata.mimeType || MIME_TYPES.binary,
//             id,
//             dataURL,
//             created: metadata?.created || Date.now(),
//             lastRetrieved: metadata?.created || Date.now(),
//           });
//         } else {
//           erroredFiles.set(id, true);
//         }
//       } catch (error: any) {
//         erroredFiles.set(id, true);
//         console.error(error);
//       }
//     }),
//   );

//   return { loadedFiles, erroredFiles };
// };

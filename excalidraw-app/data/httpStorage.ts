import { MIME_TYPES } from "../../packages/excalidraw/constants";
import { decompressData } from "../../packages/excalidraw/data/encode";
import {
  decryptData,
  encryptData,
  IV_LENGTH_BYTES,
} from "../../packages/excalidraw/data/encryption";
import { restoreElements } from "../../packages/excalidraw/data/restore";
import { getSceneVersion } from "../../packages/excalidraw/element";
import type {
  ExcalidrawElement,
  FileId,
} from "../../packages/excalidraw/element/types";
import type {
  BinaryFileData,
  BinaryFileMetadata,
  DataURL,
} from "../../packages/excalidraw/types";
import type Portal from "../collab/Portal";
import { EnvVar, getEnv } from "./config";
import type { Socket } from "socket.io-client";
// ...

//const httpStorageSceneVersionCache = new WeakMap<Socket, number>();
// There is a lot of intentional duplication with the firebase file
// to prevent modifying upstream files and ease futur maintenance of this fork

const httpStorageSceneVersionCache = new WeakMap<Socket, number>();

export const isSavedToHttpStorage = (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
): boolean => {
  if (portal.socket && portal.roomId && portal.roomKey) {
    const sceneVersion = getSceneVersion(elements);
    return httpStorageSceneVersionCache.get(portal.socket) === sceneVersion;
  }
  // if no room exists, consider the room saved so that we don't unnecessarily
  // prevent unload (there's nothing we could do at that point anyway)
  return true;
};

export const saveToHttpStorage = async (
  portal: Portal,
  elements: readonly ExcalidrawElement[],
) => {
  const { roomId, roomKey, socket } = portal;

  if (
    // if no room exists, consider the room saved because there's nothing we can
    // do at this point
    !roomId ||
    !roomKey ||
    !socket ||
    isSavedToHttpStorage(portal, elements)
  ) {
    return true;
  }

  const sceneVersion = getSceneVersion(elements);

  const HTTP_STORAGE_BACKEND_URL = await getEnv(
    EnvVar.HTTP_STORAGE_BACKEND_URL,
  );

  const getResponse = await fetch(
    `${HTTP_STORAGE_BACKEND_URL}/rooms/${roomId}`,
  );

  if (!getResponse.ok && getResponse.status !== 404) {
    return false;
  }

  // If room already exist, we compare scene versions to check
  // if we're up to date before saving our scene

  if (getResponse.ok) {
    const buffer = await getResponse.arrayBuffer();

    const existingElements = await getElementsFromBuffer(buffer, roomKey);
    if (getSceneVersion(existingElements) >= sceneVersion) {
      return false;
    }
  }

  const { ciphertext, iv } = await encryptElements(roomKey, elements);

  // Concatenate IV with encrypted data (IV does not have to be secret).
  const payloadBlob = new Blob([iv.buffer as ArrayBuffer, ciphertext]);
  const payload = await new Response(payloadBlob).arrayBuffer();
  const putResponse = await fetch(
    `${HTTP_STORAGE_BACKEND_URL}/rooms/${roomId}`,
    {
      method: "PUT",
      body: payload,
    },
  );

  if (putResponse.ok) {
    httpStorageSceneVersionCache.set(socket, sceneVersion);
    return true;
  }

  return false;
};

export const loadFromHttpStorage = async (
  roomId: string,
  roomKey: string,
  socket: Socket | null,
): Promise<readonly ExcalidrawElement[] | null> => {
  const HTTP_STORAGE_BACKEND_URL = await getEnv(
    EnvVar.HTTP_STORAGE_BACKEND_URL,
  );

  const response = await fetch(`${HTTP_STORAGE_BACKEND_URL}/rooms/${roomId}`);
  const buffer = await response.arrayBuffer();
  const elements = await getElementsFromBuffer(buffer, roomKey);

  if (socket) {
    httpStorageSceneVersionCache.set(socket, getSceneVersion(elements));
  }

  return restoreElements(elements, null);
};

const decryptElements = async (
  iv: Uint8Array,
  ciphertext: ArrayBuffer | Uint8Array,
  key: string,
): Promise<readonly ExcalidrawElement[]> => {
  const decrypted = await decryptData(iv, ciphertext, key);
  const forDecoder = new Uint8Array(decrypted);

  const decodedData = new TextDecoder("utf-8").decode(forDecoder);

  return JSON.parse(decodedData);
};
const getElementsFromBuffer = async (
  buffer: ArrayBuffer,
  key: string,
): Promise<readonly ExcalidrawElement[]> => {
  // Buffer should contain both the IV (fixed length) and encrypted data
  const iv = buffer.slice(0, IV_LENGTH_BYTES);
  const encrypted = buffer.slice(IV_LENGTH_BYTES, buffer.byteLength);

  const decryptedElements = await decryptElements(
    new Uint8Array(iv),
    new Uint8Array(encrypted),
    key,
  );

  return decryptedElements;
};
const encryptElements = async (
  key: string,
  elements: readonly ExcalidrawElement[],
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> => {
  const json = JSON.stringify(elements);
  const encoded = new TextEncoder().encode(json);
  const { encryptedBuffer, iv } = await encryptData(key, encoded);

  return { ciphertext: encryptedBuffer, iv };
};
export const saveFilesToHttpStorage = async ({
  prefix,
  files,
}: {
  prefix: string;
  files: { id: FileId; buffer: Uint8Array }[];
}) => {
  const erroredFiles = new Map<FileId, true>();
  const savedFiles = new Map<FileId, true>();
  const HTTP_STORAGE_BACKEND_URL = await getEnv(
    EnvVar.HTTP_STORAGE_BACKEND_URL,
  );

  await Promise.all(
    files.map(async ({ id, buffer }) => {
      try {
        const payloadBlob = new Blob([buffer]);
        const payload = await new Response(payloadBlob).arrayBuffer();
        await fetch(`${HTTP_STORAGE_BACKEND_URL}/files/${id}`, {
          method: "PUT",
          body: payload,
        });
        savedFiles.set(id, true);
      } catch (error: any) {
        erroredFiles.set(id, true);
      }
    }),
  );

  return { savedFiles, erroredFiles };
};

export const loadFilesFromHttpStorage = async (
  prefix: string,
  decryptionKey: string,
  filesIds: readonly FileId[],
) => {
  const loadedFiles: BinaryFileData[] = [];
  const erroredFiles = new Map<FileId, true>();

  await Promise.all(
    [...new Set(filesIds)].map(async (id) => {
      try {
        const HTTP_STORAGE_BACKEND_URL = await getEnv(
          EnvVar.HTTP_STORAGE_BACKEND_URL,
        );
        const response = await fetch(`${HTTP_STORAGE_BACKEND_URL}/files/${id}`);
        if (response.status < 400) {
          const arrayBuffer = await response.arrayBuffer();

          const { data, metadata } = await decompressData<BinaryFileMetadata>(
            new Uint8Array(arrayBuffer),
            {
              decryptionKey,
            },
          );

          const dataURL = new TextDecoder().decode(data) as DataURL;

          loadedFiles.push({
            mimeType: metadata.mimeType || MIME_TYPES.binary,
            id,
            dataURL,
            created: metadata?.created || Date.now(),
          });
        } else {
          erroredFiles.set(id, true);
        }
      } catch (error: any) {
        erroredFiles.set(id, true);
        console.error(error);
      }
    }),
  );
  //////

  return { loadedFiles, erroredFiles };
};

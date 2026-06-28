declare module 'firebase/storage' {
  import type { FirebaseApp } from 'firebase/app';

  export interface UploadTask {
    on: (...args: any[]) => any;
    cancel: () => void;
    then: (...args: any[]) => any;
    catch: (...args: any[]) => any;
  }

  export function getStorage(app?: FirebaseApp): any;
  export function ref(storage: any, path: string): any;
  export function uploadBytes(storageRef: any, data: Blob | Uint8Array | ArrayBuffer): Promise<any>;
  export function uploadString(storageRef: any, data: string, format?: string): Promise<any>;
  export function deleteObject(storageRef: any): Promise<void>;
  export function getDownloadURL(storageRef: any): Promise<string>;
  export function connectStorageEmulator(storage: any, host: string, port: number): void;
}

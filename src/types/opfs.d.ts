declare interface FileSystemDirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
}

declare interface FileSystemFileHandle {
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>
  getFile(): Promise<File>
  createSyncAccessHandle?: () => Promise<FileSystemSyncAccessHandle>
}

declare interface FileSystemWritableFileStream extends WritableStream {
  close(): Promise<void>
}

declare interface FileSystemSyncAccessHandle {
  close(): void
  flush(): void
  getSize(): number
  read(buffer: BufferSource, options?: { at?: number }): number
  write(buffer: BufferSource, options?: { at?: number }): number
}

declare interface StorageManager {
  getDirectory?(): Promise<FileSystemDirectoryHandle>
}

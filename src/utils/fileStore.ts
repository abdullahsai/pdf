import { createId } from './id'

export const OPFS_SIZE_THRESHOLD = 200 * 1024 * 1024 // 200 MB
export const OPFS_PAGE_THRESHOLD = 1000
const OPFS_NAMESPACE = 'pdf-studio'

export type MemoryFileReference = {
  type: 'memory'
  blob: Blob
  size: number
  name: string
}

export type OPFSFileReference = {
  type: 'opfs'
  path: string
  size: number
  name: string
}

export type StoredFileReference = MemoryFileReference | OPFSFileReference

async function getAppDirectory(): Promise<FileSystemDirectoryHandle> {
  const nav = getOPFSNavigator()
  const root = await nav.storage.getDirectory!()
  return await root.getDirectoryHandle(OPFS_NAMESPACE, { create: true })
}

type OPFSNavigator = Navigator & {
  storage: StorageManager & { getDirectory?: () => Promise<FileSystemDirectoryHandle> }
}

function getOPFSNavigator(): OPFSNavigator {
  if (typeof navigator === 'undefined') {
    throw new Error('Navigator is not available in this environment.')
  }
  const nav = navigator as OPFSNavigator
  if (!nav.storage?.getDirectory) {
    throw new Error('Origin Private File System is not available in this browser.')
  }
  return nav
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function saveToOPFS(blob: Blob, originalName: string): Promise<OPFSFileReference> {
  const directory = await getAppDirectory()
  const slug = slugify(originalName || 'document') || 'document'
  const fileName = `${createId('pdf')}-${slug}.pdf`
  const handle = await directory.getFileHandle(fileName, { create: true })
  const writable = await handle.createWritable()
  await blob.stream().pipeTo(writable)
  await writable.close()
  return {
    type: 'opfs',
    path: fileName,
    size: blob.size,
    name: originalName,
  }
}

export async function deleteFromOPFS(path: string): Promise<void> {
  const directory = await getAppDirectory()
  await directory.removeEntry(path, { recursive: false })
}

export async function readOPFSFile(path: string): Promise<ArrayBuffer> {
  const directory = await getAppDirectory()
  const handle = await directory.getFileHandle(path)
  if ('createSyncAccessHandle' in handle) {
    const access = await (handle as any).createSyncAccessHandle()
    try {
      const size = access.getSize()
      const buffer = new ArrayBuffer(size)
      access.read(new Uint8Array(buffer))
      return buffer
    } finally {
      access.close()
    }
  }
  const file = await handle.getFile()
  return await file.arrayBuffer()
}

export async function readChunk(
  path: string,
  offset: number,
  length: number,
): Promise<Uint8Array> {
  const directory = await getAppDirectory()
  const handle = await directory.getFileHandle(path)
  if ('createSyncAccessHandle' in handle) {
    const access = await (handle as any).createSyncAccessHandle()
    try {
      const buffer = new Uint8Array(length)
      access.read(buffer, { at: offset })
      return buffer
    } finally {
      access.close()
    }
  }
  const file = await handle.getFile()
  const slice = file.slice(offset, offset + length)
  const buffer = await slice.arrayBuffer()
  return new Uint8Array(buffer)
}

export async function storeFile(
  file: File,
  options: { pageCountHint?: number } = {},
): Promise<StoredFileReference> {
  const { pageCountHint } = options
  const shouldUseOPFS =
    file.size >= OPFS_SIZE_THRESHOLD || (typeof pageCountHint === 'number' && pageCountHint >= OPFS_PAGE_THRESHOLD)

  if (!shouldUseOPFS) {
    return {
      type: 'memory',
      blob: file,
      size: file.size,
      name: file.name,
    }
  }

  try {
    return await saveToOPFS(file, file.name)
  } catch (error) {
    console.warn('Falling back to in-memory storage because OPFS write failed.', error)
    return {
      type: 'memory',
      blob: file,
      size: file.size,
      name: file.name,
    }
  }
}

export async function readFromReference(ref: StoredFileReference): Promise<ArrayBuffer> {
  if (ref.type === 'memory') {
    return await ref.blob.arrayBuffer()
  }
  return await readOPFSFile(ref.path)
}

export function shouldUseOPFSForSize(size: number, pageCountHint?: number): boolean {
  return size >= OPFS_SIZE_THRESHOLD || (typeof pageCountHint === 'number' && pageCountHint >= OPFS_PAGE_THRESHOLD)
}

export async function ensureOPFSCapacity(): Promise<boolean> {
  try {
    getOPFSNavigator()
    await getAppDirectory()
    return true
  } catch (error) {
    console.warn('Unable to initialize OPFS', error)
    return false
  }
}

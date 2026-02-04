import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { getFiles, getStorageUsage, uploadFileToRepo, deleteFile } from '~/server/files'
import { getFolders, createFolder, deleteFolder } from '~/server/folders'
import { FORM_INPUT, BTN_BASE, BTN_PRIMARY, SETTINGS_CARD } from '~/components/forms'
import type { FileRow, FolderRow } from '~/types/database'

export const Route = createFileRoute('/_dashboard/dashboard/files')({
  loader: async () => {
    const [files, folders, storage] = await Promise.all([
      getFiles({ data: { folderId: undefined } }),
      getFolders(),
      getStorageUsage(),
    ])
    return { files, folders, storage }
  },
  component: FilesPage,
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function StorageBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100)
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-text-secondary mb-1">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(limit)} total</span>
      </div>
      <div className="h-2 bg-bg rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function DropZone({
  uploading,
  onFiles,
}: {
  uploading: boolean
  onFiles: (files: FileList) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files)
    },
    [onFiles],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-6 ${
        dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-border'
      }`}
    >
      <p className="text-text-secondary text-sm mb-3">
        {uploading ? 'Uploading...' : 'Drag & drop files here'}
      </p>
      <label className={`${BTN_PRIMARY} cursor-pointer inline-block ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
        Browse Files
        <input
          type="file"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) onFiles(e.target.files)
          }}
        />
      </label>
    </div>
  )
}

function FileCard({
  file,
  onDelete,
  onPreview,
}: {
  file: FileRow
  onDelete: (id: string) => void
  onPreview: (file: FileRow) => void
}) {
  const isImage = file.file_type === 'image'

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden group">
      {/* Preview area */}
      <div
        className="h-36 flex items-center justify-center bg-border cursor-pointer"
        onClick={() => isImage && onPreview(file)}
      >
        {isImage ? (
          <img
            src={file.file_url}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium text-text-secondary bg-bg px-3 py-1 rounded">
            {file.file_type}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-bold truncate mb-1">{file.name}</p>
        <p className="text-xs text-text-secondary mb-2">{formatBytes(file.file_size)}</p>

        {file.tags && file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {file.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-wider bg-accent/20 text-accent px-1.5 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <a
            href={file.file_url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className={`${BTN_BASE} text-xs bg-bg hover:bg-border text-text-primary`}
          >
            Download
          </a>
          <button
            onClick={() => onDelete(file.id)}
            className={`${BTN_BASE} text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewModal({ file, onClose }: { file: FileRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div className="max-w-4xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
        <img
          src={file.file_url}
          alt={file.name}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
        <p className="text-center text-sm text-text-secondary mt-2">{file.name}</p>
      </div>
    </div>
  )
}

function FolderSidebar({
  folders,
  currentFolder,
  onSelect,
  onCreateFolder,
  onDeleteFolder,
}: {
  folders: FolderRow[]
  currentFolder: string | null
  onSelect: (id: string | null) => void
  onCreateFolder: (name: string) => void
  onDeleteFolder: (id: string) => void
}) {
  const [newName, setNewName] = useState('')

  return (
    <div className="w-48 flex-shrink-0 border-r border-border pr-4 mr-4">
      <h3 className="text-xs font-medium text-text-secondary mb-3">Folders</h3>

      <button
        onClick={() => onSelect(null)}
        className={`block w-full text-left text-sm px-2 py-1.5 rounded transition-colors mb-1 ${
          currentFolder === null
            ? 'bg-accent/20 text-accent font-bold'
            : 'text-text-secondary hover:text-text-primary hover:bg-border'
        }`}
      >
        All Files
      </button>

      {folders.map((folder) => (
        <div key={folder.id} className="flex items-center group mb-1">
          <button
            onClick={() => onSelect(folder.id)}
            className={`flex-1 text-left text-sm px-2 py-1.5 rounded transition-colors truncate ${
              currentFolder === folder.id
                ? 'bg-accent/20 text-accent font-bold'
                : 'text-text-secondary hover:text-text-primary hover:bg-border'
            }`}
          >
            {folder.name}
          </button>
          <button
            onClick={() => onDeleteFolder(folder.id)}
            className="text-red-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity px-1"
            aria-label={`Delete folder ${folder.name}`}
          >
            x
          </button>
        </div>
      ))}

      <div className="mt-3 flex gap-1">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New folder"
          className={`${FORM_INPUT} text-xs !px-2 !py-1.5 flex-1`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              onCreateFolder(newName.trim())
              setNewName('')
            }
          }}
        />
        <button
          onClick={() => {
            if (newName.trim()) {
              onCreateFolder(newName.trim())
              setNewName('')
            }
          }}
          className={`${BTN_PRIMARY} text-xs !px-2 !py-1.5`}
        >
          +
        </button>
      </div>
    </div>
  )
}

function FilesPage() {
  const { files: initialFiles, folders: initialFolders, storage } = Route.useLoaderData()

  const [files, setFiles] = useState<FileRow[]>(initialFiles as FileRow[])
  const [folders, setFolders] = useState<FolderRow[]>(initialFolders as FolderRow[])
  const [storageUsage, setStorageUsage] = useState(storage)
  const [currentFolder, setCurrentFolder] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null)
  const [error, setError] = useState('')

  const isPro = storageUsage.tier === 'pro'

  const filteredFiles = currentFolder === null
    ? files
    : files.filter((f) => f.folder_id === currentFolder)

  const handleUpload = useCallback(
    async (fileList: FileList) => {
      setUploading(true)
      setError('')

      for (const file of Array.from(fileList)) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              resolve(result.split(',')[1])
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

          const result = await uploadFileToRepo({
            data: {
              base64,
              fileName: file.name,
              contentType: file.type,
              fileSize: file.size,
              folderId: currentFolder,
            },
          })

          if ('error' in result && result.error) {
            setError(result.error)
            break
          }

          if ('file' in result && result.file) {
            setFiles((prev) => [result.file as FileRow, ...prev])
            setStorageUsage((prev) => ({ ...prev, used: prev.used + file.size }))
          }
        } catch {
          setError('Upload failed. Please try again.')
          break
        }
      }

      setUploading(false)
    },
    [currentFolder],
  )

  const handleDelete = useCallback(async (id: string) => {
    const file = files.find((f) => f.id === id)
    const result = await deleteFile({ data: { id } })
    if ('error' in result && result.error) {
      setError(result.error)
      return
    }
    setFiles((prev) => prev.filter((f) => f.id !== id))
    if (file) {
      setStorageUsage((prev) => ({ ...prev, used: Math.max(0, prev.used - file.file_size) }))
    }
  }, [files])

  const handleCreateFolder = useCallback(async (name: string) => {
    const result = await createFolder({ data: { name } })
    if ('error' in result && result.error) {
      setError(result.error)
      return
    }
    if ('folder' in result && result.folder) {
      setFolders((prev) => [...prev, result.folder as FolderRow])
    }
  }, [])

  const handleDeleteFolder = useCallback(async (id: string) => {
    const result = await deleteFolder({ data: { id } })
    if ('error' in result && result.error) {
      setError(result.error)
      return
    }
    setFolders((prev) => prev.filter((f) => f.id !== id))
    if (currentFolder === id) setCurrentFolder(null)
  }, [currentFolder])

  return (
    <div>
      <h1 className="text-2xl font-display font-semibold tracking-tight mb-8">File Repository</h1>

      <StorageBar used={storageUsage.used} limit={storageUsage.limit} />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {!isPro && (
        <div className={`${SETTINGS_CARD} mb-6`}>
          <h2 className="font-medium text-text-secondary mb-2">Free Tier</h2>
          <p className="text-sm text-text-secondary mb-3">
            You have {formatBytes(storageUsage.limit)} of storage. Upgrade to Pro for 100 GB storage, folders, and more.
          </p>
          <Link to="/dashboard/settings" className={BTN_PRIMARY}>
            Upgrade to Pro
          </Link>
        </div>
      )}

      <div className="flex">
        {isPro && (
          <FolderSidebar
            folders={folders}
            currentFolder={currentFolder}
            onSelect={setCurrentFolder}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        )}

        <div className="flex-1 min-w-0">
          <DropZone uploading={uploading} onFiles={handleUpload} />

          {filteredFiles.length === 0 ? (
            <p className="text-text-secondary text-sm text-center py-12">
              No files yet. Upload some files to get started.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDelete={handleDelete}
                  onPreview={setPreviewFile}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {previewFile && (
        <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  )
}

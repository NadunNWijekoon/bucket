import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'node:path'
import os from 'node:os'
import fs from 'fs-extra'
import got from 'got'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
//
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Match the custom UI toolbar
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0e1a',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

// ========================================
// IPC Handlers
// ========================================

ipcMain.on('window-action', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return
  if (action === 'minimize') win.minimize()
  if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize()
  if (action === 'close') win.close()
})

ipcMain.handle('get-download-path', () => {
  const bucketPath = path.join(app.getPath('downloads'), 'Bucket')
  fs.ensureDirSync(bucketPath)
  return bucketPath
})

ipcMain.handle('open-folder', async (event, folderPath) => {
  const target = folderPath || path.join(app.getPath('downloads'), 'Bucket')
  await shell.openPath(target)
})

// ========================================
// Download Logic
// ========================================

const activeDownloads = new Map<string, any>()

ipcMain.on('start-download', async (event, { id, url, filename }) => {
  const bucketPath = path.join(app.getPath('downloads'), 'Bucket')
  fs.ensureDirSync(bucketPath)

  // Sanitize filename: strip query/hash and illegal chars, ensure uniqueness
  let safeFilename = filename || `download-${id}`
  safeFilename = safeFilename.split('?')[0].split('#')[0]
  safeFilename = safeFilename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim()
  if (!safeFilename) safeFilename = `download-${id}`
  if (safeFilename.length > 200) safeFilename = safeFilename.slice(0, 200)

  // We'll write to a temporary file first, then rename when we know final filename
  const tempFilePath = path.join(bucketPath, `${id}.download`)
  let finalFilename = safeFilename
  let finalFilePath = path.join(bucketPath, finalFilename)
  const base = path.basename(finalFilename, path.extname(finalFilename))
  const ext = path.extname(finalFilename)
  let counter = 1
  while (fs.existsSync(finalFilePath)) {
    finalFilePath = path.join(bucketPath, `${base} (${counter})${ext}`)
    counter++
  }

  try {
    // Host-specific downloaders (YouTube, etc.)
    let isYouTube = false
    try {
      const u = new URL(url)
      const host = (u.hostname || '').toLowerCase()
      if (host.includes('youtube.com') || host.includes('youtu.be')) isYouTube = true
    } catch (e) {
      isYouTube = false
    }

    const fileStream = fs.createWriteStream(tempFilePath)

    if (isYouTube) {
      try {
        const ytdlMod: any = await import('ytdl-core')
        const ytdl = ytdlMod.default || ytdlMod
        const info: any = await ytdl.getInfo(url)
        // prefer formats with both audio and video
        const avFormats = (info.formats || []).filter((f: any) => f.hasVideo && f.hasAudio && f.container)
        let chosen: any = avFormats.length ? avFormats[0] : (info.formats && info.formats[0])
        // pick highest bitrate if available
        if (avFormats.length > 1) {
          avFormats.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))
          chosen = avFormats[0]
        }

        const container = (chosen && chosen.container) || 'mp4'
        const title = (info.videoDetails && info.videoDetails.title) ? info.videoDetails.title : `video-${id}`
        finalFilename = `${title}${container.startsWith('.') ? '' : '.'}${container}`
        finalFilename = finalFilename.split('?')[0].split('#')[0].replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')

        finalFilePath = path.join(bucketPath, finalFilename)
        let cc = 1
        while (fs.existsSync(finalFilePath)) {
          finalFilePath = path.join(bucketPath, `${path.basename(finalFilename, path.extname(finalFilename))} (${cc})${path.extname(finalFilename)}`)
          cc++
        }

        // Start ytdl stream
        const ytStream: any = ytdl.downloadFromInfo(info, { format: chosen })
        activeDownloads.set(id, { downloadStream: ytStream, fileStream, tempFilePath, finalFilePath })

        const total = chosen && chosen.contentLength ? parseInt(chosen.contentLength, 10) : undefined
        win?.webContents.send(`download-metadata-${id}`, { filename: finalFilename, total })

        console.log(`[download] start (youtube) ${id} ${url} -> ${tempFilePath}`)
        const startTime = Date.now()

        ytStream.on('progress', (chunkLength: number, downloaded: number, totalBytes: number) => {
          const elapsedMs = Date.now() - startTime
          const elapsedSec = elapsedMs > 0 ? elapsedMs / 1000 : 0.001
          const speed = downloaded ? Math.round(downloaded / elapsedSec) : 0
          win?.webContents.send(`download-progress-${id}`, {
            percent: totalBytes ? downloaded / totalBytes : undefined,
            transferred: downloaded,
            total: totalBytes,
            speed,
          })
        })

        ytStream.on('error', (err: any) => {
          console.error(`[download] yt stream error ${id}:`, err?.message || err)
          win?.webContents.send(`download-failed-${id}`, err?.message || String(err))
          activeDownloads.delete(id)
          try { fileStream.destroy() } catch {}
        })

        ytStream.pipe(fileStream)

        fileStream.on('finish', () => {
          try {
            if (tempFilePath !== finalFilePath) fs.moveSync(tempFilePath, finalFilePath, { overwrite: false })
          } catch (err: any) {
            console.error(`[download] rename error ${id}:`, err?.message || err)
            win?.webContents.send(`download-failed-${id}`, err?.message || String(err))
            activeDownloads.delete(id)
            return
          }
          console.log(`[download] completed ${id} -> ${finalFilePath}`)
          win?.webContents.send(`download-completed-${id}`, { filePath: finalFilePath })
          activeDownloads.delete(id)
        })

        fileStream.on('error', (err: any) => {
          console.error(`[download] file error ${id}:`, err?.message || err)
          win?.webContents.send(`download-failed-${id}`, err?.message || String(err))
          activeDownloads.delete(id)
        })

        return
      } catch (err: any) {
        console.warn(`[download] ytdl-core failed ${id}:`, err?.message || err)
        // Fallback to system `yt-dlp` (must be installed on host). We'll try to get metadata and then download.
        try {
          const cp = await import('child_process')
          const { spawn } = cp

          // Check if yt-dlp is available
          await new Promise((resolve, reject) => {
            const v = spawn('yt-dlp', ['--version'])
            v.on('error', (e: any) => reject(e))
            v.on('close', (code: number) => code === 0 ? resolve(null) : reject(new Error('yt-dlp not found')))
          })

          // Fetch metadata JSON
          const metaJson: string = await new Promise((resolve, reject) => {
            const p = spawn('yt-dlp', ['-J', url], { stdio: ['ignore', 'pipe', 'pipe'] })
            let out = ''
            let errOut = ''
            p.stdout.on('data', (d: Buffer) => out += d.toString())
            p.stderr.on('data', (d: Buffer) => errOut += d.toString())
            p.on('error', (e: any) => reject(e))
            p.on('close', (code: number) => code === 0 ? resolve(out) : reject(new Error(errOut || `yt-dlp meta exit ${code}`)))
          })

          let info: any = {}
          try { info = JSON.parse(metaJson) } catch (e) { info = {} }

          const title = info.title || `video-${id}`
          const container = info.ext || 'mp4'
          finalFilename = `${title}${container.startsWith('.') ? '' : '.'}${container}`.split('?')[0].split('#')[0].replace(/[<>:\"/\\|?*\x00-\x1F]/g, '_')

          finalFilePath = path.join(bucketPath, finalFilename)
          let cc2 = 1
          while (fs.existsSync(finalFilePath)) {
            finalFilePath = path.join(bucketPath, `${path.basename(finalFilename, path.extname(finalFilename))} (${cc2})${path.extname(finalFilename)}`)
            cc2++
          }

          const total = info.filesize || info.filesize_approx
          win?.webContents.send(`download-metadata-${id}`, { filename: finalFilename, total })

          // Start yt-dlp download to temp file
          await new Promise((resolve, reject) => {
            const dl = spawn('yt-dlp', ['-f', 'best', '-o', tempFilePath, url], { stdio: ['ignore', 'pipe', 'pipe'] })
            dl.stdout.on('data', () => {})
            dl.stderr.on('data', (d: Buffer) => {
              const s = d.toString()
              // Attempt to parse progress lines like "[download]  12.3% of 50.00MiB at 1.00MiB/s ETA 00:30"
              const m = s.match(/\[download\]\s+([0-9]{1,3}\.\d+)% of ([^\s]+) at ([^\s]+)\/s/) || s.match(/\[download\]\s+([0-9]{1,3}\.\d+)%/)
              if (m) {
                const percent = parseFloat(m[1]) / 100
                // transferred/total not easily parsed reliably here; send percent only
                win?.webContents.send(`download-progress-${id}`, { percent, transferred: undefined, total: total, speed: undefined })
              }
            })
            dl.on('error', (e: any) => reject(e))
            dl.on('close', (code: number) => code === 0 ? resolve(null) : reject(new Error(`yt-dlp exit ${code}`)))
          })

          // Move to final
          try {
            if (tempFilePath !== finalFilePath) fs.moveSync(tempFilePath, finalFilePath, { overwrite: false })
          } catch (err2: any) {
            console.error(`[download] rename error ${id}:`, err2?.message || err2)
            win?.webContents.send(`download-failed-${id}`, err2?.message || String(err2))
            activeDownloads.delete(id)
            return
          }

          console.log(`[download] completed (yt-dlp) ${id} -> ${finalFilePath}`)
          win?.webContents.send(`download-completed-${id}`, { filePath: finalFilePath })
          activeDownloads.delete(id)
          return
        } catch (err2: any) {
          console.error(`[download] yt-dlp fallback error ${id}:`, err2?.message || err2)
          win?.webContents.send(`download-failed-${id}`, err2?.message || String(err2))
          activeDownloads.delete(id)
          try { fs.unlinkSync(tempFilePath) } catch {}
          return
        }
      }
    }

    // Generic HTTP download (got)
    const downloadStream = got.stream(url)

    activeDownloads.set(id, { downloadStream, fileStream, tempFilePath, finalFilePath })

    console.log(`[download] start ${id} ${url} -> ${tempFilePath}`)
    const startTime = Date.now()

    // helpers
    const parseContentDisposition = (cd?: string) => {
      if (!cd) return undefined
      // filename*=UTF-8''encoded or filename="name"
      const fnStar = /filename\*=(?:UTF-8'')?([^;\n]+)/i.exec(cd)
      if (fnStar && fnStar[1]) return fnStar[1].trim().replace(/^"|"$/g, '')
      const fn = /filename=(?:"?)([^;\n"]+)(?:"?)/i.exec(cd)
      if (fn && fn[1]) return fn[1].trim().replace(/^"|"$/g, '')
      return undefined
    }

    const guessExtFromContentType = (ct?: string) => {
      if (!ct) return ''
      const mime = ct.split(';')[0].trim().toLowerCase()
      if (mime === 'video/mp4') return '.mp4'
      if (mime === 'video/x-matroska' || mime === 'video/mkv') return '.mkv'
      if (mime.startsWith('video/')) return `.${mime.split('/')[1]}`
      if (mime.startsWith('audio/')) return `.${mime.split('/')[1]}`
      if (mime.startsWith('image/')) return `.${mime.split('/')[1]}`
      if (mime === 'application/zip' || mime === 'application/x-zip-compressed') return '.zip'
      if (mime === 'application/pdf') return '.pdf'
      if (mime === 'application/octet-stream') return ''
      return `.${mime.split('/')[1]}`
    }

    downloadStream.on('response', (response: any) => {
      const statusCode = response && (response.statusCode || response.status) || 0
      if (statusCode >= 400) {
        const msg = `HTTP ${statusCode}`
        console.error(`[download] failed ${id}: ${msg}`)
        win?.webContents.send(`download-failed-${id}`, msg)
        activeDownloads.delete(id)
        downloadStream.destroy(new Error(msg))
        return
      }

      // pick up headers
      const headers = response.headers || {}
      const cd = headers['content-disposition'] || headers['Content-Disposition']
      const ct = headers['content-type'] || headers['Content-Type']
      const total = headers['content-length'] ? parseInt(headers['content-length'], 10) : undefined

      // determine final filename
      const cdFilename = parseContentDisposition(cd)
      if (cdFilename) {
        const cleaned = cdFilename.split('?')[0].split('#')[0].replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        finalFilename = cleaned
      } else if (!path.extname(finalFilename) && ct) {
        const guessed = guessExtFromContentType(ct)
        if (guessed) finalFilename = `${finalFilename}${guessed}`
      }

      // ensure unique final path
      finalFilePath = path.join(bucketPath, finalFilename)
      let c = 1
      while (fs.existsSync(finalFilePath)) {
        finalFilePath = path.join(bucketPath, `${path.basename(finalFilename, path.extname(finalFilename))} (${c})${path.extname(finalFilename)}`)
        c++
      }

      // send metadata to renderer so UI can update filename and size
      win?.webContents.send(`download-metadata-${id}`, { filename: finalFilename, total })
    })

    downloadStream.on('downloadProgress', (progress) => {
      const elapsedMs = Date.now() - startTime
      const elapsedSec = elapsedMs > 0 ? elapsedMs / 1000 : 0.001 // avoid division by zero
      const speed = progress && progress.transferred ? Math.round(progress.transferred / elapsedSec) : 0
      win?.webContents.send(`download-progress-${id}`, {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
        speed,
      })
    })

    downloadStream.on('error', (err: any) => {
      console.error(`[download] stream error ${id}:`, err?.message || err)
      win?.webContents.send(`download-failed-${id}`, err?.message || String(err))
      activeDownloads.delete(id)
      try { fileStream.destroy() } catch {}
    })

    downloadStream.pipe(fileStream)

    fileStream.on('finish', () => {
      // rename temp -> final
      try {
        if (tempFilePath !== finalFilePath) {
          fs.moveSync(tempFilePath, finalFilePath, { overwrite: false })
        }
      } catch (err: any) {
        console.error(`[download] rename error ${id}:`, err?.message || err)
        win?.webContents.send(`download-failed-${id}`, err?.message || String(err))
        activeDownloads.delete(id)
        return
      }
      console.log(`[download] completed ${id} -> ${finalFilePath}`)
      win?.webContents.send(`download-completed-${id}`, { filePath: finalFilePath })
      activeDownloads.delete(id)
    })

    fileStream.on('error', (err: any) => {
      console.error(`[download] file error ${id}:`, err?.message || err)
      win?.webContents.send(`download-failed-${id}`, err?.message || String(err))
      activeDownloads.delete(id)
    })

  } catch (error: any) {
    console.error(`[download] catch ${id}:`, error?.message || error)
    win?.webContents.send(`download-failed-${id}`, error?.message || String(error))
  }
})

ipcMain.on('cancel-download', (event, id) => {
  const dl = activeDownloads.get(id)
  if (dl) {
    dl.downloadStream.destroy()
    dl.fileStream.destroy()
    activeDownloads.delete(id)
  }
})

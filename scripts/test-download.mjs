import fs from 'fs-extra'
import path from 'path'
import got from 'got'

const url = process.argv[2] || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
const outdir = path.join(process.cwd(), 'tmp-downloads')
await fs.ensureDir(outdir)

let filename
try {
  filename = path.basename(new URL(url).pathname) || `download-${Date.now()}.bin`
} catch (err) {
  filename = `download-${Date.now()}.bin`
}

const filepath = path.join(outdir, filename)
console.log(`Starting download: ${url}\n -> ${filepath}`)

const startTime = Date.now()

const stream = got.stream(url)

stream.on('downloadProgress', (progress) => {
  const elapsedSec = Math.max((Date.now() - startTime) / 1000, 0.001)
  const speed = progress && progress.transferred ? Math.round(progress.transferred / elapsedSec) : 0
  console.log(`progress: ${(progress.percent || 0).toFixed(3)} transferred=${progress.transferred || 0} total=${progress.total || 0} speed=${speed} B/s`)
})

stream.on('response', (response) => {
  console.log(`response status: ${response.statusCode || response.status}`)
})

stream.on('error', (err) => {
  console.error('stream error:', err?.message || err)
  process.exitCode = 2
})

const fileStream = fs.createWriteStream(filepath)
stream.pipe(fileStream)

fileStream.on('finish', () => {
  console.log('download finished ->', filepath)
})

fileStream.on('error', (err) => {
  console.error('fileStream error:', err?.message || err)
  process.exitCode = 3
})

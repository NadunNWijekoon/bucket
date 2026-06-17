import ytdl from 'ytdl-core'

const url = process.argv[2] || 'https://youtube.com/shorts/ZcsaFZgWoEc?si=YDINLuBVABz6iO8W'

try {
  console.log('Fetching info for:', url)
  const info = await ytdl.getInfo(url)
  const title = (info.videoDetails && info.videoDetails.title) || `video-${Date.now()}`
  console.log('Title:', title)

  const formats = info.formats || []
  const av = formats.filter(f => f.hasVideo && f.hasAudio && f.container)
  av.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
  const chosen = av.length ? av[0] : formats[0]
  console.log('Chosen format summary:')
  console.log({ itag: chosen?.itag, container: chosen?.container, qualityLabel: chosen?.qualityLabel, bitrate: chosen?.bitrate, contentLength: chosen?.contentLength })
  const ext = chosen?.container || 'mp4'
  const filename = `${title}.${ext}`.replace(/[<>:\\"/\|?*\x00-\x1F]/g, '_')
  console.log('Suggested filename:', filename)
} catch (err) {
  console.error('ytdl info error:', err?.message || err)
  process.exitCode = 2
}

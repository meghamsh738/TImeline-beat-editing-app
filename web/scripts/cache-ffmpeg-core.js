import fs from 'fs'
import path from 'path'

const srcDir = path.join(process.cwd(), 'node_modules', '@ffmpeg', 'core', 'dist', 'umd')
const destDir = path.join(process.cwd(), 'public', 'ffmpeg-core')

const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm']

if (!fs.existsSync(srcDir)) {
  console.error('Source ffmpeg core not found:', srcDir)
  process.exit(1)
}

fs.mkdirSync(destDir, { recursive: true })

for (const file of files) {
  const from = path.join(srcDir, file)
  const to = path.join(destDir, file)
  if (!fs.existsSync(from)) {
    console.warn('Missing file, skipping', from)
    continue
  }
  fs.copyFileSync(from, to)
  console.log('Cached', file)
}

console.log('ffmpeg core cached to public/ffmpeg-core')

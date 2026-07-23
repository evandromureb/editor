/**
 * @file Development HTTP server with auto-discover on startup.
 */

import { createReadStream, existsSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'

const root = fileURLToPath(new URL('..', import.meta.url))
const port = Number(process.env.PORT) || 3000

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

console.log('[dev] Running discover...')
execSync('node scripts/discover.js', { stdio: 'inherit', cwd: root })

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`)
  let pathname = decodeURIComponent(url.pathname)

  if (pathname === '/' || pathname === '') {
    pathname = '/demo/index.html'
  }

  if (pathname.endsWith('/')) {
    pathname += 'index.html'
  }

  const filePath = normalize(join(root, pathname))

  if (!filePath.startsWith(root)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404)
    response.end(`Not found: ${pathname}`)
    return
  }

  const ext = extname(filePath)
  response.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' })
  createReadStream(filePath).pipe(response)
})

server.listen(port, () => {
  console.log('')
  console.log(`  Demo:  http://localhost:${port}/demo/`)
  console.log(`  Embed: http://localhost:${port}/dist/embed.html (after make build)`)
  console.log('')
  console.log('  ES Modules require HTTP — do not open files via file://')
})

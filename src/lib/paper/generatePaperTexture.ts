import * as THREE from 'three'

const TEXTURE_SIZE = 512

const cache = new Map<string, THREE.CanvasTexture>()

export function generatePaperTexture(
  hexColor: string,
  hasLines: boolean
): THREE.CanvasTexture {
  const key = `${hexColor}-${hasLines}`
  if (cache.has(key)) return cache.get(key)!

  const canvas = document.createElement('canvas')
  canvas.width = TEXTURE_SIZE
  canvas.height = TEXTURE_SIZE
  const ctx = canvas.getContext('2d')!

  // Base paper color
  ctx.fillStyle = hexColor
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE)

  // Subtle paper fiber grain (random dots at low opacity)
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * TEXTURE_SIZE
    const y = Math.random() * TEXTURE_SIZE
    const light = Math.random() > 0.5
    const a = Math.random() * 0.022
    ctx.fillStyle = light ? `rgba(255,245,235,${a})` : `rgba(80,60,40,${a})`
    ctx.fillRect(x, y, 1, 1)
  }

  // Faint fibrous horizontal streaks
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * TEXTURE_SIZE
    const len = 20 + Math.random() * 80
    const x = Math.random() * (TEXTURE_SIZE - len)
    ctx.strokeStyle = `rgba(200,180,150,${0.04 + Math.random() * 0.03})`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 2)
    ctx.stroke()
  }

  // Ruled lines (notebook style) — very subtle
  if (hasLines) {
    const spacing = 26
    ctx.strokeStyle = 'rgba(100,80,60,0.09)'
    ctx.lineWidth = 0.8
    for (let y = spacing; y < TEXTURE_SIZE; y += spacing) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(TEXTURE_SIZE, y)
      ctx.stroke()
    }
    // Red margin line — barely visible
    ctx.strokeStyle = 'rgba(200,80,60,0.07)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(TEXTURE_SIZE * 0.14, 0)
    ctx.lineTo(TEXTURE_SIZE * 0.14, TEXTURE_SIZE)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2) // tile so texture isn't too zoomed in on the ball surface

  cache.set(key, tex)
  return tex
}

export function disposeTextureCache() {
  cache.forEach((t) => t.dispose())
  cache.clear()
}

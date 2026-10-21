import * as THREE from 'three';

const textureCache: Map<string, THREE.CanvasTexture> = new Map();

export function getProceduralTexture(type: 'tile' | 'wood' | 'brick' | 'metal' | 'linoleum' | 'chalkboard'): THREE.CanvasTexture {
  if (textureCache.has(type)) {
    return textureCache.get(type)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  switch (type) {
    case 'tile':
    case 'linoleum': {
      // School floor tiles
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, 512, 512);

      // 4x4 tile grid
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      for (let i = 0; i <= 512; i += 128) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }

      // Linoleum speckles
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        ctx.fillStyle = Math.random() > 0.5 ? '#cbd5e1' : '#64748b';
        ctx.fillRect(x, y, 2 + Math.random() * 2, 2 + Math.random() * 2);
      }
      break;
    }

    case 'wood': {
      // Wood planks (classroom desks, gymnasium floor, library)
      ctx.fillStyle = '#d97706';
      ctx.fillRect(0, 0, 512, 512);

      // Horizontal plank lines
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      for (let y = 0; y <= 512; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // Grain fibers
      ctx.fillStyle = 'rgba(113, 63, 18, 0.12)';
      for (let i = 0; i < 60; i++) {
        const y = Math.random() * 512;
        ctx.fillRect(0, y, 512, 1 + Math.random() * 3);
      }
      break;
    }

    case 'brick': {
      // School wall brick masonry
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, 512, 512);

      const brickH = 32;
      const brickW = 64;
      let row = 0;

      for (let y = 0; y < 512; y += brickH) {
        const offset = (row % 2) * (brickW / 2);
        for (let x = -offset; x < 512; x += brickW) {
          ctx.fillStyle = (row + Math.floor(x / brickW)) % 3 === 0 ? '#b91c1c' : '#991b1b';
          ctx.fillRect(x + 2, y + 2, brickW - 4, brickH - 4);
        }
        row++;
      }
      break;
    }

    case 'metal': {
      // Locker metal with vents
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 512, 512);

      ctx.fillStyle = '#0f172a';
      // Locker vents
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(180, 80 + i * 18, 150, 8);
        ctx.fillRect(180, 320 + i * 18, 150, 8);
      }

      // Vertical door seams
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 20, 432, 472);
      break;
    }

    case 'chalkboard': {
      // Deep green chalkboard
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(0, 0, 512, 512);

      // Chalk dust smudges
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 60, 0, Math.PI * 2);
        ctx.fill();
      }

      // Chalk handwriting sample: "E = mc²", "QUIZ HOJE"
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '28px sans-serif';
      ctx.fillText('E = mc²', 60, 100);
      ctx.fillText('QUIZ HOJE!', 280, 180);
      ctx.fillText('2x + 5 = 15', 70, 320);

      // Frame
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, 512, 512);
      break;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);

  textureCache.set(type, texture);
  return texture;
}

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { getCroppedImg } from '../utils/imageProcessor'

interface CropModalProps {
  image: string
  onCropComplete: (croppedImage: string) => void
  onCancel: () => void
}

interface RatioPreset {
  label: string
  w: number
  h: number
}

const RATIO_PRESETS: RatioPreset[] = [
  { label: '9:16', w: 9, h: 16 },
  { label: '3:2', w: 3, h: 2 },
  { label: '4:3', w: 4, h: 3 },
  { label: '4:5', w: 4, h: 5 },
  { label: '1:1', w: 1, h: 1 },
]

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const CropModal: React.FC<CropModalProps> = ({ image, onCropComplete, onCancel }) => {
  const [rect, setRect] = useState<Rect>({ x: 10, y: 10, width: 80, height: 80 })
  const [activePreset, setActivePreset] = useState<RatioPreset | null>(null)
  const [isHorizontal, setIsHorizontal] = useState(false)
  const [dragState, setDragState] = useState<{ type: 'move' | 'resize', dir?: string, startX: number, startY: number, startRect: Rect } | null>(null)
  
  const imgRef = useRef<HTMLImageElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const getAspect = useCallback((preset: RatioPreset, horizontal: boolean) => {
    if (preset.w === preset.h) return 1
    return horizontal ? Math.max(preset.w, preset.h) / Math.min(preset.w, preset.h) : Math.min(preset.w, preset.h) / Math.max(preset.w, preset.h)
  }, [])

  const updateRectWithAspect = useCallback((newRect: Rect, aspect: number | null) => {
    if (!aspect || !imgRef.current) return newRect
    
    let { width, height, x, y } = newRect
    const imgAspect = imgRef.current.naturalWidth / imgRef.current.naturalHeight
    
    // Maintain width, adjust height based on aspect
    // width% / height% = aspect / imgAspect
    height = (width * imgAspect) / aspect
    
    // Bounds check and shift if necessary
    if (y + height > 100) {
        y = Math.max(0, 100 - height)
        if (y === 0 && height > 100) {
            height = 100
            width = (height * aspect) / imgAspect
        }
    }
    if (x + width > 100) {
        x = Math.max(0, 100 - width)
    }
    
    return { x, y, width, height }
  }, [])

  const handlePresetSelect = (preset: RatioPreset) => {
    setActivePreset(preset)
    const aspect = getAspect(preset, isHorizontal)
    setRect(prev => updateRectWithAspect({ ...prev, width: 80, x: 10, y: 10 }, aspect))
  }

  const toggleOrientation = () => {
    const nextHorizontal = !isHorizontal
    setIsHorizontal(nextHorizontal)
    if (activePreset) {
      const aspect = getAspect(activePreset, nextHorizontal)
      setRect(prev => updateRectWithAspect({ ...prev }, aspect))
    }
  }

  const onMouseDown = (e: React.MouseEvent, type: 'move' | 'resize', dir?: string) => {
    e.preventDefault()
    e.stopPropagation() // Crucial to prevent move-triggering on parent
    setDragState({
      type,
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startRect: { ...rect }
    })
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragState || !wrapperRef.current || !imgRef.current) return

      const dx = ((e.clientX - dragState.startX) / wrapperRef.current.offsetWidth) * 100
      const dy = ((e.clientY - dragState.startY) / wrapperRef.current.offsetHeight) * 100

      setRect(() => {
        let { x, y, width, height } = { ...dragState.startRect }
        
        if (dragState.type === 'move') {
          x = Math.max(0, Math.min(100 - width, x + dx))
          y = Math.max(0, Math.min(100 - height, y + dy))
        } else if (dragState.type === 'resize' && dragState.dir) {
          const dir = dragState.dir
          const aspect = activePreset ? getAspect(activePreset, isHorizontal) : null
          const imgAspect = imgRef.current!.naturalWidth / imgRef.current!.naturalHeight

          if (dir.includes('e')) width = Math.max(5, Math.min(100 - x, width + dx))
          if (dir.includes('s')) height = Math.max(5, Math.min(100 - y, height + dy))
          if (dir.includes('w')) {
            const oldX = x
            x = Math.max(0, Math.min(x + width - 5, x + dx))
            width += (oldX - x)
          }
          if (dir.includes('n')) {
            const oldY = y
            y = Math.max(0, Math.min(y + height - 5, y + dy))
            height += (oldY - y)
          }

          if (aspect) {
            // Maintain aspect ratio during resize
            // We prioritize the change that was explicitly dragged
            if (dir === 'e' || dir === 'w' || (Math.abs(dx) > Math.abs(dy) && (dir.length === 2))) {
                height = (width * imgAspect) / aspect
                // If height goes out of bounds, re-adjust width
                if (y + height > 100) {
                    height = 100 - y
                    width = (height * aspect) / imgAspect
                }
            } else {
                width = (height * aspect) / imgAspect
                // If width goes out of bounds, re-adjust height
                if (x + width > 100) {
                    width = 100 - x
                    height = (width * imgAspect) / aspect
                }
            }
          }
        }

        return { x, y, width, height }
      })
    }

    const onMouseUp = () => {
      setDragState(null)
    }

    if (dragState) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragState, activePreset, isHorizontal, getAspect])

  const handleConfirm = async () => {
    if (!imgRef.current) return
    const img = imgRef.current
    const pixelCrop = {
      x: (rect.x / 100) * img.naturalWidth,
      y: (rect.y / 100) * img.naturalHeight,
      width: (rect.width / 100) * img.naturalWidth,
      height: (rect.height / 100) * img.naturalHeight,
    }
    const cropped = await getCroppedImg(image, pixelCrop)
    onCropComplete(cropped)
  }

  // Clip path for the hole in the overlay
  const clipPath = `polygon(
    0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
    ${rect.x}% ${rect.y}%, 
    ${rect.x + rect.width}% ${rect.y}%, 
    ${rect.x + rect.width}% ${rect.y + rect.height}%, 
    ${rect.x}% ${rect.y + rect.height}%, 
    ${rect.x}% ${rect.y}%
  )`

  return (
    <div className="crop-modal-overlay">
      <div className="crop-modal">
        <div className="modal-header">
          <h3>Crop Image</h3>
          <p className="hint-text">Drag area to move, corners to resize</p>
        </div>

        <div className="crop-toolbar">
          <div className="ratio-presets">
            <button className={`preset-btn ${!activePreset ? 'active' : ''}`} onClick={() => setActivePreset(null)}>Free</button>
            {RATIO_PRESETS.map(p => (
              <button key={p.label} className={`preset-btn ${activePreset?.label === p.label ? 'active' : ''}`} onClick={() => handlePresetSelect(p)}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="orientation-toggle">
            <button className={`toggle-btn ${!isHorizontal ? 'active' : ''}`} onClick={toggleOrientation} disabled={!activePreset || activePreset.w === activePreset.h}>Portrait</button>
            <button className={`toggle-btn ${isHorizontal ? 'active' : ''}`} onClick={toggleOrientation} disabled={!activePreset || activePreset.w === activePreset.h}>Landscape</button>
          </div>
        </div>

        <div className="custom-cropper-container">
          <div className="cropper-wrapper" ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
            <img ref={imgRef} src={image} alt="To crop" className="crop-source-img" />
            
            <div className="crop-overlay-dim" style={{ clipPath }} />
            
            <div 
              className="crop-selection-outline"
              style={{
                position: 'absolute',
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                border: '2px solid #fff',
                cursor: 'move'
              }}
              onMouseDown={(e) => onMouseDown(e, 'move')}
            >
              <div className="handle nw" onMouseDown={(e) => onMouseDown(e, 'resize', 'nw')} />
              <div className="handle ne" onMouseDown={(e) => onMouseDown(e, 'resize', 'ne')} />
              <div className="handle sw" onMouseDown={(e) => onMouseDown(e, 'resize', 'sw')} />
              <div className="handle se" onMouseDown={(e) => onMouseDown(e, 'resize', 'se')} />
              
              {/* Added edge handles for better UX */}
              <div className="edge-handle n" onMouseDown={(e) => onMouseDown(e, 'resize', 'n')} />
              <div className="edge-handle s" onMouseDown={(e) => onMouseDown(e, 'resize', 's')} />
              <div className="edge-handle e" onMouseDown={(e) => onMouseDown(e, 'resize', 'e')} />
              <div className="edge-handle w" onMouseDown={(e) => onMouseDown(e, 'resize', 'w')} />
            </div>
          </div>
        </div>

        <div className="modal-buttons">
          <button className="secondary-btn" onClick={onCancel}>Cancel</button>
          <button className="run-btn" onClick={() => onCropComplete(image)}>No Crop</button>
          <button className="success-btn" onClick={handleConfirm}>Apply Crop</button>
        </div>
      </div>
    </div>
  )
}

export default CropModal

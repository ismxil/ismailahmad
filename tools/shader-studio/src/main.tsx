import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SmileyStudio from './tool'
import { restoreShape } from './tool/state'

// The photo is a texture every renderer reads, so it is decoded before the first frame.
restoreShape().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <SmileyStudio />
    </StrictMode>,
  )
})

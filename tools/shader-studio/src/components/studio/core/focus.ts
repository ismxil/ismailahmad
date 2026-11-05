export function keepFocus(run: () => void, peers: string) {
  const before = [...document.querySelectorAll<HTMLElement>(peers)]
  const i = before.indexOf(document.activeElement as HTMLElement)
  run()
  if (i < 0) return
  requestAnimationFrame(() => {
    const a = document.activeElement
    if (a && a !== document.body && a.isConnected) return
    const after = [...document.querySelectorAll<HTMLElement>(peers)]
    after[Math.min(i, after.length - 1)]?.focus({ preventScroll: true })
  })
}

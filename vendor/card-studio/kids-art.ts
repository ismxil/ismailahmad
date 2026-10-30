export const shapeKinds = ['Burst', 'Blob', 'Loop', 'Arc', 'Sprinkles'] as const
export type ShapeKind = typeof shapeKinds[number]
export type KidsShape = { id: string; kind: ShapeKind; x: number; y: number; size: number; rotation: number; color: string; visible: boolean }
export type KidsArt = { back: boolean; kidsShapes: KidsShape[] }
const shape = (id: string, kind: ShapeKind, x: number, y: number, size: number, rotation: number, color: string): KidsShape => ({ id, kind, x, y, size, rotation, color, visible: true })
export const kidsLooks = [
  { name: 'Cyan', tier: 5, color: '#31afd2', shapes: [] as KidsShape[] },
  { name: 'Magenta', tier: 6, color: '#e650a0', shapes: [] as KidsShape[] },
  { name: 'Yellow', tier: 7, color: '#f4dc00', shapes: [] as KidsShape[] },
  { name: 'Purple', tier: 8, color: '#7b4ff4', shapes: [] as KidsShape[] },
  { name: 'Playtime', tier: 5, color: '#00bfd9', shapes: [
    shape('blue-blob','Blob',25,101,97,-9,'#2c43d0'), shape('orange-blob','Blob',100,48,32,28,'#ff7318'),
    shape('blue-loop','Arc',78,79,43,-21,'#72f3f1'), shape('yellow-burst','Burst',18,19,21,12,'#ffed00'),
    shape('white-marks','Sprinkles',42,28,18,20,'#ffffff'),
  ] },
  { name: 'Doodles', tier: 6, color: '#fb40a9', shapes: [
    shape('peach-blob','Blob',15,23,99,-20,'#ffdac1'), shape('peach-loop','Loop',84,78,54,-22,'#ffdac1'),
    shape('pink-marks','Sprinkles',27,31,20,-18,'#fb40a9'),
  ] },
  { name: 'Happy days', tier: 7, color: '#f8b718', shapes: [
    shape('orange-blob','Blob',16,66,58,-46,'#ff7719'), shape('purple-blob','Blob',104,62,35,30,'#7b4ff4'),
    shape('purple-smile','Arc',51,59,23,10,'#7b4ff4'), shape('purple-arch','Arc',38,93,16,180,'#7b4ff4'),
    shape('pink-marks','Sprinkles',21,26,15,-25,'#fb40a9'),
  ] },
  { name: 'Big ideas', tier: 8, color: '#7b4ff4', shapes: [
    shape('pink-blob','Blob',17,102,84,12,'#fb40a9'), shape('lavender-blob','Blob',101,52,31,-12,'#c3d5ff'),
    shape('pink-loop','Loop',57,89,48,17,'#fb40a9'), shape('yellow-burst','Burst',43,28,29,17,'#ffed00'),
    shape('white-marks','Sprinkles',21,24,18,-39,'#ffffff'),
  ] },
]

/** Flat editable geometry, shared by preview, thumbnails, PNG and PDF. */
export function drawKidsArt(ctx: CanvasRenderingContext2D, art: KidsArt, width: number, height: number) {
  if (art.back) return
  for (const s of art.kidsShapes) {
    if (!s.visible) continue
    ctx.save(); ctx.translate(s.x / 100 * width, s.y / 100 * height); ctx.rotate(s.rotation * Math.PI / 180)
    const size = s.size / 100 * width
    ctx.scale(size / 100, size / 100); ctx.fillStyle = s.color; ctx.strokeStyle = s.color
    ctx.lineWidth = s.kind === 'Burst' ? 8 : 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath()
    if (s.kind === 'Burst') {
      for (let i=0;i<6;i++) { const a=i*Math.PI/3;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*44,Math.sin(a)*44) }
      ctx.stroke()
    } else if(s.kind === 'Blob') {
      ctx.moveTo(-44,-17);ctx.bezierCurveTo(-38,-54,2,-34,27,-45);ctx.bezierCurveTo(58,-58,58,-7,34,12)
      ctx.bezierCurveTo(17,29,45,49,13,49);ctx.bezierCurveTo(-17,49,-12,22,-39,26);ctx.bezierCurveTo(-64,31,-61,4,-44,-17);ctx.closePath();ctx.fill()
    } else if(s.kind === 'Loop') {
      ctx.moveTo(-48,42);ctx.bezierCurveTo(-36,-17,37,-8,16,13);ctx.bezierCurveTo(-6,32,-30,-38,48,-45);ctx.stroke()
    } else if(s.kind === 'Arc') {
      ctx.arc(0,0,42,.1,Math.PI-.1);ctx.stroke()
    } else {
      ctx.moveTo(-24,10);ctx.lineTo(-40,-12);ctx.moveTo(-3,0);ctx.lineTo(-3,-31);ctx.moveTo(20,11);ctx.lineTo(40,-9);ctx.stroke()
    }
    ctx.restore()
  }
}

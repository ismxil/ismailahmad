// Shared by the tile builder (scripts/lagos-map/build-data.mjs) and the browser renderer.
// World coordinates are metres east and south of the north-west corner of BBOX.
export const BBOX = { west: 3.17, south: 6.39, east: 3.60, north: 6.70 };
const MID_LAT = (BBOX.south + BBOX.north) / 2 * Math.PI / 180;
export const M_PER_LNG = 111320 * Math.cos(MID_LAT), M_PER_LAT = 110574;
export const project = (lng, lat) => ({ x: (lng - BBOX.west) * M_PER_LNG, y: (BBOX.north - lat) * M_PER_LAT });
export const unproject = (x, y) => ({ lng: BBOX.west + x / M_PER_LNG, lat: BBOX.north - y / M_PER_LAT });

export const TILE = 1024;   // metres per data tile
export const MARGIN = 40;   // roads and areas overlap neighbouring tiles by this much
export const UNIT = 0.25;   // int16 coordinate step, in metres

export const AREA = { residential: 0, commercial: 1, industrial: 2, bare: 3, campus: 4, cemetery: 5, park: 6, grass: 7, golf: 8, scrub: 9, wood: 10,
    wetland: 11, sand: 12, apron: 13, water: 14, sea: 15, sports: 16, pitch: 17, track: 18, parking: 19, market: 20, plaza: 21, pier: 22, runway: 23 };
export const ROAD = { motorway: 0, trunk: 1, primary: 2, secondary: 3, tertiary: 4, street: 5, service: 6, path: 7, rail: 8, runway: 9, taxiway: 10 };
export const WATERLINE = { river: 0, canal: 1, stream: 2, drain: 3 };
export const POI = { stadium: 0, education: 1, health: 2, market: 3, worship: 4, park: 5, transport: 6, culture: 7, civic: 8, hotel: 9 };

// Zoomed-out views use pre-rendered pictures (assets/lagos/map/r/{mode}/{level}/{x}_{y}.webp),
// coarsest first. Each level is in pixels per metre; every image is RASTER_SIZE square.
export const RASTER_LEVELS = [0.03125, 0.0625, 0.125];
export const RASTER_SIZE = 512;

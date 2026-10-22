# Tiny Lagos map data

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database Licence. The page credits OpenStreetMap in its footer and its About dialog; keep that credit wherever the map appears.

- `meta.json`: map size, the list of tiles, and OpenStreetMap neighbourhood names.
- `t/{col}_{row}.bin`: one binary tile per square kilometre, holding buildings, roads, land use, water and points of interest. `js/lagos-map-schema.js` describes the coordinates, and `parseTile` in `js/lagos-render.js` reads the format.
- `r/{day|night}/{level}/{x}_{y}.webp`: pre-rendered pictures for zoomed-out views, made with the same renderer.

Building heights, roof colours, trees and traffic are illustrative. They are derived from each building's tags and a stable hash, not from survey data.

## Rebuilding

Coverage is `BBOX` in `js/lagos-map-schema.js` (Ojo to the Lekki Peninsula, the Atlantic to Ojokoro). To refresh it from a newer extract:

```sh
curl -LO https://download.geofabrik.de/africa/nigeria-latest.osm.pbf
osmium extract -b 3.17,6.39,3.60,6.70 --strategy smart nigeria-latest.osm.pbf -o lagos.osm.pbf
osmium tags-filter lagos.osm.pbf nwr/building nwr/highway nwr/railway nwr/natural nwr/landuse \
  nwr/leisure nwr/waterway nwr/water nwr/amenity nwr/place nwr/aeroway nwr/man_made nwr/shop=mall \
  nwr/tourism nwr/bridge -o sel.pbf
osmium export sel.pbf -f geojsonseq -x print_record_separator=false -o sel.geojsonseq
node --max-old-space-size=8192 scripts/lagos-map/build-data.mjs sel.geojsonseq
CHROME="/path/to/Chrome" node scripts/lagos-map/prerender.mjs
```

The tile build takes about a minute, and the pre-render about 30 seconds. To check a spot while changing the renderer, run `npm run dev` and open `/scripts/lagos-map/preview.html?lat=6.4985&lng=3.3650&p=1&mode=day` (`p` is pixels per metre).

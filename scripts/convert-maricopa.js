/**
 * Convert Maricopa.geojson (single-line ~660MB, EPSG:4326)
 * → line-per-feature GeoJSON for tippecanoe.
 *
 * Approach: Stream 512KB chunks. Track brace depth + string state
 * to find feature boundaries. Collect feature bytes into an array
 * of small strings, join only when a complete feature is found.
 */
const fs = require('fs');
const path = require('path');

const INPUT = process.argv[2] || path.resolve(__dirname, '..', 'Maricopa.geojson');
const OUTPUT = path.resolve(__dirname, '..', 'public', 'data', 'phoenix_homes_wgs84.geojson');

function formatFeature(raw) {
  const feature = JSON.parse(raw);
  const props = feature.properties || {};
  const [lng, lat] = feature.geometry?.coordinates || [0, 0];

  const parts = [props.HseNo, props.StDir, props.StName, props.StType, props.StSufx]
    .filter(Boolean).join(' ').trim();
  const address = parts || props.AddressWithCity || 'Unknown';

  return JSON.stringify({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties: {
      id: String(props.OBJECTID || feature.id || ''),
      address,
      city: props.USPSCityAlias || '',
      zip: props.Zip || '',
      hseNo: props.HseNo || '',
      stDir: props.StDir || '',
      stName: props.StName || '',
      stType: props.StType || '',
      addressFull: props.AddressWithCityAndZip || '',
      addressType: props.AddressType || '',
      unitNo: props.UnitNo || '',
    },
  });
}

async function convert() {
  const stat = fs.statSync(INPUT);
  const totalBytes = stat.size;
  console.log('Input:  ' + INPUT);
  console.log('Size:   ' + (totalBytes / 1024 / 1024).toFixed(1) + ' MB');
  console.log('Output: ' + OUTPUT + '\n');

  return new Promise(function(resolveMain, rejectMain) {
    const out = fs.createWriteStream(OUTPUT, { encoding: 'utf8' });
    out.write('{"type":"FeatureCollection","features":[\n');

    const stream = fs.createReadStream(INPUT, { highWaterMark: 512 * 1024 });
    const startTime = Date.now();

    let bytesRead = 0;
    let count = 0;
    let skipped = 0;
    let first = true;

    // State machine
    let foundFeatures = false;
    let seekBuf = '';

    let depth = 0;
    let inStr = false;
    let esc = false;

    // Accumulate current feature as array of small slices
    let featureSlices = [];
    let featureStart = -1;

    function emitFeature(text) {
      try {
        const line = formatFeature(text);
        if (!first) out.write(',\n');
        out.write(line);
        first = false;
        count++;
        if (count % 100000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const pct = ((bytesRead / totalBytes) * 100).toFixed(1);
          console.log('  ' + count.toLocaleString() + ' features | ' + pct + '% | ' + elapsed + 's');
        }
      } catch (e) {
        skipped++;
      }
    }

    stream.on('error', function(err) {
      rejectMain(err);
    });

    stream.on('data', function(raw) {
      const chunk = typeof raw === 'string' ? raw : raw.toString('utf8');
      bytesRead += raw.length;

      let offset = 0;

      // Phase 1: find "features":[
      if (!foundFeatures) {
        seekBuf += chunk;
        const marker = '"features":[';
        const pos = seekBuf.indexOf(marker);
        if (pos === -1) {
          if (seekBuf.length > 200) seekBuf = seekBuf.slice(-marker.length);
          return;
        }
        foundFeatures = true;
        const markerEnd = pos + marker.length;
        const seekBufLenBefore = seekBuf.length - chunk.length;
        if (markerEnd <= seekBufLenBefore) {
          offset = 0;
        } else {
          offset = markerEnd - seekBufLenBefore;
        }
        seekBuf = '';
      }

      // Phase 2: extract features
      for (let i = offset; i < chunk.length; i++) {
        const ch = chunk.charCodeAt(i);

        if (depth === 0) {
          if (ch === 123) { // {
            depth = 1;
            inStr = false;
            esc = false;
            featureSlices = [];
            featureStart = i;
          } else if (ch === 93) { // ]
            return;
          }
          continue;
        }

        // Inside a feature
        if (inStr) {
          if (esc) {
            esc = false;
          } else if (ch === 92) { // backslash
            esc = true;
          } else if (ch === 34) { // "
            inStr = false;
          }
          continue;
        }

        if (ch === 34) { // "
          inStr = true;
          continue;
        }
        if (ch === 123) depth++;      // {
        else if (ch === 125) depth--; // }

        if (depth === 0) {
          // Feature complete
          if (featureSlices.length === 0) {
            // Entire feature within this chunk
            emitFeature(chunk.substring(featureStart, i + 1));
          } else {
            // Feature spans chunks
            featureSlices.push(chunk.substring(0, i + 1));
            emitFeature(featureSlices.join(''));
            featureSlices = [];
          }
          featureStart = -1;
        }
      }

      // Mid-feature at end of chunk: save partial
      if (depth > 0) {
        if (featureStart >= 0) {
          featureSlices.push(chunk.substring(featureStart));
          featureStart = -1;
        } else {
          featureSlices.push(chunk);
        }
      }
    });

    stream.on('end', function() {
      out.write('\n]}');
      out.end();
    });

    out.on('finish', function() {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const outSize = fs.statSync(OUTPUT).size;
      console.log('\nDone in ' + elapsed + 's');
      console.log('  ' + count.toLocaleString() + ' features written');
      console.log('  ' + skipped + ' skipped');
      console.log('  Output: ' + (outSize / 1024 / 1024).toFixed(1) + ' MB');
      console.log('\nCoordinates are already WGS84 - no offset needed.');
      console.log('Now re-run tippecanoe on this file.');
      resolveMain();
    });
  });
}

convert().catch(function(err) {
  console.error('\nFatal:', err);
  process.exit(1);
});

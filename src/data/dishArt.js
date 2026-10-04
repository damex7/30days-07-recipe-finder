/*
  Illustrated tiles for house recipes. We have no photos of our own, and
  hotlinking someone else's would be borrowing their work, so each dish
  gets a small SVG: adire dots on a coloured cloth and a bowl seen from
  slightly above, filled with the food in the dish's own colours. It's
  returned as a data: URI, so it travels through the same `image` field
  as an API photo and no component needs to know the difference.
*/
export function dishArt({ cloth, food, accent, shape = 'mound' }) {
  const flecks = (cy) =>
    [140, 168, 196, 226, 254, 182, 240, 154]
      .map((x, i) => `<circle cx="${x}" cy="${cy + (i % 3) * 6 - 6}" r="${i % 2 ? 4 : 5.5}" fill="${accent}"/>`)
      .join('')

  const topping = {
    // rice and stews: a heaped mound rising out of the bowl
    mound: `<path d="M86 176C104 104 296 104 314 176z" fill="${food}"/>${flecks(150)}`,
    // soups: just the surface, with flecks of leaf and pepper
    soup: flecks(176),
    // snacks: little rounds (puff-puff, akara)
    balls: [
      [150, 168], [190, 172], [232, 168], [270, 174], [170, 140], [212, 142], [250, 146], [192, 116],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="${food}"/><circle cx="${x - 7}" cy="${y - 8}" r="6" fill="#fff" fill-opacity=".25"/>`)
      .join(''),
    // suya: skewers resting across the bowl
    skewer: [0, 1, 2]
      .map(
        (i) =>
          `<g transform="rotate(${-14 + i * 14} 200 150)"><rect x="70" y="${146 + i * 6}" width="260" height="5" rx="2.5" fill="#e8d9bf"/>` +
          [112, 152, 192, 232, 272].map((x) => `<rect x="${x}" y="${134 + i * 6}" width="30" height="28" rx="7" fill="${food}"/>`).join('') +
          `</g>`,
      )
      .join('') + flecks(190),
    // moi moi: a steamed loaf
    loaf: `<rect x="126" y="112" width="148" height="72" rx="30" fill="${food}"/><rect x="146" y="124" width="56" height="10" rx="5" fill="#fff" fill-opacity=".22"/>`,
  }[shape]

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<defs><pattern id="d" width="28" height="28" patternUnits="userSpaceOnUse">
<circle cx="7" cy="7" r="3" fill="#fff" fill-opacity=".16"/><circle cx="21" cy="21" r="6" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
</pattern></defs>
<rect width="400" height="300" fill="${cloth}"/><rect width="400" height="300" fill="url(#d)"/>
<ellipse cx="200" cy="262" rx="150" ry="18" fill="#000" fill-opacity=".2"/>
<path d="M60 180h280c0 58-64 82-140 82S60 238 60 180z" fill="#fbf3e4"/>
<path d="M76 206h248c-14 30-62 46-124 46s-110-16-124-46z" fill="#e8d9bf" fill-opacity=".6"/>
<ellipse cx="200" cy="180" rx="140" ry="30" fill="#fffaf1"/>
<ellipse cx="200" cy="181" rx="126" ry="22" fill="${food}"/>
${shape === 'soup' ? '' : '<ellipse cx="200" cy="181" rx="126" ry="22" fill="#000" fill-opacity=".12"/>'}
${topping}
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

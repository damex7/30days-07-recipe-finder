/*
  Illustrated tiles for house recipes. We have no photos of our own, and
  hotlinking someone else's would be borrowing their work, so each dish
  gets a small SVG: adire dots on a coloured cloth, a bowl, and the food
  in the dish's own colours. It's returned as a data: URI, so it travels
  through the same `image` field as an API photo and no component needs
  to know the difference.
*/
export function dishArt({ cloth, food, accent, shape = 'mound' }) {
  const foodShape = {
    // rice and stews: a heaped mound
    mound: `<path d="M118 178c10-52 154-52 164 0z" fill="${food}"/>`,
    // soups: a flat surface with flecks of leaf
    soup: `<ellipse cx="200" cy="176" rx="96" ry="22" fill="${food}"/>`,
    // snacks: little rounds (puff-puff, akara)
    balls: [150, 185, 220, 250, 168, 205, 236]
      .map((x, i) => `<circle cx="${x}" cy="${i < 4 ? 170 : 150}" r="20" fill="${food}"/>`)
      .join(''),
    // suya: skewers
    skewer: [0, 1, 2]
      .map(
        (i) =>
          `<g transform="rotate(${-12 + i * 12} 200 170)"><rect x="110" y="${160 + i * 4}" width="180" height="4" rx="2" fill="#e8d9bf"/>` +
          [130, 165, 200, 235].map((x) => `<rect x="${x}" y="${150 + i * 4}" width="28" height="24" rx="6" fill="${food}"/>`).join('') +
          `</g>`,
      )
      .join(''),
    // moi moi: a steamed loaf
    loaf: `<rect x="140" y="132" width="120" height="58" rx="26" fill="${food}"/>`,
  }[shape]

  const flecks = [150, 178, 214, 246, 196, 230, 165]
    .map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 168 : 176}" r="${i % 3 ? 4 : 5}" fill="${accent}"/>`)
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<defs><pattern id="d" width="28" height="28" patternUnits="userSpaceOnUse">
<circle cx="7" cy="7" r="3" fill="#fff" fill-opacity=".16"/><circle cx="21" cy="21" r="6" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/>
</pattern></defs>
<rect width="400" height="300" fill="${cloth}"/><rect width="400" height="300" fill="url(#d)"/>
<ellipse cx="200" cy="232" rx="150" ry="22" fill="#000" fill-opacity=".18"/>
<path d="M70 178h260c0 52-58 70-130 70S70 230 70 178z" fill="#fbf3e4"/>
<path d="M88 192h224c-8 28-52 44-112 44s-104-16-112-44z" fill="#e8d9bf" fill-opacity=".55"/>
${foodShape}${shape === 'balls' || shape === 'skewer' || shape === 'loaf' ? '' : flecks}
<rect x="62" y="172" width="276" height="10" rx="5" fill="#fffaf1"/>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

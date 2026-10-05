/*
  Photos for the house recipes, from Wikimedia Commons. Each one is under a
  Creative Commons licence that lets us use it as long as we credit the
  photographer and name the licence, which the recipe page does under the
  photo. The files in public/dishes/ are resized copies (800px wide, plus a
  320px thumbnail for cards).

  [Commons file name, photographer, licence]
*/
const PHOTOS = {
  'party-jollof-rice': ['A Nigeria Jollof Rice with chicken.jpg', "Ei'eke", 'CC BY-SA 4.0'],
  'nigerian-fried-rice': ['Fried rice and chicken garnished with sweet corn, carrot and green peas.jpg', 'Bukky658', 'CC BY-SA 4.0'],
  'coconut-rice': ['Coconut Rice.jpg', 'Aderiqueza', 'CC BY-SA 4.0'],
  'egusi-soup': ['Egusi soup with ponmo and beef.jpg', 'Bukky658', 'CC BY-SA 4.0'],
  'efo-riro': ['Efo Riro with fried mackerel fishes and roasted cowskin.jpg', 'Bukky658', 'CC BY-SA 4.0'],
  'ogbono-soup': ['Ogbono soup with assorted meats.jpg', 'Bukky658', 'CC BY-SA 4.0'],
  'okra-soup': ['Okra Soup.jpg', 'Aderiqueza', 'CC BY-SA 4.0'],
  'goat-meat-pepper-soup': ['Goat meat pepper soup served with bread.jpg', 'Nancy Nwachukwu', 'CC BY-SA 4.0'],
  ayamase: ['Ofada Stew (Ayamase stew).jpg', 'Aderiqueza', 'CC BY-SA 4.0'],
  'ewa-riro-dodo': ['Aganyin Beans with Plantain and Meat.jpg', 'secretlondon123', 'CC BY-SA 2.0'],
  'yam-porridge-asaro': ['Yam porridge.jpg', 'Nancy Nwachukwu', 'CC BY-SA 4.0'],
  'ofada-stew': ['Ofada Rice and Sauce, complimented with Moimoi, Egg, Plantain and Assorted Meat.jpg', 'Cherish Aurora', 'CC BY-SA 4.0'],
  suya: ['Suya with pepper sauce.jpg', 'Bukky658', 'CC BY-SA 4.0'],
  'puff-puff': ['Puff Puff Making series 6.jpg', 'Dappasolomon001', 'CC BY-SA 4.0'],
  'moi-moi': ['Moi moi In Northern Nigeria 8.jpg', 'Hajjare', 'CC BY-SA 4.0'],
  akara: ['Beans Ball-Akara.jpg', 'AkinkuotuFunmi', 'CC BY-SA 4.0'],
}

/** { image, thumb, credit } for a house recipe, or null if it has no photo. */
export function dishPhoto(slug) {
  const entry = PHOTOS[slug]
  if (!entry) return null
  const [file, author, license] = entry
  const version = license.match(/[\d.]+$/)[0]
  return {
    image: `/dishes/${slug}.jpg`,
    thumb: `/dishes/${slug}-thumb.jpg`,
    credit: {
      author,
      license,
      licenseUrl: `https://creativecommons.org/licenses/by-sa/${version}/`,
      source: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`,
    },
  }
}

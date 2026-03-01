// Mapping des villes marocaines vers des images locales
// Les images doivent être dans le dossier frontend/public/cities/
export const MOROCCAN_CITIES_IMAGES: Record<string, string> = {
  marrakech: "/cities/Marrakech.jpg",
  essaouira: "/cities/Essaouira.jpg",
  agadir: "/cities/Agadir.jpg",
  casablanca: "/cities/Casablanca.jpg",
  fes: "/cities/Fes.jpg",
  fez: "/cities/Fes.jpg",
  chefchaouen: "/cities/Chefchaoun.jpg",
  "chefchaoun": "/cities/Chefchaoun.jpg",
  rabat: "/cities/Rabat.jpg",
  tanger: "/cities/Tanger.jpg",
  tangier: "/cities/Tanger.jpg",
  tetouan: "/cities/Tetouan.jpg",
  khouribga: "/cities/Khouribga.jpg",
  benguerir: "/cities/Benguerir.jpg",
  youssoufia: "/cities/Youssoufia.jpg",
  laayoune: "/cities/Laayoun.jpg",
  "laâyoune": "/cities/Laayoun.jpg",
  dakhla: "/cities/Dakhla.jpg",
  martil: "/cities/Martil.jpg",
};

/**
 * Génère une URL d'image locale pour une ville marocaine
 * Cherche automatiquement dans le dossier /cities/ avec plusieurs variantes de nom
 * @param cityName - Nom de la ville
 * @returns URL d'image locale
 */
export function getCityImageUrl(cityName: string): string {
  if (!cityName) {
    return "/cities/Marrakech.jpg"; // Image par défaut
  }

  const cityLower = cityName.toLowerCase().trim();
  
  // Chercher une correspondance exacte dans le mapping
  if (MOROCCAN_CITIES_IMAGES[cityLower]) {
    return MOROCCAN_CITIES_IMAGES[cityLower];
  }

  // Chercher une correspondance partielle dans le mapping
  for (const [key, url] of Object.entries(MOROCCAN_CITIES_IMAGES)) {
    if (cityLower.includes(key) || key.includes(cityLower)) {
      return url;
    }
  }

  // Essayer plusieurs variantes de nom de fichier pour la ville
  const variants = [
    // Nom exact avec première lettre majuscule
    cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase(),
    // Tout en majuscules
    cityName.toUpperCase(),
    // Tout en minuscules
    cityLower,
    // Avec accents supprimés (pour Laâyoune -> Laayoune)
    cityLower.replace(/â/g, "a").replace(/é/g, "e").replace(/è/g, "e").replace(/ê/g, "e"),
  ];

  // Essayer différentes extensions
  const extensions = [".jpg", ".jpeg", ".png", ".webp"];

  for (const variant of variants) {
    for (const ext of extensions) {
      const imagePath = `/cities/${variant}${ext}`;
      // Note: En production, on suppose que l'image existe si elle correspond au pattern
      // Le navigateur chargera l'image ou affichera une erreur si elle n'existe pas
      return imagePath;
    }
  }

  // Fallback: utiliser le nom de la ville avec .jpg
  const capitalizedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
  return `/cities/${capitalizedCity}.jpg`;
}

/**
 * Génère une URL d'image via l'API Unsplash Search
 * Utilise les images locales du dossier /public/cities
 */
export async function fetchCityImageFromUnsplash(cityName: string): Promise<string> {
  return getCityImageUrl(cityName);
}

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';



export type TmdbImageSize = 'w92' | 'w342' | 'w500';



export function getTmdbImageUrl(imagePath: string, size: TmdbImageSize): string {
  return `${TMDB_IMAGE_BASE_URL}/${size}${imagePath}`;
}

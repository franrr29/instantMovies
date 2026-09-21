import 'dotenv/config';
import bcrypt from 'bcrypt';
import { RecommendationStatus } from './generated/prisma/client';
import { prisma } from './shared/db';

const SALT_ROUNDS = 10;

// username del usuario demo (el modelo User no tiene campo email, solo username)
const DEMO_USERNAME = 'demo@instant.com';
const DEMO_PASSWORD = 'Demo1234!';

// tmdbId reales de TMDB; title/posterPath son solo referencia local para este
// script, no se persisten (CLAUDE.md: TMDB es la fuente de verdad, la tabla
// likes solo guarda tmdb_movie_id)
const DEMO_LIKES = [
  { tmdbId: 27205, title: 'Inception', posterPath: '/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg' },
  { tmdbId: 155, title: 'The Dark Knight', posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg' },
  { tmdbId: 424, title: "Schindler's List", posterPath: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg' },
];

const DEMO_RECOMMENDATION_MOVIES = [
  {
    tmdbMovieId: 238,
    reason:
      'Basado en tu gusto por thrillers con giros narrativos y dramas premiados, te recomendamos El Padrino por su narrativa intensa sobre poder y familia.',
  },
  {
    tmdbMovieId: 680,
    reason:
      'Por tu afinidad con narrativas no lineales y giros argumentales, Pulp Fiction te va a enganchar con su estructura fragmentada.',
  },
  {
    tmdbMovieId: 429,
    reason:
      'Dado tu gusto por dramas premiados con tension moral, El Bueno, el Malo y el Feo ofrece una epica igual de intensa.',
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { username: DEMO_USERNAME },
    update: {},
    create: { username: DEMO_USERNAME, passwordHash },
  });

  for (const like of DEMO_LIKES) {
    await prisma.like.upsert({
      where: { userId_tmdbMovieId: { userId: user.id, tmdbMovieId: like.tmdbId } },
      update: {},
      create: { userId: user.id, tmdbMovieId: like.tmdbId },
    });
  }

  const existingRecommendation = await prisma.recommendation.findFirst({
    where: { userId: user.id, status: RecommendationStatus.COMPLETED },
  });

  if (!existingRecommendation) {
    await prisma.recommendation.create({
      data: {
        userId: user.id,
        status: RecommendationStatus.COMPLETED,
        movies: DEMO_RECOMMENDATION_MOVIES,
      },
    });
  }

  console.log(`seed ok: usuario demo "${DEMO_USERNAME}" (id ${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

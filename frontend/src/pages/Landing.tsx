import { Link } from 'react-router-dom';

import { Eyebrow } from '../components/ui/Eyebrow';
import { btnPrimary, btnSecondary, sectionHeading } from '../components/ui/styles';
import { TypingDots } from '../components/ui/TypingDots';
import { cn } from '../lib/cn';
import { getTmdbImageUrl } from '../utils/tmdb';



const NAV_LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#chat', label: 'The assistant' },
  { href: '#faq', label: 'FAQ' },
];

const FILMSTRIP = [
  { title: 'Stalker', meta: 'DRAMA · 1979', gradient: 'from-accent', posterPath: '/1qhOyf5C4s9ZdvY8d5JDx9DFMeT.jpg' },
  {
    title: 'Chinatown',
    meta: 'NOIR · 1974',
    gradient: 'from-poster-rust',
    posterPath: '/kZRSP3FmOcq0xnBulqpUQngJUXY.jpg',
  },
  {
    title: 'Blade Runner',
    meta: 'SCI-FI · 1982',
    gradient: 'from-poster-bronze',
    posterPath: '/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg',
  },
  {
    title: 'Once Upon a Time…',
    meta: 'WESTERN · 1968',
    gradient: 'from-poster-clay',
    posterPath: '/qbYgqOczabWNn2XKwgMtVrntD6P.jpg',
  },
  { title: 'Se7en', meta: 'THRILLER · 1995', gradient: 'from-accent', posterPath: '/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg' },
];

const STEPS = [
  {
    number: '01',
    title: 'Like the films you already love.',
    body: "Search the TMDB catalogue and tap the heart. No ratings, no five-star ceremonies — just the shelf you'd defend at dinner.",
    tag: 'Catalogue → Likes',
    highlighted: false,
  },
  {
    number: '02',
    title: 'The queue does the thinking.',
    body: "Ask for a recommendation and we accept the ticket. A worker consumes it at Groq's pace, reads your likes with genre context, and reports back.",
    tag: 'Pending → Completed',
    highlighted: false,
  },
  {
    number: '03',
    title: 'Chat with the projectionist.',
    body: 'Not sold on the pick? Ask why. Push back. Say you\'re in the mood for "slow, cold, and blue." The assistant remembers what\'s on your shelf.',
    tag: 'Ongoing conversation',
    highlighted: true,
  },
];

const ASSISTANT_HIGHLIGHTS = [
  'Grounded in your liked titles — no cold-start guesses.',
  'Reads TMDB genres and metadata before answering.',
  'Every recommendation ships with a reason you can push back on.',
];

const STATS = [
  { value: '1M+', label: 'titles on the TMDB shelf' },
  { value: '~3s', label: 'from request to worker start' },
  { value: '0', label: "rate-limit errors you'll ever see" },
  { value: '∞', label: 'follow-ups per recommendation' },
];

const FAQS = [
  {
    question: 'Do I need to rate movies out of five?',
    answer:
      "No. Likes only. A heart is signal enough, and it's honest — nobody actually knows the difference between a 7 and an 8.",
  },
  {
    question: 'Why is the recommendation asynchronous?',
    answer:
      "Because good models rate-limit. Requests go into a queue and a worker consumes them at Groq's pace, so a slow LLM never means a slow app.",
  },
  {
    question: 'Can I stream the films through the app?',
    answer: 'No — this is a recommender, not a projector. We tell you what to watch. Where to watch it is your evening.',
  },
  {
    question: 'Is my data used to train anything?',
    answer: "No. Your likes stay in your account, and prompts to Groq carry only what's needed to answer the current question.",
  },
];

const MARQUEE_ITEMS = [
  'Powered by TMDB catalogue',
  'Recommendations via Groq',
  'Async queue — no rate-limit anxiety',
  'No streaming, only signal',
];



function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-display text-xl font-semibold tracking-tight">
      <span className="flex h-6 w-6 items-center justify-center bg-accent text-xs text-accent-ink">▶</span>
      InstantMovies
    </div>
  );
}



interface PosterPlaceholderProps {
  title: string;
  meta: string;
  gradient: string;
  posterPath: string;
}



function PosterPlaceholder({ title, meta, gradient, posterPath }: PosterPlaceholderProps) {
  return (
    <div className="relative aspect-[2/3] border border-divider bg-gradient-to-br from-surface to-bg">
      <img
        src={getTmdbImageUrl(posterPath, 'w500')}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className={cn('absolute inset-0 bg-gradient-to-tr to-transparent opacity-75 mix-blend-screen', gradient)} />
      <div className="absolute inset-x-2.5 bottom-2.5 font-display text-xs tracking-wide">
        <div className="text-[9px] tracking-[0.24em] text-ink/55">{meta}</div>
        <div>{title}</div>
      </div>
    </div>
  );
}



export function Landing() {
  return (
    <div className="relative overflow-x-hidden bg-bg text-ink">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-5 sm:px-10">
        <Logo />
        <div className="ml-auto hidden items-center gap-7 text-[13px] sm:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-ink/75 transition-colors hover:text-accent">
              {link.label}
            </a>
          ))}
          <Link to="/login" className={btnSecondary}>
            Sign in
          </Link>
          <Link to="/register" className={btnPrimary}>
            Get started
          </Link>
        </div>
        <Link to="/register" className={cn(btnPrimary, 'ml-auto sm:hidden')}>
          Get started
        </Link>
      </div>

      <section className="relative mx-auto max-w-6xl px-6 pb-20 pt-10 sm:px-10 sm:pb-24 sm:pt-14">
        <div
          className="pointer-events-none absolute -inset-x-[10%] -top-[10%] h-[70vh] animate-flicker
            bg-[radial-gradient(60%_55%_at_50%_0%,color-mix(in_srgb,var(--color-accent)_28%,transparent),transparent_65%)]"
        />

        <div
          className="relative mb-8 flex animate-rise items-center gap-4 font-display text-[11px]
            uppercase tracking-[0.28em] text-ink/60"
        >
          <span className="h-px w-8 bg-accent" />
          REEL 01 · Personal cinema, on tap
          <span className="ml-auto hidden sm:inline">EST. 2026 · v1.0</span>
        </div>

        <h1
          className={cn(
            sectionHeading,
            'relative animate-rise text-[15vw] font-semibold sm:text-[68px] lg:text-[96px]',
            '[animation-delay:.1s]',
          )}
          style={{ lineHeight: 0.95 }}
        >
          The movie you didn&apos;t know you wanted,{' '}
          <span className="font-normal italic text-accent">instantly.</span>
        </h1>

        <div
          className="relative mt-10 grid animate-rise gap-8 [animation-delay:.22s]
            lg:grid-cols-[1.1fr_.9fr] lg:items-end"
        >
          <p className="max-w-xl text-lg leading-relaxed text-ink/80">
            Like a few films. Let a language model read between your credits. Get recommendations tuned to{' '}
            <em className="not-italic text-accent">your</em> shelf — and chat with an assistant that argues for its picks.
          </p>
          <div className="flex flex-wrap items-center gap-3.5 lg:justify-end">
            <Link to="/register" className={cn(btnPrimary, 'px-7 py-3.5 text-[15px]')}>
              Start liking movies <span>→</span>
            </Link>
            <a href="#how" className={cn(btnSecondary, 'px-6 py-3.5')}>
              See how it works
            </a>
          </div>
        </div>

        <div className="relative mt-16 animate-rise [animation-delay:.34s]">
          <div
            className="mb-3.5 flex items-end justify-between font-display text-[11px]
              uppercase tracking-[0.24em] text-ink/55"
          >
            <span>Now scoring · from your TMDB catalogue</span>
            <span className="hidden sm:inline">006 titles</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {FILMSTRIP.map((poster) => (
              <PosterPlaceholder key={poster.title} {...poster} />
            ))}
            <div
              className="flex aspect-[2/3] flex-col items-center justify-center gap-1.5
                border border-divider text-center font-display"
            >
              <div className="text-2xl text-accent">+</div>
              <div className="text-[10px] tracking-[0.24em] text-ink/60">ADD LIKES</div>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-divider py-3.5">
        <div
          className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-xs
            uppercase tracking-[0.28em] text-ink/50"
        >
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
            <span key={index} className="flex items-center gap-8">
              {item} <span>·</span>
            </span>
          ))}
        </div>
      </div>

      <section id="how" className="mx-auto max-w-6xl px-6 py-24 sm:px-10 sm:py-32">
        <div className="mb-14 grid gap-8 sm:mb-20 lg:grid-cols-[.6fr_1.4fr] lg:items-end">
          <Eyebrow>REEL 02 · Three cuts</Eyebrow>
          <h2 className={cn(sectionHeading, 'max-w-3xl text-4xl sm:text-5xl lg:text-[56px]')}>
            Three steps between you and your next favourite film.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={cn(
                'flex min-h-[320px] flex-col gap-5 border border-divider p-8',
                step.highlighted && 'bg-accent/[0.06]',
              )}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    'font-display text-6xl leading-none tracking-tight text-transparent',
                    '[-webkit-text-stroke:1px_color-mix(in_srgb,var(--color-accent)_80%,transparent)]',
                  )}
                >
                  {step.number}
                </div>
                <div className="font-display text-[10px] tracking-[0.24em] text-ink/50">STEP</div>
              </div>
              <h3 className="text-2xl leading-tight">{step.title}</h3>
              <p className="flex-1 text-sm text-ink/72">{step.body}</p>
              <div className="flex items-center gap-2 font-display text-[11px] uppercase tracking-[0.16em] text-accent">
                <span className="h-px w-5 bg-accent" /> {step.tag}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="chat" className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-24">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div>
            <Eyebrow>REEL 03 · The assistant</Eyebrow>
            <h2 className={cn(sectionHeading, 'mt-6 text-4xl sm:text-5xl')}>
              A film buff on call, with your taste memorised.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink/78">
              Every conversation starts with the shelf you built. The assistant argues its picks with real reasons —
              director, era, mood, restraint — and never recommends something you&apos;ve already liked.
            </p>
            <ul className="mt-8 flex flex-col gap-3.5 text-sm">
              {ASSISTANT_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-3.5">
                  <span className="font-display text-accent">◆</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-divider bg-gradient-to-b from-surface-raised to-bg">
            <div
              className="flex items-center gap-2.5 border-b border-divider px-5 py-3.5
                font-display text-xs uppercase tracking-[0.16em] text-ink/75"
            >
              <span className="h-2 w-2 rounded-full bg-accent" />
              Session · projectionist
              <span className="ml-auto text-[10px] text-ink/50">3 titles on shelf</span>
            </div>
            <div className="flex flex-col gap-3.5 p-6">
              <p className="self-end max-w-[75%] border border-accent/40 bg-accent/[0.14] px-4 py-3 text-sm">
                I&apos;ve been liking cold, slow sci-fi. Something else in that key?
              </p>
              <div className="self-start max-w-[85%] border border-divider px-4.5 py-3.5 text-sm leading-relaxed">
                <div className="mb-2 font-display text-[11px] uppercase tracking-[0.2em] text-accent">
                  Solaris · Tarkovsky · 1972
                </div>
                You liked <em>Stalker</em> and <em>Blade Runner</em>. Same patience, same ache — a station full of
                grief and a planet that answers back. If you want colder, we go to Antarctica next.
              </div>
              <p className="self-end max-w-[60%] border border-accent/40 bg-accent/[0.14] px-4 py-3 text-sm">
                Colder. Less crying.
              </p>
              <div className="flex w-fit self-start border border-divider px-4.5 py-3.5">
                <TypingDots />
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-t border-divider px-4 py-3">
              <input
                disabled
                placeholder="Ask for something you'd actually watch tonight…"
                className="flex-1 border-transparent bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
              />
              <button disabled className={cn(btnPrimary, 'px-3.5 py-2')}>
                Send
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-divider">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-6 py-12 sm:px-10 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-4xl leading-none tracking-tight text-accent sm:text-5xl">
                {stat.value}
              </div>
              <div className="mt-2 text-xs text-ink/60">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-6xl px-6 py-24 sm:px-10 sm:py-32">
        <div className="grid gap-10 lg:grid-cols-[.6fr_1.4fr]">
          <div>
            <Eyebrow>REEL 04 · Notes</Eyebrow>
            <h2 className={cn(sectionHeading, 'mt-6 text-4xl sm:text-5xl')}>Small print, large type.</h2>
          </div>
          <div className="flex flex-col">
            {FAQS.map((faq, index) => (
              <details key={faq.question} open={index === 0} className="border-t border-divider py-6 last:border-b">
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-xl">
                  {faq.question}
                  <span className="text-accent">+</span>
                </summary>
                <p className="mt-4 max-w-2xl text-[15px] text-ink/75">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24 sm:px-10 sm:py-32">
        <div
          className="relative border border-divider px-8 py-20 text-center sm:px-16
            bg-[radial-gradient(80%_120%_at_50%_0%,color-mix(in_srgb,var(--color-accent)_22%,transparent),transparent_70%)]"
        >
          <div className="mb-5 font-display text-[11px] uppercase tracking-[0.28em] text-accent">
            Now Showing · Free to start
          </div>
          <h2 className={cn(sectionHeading, 'mx-auto max-w-3xl text-5xl sm:text-6xl lg:text-[80px]')}>
            Roll the projector.
            <br />
            Find your next favourite.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[17px] text-ink/72">
            Sign up, like six films, and let the assistant do what it&apos;s good at.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3.5">
            <Link to="/register" className={cn(btnPrimary, 'px-7 py-4 text-[15px]')}>
              Create account <span>→</span>
            </Link>
            <Link to="/login" className={cn(btnSecondary, 'px-6 py-4')}>
              I already have one
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-divider">
        <div
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-10
            font-display text-xs uppercase tracking-[0.14em] text-ink/60 sm:px-10"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-5.5 w-5.5 items-center justify-center bg-accent text-[11px] text-accent-ink">▶</span>
            InstantMovies · MMXXVI
          </div>
          <div className="flex gap-7">
            <span>TMDB</span>
            <span>Groq</span>
            <span>Privacy</span>
            <span>Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

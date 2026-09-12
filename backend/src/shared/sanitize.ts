const HTML_TAG_REGEX = /<[^>]*>/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;

// lista razonable, no exhaustiva, de patrones obvios de prompt injection
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore previous instructions/i,
  /ignore all instructions/i,
  /system prompt/i,
  /olvida todo/i,
  /ignora las instrucciones/i,
  /forget your instructions/i,
  /act as/i,
  /you are now/i,
  /disregard\s+(all\s+|any\s+)?previous\s+instructions/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /roleplay\s+as\s+/i,
  /reveal\s+(your\s+)?instructions/i,
  /show\s+(me\s+)?(the\s+)?system\s+prompt/i,
  /olvida\s+(todas?\s+)?(las\s+)?instrucciones/i,
];

export interface SanitizeResult {
  clean: string;
  blocked: boolean;
}

// normaliza solo para testear los regex contra variantes de unicode/espaciado; nunca se devuelve
function normalizeForDetection(input: string): string {
  return input.normalize('NFKC').replace(MULTIPLE_SPACES_REGEX, ' ').trim();
}


// sanitiza el mensaje de chat eliminando etiquetas HTML y detectando posibles intentos de prompt injection
export function sanitizeMessage(input: string): SanitizeResult {
  const clean = input.replace(HTML_TAG_REGEX, '');
  const forDetection = normalizeForDetection(clean);
  const blocked = PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(forDetection));

  return { clean, blocked };
}

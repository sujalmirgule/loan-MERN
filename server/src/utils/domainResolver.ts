import { Request } from 'express';
import { prisma } from '../services/db';

/**
 * Resolves the active Domain record ID from the incoming HTTP request.
 *
 * Resolution order (most reliable → least):
 *   1. req.hostname (Express trusted proxy-aware host)
 *   2. Origin header (cross-origin customer SPA)
 *   3. Referer header (fallback)
 *
 * Never trusts any body/query-param domainId provided by the client.
 * Returns null if no matching active domain is found.
 */
export async function resolveDomainId(req: Request): Promise<string | null> {
  const candidates: string[] = [];

  // 1. Express hostname (most reliable for same-origin or behind trusted reverse proxy)
  if (req.hostname && req.hostname !== 'localhost' && req.hostname !== '127.0.0.1') {
    candidates.push(req.hostname.replace(/^www\./, '').toLowerCase());
  }

  // 2. Origin header (for cross-origin SPA requests, e.g. partner-example.com → backend)
  const originHeader = req.headers['origin'];
  if (originHeader) {
    try {
      const url = new URL(originHeader);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      if (host && host !== 'localhost' && !candidates.includes(host)) {
        candidates.push(host);
      }
    } catch {
      // ignore malformed Origin
    }
  }

  // 3. Referer header (last resort)
  const refererHeader = req.headers['referer'];
  if (refererHeader) {
    try {
      const url = new URL(refererHeader);
      const host = url.hostname.replace(/^www\./, '').toLowerCase();
      if (host && host !== 'localhost' && !candidates.includes(host)) {
        candidates.push(host);
      }
    } catch {
      // ignore malformed Referer
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  // Look up the first matching active domain
  for (const host of candidates) {
    const domain = await prisma.domain.findFirst({
      where: { domainName: host, isActive: true },
      select: { id: true },
    });
    if (domain) {
      return domain.id;
    }
  }

  return null;
}

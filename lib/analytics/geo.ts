/** Reads geo info Vercel already resolves at the edge — never do a separate
 *  IP lookup, and never persist the raw IP. Headers are absent in local dev. */
export function geoFromHeaders(headers: Headers) {
  return {
    country: headers.get("x-vercel-ip-country") || null,
    region: headers.get("x-vercel-ip-country-region") || null,
    city: headers.get("x-vercel-ip-city") || null,
  };
}

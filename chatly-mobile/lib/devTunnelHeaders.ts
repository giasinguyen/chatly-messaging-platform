/**
 * Dev Tunnels may return an HTML interstitial unless these headers are sent.
 */
export function getDevTunnelExtraHeaders(baseUrl: string): Record<string, string> {
  if (!baseUrl.includes('devtunnels.ms')) {
    return {};
  }
  return {
    'X-Tunnel-Skip-AntiPhishing-Page': '1',
    Accept: 'application/json',
  };
}

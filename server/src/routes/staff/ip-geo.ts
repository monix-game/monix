import { Elysia, t } from 'elysia';
import { deriveAuth, onlyRole } from '../../middleware';

export const ipGeo = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyRole('admin'))
  .get('/ip-geo', async ({ query, set }) => {
    const rawIp = query.ip;
    const ip = typeof rawIp === 'string' ? rawIp.trim() : '';

    if (!ip) {
      set.status = 400;
      return { error: 'Missing ip parameter' };
    }

    const fetchFromIpWho = async () => {
      const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
      const data = (await response.json()) as {
        success?: boolean;
        latitude?: number;
        longitude?: number;
        city?: string;
        region?: string;
        country?: string;
        isp?: string;
        message?: string;
      };

      if (!data?.success || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
        return { geo: null, error: data?.message || 'Unable to resolve IP location' };
      }

      return {
        geo: {
          ip,
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          region: data.region,
          country: data.country,
          isp: data.isp,
        },
        error: undefined,
      };
    };

    const fetchFromIpApi = async () => {
      const response = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,lat,lon,city,regionName,country,isp`
      );
      const data = (await response.json()) as {
        status?: string;
        message?: string;
        lat?: number;
        lon?: number;
        city?: string;
        regionName?: string;
        country?: string;
        isp?: string;
      };

      if (data?.status !== 'success' || !Number.isFinite(data.lat) || !Number.isFinite(data.lon)) {
        return { geo: null, error: data?.message || 'Unable to resolve IP location' };
      }

      return {
        geo: {
          ip,
          latitude: data.lat,
          longitude: data.lon,
          city: data.city,
          region: data.regionName,
          country: data.country,
          isp: data.isp,
        },
        error: undefined,
      };
    };

    try {
      const primary = await fetchFromIpWho();
      if (primary.geo) {
        return { geo: primary.geo };
      }

      const fallback = await fetchFromIpApi();
      if (fallback.geo) {
        return { geo: fallback.geo };
      }

      set.status = 400;
      return { error: fallback.error || primary.error || 'Unable to resolve IP location' };
    } catch (err) {
      console.error('Failed to fetch IP geolocation', err);
      set.status = 500;
      return { error: 'Failed to fetch IP geolocation' };
    }
  }, {
    query: t.Object({ ip: t.Optional(t.String()) }),
  });

export default ipGeo;

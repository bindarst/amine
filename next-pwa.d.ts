declare module 'next-pwa' {
    import { NextConfig } from 'next';

    interface PWAConfig {
        dest?: string;
        register?: boolean;
        skipWaiting?: boolean;
        disable?: boolean;
        runtimeCaching?: Array<{
            urlPattern: RegExp | string;
            handler: string;
            method?: string;
            options?: {
                cacheName?: string;
                expiration?: {
                    maxEntries?: number;
                    maxAgeSeconds?: number;
                };
                networkTimeoutSeconds?: number;
                rangeRequests?: boolean;
            };
        }>;
    }

    export default function withPWA(
        pwaConfig: PWAConfig
    ): (nextConfig: NextConfig) => NextConfig;
}

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('PWA & Manifest Configuration (@ahwtna/web)', () => {
  const publicDir = path.resolve(__dirname, '../public');
  const indexHtmlPath = path.resolve(__dirname, '../index.html');

  it('provides a valid and compliant PWA web manifest file', () => {
    const manifestPath = path.join(publicDir, 'manifest.webmanifest');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const raw = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);

    // Identity and localization
    expect(manifest.name).toContain('قهوتنا');
    expect(manifest.short_name).toBe('قهوتنا');
    expect(manifest.dir).toBe('rtl');
    expect(manifest.lang).toBe('ar-EG');

    // Display mode and navigation
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.background_color).toBe('#0D261E');
    expect(manifest.theme_color).toBe('#0D3B2E');

    // Icon definitions
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');

    const hasMaskable = manifest.icons.some((i: { purpose?: string }) =>
      i.purpose?.includes('maskable')
    );
    expect(hasMaskable).toBe(true);
  });

  it('includes all required SVG icons with valid SVG structure', () => {
    const requiredIcons = [
      'favicon.svg',
      'icons/icon-192.svg',
      'icons/icon-512.svg',
      'icons/icon-maskable.svg',
    ];

    for (const relPath of requiredIcons) {
      const fullPath = path.join(publicDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content).toContain('<svg');
      expect(content).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(content).toContain('</svg>');
    }
  });

  it('implements smart caching Service Worker that bypasses WebSockets', () => {
    const swPath = path.join(publicDir, 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const content = fs.readFileSync(swPath, 'utf-8');

    // Cache versioning and lifecycle
    expect(content).toContain('ahwtna-v');
    expect(content).toContain("addEventListener('install'");
    expect(content).toContain("addEventListener('activate'");
    expect(content).toContain("addEventListener('fetch'");

    // Critical: Exclude real-time socket.io / WebSocket traffic from caching
    expect(content).toContain('socket.io');
    expect(content).toContain("url.protocol.startsWith('ws')");
  });

  it('index.html contains full PWA and safe area viewport metadata', () => {
    expect(fs.existsSync(indexHtmlPath)).toBe(true);
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');

    // Manifest link
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('manifest.webmanifest');

    // Theme color & apple meta tags
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('#0D3B2E');
    expect(html).toContain('name="apple-mobile-web-app-capable"');
    expect(html).toContain('apple-mobile-web-app-status-bar-style');

    // Safe area cover viewport
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('safe-area-inset-top');
  });
});

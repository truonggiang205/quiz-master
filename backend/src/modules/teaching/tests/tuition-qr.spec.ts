import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { TuitionService } from '../services/tuition.service.js';

describe('Tuition QR Service Regression Suite (QR-01 to QR-09)', () => {
  let service: TuitionService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    service = new TuitionService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // QR-01: Valid tuition data produces a valid QR image source / proxy response
  it('QR-01: Valid tuition data produces a valid QR image buffer and content-type', async () => {
    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/png' }),
      arrayBuffer: async () => fakePng.buffer,
    });

    const result = await service.generateOrProxyPaymentQr({
      bankCode: 'mb',
      accountNumber: '713072005',
      amount: 200000,
      addInfo: 'HP Đặng Thị Hồng Xuân 202610',
      accountName: 'TRẦN THỊ PHƯƠNG ANH',
    });

    expect(result.contentType).toBe('image/png');
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.buffer[0]).toBe(0x89);
    expect(result.buffer[1]).toBe(0x50);
  });

  // QR-02 & QR-03: Renders VietQR SVG to clean PNG buffer without broken icons
  it('QR-02 & QR-03: Renders clean PNG buffer from VietQR SVG response without broken icons', async () => {
    const svgResponse = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#fff"/><circle cx="50" cy="50" r="40" fill="#000"/></svg>`;
    const svgBytes = new TextEncoder().encode(svgResponse);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/svg+xml; charset=utf-8' }),
      arrayBuffer: async () => svgBytes.buffer,
    });

    const result = await service.generateOrProxyPaymentQr({
      bankCode: 'mb',
      accountNumber: '713072005',
      amount: 200000,
    });

    expect(result.contentType).toBe('image/png');
    expect(result.buffer[0]).toBe(0x89);
    expect(result.buffer[1]).toBe(0x50);
    expect(result.buffer[2]).toBe(0x4e);
    expect(result.buffer[3]).toBe(0x47);
  });

  // QR-10: Complete QR Matrix Preservation using production VietQR SVG fixture
  it('QR-10: Complete QR Matrix Preservation - verifies rendered PNG contains real QR visual data, not a blank box', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sharp = (await import('sharp')).default;

    const fixturePath = path.resolve(__dirname, 'fixtures/vietqr-sample.svg');
    const fixtureSvg = fs.readFileSync(fixturePath);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'image/svg+xml; charset=utf-8' }),
      arrayBuffer: async () => fixtureSvg.buffer.slice(fixtureSvg.byteOffset, fixtureSvg.byteOffset + fixtureSvg.byteLength),
    });

    const result = await service.generateOrProxyPaymentQr({
      bankCode: 'mb',
      accountNumber: '713072005',
      amount: 200000,
      addInfo: 'HP Dang Thi Hong Xuan 202610',
      accountName: 'TRAN THI PHUONG ANH',
    });

    // 1. Output is PNG
    expect(result.contentType).toBe('image/png');

    // 2. Output is valid PNG magic bytes
    expect(result.buffer[0]).toBe(0x89);
    expect(result.buffer[1]).toBe(0x50);
    expect(result.buffer[2]).toBe(0x4e);
    expect(result.buffer[3]).toBe(0x47);

    // 3. Dimensions match VietQR standard template (540 x 640)
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(540);
    expect(meta.height).toBe(640);

    // 4. Inspect pixel data in the central QR matrix area (x: 160-380, y: 190-450)
    // The previous bug extracted only the frame template which had 0 dark pixels (completely blank white box)
    const { data, info } = await sharp(result.buffer).raw().toBuffer({ resolveWithObject: true });
    let darkPixelCount = 0;
    const startX = Math.floor(info.width * 0.3);
    const endX = Math.floor(info.width * 0.7);
    const startY = Math.floor(info.height * 0.3);
    const endY = Math.floor(info.height * 0.7);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const idx = (y * info.width + x) * info.channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r < 60 && g < 60 && b < 60) {
          darkPixelCount++;
        }
      }
    }

    // The central QR matrix MUST contain substantial dark pixels (VietQR matrix has > 20,000 dark pixels in center)
    expect(darkPixelCount).toBeGreaterThan(10000);
  });

  // QR-07: Vietnamese transfer content is encoded correctly
  it('QR-07: Vietnamese transfer content is encoded correctly without corruption', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => fakePng.buffer,
      });
    });

    const addInfo = 'HP Đặng Thị Hồng Xuân 202610';
    await service.generateOrProxyPaymentQr({
      bankCode: 'mb',
      accountNumber: '713072005',
      amount: 200000,
      addInfo,
      accountName: 'TRẦN THỊ PHƯƠNG ANH',
    });

    const parsedUrl = new URL(capturedUrl);
    expect(parsedUrl.searchParams.get('addInfo')).toBe(addInfo);
    expect(parsedUrl.searchParams.get('accountName')).toBe('TRẦN THỊ PHƯƠNG ANH');
    expect(parsedUrl.hostname).toBe('img.vietqr.io');
    expect(parsedUrl.pathname).toBe('/image/mb-713072005-compact2.png');
  });

  // QR-08: Amount 200000 is encoded correctly
  it('QR-08: Amount 200000 is encoded correctly as positive integer', async () => {
    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        arrayBuffer: async () => fakePng.buffer,
      });
    });

    await service.generateOrProxyPaymentQr({
      bankCode: 'mb',
      accountNumber: '713072005',
      amount: '200000',
    });

    const parsedUrl = new URL(capturedUrl);
    expect(parsedUrl.searchParams.get('amount')).toBe('200000');
  });

  // QR-09: Architecture safety & SSR proxy isolation
  it('QR-09: Rejects arbitrary host injection or malicious input parameters', async () => {
    await expect(
      service.generateOrProxyPaymentQr({
        bankCode: '../malicious/bank',
        accountNumber: '713072005',
      })
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.generateOrProxyPaymentQr({
        bankCode: 'mb',
        accountNumber: '123; DROP TABLE users;',
      })
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.generateOrProxyPaymentQr({
        bankCode: '',
        accountNumber: '713072005',
      })
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.generateOrProxyPaymentQr({
        bankCode: 'mb',
        accountNumber: '',
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('QR-09: Throws BadGatewayException when external VietQR returns error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers(),
    });

    await expect(
      service.generateOrProxyPaymentQr({
        bankCode: 'mb',
        accountNumber: '713072005',
        amount: 200000,
      })
    ).rejects.toThrow(BadGatewayException);
  });

  it('QR-09: Throws BadGatewayException when network times out or fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection timed out'));

    await expect(
      service.generateOrProxyPaymentQr({
        bankCode: 'mb',
        accountNumber: '713072005',
        amount: 200000,
      })
    ).rejects.toThrow(BadGatewayException);
  });
});

import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { TuitionController } from '../controllers/tuition.controller.js';

describe('Tuition QR Controller and Guard Security Suite', () => {
  it('Guards allow public access when route is decorated with @Public()', async () => {
    const fakeReflector = {
      getAllAndOverride: (key: string) => {
        if (key === IS_PUBLIC_KEY) return true;
        return undefined;
      },
    } as unknown as Reflector;

    const fakeJwtService = { verifyAsync: vi.fn() };
    const jwtGuard = new JwtAuthGuard(fakeJwtService as any, fakeReflector);
    const rolesGuard = new RolesGuard(fakeReflector);

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
      getHandler: () => () => {},
      getClass: () => class {},
    } as any;

    expect(await jwtGuard.canActivate(mockContext)).toBe(true);
    expect(rolesGuard.canActivate(mockContext)).toBe(true);
  });

  it('TuitionController.getPaymentQr sets CORS, cache and content headers correctly', async () => {
    const fakeBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const fakeTuitionService = {
      generateOrProxyPaymentQr: vi.fn().mockResolvedValue({
        buffer: fakeBuffer,
        contentType: 'image/png',
      }),
    };

    const controller = new TuitionController(fakeTuitionService as any);

    const headersSet: Record<string, string> = {};
    let endedBuffer: any = null;
    const mockRes = {
      set: vi.fn().mockImplementation((headers: Record<string, string>) => {
        Object.assign(headersSet, headers);
        return mockRes;
      }),
      end: vi.fn().mockImplementation((buf: any) => {
        endedBuffer = buf;
        return buf;
      }),
    } as any;

    await controller.getPaymentQr(
      'mb',
      '713072005',
      '200000',
      'HP Dang Thi Hong Xuan',
      'TRAN THI PHUONG ANH',
      'compact2',
      mockRes,
    );

    expect(fakeTuitionService.generateOrProxyPaymentQr).toHaveBeenCalledWith({
      bankCode: 'mb',
      accountNumber: '713072005',
      amount: '200000',
      addInfo: 'HP Dang Thi Hong Xuan',
      accountName: 'TRAN THI PHUONG ANH',
      template: 'compact2',
    });

    expect(headersSet['Content-Type']).toBe('image/png');
    expect(headersSet['Access-Control-Allow-Origin']).toBe('*');
    expect(headersSet['Cross-Origin-Resource-Policy']).toBe('cross-origin');
    expect(headersSet['Cache-Control']).toContain('public');
    expect(endedBuffer).toEqual(fakeBuffer);
  });
});

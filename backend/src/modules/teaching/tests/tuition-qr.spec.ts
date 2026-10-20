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

  // QR-02 & QR-03: Handles VietQR SVG containing embedded base64 PNG
  it('QR-02 & QR-03: Extracts clean PNG buffer from VietQR SVG response without broken icons', async () => {
    const rawPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03]);
    const b64 = Buffer.from(rawPngBytes).toString('base64');
    const svgResponse = `<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${b64}"/></svg>`;
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
    expect(result.buffer).toEqual(Buffer.from(rawPngBytes));
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

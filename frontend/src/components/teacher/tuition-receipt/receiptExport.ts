import html2canvas from 'html2canvas';

export interface ReceiptFallbackInfo {
  accountNumber?: string;
  bankName?: string;
  accountHolder?: string;
  transferContent?: string;
  amountFormatted?: string;
}

/**
 * Fetch QR image from the backend proxy URL as a Blob and convert it to a local base64 Data URL.
 * Guarantees zero CORS race conditions, zero network requests in cloned iframes, and canvas export safety.
 */
export async function fetchQrAsDataUrl(qrUrl: string): Promise<string> {
  if (!qrUrl) return '';
  if (qrUrl.startsWith('data:image')) return qrUrl;

  const res = await fetch(qrUrl, { mode: 'cors' });
  if (!res.ok) {
    throw new Error(`Không thể tải mã QR: HTTP ${res.status}`);
  }

  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not produce string Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Wait for all images inside an element to be fully loaded and decoded.
 */
export async function waitForImages(root: HTMLElement, timeoutMs = 10000): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  if (images.length === 0) return;

  await Promise.all(
    images.map((img) => {
      return new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) {
          if (typeof img.decode === 'function') {
            img.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
          return;
        }

        let isResolved = false;
        const done = () => {
          if (isResolved) return;
          isResolved = true;
          if (typeof img.decode === 'function') {
            img.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        };

        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, timeoutMs);
      });
    })
  );
}

/**
 * Capture receipt element with html2canvas and return the rendered canvas.
 * - Downloads QR into Data URL before capture.
 * - Uses onclone to guarantee the cloned DOM in html2canvas holds the exact Data URL.
 * - Temporarily resets scroll container to prevent scroll-offset clipping.
 * - Measures exact actual content width and height.
 */
export async function captureReceiptCanvas(
  sourceElement: HTMLElement,
  fallbackInfo?: ReceiptFallbackInfo
): Promise<HTMLCanvasElement> {
  const scrollContainer = sourceElement.closest('.overflow-y-auto') as HTMLElement | null;
  const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

  // Find QR image in source element
  const qrImg = sourceElement.querySelector<HTMLImageElement>(
    'img[data-receipt-qr="true"], img[alt="VietQR"], img[src*="/tuition/qr"]'
  );

  let qrDataUrl = '';
  const originalQrSrc = qrImg ? qrImg.src : '';

  try {
    // 1. Temporarily reset container scroll so element is not offset
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }

    // 2. Wait for fonts & paints
    await document.fonts?.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    // 3. Step A & B: Download QR image as Blob and convert to local data URL
    if (qrImg && qrImg.src) {
      try {
        qrDataUrl = await fetchQrAsDataUrl(qrImg.src);

        // Pre-verify that the Data URL is decodable
        const preloader = new Image();
        preloader.src = qrDataUrl;
        if (typeof preloader.decode === 'function') {
          await preloader.decode();
        }

        // Apply Data URL directly to source QR image
        qrImg.setAttribute('src', qrDataUrl);
        qrImg.src = qrDataUrl;
        qrImg.removeAttribute('crossorigin');
        if (typeof qrImg.decode === 'function') {
          await qrImg.decode();
        }
      } catch (err) {
        console.error('[ReceiptExport] QR preparation failed:', err);
      }
    }

    // 4. Wait for all images in receipt to load and decode
    await waitForImages(sourceElement);

    // 5. Measure exact dynamic dimensions
    const rect = sourceElement.getBoundingClientRect();
    const actualWidth = Math.ceil(sourceElement.scrollWidth || rect.width);
    const actualHeight = Math.ceil(sourceElement.scrollHeight || rect.height);

    if (actualWidth === 0 || actualHeight === 0) {
      throw new Error(`Receipt element has 0 dimensions: ${actualWidth}x${actualHeight}`);
    }

    // 6. html2canvas with scale: 2 and onclone injection
    const canvas = await html2canvas(sourceElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      width: actualWidth,
      height: actualHeight,
      windowWidth: Math.max(1440, window.innerWidth),
      windowHeight: Math.max(actualHeight + 200, window.innerHeight),
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc: Document) => {
        const clonedQrs = clonedDoc.querySelectorAll<HTMLImageElement>(
          'img[data-receipt-qr="true"], img[alt="VietQR"], img[src*="/tuition/qr"]'
        );

        clonedQrs.forEach((img) => {
          if (qrDataUrl) {
            img.setAttribute('src', qrDataUrl);
            img.src = qrDataUrl;
            img.removeAttribute('crossorigin');
            img.style.width = '180px';
            img.style.height = '180px';
            img.style.maxWidth = '180px';
            img.style.maxHeight = '180px';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
          } else {
            // QR preparation failed fallback in cloned document
            const parent = img.parentElement;
            if (parent) {
              const fallbackBox = document.createElement('div');
              fallbackBox.className =
                'w-full p-4 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 text-center text-slate-700 space-y-2';
              fallbackBox.innerHTML = `
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.05em;">
                  QR THANH TOÁN
                </div>
                <div style="font-size: 10px; color: #64748b; font-weight: 500;">
                  Vui lòng chuyển khoản theo thông tin bên dưới
                </div>
                ${
                  fallbackInfo?.accountNumber
                    ? `
                  <div style="font-size: 12px; font-weight: 800; font-family: monospace; color: #0f172a; margin-top: 4px;">
                    STK: ${fallbackInfo.accountNumber}
                  </div>
                  <div style="font-size: 11px; font-weight: 700; color: #334155;">
                    ${fallbackInfo.bankName || ''}
                  </div>
                  <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569;">
                    Chủ TK: ${fallbackInfo.accountHolder || ''}
                  </div>
                  ${
                    fallbackInfo.transferContent
                      ? `<div style="font-size: 10px; color: #64748b; background: #ffffff; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; margin-top: 4px;">
                          Nội dung: <b>${fallbackInfo.transferContent}</b>
                        </div>`
                      : ''
                  }
                  ${
                    fallbackInfo.amountFormatted
                      ? `<div style="font-size: 12px; font-weight: 900; color: #1e3a8a; margin-top: 4px;">
                          Số tiền: ${fallbackInfo.amountFormatted} đ
                        </div>`
                      : ''
                  }
                `
                    : ''
                }
              `;
              parent.replaceChild(fallbackBox, img);
            }
          }
        });
      },
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Generated canvas has 0 dimensions');
    }

    return canvas;
  } finally {
    // Restore original QR source on live preview
    if (qrImg && originalQrSrc) {
      qrImg.setAttribute('src', originalQrSrc);
      qrImg.src = originalQrSrc;
      qrImg.setAttribute('crossorigin', 'anonymous');
    }

    // Restore scroll position
    if (scrollContainer) {
      scrollContainer.scrollTop = prevScrollTop;
    }
  }
}

/**
 * Export receipt to PNG and trigger browser download.
 */
export async function exportReceiptToPng(
  sourceElement: HTMLElement,
  filename: string,
  fallbackInfo?: ReceiptFallbackInfo
): Promise<void> {
  const canvas = await captureReceiptCanvas(sourceElement, fallbackInfo);
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Export receipt to PNG Blob for clipboard copy.
 */
export async function exportReceiptToBlob(
  sourceElement: HTMLElement,
  fallbackInfo?: ReceiptFallbackInfo
): Promise<Blob> {
  const canvas = await captureReceiptCanvas(sourceElement, fallbackInfo);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to PNG blob'));
      }
    }, 'image/png');
  });
}

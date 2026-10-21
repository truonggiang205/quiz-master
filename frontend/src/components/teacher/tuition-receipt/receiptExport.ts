import html2canvas from 'html2canvas';

export interface ReceiptFallbackInfo {
  accountNumber?: string;
  bankName?: string;
  accountHolder?: string;
  transferContent?: string;
  amountFormatted?: string;
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
 * Convert an image to a base64 Data URL to guarantee CORS and html2canvas iframe clone safety.
 */
export async function getImageDataUrl(
  img: HTMLImageElement,
  sourceImg?: HTMLImageElement
): Promise<string> {
  if (img.src && img.src.startsWith('data:')) {
    return img.src;
  }

  // Strategy 1: If source image in DOM is already complete and decoded, draw to offscreen canvas
  const candidate = (sourceImg && sourceImg.complete && sourceImg.naturalWidth > 0) ? sourceImg : img;
  if (candidate.complete && candidate.naturalWidth > 0) {
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = candidate.naturalWidth;
      tempCanvas.height = candidate.naturalHeight;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(candidate, 0, 0);
        const dataUrl = tempCanvas.toDataURL('image/png');
        if (dataUrl && dataUrl.length > 100) {
          return dataUrl;
        }
      }
    } catch {
      // Tainted canvas or drawImage error, proceed to Strategy 2
    }
  }

  // Strategy 2: Fetch image blob with CORS and convert to base64 via FileReader
  if (img.src && (img.src.startsWith('http://') || img.src.startsWith('https://') || img.src.startsWith('/'))) {
    try {
      const res = await fetch(img.src, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // Fetch failed, proceed to fallback
    }
  }

  return img.src;
}

/**
 * Prepare QR images in export element: convert to Data URL and verify.
 * If preparation fails, render an explicit, clear fallback block instead of an empty box.
 */
export async function prepareQrImagesForExport(
  exportRoot: HTMLElement,
  sourceRoot?: HTMLElement,
  fallbackInfo?: ReceiptFallbackInfo
): Promise<void> {
  const qrImages = Array.from(
    exportRoot.querySelectorAll<HTMLImageElement>(
      'img[alt="VietQR"], img[data-qr="true"], img[src*="/tuition/qr"]'
    )
  );

  if (qrImages.length === 0) return;

  const sourceImages = sourceRoot
    ? Array.from(
        sourceRoot.querySelectorAll<HTMLImageElement>(
          'img[alt="VietQR"], img[data-qr="true"], img[src*="/tuition/qr"]'
        )
      )
    : [];

  await Promise.all(
    qrImages.map(async (qrImg, index) => {
      const sourceQrImg = sourceImages[index];
      let success = false;

      try {
        const dataUrl = await getImageDataUrl(qrImg, sourceQrImg);
        if (dataUrl && dataUrl.startsWith('data:image')) {
          qrImg.src = dataUrl;
          if (typeof qrImg.decode === 'function') {
            await qrImg.decode();
          }
          if (qrImg.naturalWidth > 0 && qrImg.naturalHeight > 0) {
            success = true;
          }
        }
      } catch (err) {
        console.error('[ReceiptExport] QR preparation failed:', err);
      }

      // If QR preparation failed, render clear fallback in the clone
      if (!success) {
        console.error('[ReceiptExport] QR preparation failed: QR image could not be loaded into canvas-safe Data URL');
        const container = qrImg.parentElement;
        if (container) {
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
          container.replaceChild(fallbackBox, qrImg);
        }
      }
    })
  );
}

/**
 * Creates an isolated clone of the receipt element in an off-screen sandbox.
 * The original live preview is NOT modified.
 */
export function cloneReceiptForExport(sourceElement: HTMLElement): {
  sandbox: HTMLElement;
  clonedReceipt: HTMLElement;
  actualWidth: number;
  cleanup: () => void;
} {
  const rect = sourceElement.getBoundingClientRect();
  const actualWidth = Math.ceil(sourceElement.scrollWidth || rect.width) || 720;

  // Dedicated sandbox behind modal (modal is z-50 with backdrop)
  const sandbox = document.createElement('div');
  sandbox.id = 'receipt-export-sandbox';
  sandbox.setAttribute('aria-hidden', 'true');
  sandbox.style.position = 'fixed';
  sandbox.style.top = '0';
  sandbox.style.left = '0';
  sandbox.style.width = `${actualWidth}px`;
  sandbox.style.minWidth = `${actualWidth}px`;
  sandbox.style.maxWidth = `${actualWidth}px`;
  sandbox.style.height = 'auto';
  sandbox.style.minHeight = '0';
  sandbox.style.maxHeight = 'none';
  sandbox.style.overflow = 'visible';
  sandbox.style.zIndex = '40';
  sandbox.style.pointerEvents = 'none';
  sandbox.style.backgroundColor = '#ffffff';
  sandbox.style.boxSizing = 'border-box';

  const clonedReceipt = sourceElement.cloneNode(true) as HTMLElement;
  clonedReceipt.style.width = '100%';
  clonedReceipt.style.height = 'auto';
  clonedReceipt.style.minHeight = '0';
  clonedReceipt.style.maxHeight = 'none';
  clonedReceipt.style.overflow = 'visible';

  sandbox.appendChild(clonedReceipt);
  document.body.appendChild(sandbox);

  const cleanup = () => {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  };

  return { sandbox, clonedReceipt, actualWidth, cleanup };
}

/**
 * Prepares the receipt for export: awaits fonts, clones receipt into sandbox,
 * preloads all images into base64 Data URLs, and measures exact rendered height.
 */
export async function prepareReceiptExport(
  sourceElement: HTMLElement,
  fallbackInfo?: ReceiptFallbackInfo
): Promise<{
  exportElement: HTMLElement;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  // 1. Wait for document fonts
  await document.fonts?.ready;

  // 2. Wait for images in the live source element to load
  await waitForImages(sourceElement);

  // 3. Clone receipt into isolated sandbox
  const { clonedReceipt, actualWidth, cleanup } = cloneReceiptForExport(sourceElement);

  try {
    // 4. Convert QR and images in cloned receipt to data URLs
    await prepareQrImagesForExport(clonedReceipt, sourceElement, fallbackInfo);

    // Also convert any other non-QR images in clone
    const otherImages = Array.from(clonedReceipt.querySelectorAll('img')).filter(
      (img) => !img.src.startsWith('data:')
    );
    await Promise.all(
      otherImages.map(async (img) => {
        try {
          const dataUrl = await getImageDataUrl(img);
          if (dataUrl && dataUrl.startsWith('data:')) {
            img.src = dataUrl;
          }
        } catch {
          // Keep original src
        }
      })
    );

    // 5. Re-verify all images in clone
    await waitForImages(clonedReceipt);

    // 6. Wait for layout paints
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    // 7. Measure actual rendered height after dynamic expansion
    const cloneRect = clonedReceipt.getBoundingClientRect();
    const actualHeight = Math.ceil(clonedReceipt.scrollHeight || cloneRect.height);

    if (actualWidth === 0 || actualHeight === 0) {
      throw new Error(`Receipt export element has 0 dimensions: ${actualWidth}x${actualHeight}`);
    }

    return {
      exportElement: clonedReceipt,
      width: actualWidth,
      height: actualHeight,
      cleanup,
    };
  } catch (err) {
    cleanup();
    throw err;
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
  const { exportElement, width, height, cleanup } = await prepareReceiptExport(
    sourceElement,
    fallbackInfo
  );

  try {
    const canvas = await html2canvas(exportElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      width,
      height,
      windowWidth: Math.max(1440, window.innerWidth),
      windowHeight: Math.max(height + 200, window.innerHeight),
      scrollX: 0,
      scrollY: 0,
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Generated canvas has 0 dimensions');
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    cleanup();
  }
}

/**
 * Export receipt to PNG Blob for clipboard copy.
 */
export async function exportReceiptToBlob(
  sourceElement: HTMLElement,
  fallbackInfo?: ReceiptFallbackInfo
): Promise<Blob> {
  const { exportElement, width, height, cleanup } = await prepareReceiptExport(
    sourceElement,
    fallbackInfo
  );

  try {
    const canvas = await html2canvas(exportElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 15000,
      width,
      height,
      windowWidth: Math.max(1440, window.innerWidth),
      windowHeight: Math.max(height + 200, window.innerHeight),
      scrollX: 0,
      scrollY: 0,
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Generated canvas has 0 dimensions');
    }

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to PNG blob'));
        }
      }, 'image/png');
    });
  } finally {
    cleanup();
  }
}

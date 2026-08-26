import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Loader2, CheckCircle, AlertTriangle, ScanLine, Keyboard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface OrderScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: { orderNumber: string; customerName?: string; courier?: string }) => void;
}

export const OrderScannerModal: React.FC<OrderScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualResi, setManualResi] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setErrorMessage(null);
    setScanning(true);
    setScannerReady(false);

    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const scannerId = 'packguard-qr-scanner';
      const scannerElement = document.getElementById(scannerId);
      if (!scannerElement) {
        setErrorMessage('Elemen scanner tidak ditemukan.');
        setScanning(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 120 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Successfully scanned a barcode/QR code
          handleScanResult(decodedText);
        },
        () => {
          // Scan frame - no result yet (expected, silent)
        }
      );

      setScannerReady(true);
      setScanning(false);
    } catch (err: any) {
      console.error('Scanner Error:', err);
      setScanning(false);
      if (err?.toString?.()?.includes('NotAllowedError') || err?.toString?.()?.includes('Permission')) {
        setErrorMessage('Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser Anda.');
      } else {
        setErrorMessage('Gagal memulai scanner kamera. Gunakan input manual di bawah.');
      }
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      // Ignore cleanup errors
      console.warn('Scanner cleanup:', err);
    }
    setScannerReady(false);
    setScanning(false);
  };

  const handleScanResult = async (scannedText: string) => {
    if (!scannedText || scannedText.trim().length === 0) return;

    // Stop scanner first to prevent duplicate scans
    await stopScanner();

    const trackingNumber = scannedText.trim();

    onScanSuccess({
      orderNumber: trackingNumber,
    });
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualResi.trim()) {
      setErrorMessage('Masukkan nomor resi terlebih dahulu.');
      return;
    }
    handleScanResult(manualResi.trim());
  };

  const handleClose = () => {
    stopScanner();
    setShowManualInput(false);
    setManualResi('');
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl text-slate-900">

        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <ScanLine className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-sm text-slate-900">Scan Resi Pengiriman</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {errorMessage && (
            <div className="mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Camera Scanner Area */}
          <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
            <div
              id="packguard-qr-scanner"
              ref={containerRef}
              style={{ width: '100%', minHeight: '240px' }}
            />

            {scanning && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-amber-300 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                <span className="text-xs font-semibold text-white">Mempersiapkan Kamera Scanner...</span>
              </div>
            )}

            {scannerReady && (
              <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                <span className="text-[10px] bg-slate-900/80 text-emerald-400 px-2 py-0.5 rounded font-mono flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>Scanner Aktif</span>
                </span>
                <span className="text-[10px] bg-slate-900/80 text-slate-300 px-2 py-0.5 rounded font-mono">
                  Barcode & QR
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-3 text-center">
            Arahkan kamera ke <strong>barcode</strong> atau <strong>QR code</strong> pada resi pengiriman. Scanner akan membaca otomatis.
          </p>

          {/* Manual Input Toggle */}
          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="w-full text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center justify-center space-x-1.5 py-1 transition-colors cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>{showManualInput ? 'Sembunyikan Input Manual' : 'Input Resi Manual'}</span>
            </button>

            {showManualInput && (
              <form onSubmit={handleManualSubmit} className="mt-2 flex space-x-2">
                <input
                  type="text"
                  value={manualResi}
                  onChange={(e) => setManualResi(e.target.value)}
                  placeholder="Ketik nomor resi..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:bg-white"
                  autoFocus
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-all"
                >
                  OK
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

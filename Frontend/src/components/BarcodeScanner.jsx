import { useEffect, useRef } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    async function start() {
      try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        const deviceId = videoInputDevices[0]?.deviceId;
        if (!deviceId) throw new Error("No camera found");
        codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
          if (result) {
            onDetected(result.getText());
            // stop after detection
            codeReader.reset();
          }
        });
      } catch (e) {
        console.error(e);
        alert("Camera access failed: " + e.message);
        onClose();
      }
    }
    start();

    return () => {
      try { codeReader.reset(); } catch (e) {}
    };
  }, [onDetected, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-4 w-96">
        <div className="mb-2 flex justify-between items-center">
          <div className="font-bold">Scan Barcode</div>
          <button onClick={onClose} className="text-sm text-gray-600">Close</button>
        </div>
        <video ref={videoRef} style={{ width: "100%", height: "240px" }} />
      </div>
    </div>
  );
}

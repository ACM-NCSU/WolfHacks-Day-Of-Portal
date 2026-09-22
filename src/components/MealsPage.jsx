import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { lookupDietaryInfo } from '../lib/mealsApi.js';
import { ApiError } from '../lib/api.js';

// A hacker's own QR code just encodes their applications-table id (already
// known client-side from /api/auth/me) -- no secret, just an identifier
// staff use to look up dietary info at the food table.
function HackerMealQR({ participant }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !participant?.id) return;
    QRCode.toCanvas(canvasRef.current, participant.id, { width: 204, margin: 1 }).catch(() => {});
  }, [participant?.id]);

  return (
    <div className="portal-shell__qr-card">
      <canvas ref={canvasRef} className="portal-shell__qr-canvas" aria-label="Your meal QR code" />
      <p className="portal-shell__placeholder-note">
        Show this at the food table -- staff will scan it to check your dietary restrictions.
      </p>
    </div>
  );
}

// Organizer-facing camera scanner: reads frames off a <video> feed into a
// hidden <canvas>, decodes with jsQR, and looks up the scanned id's dietary
// info once organizer-gated (backend/meals.py). The <video> stays mounted
// at all times (just hidden via CSS) so the ref is attached before we try
// to assign a camera stream to it.
function OrganizerMealScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | scanning | looking-up | found | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  function stopCamera() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function tick() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      frameRef.current = requestAnimationFrame(tick);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      handleDecoded(code.data);
      return;
    }
    frameRef.current = requestAnimationFrame(tick);
  }

  async function handleDecoded(participantId) {
    stopCamera();
    setStatus('looking-up');
    try {
      const data = await lookupDietaryInfo(participantId);
      setResult(data);
      setStatus('found');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Lookup failed. Please try again.');
      setStatus('error');
    }
  }

  async function startScanning() {
    setErrorMessage('');
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus('scanning');
      frameRef.current = requestAnimationFrame(tick);
    } catch {
      setErrorMessage('Could not access the camera. Check browser permissions and try again.');
      setStatus('error');
    }
  }

  useEffect(() => () => stopCamera(), []);

  return (
    <div className="team-card">
      <p className="team-card__title">Scan a hacker&apos;s meal QR code</p>

      {(status === 'idle' || status === 'error') && (
        <button className="btn btn--primary" type="button" onClick={startScanning}>
          {status === 'error' ? 'Try again' : 'Start scanning'}
        </button>
      )}

      <div className={`meals-scanner__video-wrap ${status === 'scanning' ? '' : 'meals-scanner__video-wrap--hidden'}`}>
        <video ref={videoRef} className="meals-scanner__video" muted playsInline />
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {status === 'looking-up' && <p className="team-card__note">Looking up dietary info...</p>}

      {status === 'error' && errorMessage && (
        <p className="team-card__error" role="alert">{errorMessage}</p>
      )}

      {status === 'found' && result && (
        <div className="meals-scanner__result">
          <p className="team-card__title">{result.first_name} {result.last_name}</p>
          <p className="team-card__note">
            {result.dietary_notes
              ? `${result.dietary_notes}${result.dietary_notes_other ? ` -- ${result.dietary_notes_other}` : ''}`
              : 'No dietary restrictions on file.'}
          </p>
          <button className="btn btn--primary" type="button" onClick={startScanning}>
            Scan another
          </button>
        </div>
      )}
    </div>
  );
}

export default function MealsPage({ participant }) {
  return (
    <section>
      <div className="portal-shell__intro">
        <p className="eyebrow">MEALS</p>
        <h1 className="section__heading">
          {participant.is_organizer ? 'Meal check-in' : 'Show this at the food table.'}
        </h1>
      </div>
      {participant.is_organizer ? <OrganizerMealScanner /> : <HackerMealQR participant={participant} />}
    </section>
  );
}

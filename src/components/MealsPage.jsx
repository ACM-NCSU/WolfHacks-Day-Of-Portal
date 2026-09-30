import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import SelectField from './SelectField.jsx';
import { listMealSlots, scanMeal } from '../lib/mealsApi.js';
import { ApiError } from '../lib/api.js';

// A hacker's own QR code just encodes their applications-table id (already
// known client-side from /api/auth/me) -- no secret, just an identifier
// staff use to mark a meal scanned at the food table.
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
        Show this at the food table -- staff will scan it to mark your meal.
      </p>
    </div>
  );
}

// Organizer-facing camera scanner: pick which of the 4 scheduled meals is
// being handed out, then read frames off a <video> feed into a hidden
// <canvas>, decode with jsQR, and scan the id against that meal slot
// (backend/meals.py marks it consumed -- a repeat scan for the same meal is
// rejected, not silently re-marked). The <video> stays mounted at all times
// (just hidden via CSS) so the ref is attached before we try to assign a
// camera stream to it.
function OrganizerMealScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [status, setStatus] = useState('idle'); // idle | scanning | looking-up | found | already-scanned | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    listMealSlots()
      .then((data) => {
        setSlots(data);
        setSelectedSlot((current) => current || data[0]?.slug || '');
      })
      .catch((err) => {
        console.error('Failed to load meal slots:', err);
      });
  }, []);

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
      const data = await scanMeal(participantId, selectedSlot);
      setResult(data);
      setStatus('found');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrorMessage(err.message);
        setStatus('already-scanned');
      } else {
        setErrorMessage(err instanceof ApiError ? err.message : 'Scan failed. Please try again.');
        setStatus('error');
      }
    }
  }

  async function startScanning() {
    if (!selectedSlot) return;
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

  const idle = status === 'idle' || status === 'error' || status === 'already-scanned';
  const selectedLabel = slots.find((slot) => slot.slug === selectedSlot)?.label ?? '';

  function handleSlotChange(_name, label) {
    setSelectedSlot(slots.find((slot) => slot.label === label)?.slug ?? '');
  }

  return (
    <div className="team-card meals-scanner">
      <p className="team-card__title">Scan a hacker&apos;s meal QR code</p>

      <label className="meals-scanner__slot-picker">
        <span className="application-form__question">Meal</span>
        <SelectField
          name="mealSlot"
          value={selectedLabel}
          onChange={handleSlotChange}
          options={slots.map((slot) => slot.label)}
          placeholder="Select a meal"
          disabled={status === 'scanning' || status === 'looking-up'}
        />
      </label>

      {idle && (
        <button className="btn btn--primary" type="button" onClick={startScanning} disabled={!selectedSlot}>
          {status === 'idle' ? 'Start scanning' : 'Try again'}
        </button>
      )}

      <div className={`meals-scanner__video-wrap ${status === 'scanning' ? '' : 'meals-scanner__video-wrap--hidden'}`}>
        <video ref={videoRef} className="meals-scanner__video" muted playsInline />
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {status === 'looking-up' && <p className="team-card__note">Scanning...</p>}

      {status === 'already-scanned' && errorMessage && (
        <p className="meals-scanner__already" role="alert">{errorMessage}</p>
      )}

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

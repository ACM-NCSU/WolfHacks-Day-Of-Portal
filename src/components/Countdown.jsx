import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import useCountdown from '../hooks/useCountdown.js';

const UNITS = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hrs' },
  { key: 'mins', label: 'Min' },
  { key: 'secs', label: 'Sec' },
];

export default function Countdown({ target }) {
  const parts = useCountdown(target);
  const prefersReducedMotion = useReducedMotion();
  if (!parts) return null;

  return (
    <div className="countdown" aria-live="polite">
      {UNITS.map((unit) => (
        <div className="countdown__unit" key={unit.key}>
          <span className="countdown__value">
            {prefersReducedMotion ? (
              parts[unit.key]
            ) : (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={parts[unit.key]}
                  initial={{ y: -12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 12, opacity: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                >
                  {parts[unit.key]}
                </motion.span>
              </AnimatePresence>
            )}
          </span>
          <span className="countdown__label">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

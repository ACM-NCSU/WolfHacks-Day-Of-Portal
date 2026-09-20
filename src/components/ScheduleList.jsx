import { useMemo, useState } from 'react';
import ScheduleEditForm from './ScheduleEditForm.jsx';
import { findNextItem, getItemStatus } from '../lib/scheduleStatus.js';

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export default function ScheduleList({ schedule, now, canEdit, onChanged }) {
  const [editingId, setEditingId] = useState(null);
  // schedule is sorted by start_time by the API; findNextItem relies on that.
  const nextItem = useMemo(() => findNextItem(schedule, now), [schedule, now]);

  if (schedule.length === 0) {
    return <p className="team-card__note">No schedule yet.</p>;
  }

  return (
    <ul className="schedule-list">
      {schedule.map((item) => {
        if (editingId === item.id) {
          return (
            <li className="schedule-item schedule-item--editing" key={item.id}>
              <ScheduleEditForm
                item={item}
                onCancel={() => setEditingId(null)}
                onSaved={async () => {
                  setEditingId(null);
                  await onChanged();
                }}
              />
            </li>
          );
        }

        const itemStatus = getItemStatus(item, now);
        const isNext = nextItem?.id === item.id;
        // Location is only surfaced for what's happening now or what's next --
        // the full list stays scannable instead of repeating a room name on
        // every row.
        const showLocation = (itemStatus === 'current' || isNext) && item.location;

        return (
          <li className={`schedule-item schedule-item--${itemStatus}`} key={item.id}>
            <div className="schedule-item__time">
              {timeFormatter.format(new Date(item.start_time))}
              {' – '}
              {timeFormatter.format(new Date(item.end_time))}
            </div>
            <div className="schedule-item__body">
              <div className="schedule-item__title-row">
                <span className="schedule-item__title">{item.title}</span>
                {itemStatus === 'current' && (
                  <span className="schedule-item__badge">Happening now</span>
                )}
                {itemStatus !== 'current' && isNext && (
                  <span className="schedule-item__badge schedule-item__badge--next">Next</span>
                )}
              </div>
              {showLocation && <div className="schedule-item__location">{item.location}</div>}
            </div>
            {canEdit && (
              <button
                className="btn btn--ghost schedule-item__edit"
                type="button"
                onClick={() => setEditingId(item.id)}
              >
                Adjust
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

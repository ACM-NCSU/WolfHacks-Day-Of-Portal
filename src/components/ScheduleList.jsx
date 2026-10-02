import { Fragment, useMemo, useState } from 'react';
import ScheduleEditForm from './ScheduleEditForm.jsx';
import { findNextItem, getItemStatus } from '../lib/scheduleStatus.js';
import { EVENT_TIME_ZONE, easternDateKey } from '../lib/eventTime.js';

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
});
const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TIME_ZONE,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

export default function ScheduleList({ schedule, now, canEdit, onChanged }) {
  const [editingId, setEditingId] = useState(null);
  // schedule is sorted by start_time by the API; findNextItem relies on that.
  const nextItem = useMemo(() => findNextItem(schedule, now), [schedule, now]);

  if (schedule.length === 0) {
    return <p className="team-card__note">No schedule yet.</p>;
  }

  let lastDateKey = null;
  let dayNumber = 0;

  return (
    <ul className="schedule-list">
      {schedule.map((item) => {
        const startDate = new Date(item.start_time);
        const dateKey = easternDateKey(startDate);
        const isNewDay = dateKey !== lastDateKey;
        if (isNewDay) {
          lastDateKey = dateKey;
          dayNumber += 1;
        }
        const dayHeading = isNewDay && (
          <li className="schedule-day-heading">
            <span className="schedule-day-heading__label">Day {dayNumber}</span>
            <span className="schedule-day-heading__date">{dayFormatter.format(startDate)}</span>
          </li>
        );

        if (editingId === item.id) {
          return (
            <Fragment key={item.id}>
              {dayHeading}
              <li className="schedule-item schedule-item--editing">
                <ScheduleEditForm
                  item={item}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await onChanged();
                  }}
                />
              </li>
            </Fragment>
          );
        }

        const itemStatus = getItemStatus(item, now);
        const isNext = nextItem?.id === item.id;
        // Location is only surfaced for what's happening now or what's next --
        // the full list stays scannable instead of repeating a room name on
        // every row.
        const showLocation = (itemStatus === 'current' || isNext) && item.location;

        return (
          <Fragment key={item.id}>
            {dayHeading}
            <li className={`schedule-item schedule-item--${itemStatus}`}>
              <div className="schedule-item__time">
                {timeFormatter.format(startDate)}
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
          </Fragment>
        );
      })}
    </ul>
  );
}

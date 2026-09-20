import ScheduleList from './ScheduleList.jsx';
import useSchedule from '../hooks/useSchedule.js';
import useNow from '../hooks/useNow.js';

// Rendered inside PortalShell's 'schedule' section -- PortalShell already
// guarantees an authenticated `participant` before this ever mounts.
export default function SchedulePage({ participant }) {
  const { schedule, status: scheduleStatus, refresh } = useSchedule();
  const now = useNow();

  const canEdit = Boolean(participant?.is_organizer);

  return (
    <section>
      <div className="portal-shell__intro">
        <p className="eyebrow">LIVE SCHEDULE</p>
        <h1 className="section__heading">What's happening right now.</h1>
      </div>

      <div className="team-card">
        <p className="team-card__title">Today's agenda</p>
        {scheduleStatus === 'error' ? (
          <p className="team-card__error" role="alert">Could not load the schedule. Please refresh the page.</p>
        ) : (
          <ScheduleList schedule={schedule} now={now} canEdit={canEdit} onChanged={refresh} />
        )}
      </div>

      {!canEdit && (
        <p className="team-card__note">Only organizers can adjust the schedule.</p>
      )}
    </section>
  );
}

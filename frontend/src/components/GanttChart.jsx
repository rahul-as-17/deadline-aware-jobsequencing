const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#0891b2','#7c3aed','#ea580c','#65a30d','#db2777','#0d9488','#6d28d9','#ca8a04'];

export default function GanttChart({ scheduledJobs, allJobs, highlightTime }) {
  if (!scheduledJobs || !scheduledJobs.length) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1.5rem 0' }}>No jobs scheduled.</div>;
  }

  const maxEnd = Math.max(...scheduledJobs.map(j => j.end_time), ...allJobs.map(j => j.deadline)) + 1;
  const ticks = Array.from({ length: maxEnd + 1 }, (_, i) => i);
  const jobMap = Object.fromEntries(allJobs.map(j => [j.id, j]));

  return (
    <div className="gantt-container">
      <div className="gantt-chart">
        {/* Time header */}
        <div className="gantt-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem', borderBottom: 'none' }}>
          <div className="gantt-label" style={{ width: '70px', marginRight: '0.6rem', color: 'var(--text-muted)', fontSize: '0.65rem' }}>Job</div>
          <div className="gantt-timeline" style={{ position: 'relative', flex: 1, height: '18px' }}>
            {ticks.map(t => (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: `${(t / maxEnd) * 100}%`,
                  transform: 'translateX(-50%)',
                  fontSize: '0.68rem',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 600
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Rows Wrapper with global timeline overlay line */}
        <div style={{ position: 'relative' }}>
          {/* Global moving time indicator line */}
          {highlightTime !== undefined && highlightTime !== null && (
            <div
              style={{
                position: 'absolute',
                left: `calc(70px + 0.6rem + ${(highlightTime / maxEnd)} * (100% - 70px - 0.6rem))`,
                top: 0,
                bottom: 0,
                width: '2px',
                background: '#a855f7',
                boxShadow: '0 0 6px #a855f7',
                zIndex: 10,
                pointerEvents: 'none',
                transition: 'left 0.15s ease'
              }}
              title={`Current Time: ${highlightTime}`}
            >
              {/* Handle at the top of the line */}
              <div style={{
                position: 'absolute',
                top: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#a855f7',
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
              }} />
            </div>
          )}

          {/* Job rows */}
          {scheduledJobs.map((sj, idx) => {
            const left = `${(sj.start_time / maxEnd) * 100}%`;
            const width = `${((sj.end_time - sj.start_time + 1) / maxEnd) * 100}%`;
            const bg = COLORS[idx % COLORS.length];
            const job = jobMap[sj.job_id];

            return (
              <div key={sj.job_id} className="gantt-row" style={{ position: 'relative' }}>
                <div className="gantt-label">J{sj.job_id}</div>
                <div className="gantt-track" style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* Vertical grid lines inside each track */}
                  {ticks.map(t => (
                    <div
                      key={t}
                      style={{
                        position: 'absolute',
                        left: `${(t / maxEnd) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        borderLeft: '1px dashed var(--border-subtle)',
                        opacity: 0.5,
                        pointerEvents: 'none'
                      }}
                    />
                  ))}

                  {/* Scheduled Block */}
                  <div className="gantt-block" style={{ left, width, background: `linear-gradient(135deg, ${bg}, ${bg}cc)` }}
                    title={job ? `J${sj.job_id}: profit ₹${job.profit}, deadline ${job.deadline}` : `J${sj.job_id}`}>
                    J{sj.job_id}
                  </div>

                  {/* Deadline marker */}
                  {job && (
                    <div style={{
                      position: 'absolute',
                      left: `${(job.deadline / maxEnd) * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: '2px',
                      background: 'var(--rose)',
                      opacity: 0.7,
                      zIndex: 3
                    }}
                      title={`Deadline: ${job.deadline}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 16, height: 10, background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', borderRadius: 3 }} /> Scheduled block
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 2, height: 12, background: 'var(--rose)' }} /> Deadline
        </div>
        {highlightTime !== undefined && highlightTime !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 2, height: 12, background: '#a855f7', boxShadow: '0 0 3px #a855f7' }} /> Current time (t={highlightTime})
          </div>
        )}
      </div>
    </div>
  );
}

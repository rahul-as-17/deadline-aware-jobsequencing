const COLORS = ['#2563eb','#059669','#d97706','#dc2626','#0891b2','#7c3aed','#ea580c','#65a30d','#db2777','#0d9488','#6d28d9','#ca8a04'];

export default function GanttChart({ scheduledJobs, allJobs }) {
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
        <div className="gantt-header">
          <div className="gantt-label" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Job</div>
          <div className="gantt-timeline">
            {ticks.map(t => <div key={t} className="gantt-tick">{t}</div>)}
          </div>
        </div>

        {/* Job rows */}
        {scheduledJobs.map((sj, idx) => {
          const left = `${(sj.start_time / maxEnd) * 100}%`;
          const width = `${((sj.end_time - sj.start_time + 1) / maxEnd) * 100}%`;
          const bg = COLORS[idx % COLORS.length];
          const job = jobMap[sj.job_id];

          return (
            <div key={sj.job_id} className="gantt-row">
              <div className="gantt-label">J{sj.job_id}</div>
              <div className="gantt-track">
                <div className="gantt-block" style={{ left, width, background: `linear-gradient(135deg, ${bg}, ${bg}cc)` }}
                  title={job ? `J${sj.job_id}: profit ₹${job.profit}, deadline ${job.deadline}` : `J${sj.job_id}`}>
                  J{sj.job_id}
                </div>
                {/* Deadline marker */}
                {job && (
                  <div style={{
                    position: 'absolute', left: `${((job.deadline + 0.5) / maxEnd) * 100}%`,
                    top: 0, bottom: 0, width: 1,
                    background: 'var(--rose)', opacity: 0.5,
                  }}
                    title={`Deadline: ${job.deadline}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 20, height: 3, background: 'var(--accent)', borderRadius: 2 }} /> Scheduled block
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 1, height: 12, background: 'var(--rose)', opacity: 0.6 }} /> Deadline
        </div>
      </div>
    </div>
  );
}

/* global React, ReactDOM, TRU_DATA, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSelect, TweakToggle, TweakColor */
const { useState, useMemo, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────────
// Helpers

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const fmtShort = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};
const fmtDay = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" });
const today = () => new Date().toISOString().slice(0, 10);
const showDate = (iso, text) => text || (iso ? fmtDate(iso) : "—");
const daysBetween = (a, b) =>
  Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

const STATUS_OPTIONS = [
  { id: "none",        label: "Not started", dot: "var(--ink-30)" },
  { id: "shortlist",   label: "Shortlisted", dot: "var(--accent-tan-deep)" },
  { id: "registered",  label: "Registered",  dot: "var(--accent-terracotta)" },
  { id: "tested",      label: "Tested",      dot: "var(--accent-plum)" },
  { id: "offered",     label: "Offered",     dot: "var(--accent-forest)" },
  { id: "declined",    label: "Declined",    dot: "var(--ink-50)" },
];
const statusOf = (id) => STATUS_OPTIONS.find(s => s.id === id) || STATUS_OPTIONS[0];

// localStorage keys
const LS_STATUS = "tru_status_v1";
const LS_NOTES  = "tru_notes_v1";
const LS_VIEW   = "tru_view_v1";

const loadLS = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ICS export
function downloadICS(school) {
  const pad = n => String(n).padStart(2, "0");
  const toICS = (iso) => iso.replaceAll("-", "");
  const events = [];
  if (school.regCloses) events.push({
    title: `Register: ${school.name}`,
    date: school.regCloses,
    desc: `Registration deadline. ${school.url || ""}`,
  });
  if (school.testDate) events.push({
    title: `11+ Test: ${school.name}`,
    date: school.testDate,
    desc: `${school.region} test. ${school.url || ""}`,
  });
  if (school.resultsDate) events.push({
    title: `Results: ${school.name}`,
    date: school.resultsDate,
    desc: `Results released. ${school.url || ""}`,
  });
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TRU//11+ Tracker//EN",
    ...events.flatMap(e => ([
      "BEGIN:VEVENT",
      `UID:${school.id}-${e.date}@tru`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toICS(e.date)}`,
      `DTEND;VALUE=DATE:${toICS(e.date)}`,
      `SUMMARY:${e.title}`,
      `DESCRIPTION:${e.desc.replaceAll("\n"," ")}`,
      "END:VEVENT",
    ])),
    "END:VCALENDAR",
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${school.id}.ics`; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────
// Status pill (interactive popover)

function StatusPill({ schoolId, status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const s = statusOf(status);
  return (
    <div className="status-pill-wrap" ref={ref}>
      <button className="status-pill" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="status-dot" style={{ background: s.dot }} />
        <span>{s.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="status-menu" role="menu">
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.id} className="status-item" role="menuitem"
                    onClick={() => { onChange(schoolId, opt.id); setOpen(false); }}>
              <span className="status-dot" style={{ background: opt.dot }} />
              <span>{opt.label}</span>
              {opt.id === status && <span className="check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Notes textarea (auto-save)
function NotesField({ schoolId, value, onChange }) {
  return (
    <textarea
      className="notes-field"
      placeholder="Your notes — distance, transport, sibling links, gut feel…"
      value={value || ""}
      onChange={(e) => onChange(schoolId, e.target.value)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────
// Cover

function Cover({ data }) {
  const r = data.receipt;
  return (
    <section className="cover" data-screen-label="01 Cover">
      <div className="cover-paper">
        <header className="cover-head">
          <div className="brand">
            <img className="brand-logo" src={window.TRUUW_LOGO || "assets/truuw-logo.png"} alt="TRUUW" style={{height: 44, width: "auto", display: "block"}} />
            <span className="brand-tag" style={{paddingLeft: 14, borderLeft: "1px solid var(--hairline)", marginLeft: 4}}>A clearer 11+ year</span>
          </div>
          <div className="edition-stamp">
            <span className="stamp-line">EDITION</span>
            <span className="stamp-edition">{data.edition}</span>
          </div>
        </header>

        <div className="cover-hero">
          <p className="eyebrow">An interactive dossier</p>
          <h1 className="cover-title">
            The grammar schools<br/>
            <em>worth knowing about</em>,<br/>
            in one place.
          </h1>
          <p className="cover-lede">
            76 selective schools across London and the South East — sorted by area,
            with dates correct as at September 2026, and built so you can plan, register, and
            track every deadline from one quiet document on your laptop.
          </p>
        </div>

        <div className="cover-meta">
          <div className="meta-block">
            <span className="meta-label">Schools listed</span>
            <span className="meta-num">{data.schools.length}</span>
          </div>
          <div className="meta-block">
            <span className="meta-label">Regions</span>
            <span className="meta-num">{Object.keys(data.consortia).length}</span>
          </div>
          <div className="meta-block">
            <span className="meta-label">National Offer Day</span>
            <span className="meta-num small">1 Mar 2027</span>
          </div>
          <div className="meta-block">
            <span className="meta-label">Dates correct as at</span>
            <span className="meta-num small">{data.generatedAt}</span>
          </div>
        </div>

        <div className="receipt">
          <div className="receipt-head">
            <span className="receipt-paid">PAID</span>
            <span className="receipt-order">Order №&nbsp;{r.order}</span>
          </div>
          <dl className="receipt-rows">
            <div><dt>Family</dt><dd>{r.purchasedFor}</dd></div>
            <div><dt>Purchased</dt><dd>{r.purchased}</dd></div>
            <div><dt>Method</dt><dd>{r.method}</dd></div>
            <div><dt>Total</dt><dd className="total">{r.fee}</dd></div>
          </dl>
          <p className="receipt-foot">Single-family licence. Dates correct as at {data.datesAsAt || data.generatedAt} — always confirm on the school's site.</p>
        </div>

        <p className="cover-note">
          Tip — your filters, status flags and notes save automatically to this device.
          Refresh, close, come back. They&rsquo;ll still be here.
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Toolbar

function Toolbar({ q, setQ, region, setRegion, type, setType, status, setStatus, view, setView, regions, count, total }) {
  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <label className="search">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <circle cx="6" cy="6" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input type="text" placeholder="Search schools, towns, notes…" value={q} onChange={e => setQ(e.target.value)} />
          {q && <button className="clear" onClick={() => setQ("")} aria-label="Clear search">×</button>}
        </label>

        <div className="view-switch" role="tablist" aria-label="View">
          {[
            { id: "table",    label: "Table"    },
            { id: "cards",    label: "Cards"    },
            { id: "timeline", label: "Timeline" },
          ].map(v => (
            <button key={v.id} role="tab" aria-selected={view === v.id}
                    className={"view-btn " + (view === v.id ? "is-active" : "")}
                    onClick={() => setView(v.id)}>{v.label}</button>
          ))}
        </div>
      </div>

      <div className="toolbar-row filters">
        <FilterChips label="Region" value={region} setValue={setRegion} options={["All", ...regions]} />
        <FilterChips label="Type" value={type} setValue={setType} options={["All", "Boys", "Girls", "Co-ed"]} />
        <FilterChips label="Status" value={status} setValue={setStatus} options={["All", ...STATUS_OPTIONS.map(s => s.label)]} />
        <span className="count">
          <span className="count-num">{count}</span>
          <span className="count-of"> of {total} schools</span>
        </span>
      </div>
    </div>
  );
}

function FilterChips({ label, value, setValue, options }) {
  return (
    <div className="chips">
      <span className="chips-label">{label}</span>
      <div className="chips-row">
        {options.map(o => (
          <button key={o} className={"chip " + (value === o ? "is-on" : "")} onClick={() => setValue(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Table view

function TableView({ schools, statusMap, notesMap, onStatus, onNotes, expanded, setExpanded }) {
  return (
    <div className="table-wrap">
      <table className="schools-table">
        <thead>
          <tr>
            <th className="col-status">Status</th>
            <th className="col-school">School</th>
            <th className="col-region">Region</th>
            <th className="col-type">Type</th>
            <th className="col-date">Reg. closes</th>
            <th className="col-date">Test</th>
            <th className="col-date">Results</th>
            <th className="col-fee">Fee</th>
            <th className="col-act"></th>
          </tr>
        </thead>
        <tbody>
          {schools.map(s => {
            const isOpen = expanded === s.id;
            return (
              <React.Fragment key={s.id}>
                <tr className={isOpen ? "is-open" : ""}>
                  <td><StatusPill schoolId={s.id} status={statusMap[s.id]} onChange={onStatus} /></td>
                  <td>
                    <div className="school-cell">
                      <span className="school-name">{s.name}</span>
                      <span className="school-town">{s.town}</span>
                    </div>
                  </td>
                  <td><span className="region-tag">{s.region}</span></td>
                  <td><span className="type-tag" data-t={s.type}>{s.type}</span></td>
                  <td className="num"><DateCell iso={s.regCloses} text={s.regClosesText} flag /></td>
                  <td className="num"><DateCell iso={s.testDate} text={s.testDateText} /></td>
                  <td className="num"><DateCell iso={s.resultsDate} text={s.resultsDateText} /></td>
                  <td className="num">{s.fee}</td>
                  <td className="col-act">
                    <button className="row-toggle" onClick={() => setExpanded(isOpen ? null : s.id)} aria-label="More">
                      <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: isOpen ? "rotate(90deg)" : "" }}>
                        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="expand-row">
                    <td colSpan={9}>
                      <ExpandPanel s={s} notes={notesMap[s.id]} onNotes={onNotes} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DateCell({ iso, flag, text }) {
  if (!iso) return <span className="date-empty" title={text || ""}>{text ? (text.length > 22 ? text.slice(0, 20) + "…" : text) : "—"}</span>;
  const d = daysBetween(today(), iso);
  const past = d < 0;
  const soon = !past && d <= 21;
  return (
    <span className={"date-cell " + (past ? "is-past " : "") + (flag && soon ? "is-soon" : "")}>
      <span className="date-main">{fmtShort(iso)}</span>
      <span className="date-sub">{fmtDay(iso)}</span>
    </span>
  );
}

function ExpandPanel({ s, notes, onNotes }) {
  return (
    <div className="expand">
      <div className="expand-grid">
        <div>
          <h4 className="exp-h">About</h4>
          <p className="exp-p">{s.notes}</p>
          {(s.openDaysText || (s.openDays && s.openDays.length > 0)) && (
            <p className="exp-p"><strong>Open days:</strong> {s.openDaysText || s.openDays.map(fmtDate).join(" · ")}</p>
          )}
          <div className="exp-links">
            {s.url && <a className="exp-link" href={s.url} target="_blank" rel="noreferrer">School website ↗</a>}
            <button className="exp-link as-button" onClick={() => downloadICS(s)}>Add dates to calendar (.ics)</button>
          </div>
        </div>
        <div>
          <h4 className="exp-h">Your notes</h4>
          <NotesField schoolId={s.id} value={notes} onChange={onNotes} />
        </div>
        <div>
          <h4 className="exp-h">Key dates</h4>
          <ul className="exp-dates">
            <li><span>Registration opens</span><span>{showDate(s.regOpens, s.regOpensText)}</span></li>
            <li><span>Registration closes</span><span>{showDate(s.regCloses, s.regClosesText)}</span></li>
            <li><span>Test</span><span>{showDate(s.testDate, s.testDateText)}</span></li>
            <li><span>Results</span><span>{showDate(s.resultsDate, s.resultsDateText)}</span></li>
            <li><span>National Offer Day</span><span>1 Mar 2027</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Cards view

function CardsView({ schools, statusMap, notesMap, onStatus, onNotes }) {
  // group by region
  const groups = useMemo(() => {
    const m = {};
    schools.forEach(s => { (m[s.region] ||= []).push(s); });
    return m;
  }, [schools]);
  const order = Object.keys(groups);
  return (
    <div className="cards-view">
      {order.map(region => (
        <section key={region} className="card-group">
          <header className="group-head">
            <h3 className="group-title">{region}</h3>
            <span className="group-count">{groups[region].length} school{groups[region].length === 1 ? "" : "s"}</span>
          </header>
          <div className="card-grid">
            {groups[region].map(s => (
              <SchoolCard key={s.id} s={s} status={statusMap[s.id]} notes={notesMap[s.id]} onStatus={onStatus} onNotes={onNotes} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SchoolCard({ s, status, notes, onStatus, onNotes }) {
  const stat = statusOf(status);
  const daysToClose = s.regCloses ? daysBetween(today(), s.regCloses) : null;
  let urgency = null;
  if (daysToClose !== null) {
    if (daysToClose < 0) urgency = { label: "Reg. closed", tone: "past" };
    else if (daysToClose <= 14) urgency = { label: `Closes in ${daysToClose}d`, tone: "soon" };
    else urgency = { label: `Closes ${fmtShort(s.regCloses)}`, tone: "ok" };
  }
  return (
    <article className="school-card">
      <div className="card-band" style={{ background: stat.dot }} />
      <header className="card-head">
        <div>
          <h4 className="card-name">{s.name}</h4>
          <p className="card-sub">{s.town} · <span className="card-type">{s.type}</span></p>
        </div>
        <StatusPill schoolId={s.id} status={status} onChange={onStatus} />
      </header>
      <ul className="card-dates">
        <li><span>Reg. closes</span><span className="mono">{s.regCloses ? fmtShort(s.regCloses) : (s.regClosesText || "—")}</span></li>
        <li><span>Test</span><span className="mono">{s.testDate ? fmtShort(s.testDate) : (s.testDateText || "—")}</span></li>
        <li><span>Results</span><span className="mono">{s.resultsDate ? fmtShort(s.resultsDate) : (s.resultsDateText || "—")}</span></li>
      </ul>
      {urgency && <div className={"urgency tone-" + urgency.tone}>{urgency.label}</div>}
      <p className="card-notes-h">Notes</p>
      <NotesField schoolId={s.id} value={notes} onChange={onNotes} />
      <footer className="card-foot">
        {s.url && <a href={s.url} target="_blank" rel="noreferrer">Website ↗</a>}
        <button className="ics-btn" onClick={() => downloadICS(s)}>.ics</button>
      </footer>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────
// Timeline view

function TimelineView({ schools, statusMap, onStatus }) {
  // Build a min/max span across all reg-open and results dates
  const span = useMemo(() => {
    const dates = schools.flatMap(s => [s.regOpens, s.regCloses, s.testDate, s.resultsDate]).filter(Boolean);
    if (dates.length === 0) return null;
    const min = dates.reduce((a, b) => a < b ? a : b);
    const max = dates.reduce((a, b) => a > b ? a : b);
    return { min, max };
  }, [schools]);

  if (!span) return <p className="empty">No dates to show.</p>;

  // Generate month ticks between min and max
  const months = useMemo(() => {
    const out = [];
    const start = new Date(span.min + "T00:00:00");
    const end   = new Date(span.max + "T00:00:00");
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      out.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return out;
  }, [span]);

  const totalDays = daysBetween(span.min, span.max) || 1;
  const pct = (iso) => (daysBetween(span.min, iso) / totalDays) * 100;

  // group by region
  const groups = useMemo(() => {
    const m = {};
    schools.forEach(s => { (m[s.region] ||= []).push(s); });
    return m;
  }, [schools]);
  const order = Object.keys(groups);

  const todayPct = (() => {
    const t = today();
    if (t < span.min || t > span.max) return null;
    return (daysBetween(span.min, t) / totalDays) * 100;
  })();

  return (
    <div className="timeline-view">
      <div className="timeline-axis">
        <div className="axis-track">
          {months.map((m, i) => {
            const iso = m.toISOString().slice(0, 10);
            const left = (daysBetween(span.min, iso) / totalDays) * 100;
            return (
              <div key={i} className="axis-tick" style={{ left: `${left}%` }}>
                <span className="tick-mark" />
                <span className="tick-label">{m.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}</span>
              </div>
            );
          })}
          {todayPct !== null && (
            <div className="today-line" style={{ left: `${todayPct}%` }}><span>Today</span></div>
          )}
        </div>
      </div>

      {order.map(region => (
        <section key={region} className="tl-group">
          <h3 className="tl-region">{region}</h3>
          <div className="tl-rows">
            {groups[region].map(s => {
              const stat = statusOf(statusMap[s.id]);
              const regL = pct(s.regOpens);
              const regR = pct(s.regCloses);
              return (
                <div key={s.id} className="tl-row">
                  <div className="tl-name">
                    <span className="tl-dot" style={{ background: stat.dot }} />
                    <span>{s.name}</span>
                  </div>
                  <div className="tl-track">
                    {s.regOpens && s.regCloses && <div className="tl-band" style={{ left: `${regL}%`, width: `${Math.max(0.5, regR - regL)}%` }} />}
                    {s.testDate && <div className="tl-pin tl-test" style={{ left: `${pct(s.testDate)}%` }} title={`Test ${fmtDate(s.testDate)}`}><span>T</span></div>}
                    {s.resultsDate && <div className="tl-pin tl-res" style={{ left: `${pct(s.resultsDate)}%` }} title={`Results ${fmtDate(s.resultsDate)}`}><span>R</span></div>}
                    {todayPct !== null && <div className="tl-today" style={{ left: `${todayPct}%` }} />}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <div className="tl-legend">
        <span><i className="leg-band" /> Registration window</span>
        <span><i className="leg-pin tl-test"><b>T</b></i> Test</span>
        <span><i className="leg-pin tl-res"><b>R</b></i> Results</span>
        <span><i className="leg-today" /> Today</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Region context (consortia explainer)

function ConsortiaPanel({ data, schools }) {
  const counts = useMemo(() => {
    const m = {};
    schools.forEach(s => { m[s.region] = (m[s.region] || 0) + 1; });
    return m;
  }, [schools]);
  return (
    <section className="consortia">
      <header className="section-head">
        <p className="section-eyebrow">Reference</p>
        <h2 className="section-title">Test boards &amp; consortia</h2>
        <p className="section-lede">Most regions run one shared test for all their grammar schools. A few — Birmingham, Warwickshire, parts of Wiltshire — set their own. Here&rsquo;s the lay of the land.</p>
      </header>
      <div className="consortia-grid">
        {Object.entries(data.consortia).map(([k, v]) => (
          <div key={k} className="consortium">
            <div className="consortium-head">
              <h4>{k}</h4>
              <span className="consortium-count">{counts[k] || 0}</span>
            </div>
            <p className="consortium-test">{v.test}</p>
            <p className="consortium-body">{v.body} · Offers {v.offerDay}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// Walk-through

function HowToUse() {
  const steps = [
    { n: "01", t: "Skim the timeline first", b: "It tells you which regions test in the first week of September and which slip a fortnight later. Plan around the cluster you care about." },
    { n: "02", t: "Star the schools you'll actually apply to", b: "Use the status pill — Shortlisted, Registered, Tested. The colour follows your child through the document." },
    { n: "03", t: "Set reminders without leaving the page", b: "Each school has an .ics download. Drop it into Apple Calendar, Google Calendar, Outlook — the registration deadline, test, and results all land in one tap." },
    { n: "04", t: "Write everything down", b: "Notes save to your device the moment you stop typing. Refresh the page; nothing disappears." },
  ];
  return (
    <section className="howto" data-screen-label="How to use">
      <header className="section-head">
        <p className="section-eyebrow">Before you start</p>
        <h2 className="section-title">How to use this document</h2>
      </header>
      <ol className="howto-list">
        {steps.map(s => (
          <li key={s.n}>
            <span className="howto-n">{s.n}</span>
            <div>
              <h4>{s.t}</h4>
              <p>{s.b}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// App

function App() {
  const data = TRU_DATA;

  // Tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "defaultView": "table",
    "palette": "cream",
    "density": "comfortable",
    "showCover": true,
    "showHowTo": true,
    "showConsortia": true
  }/*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // State
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All");
  const [type, setType] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [view, setView] = useState(() => loadLS(LS_VIEW, t.defaultView));
  const [statusMap, setStatusMap] = useState(() => loadLS(LS_STATUS, {}));
  const [notesMap, setNotesMap] = useState(() => loadLS(LS_NOTES, {}));
  const [expanded, setExpanded] = useState(null);

  // Sync default view if tweak changes & user hasn't manually picked
  useEffect(() => { saveLS(LS_VIEW, view); }, [view]);
  useEffect(() => { saveLS(LS_STATUS, statusMap); }, [statusMap]);
  useEffect(() => { saveLS(LS_NOTES, notesMap); }, [notesMap]);

  // palette swap
  useEffect(() => {
    document.documentElement.setAttribute("data-palette", t.palette);
    document.documentElement.setAttribute("data-density", t.density);
  }, [t.palette, t.density]);

  const onStatus = (id, val) => setStatusMap(m => ({ ...m, [id]: val }));
  const onNotes  = (id, val) => setNotesMap(m => ({ ...m, [id]: val }));

  const regions = useMemo(() => Object.keys(data.consortia), [data]);
  const filtered = useMemo(() => {
    return data.schools.filter(s => {
      if (region !== "All" && s.region !== region) return false;
      if (type !== "All" && s.type !== type) return false;
      if (statusFilter !== "All") {
        const want = STATUS_OPTIONS.find(o => o.label === statusFilter)?.id;
        if ((statusMap[s.id] || "none") !== want) return false;
      }
      if (q) {
        const hay = (s.name + " " + s.town + " " + s.region + " " + (s.notes || "") + " " + (notesMap[s.id] || "")).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [data.schools, region, type, statusFilter, q, statusMap, notesMap]);

  // Stats
  const summary = useMemo(() => {
    const counts = { shortlist: 0, registered: 0, tested: 0, offered: 0 };
    Object.values(statusMap).forEach(v => { if (counts[v] !== undefined) counts[v]++; });
    return counts;
  }, [statusMap]);

  return (
    <div className="page">
      {t.showCover && <Cover data={data} />}

      <main className="main" data-screen-label="02 Tracker">
        {t.showHowTo && <HowToUse />}

        <header className="tracker-head">
          <p className="section-eyebrow">The list</p>
          <h2 className="section-title">{data.schools.length} grammar schools, your way</h2>
          <p className="section-lede">Filter, mark, note. Everything stays on this device.</p>
          <div className="summary-pills">
            <span className="sp"><b>{summary.shortlist}</b> shortlisted</span>
            <span className="sp"><b>{summary.registered}</b> registered</span>
            <span className="sp"><b>{summary.tested}</b> tested</span>
            <span className="sp"><b>{summary.offered}</b> offered</span>
          </div>
        </header>

        <Toolbar
          q={q} setQ={setQ}
          region={region} setRegion={setRegion}
          type={type} setType={setType}
          status={statusFilter} setStatus={setStatusFilter}
          view={view} setView={setView}
          regions={regions}
          count={filtered.length} total={data.schools.length}
        />

        <div className="view-frame">
          {view === "table" && (
            <TableView schools={filtered} statusMap={statusMap} notesMap={notesMap}
                       onStatus={onStatus} onNotes={onNotes}
                       expanded={expanded} setExpanded={setExpanded} />
          )}
          {view === "cards" && (
            <CardsView schools={filtered} statusMap={statusMap} notesMap={notesMap}
                       onStatus={onStatus} onNotes={onNotes} />
          )}
          {view === "timeline" && (
            <TimelineView schools={filtered} statusMap={statusMap} onStatus={onStatus} />
          )}
          {filtered.length === 0 && (
            <div className="empty">
              <p>No schools match those filters.</p>
              <button onClick={() => { setQ(""); setRegion("All"); setType("All"); setStatusFilter("All"); }}>Reset filters</button>
            </div>
          )}
        </div>

        {t.showConsortia && <ConsortiaPanel data={data} schools={data.schools} />}
      </main>

      <footer className="page-foot">
        <div className="foot-grid">
          <div>
            <img src={window.TRUUW_LOGO || "assets/truuw-logo.png"} alt="TRUUW" style={{height: 38, width: "auto", display: "block"}} />
            <p className="foot-tag" style={{marginTop: 8}}>A clearer 11+ year</p>
          </div>
          <div>
            <p className="foot-h">About this document</p>
            <p>An offline-friendly HTML dossier for one family. Status, notes, and view choices are saved to this browser only — nothing is sent anywhere.</p>
          </div>
          <div>
            <p className="foot-h">Disclaimer</p>
            <p>Dates and details verified at the edition stamp on the cover. Always cross-check on the school&rsquo;s website before relying on a deadline. Errors? <a href="mailto:info@tutorsareus.co.uk">info@tutorsareus.co.uk</a>.</p>
          </div>
        </div>
        <div className="foot-line">
          <span>© TRU 2026</span>
          <span>Edition: {data.edition}</span>
          <span>Order №&nbsp;{data.receipt.order}</span>
        </div>
      </footer>

      {/* Tweaks */}
      <TweaksPanel>
        <TweakSection title="Default view">
          <TweakRadio
            value={t.defaultView}
            onChange={(v) => { setTweak("defaultView", v); setView(v); }}
            options={[
              { value: "table", label: "Table" },
              { value: "cards", label: "Cards" },
              { value: "timeline", label: "Timeline" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Palette">
          <TweakSelect
            value={t.palette}
            onChange={(v) => setTweak("palette", v)}
            options={[
              { value: "cream", label: "Cream — warm parchment" },
              { value: "linen", label: "Linen — soft tan" },
              { value: "fog",   label: "Fog — cool neutral" },
              { value: "ink",   label: "Ink — dark mode" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Density">
          <TweakRadio
            value={t.density}
            onChange={(v) => setTweak("density", v)}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact",     label: "Compact" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Sections">
          <TweakToggle label="Cover page"        value={t.showCover}     onChange={(v) => setTweak("showCover", v)} />
          <TweakToggle label="How-to-use intro"  value={t.showHowTo}     onChange={(v) => setTweak("showHowTo", v)} />
          <TweakToggle label="Consortia panel"   value={t.showConsortia} onChange={(v) => setTweak("showConsortia", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

// Sections added to the Full Report to match the Store Audit Agent prompt
// (storeproof/docs/STORE_AUDIT_AGENT_PROMPT.md §8): per-finding evidence rows
// (where / see it yourself / the fix + effort), "How to get more buyers"
// (§5b), "What we would do first" with the before/after fix preview (§5c, §8.6)
// and "How this was tested" (§8.7). Pure presentational; styles live in
// FullReport's <style> block under the .fx-* prefix.
import React from 'react';

export interface Shot { label: string; dataUri: string; kind?: 'phone' | 'wide' | 'card' }

export interface Opportunity {
  title: string;
  /** What we saw on this store or its marketing (observed, specific). */
  saw: string;
  /** What we would build or set up. */
  build: string;
  /** What the owner would see change — the thing, not a number. */
  change: string;
  shot?: Shot;
}

export interface PlanStage {
  title: string;
  when: string;
  what: string[];
  access: string;
  proof: string;
}

export interface Plan {
  intro?: string;
  stages: PlanStage[];
  /** Before/after previews made in the browser only (§5c). */
  previews?: { title: string; note: string; before: Shot; after: Shot }[];
  cta?: { title: string; body: string; button?: { label: string; href: string } };
}

export interface Method {
  device: string;
  dates: string;
  tested: string[];
  notTested: string[];
  note?: string;
}

export const EFFORT_TAG: Record<string, { label: string; cls: string }> = {
  s: { label: 'Quick · under a day', cls: 'quick' },
  m: { label: 'Medium · a few days', cls: 'medium' },
  l: { label: 'Project', cls: 'project' },
};

/** The four evidence parts the prompt requires, rendered under a finding. */
export function EvidenceRows({ where, verify, fix, effort }: { where?: string; verify?: string; fix?: string; effort?: string }) {
  if (!where && !verify && !fix) return null;
  const e = effort ? EFFORT_TAG[effort.toLowerCase()] : null;
  return (
    <div className="fx-rows">
      {where && <div className="fx-row"><b>Where</b><span className="fx-where">{where}</span></div>}
      {verify && <div className="fx-row"><b>See it yourself</b><span>{verify}</span></div>}
      {fix && (
        <div className="fx-row"><b>The fix</b><span>{fix}{e && <> <span className={`fx-effort ${e.cls}`}>{e.label}</span></>}</span></div>
      )}
    </div>
  );
}

export function Opportunities({ items, Frame }: { items: Opportunity[]; Frame: React.ComponentType<{ shot: Shot; size?: 'sm' | 'md' | 'lg' }> }) {
  return (
    <div className="fx-opps">
      {items.map((o, i) => (
        <div className="fx-opp" key={i}>
          <div className="fx-opp-n">{i + 1}</div>
          <div style={{ minWidth: 0 }}>
            <h4>{o.title}</h4>
            <div className="fx-row"><b>What we saw</b><span>{o.saw}</span></div>
            <div className="fx-row"><b>What we would set up</b><span>{o.build}</span></div>
            <div className="fx-row"><b>What you would see change</b><span>{o.change}</span></div>
          </div>
          {o.shot?.dataUri && <Frame shot={o.shot} size="sm" />}
        </div>
      ))}
    </div>
  );
}

export function PlanSection({ plan, Frame }: { plan: Plan; Frame: React.ComponentType<{ shot: Shot; size?: 'sm' | 'md' | 'lg' }> }) {
  return (
    <div>
      {plan.intro && <p className="fr-body" style={{ marginBottom: 16 }}>{plan.intro}</p>}
      <div className="fx-stages">
        {plan.stages.map((s, i) => (
          <div className="fx-stage" key={i}>
            <div className="fx-stage-head"><span className="fx-stage-n">{i + 1}</span><div><h4>{s.title}</h4><div className="fx-stage-when">{s.when}</div></div></div>
            <ul>{s.what.map((w, j) => <li key={j}>{w}</li>)}</ul>
            <div className="fx-stage-meta"><span><b>Access we need:</b> {s.access}</span><span><b>How we prove it worked:</b> {s.proof}</span></div>
          </div>
        ))}
      </div>
      {plan.previews?.length ? (
        <div className="fx-previews">
          {plan.previews.map((pv, i) => (
            <div className="fx-preview" key={i}>
              <div className="fx-preview-head"><h4>{pv.title}</h4><span className="fx-preview-tag">Preview of our fix · made in the browser, not on your store</span></div>
              <div className="fx-ba">
                <div><div className="fx-ba-label before">Before</div><Frame shot={pv.before} size="md" /></div>
                <div><div className="fx-ba-label after">After</div><Frame shot={pv.after} size="md" /></div>
              </div>
              <p className="fx-preview-note">{pv.note}</p>
            </div>
          ))}
        </div>
      ) : null}
      {plan.cta && (
        <div className="fx-cta">
          <h3>{plan.cta.title}</h3>
          <p>{plan.cta.body}</p>
          {plan.cta.button && <a className="fr-pdf" href={plan.cta.button.href}>{plan.cta.button.label} <i>→</i></a>}
        </div>
      )}
    </div>
  );
}

export function MethodSection({ method }: { method: Method }) {
  return (
    <div className="fr-card fx-method">
      <div className="fx-row"><b>Device</b><span>{method.device}</span></div>
      <div className="fx-row"><b>When</b><span>{method.dates}</span></div>
      <div className="fx-row"><b>Tested</b><span>{method.tested.join(' · ')}</span></div>
      <div className="fx-row"><b>Not tested</b><span>{method.notTested.join(' · ')}</span></div>
      {method.note && <div className="fx-row"><b>Note</b><span>{method.note}</span></div>}
    </div>
  );
}

export const EXTRAS_CSS = `
  .fx-rows { margin-top:14px; border-top:1px dashed var(--line); padding-top:6px; }
  .fx-row { display:grid; grid-template-columns:150px 1fr; gap:12px; font-size:14px; color:var(--body); padding:8px 0; border-bottom:1px dashed var(--line); line-height:1.55; }
  .fx-row:last-child { border-bottom:0; }
  .fx-row b { font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); font-weight:700; padding-top:3px; }
  .fx-where { font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12.5px; color:var(--ink); word-break:break-word; }
  .fx-effort { display:inline-block; font-size:10.5px; font-weight:800; padding:3px 8px; border-radius:6px; text-transform:uppercase; letter-spacing:0.05em; vertical-align:middle; margin-left:4px; }
  .fx-effort.quick { background:#D1FADF; color:#067647; } .fx-effort.medium { background:#FEF0C7; color:#B54708; } .fx-effort.project { background:#EAECF5; color:#3E4784; }
  .fx-opps { display:flex; flex-direction:column; gap:12px; }
  .fx-opp { display:grid; grid-template-columns:36px minmax(0,1fr) auto; gap:16px; background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px 20px; align-items:start; }
  .fx-opp-n { width:36px; height:36px; border-radius:10px; background:var(--mint-soft); color:#067647; font-family:var(--heading); font-weight:700; display:grid; place-items:center; }
  .fx-opp h4 { margin:0 0 6px; font-size:16.5px; color:var(--ink); font-weight:700; line-height:1.3; }
  .fx-opp .fx-row { grid-template-columns:170px 1fr; }
  .fx-stages { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:12px; }
  .fx-stage { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px; display:flex; flex-direction:column; gap:10px; }
  .fx-stage-head { display:flex; gap:12px; align-items:flex-start; }
  .fx-stage-n { width:30px; height:30px; border-radius:50%; background:var(--ink); color:var(--mint); font-family:var(--heading); font-weight:700; display:grid; place-items:center; flex:0 0 30px; font-size:13px; }
  .fx-stage h4 { margin:0; font-size:15.5px; color:var(--ink); font-weight:700; line-height:1.3; }
  .fx-stage-when { font-size:12px; color:var(--muted); font-weight:600; margin-top:2px; }
  .fx-stage ul { margin:0; padding-left:18px; font-size:13.5px; color:var(--body); display:flex; flex-direction:column; gap:5px; }
  .fx-stage-meta { margin-top:auto; padding-top:10px; border-top:1px dashed var(--line); font-size:12.5px; color:var(--muted); display:flex; flex-direction:column; gap:4px; }
  .fx-stage-meta b { color:var(--ink); font-weight:700; }
  .fx-previews { margin-top:18px; display:flex; flex-direction:column; gap:14px; }
  .fx-preview { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px 20px; }
  .fx-preview-head { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
  .fx-preview-head h4 { margin:0; font-size:16px; color:var(--ink); font-weight:700; flex:1; }
  .fx-preview-tag { font-size:10.5px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#B54708; background:#FEF0C7; padding:4px 9px; border-radius:6px; }
  .fx-ba { display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:640px; }
  .fx-ba-label { font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:8px; }
  .fx-ba-label.before { color:#B42318; } .fx-ba-label.after { color:#067647; }
  .fx-preview-note { font-size:13px; color:var(--muted); margin-top:10px; }
  .fx-cta { margin-top:18px; background: radial-gradient(500px 220px at 100% 0%, rgba(6,214,160,0.25), transparent 60%), var(--ink); color:#fff; border-radius:16px; padding:24px 26px; }
  .fx-cta h3 { margin:0 0 8px; font-size:19px; font-weight:700; letter-spacing:-0.01em; }
  .fx-cta p { color:rgba(255,255,255,0.8); font-size:14.5px; margin:0 0 14px; max-width:62ch; }
  .fx-cta .fr-pdf { background:var(--mint); color:var(--ink); }
  .fx-method .fx-row { grid-template-columns:110px 1fr; }
  @media (max-width: 720px) {
    .fx-row, .fx-opp .fx-row, .fx-method .fx-row { grid-template-columns:1fr; gap:3px; }
    .fx-opp { grid-template-columns:30px minmax(0,1fr); }
    .fx-opp .fr-shotf { grid-column:2; max-width:220px; }
    .fx-stages { grid-template-columns:1fr; }
    .fx-ba { grid-template-columns:1fr 1fr; gap:10px; }
  }
`;

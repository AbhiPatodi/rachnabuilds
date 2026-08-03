import type { CallScriptData } from '@/lib/scriptGenerator';

const S: Record<string, React.CSSProperties> = {
  card: { border: '1px solid #e3e6ea', borderRadius: 12, padding: '18px 22px', marginBottom: 14, background: '#fff' },
  tag: { display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0E8A6E', marginBottom: 6 },
  heading: { fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#141821' },
  q: { fontSize: 14, lineHeight: 1.7, margin: '0 0 6px', paddingLeft: 16, textIndent: -16, color: '#141821' },
  note: { fontSize: 12.5, color: '#8a6d1a', background: '#fdf6e3', borderRadius: 8, padding: '8px 12px', marginTop: 10, lineHeight: 1.6 },
  talk: { fontSize: 14, lineHeight: 1.75, color: '#333' },
};

export default function CallScriptView({ script }: { script: CallScriptData }) {
  return (
    <div style={{ color: '#141821' }}>
      <div style={{ ...S.card, background: '#0B3D2E', color: '#fff', border: 'none' }}>
        <div style={{ ...S.tag, color: '#7CE8C8' }}>60-second snapshot</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{script.leadSnapshot}</p>
      </div>

      <div style={S.card}>
        <div style={S.tag}>Working hypotheses</div>
        {script.hypotheses.map((h, i) => <p key={i} style={S.q}>• {h}</p>)}
      </div>

      <div style={S.card}>
        <div style={S.tag}>Rapport openers</div>
        {script.rapport.map((r, i) => <p key={i} style={S.talk}>&ldquo;{r}&rdquo;</p>)}
        <div style={{ ...S.tag, marginTop: 10 }}>Setting the frame</div>
        <p style={S.talk}>&ldquo;{script.frame}&rdquo;</p>
      </div>

      {script.checkpoints.map((cp) => (
        <div key={cp.id} style={S.card}>
          <div style={S.tag}>{cp.id} — {cp.name}</div>
          <p style={{ fontSize: 12.5, color: '#667', marginBottom: 10 }}>{cp.objective}</p>
          {cp.questions.map((q, i) => <p key={i} style={S.q}>☐ &ldquo;{q}&rdquo;</p>)}
          {cp.notes && <div style={S.note}>👂 {cp.notes}</div>}
        </div>
      ))}

      <div style={S.card}>
        <div style={S.tag}>Temp check (before price)</div>
        {script.tempCheck.map((t, i) => <p key={i} style={S.q}>☐ &ldquo;{t}&rdquo;</p>)}
      </div>

      <div style={{ ...S.card, borderColor: '#0E8A6E', borderWidth: 2 }}>
        <div style={S.tag}>The pitch — Eagle&apos;s eye</div>
        <p style={S.talk}>{script.pitch.eaglesEye}</p>
        {script.pitch.steps.map((step, i) => (
          <div key={i} style={{ marginTop: 14 }}>
            <div style={S.heading}>🚤 Step {i + 1} — {step.title}</div>
            <p style={S.talk}>{step.talkTrack}</p>
          </div>
        ))}
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#ECFDF5', borderRadius: 8 }}>
          <strong style={{ fontSize: 14, color: '#141821' }}>💰 {script.pitch.price}</strong>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.tag}>Objection prep</div>
        {script.objectionPrep.map((o, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>❓ &ldquo;{o.objection}&rdquo;</p>
            <p style={S.talk}>→ {o.response}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

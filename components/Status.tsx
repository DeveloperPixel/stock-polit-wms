export default function Status({ s }: { s: string }) { return <span className={`badge b-${s}`}>{s}</span>; }

interface TopBarProps {
  workbookLastModified: string;
}

function formatTimestamp(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TopBar({ workbookLastModified }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar__meta">
        <h1>AI Shock Fiscal Simulator</h1>
        <p className="topbar__timestamp">Last update: {formatTimestamp(workbookLastModified)}</p>
      </div>
    </header>
  );
}

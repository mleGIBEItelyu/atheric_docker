import { useNews } from '@/hooks/useStock'

interface Props { ticker: string }

export function NewsFeed({ ticker }: Props) {
  const { data: items = [] } = useNews(ticker)
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <section className="card panel-card">
      <div className="news-head">
        <span className="card-title">News Feed</span>
        <span className="news-live">
          <span className="panel-updated">Updated {now}</span>
          <span className="live-dot"/>
        </span>
      </div>
      <div className="news-scroll">
        {items.map((item, i) => (
          <div key={i} className="news-item">
            <div>
              <div className="news-headline">{item.headline}</div>
              <div className="news-meta">{item.source} · {item.time}</div>
            </div>
            <span className={`tag ${item.tone}`}>{item.tag}{item.tone === 'green' ? ' +' : ''}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

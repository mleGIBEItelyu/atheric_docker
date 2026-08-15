import { HighlightGrid } from '@/components/markets/HighlightGrid'
import { RankingTable } from '@/components/markets/RankingTable'

interface Props { searchQuery?: string }

export function Markets({ searchQuery }: Props) {
  return (
    <div className="content">
      <div className="page-head">
        <div className="page-title">TOP 100 FORECASTING</div>
      </div>
      <HighlightGrid/>
      <RankingTable searchQuery={searchQuery}/>
    </div>
  )
}

import { InfoIcon } from './icons'

interface Props { label: string; text: string }

export function InfoTip({ label, text }: Props) {
  if (!text) return null
  return (
    <span className="tip" tabIndex={0} role="img" aria-label={`${label}: ${text}`}>
      <InfoIcon />
      <span className="tip-bubble" aria-hidden="true">{text}</span>
    </span>
  )
}

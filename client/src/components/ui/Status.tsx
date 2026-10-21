import type { ReactNode } from 'react'

const variants = { info: 'ui-status-info', loading: 'ui-status-loading', empty: 'ui-status-empty', success: 'ui-status-success', error: 'ui-status-error' }

type StatusKind = 'info' | 'loading' | 'empty' | 'success' | 'error'
export function Status({ kind = 'info', title, children, action }: {
  kind?: StatusKind; title: string; children?: ReactNode; action?: ReactNode
}) {
  return (
    <div className={`ui-status ${variants[kind]}`} role={kind === 'error' ? 'alert' : 'status'} aria-atomic="true">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  )
}

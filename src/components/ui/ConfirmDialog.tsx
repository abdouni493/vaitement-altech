import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'
import { useTranslation } from '@/i18n/useTranslation'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
}

export const ConfirmDialog = ({ open, onClose, onConfirm, title, message }: ConfirmDialogProps) => {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/15">
          <AlertTriangle className="text-terracotta" size={32} />
        </div>
        <h3 className="text-display text-xl font-bold text-wood-dark">{title ?? t('confirmDelete')}</h3>
        <p className="text-sm text-wood-medium">{message ?? t('confirmDeleteMsg')}</p>
        <div className="mt-2 flex w-full gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {t('delete')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

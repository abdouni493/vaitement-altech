import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Store, UserCog, Database, Download, Upload, Check, Image as ImageIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/Misc'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useTranslation } from '@/i18n/useTranslation'
import { exportData, importData } from '@/utils/export'
import { fadeUp, staggerContainer } from '@/utils/animations'

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <motion.div variants={fadeUp} className="card-wood rounded-2xl p-5">
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wood-btn text-accentfg">{icon}</div>
      <h3 className="text-display text-lg font-bold text-wood-dark">{title}</h3>
    </div>
    {children}
  </motion.div>
)

export const SettingsPage = () => {
  const { t, lang, setLang } = useTranslation()
  const { settings, updateSettings } = useSettingsStore()
  const { currentUser, updateAccount } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  const [store, setStore] = useState(settings)
  const [account, setAccount] = useState({
    fullName: currentUser?.fullName ?? '',
    username: currentUser?.username ?? '',
    email: currentUser?.email ?? '',
    password: currentUser?.password ?? '',
  })

  const saveStore = () => {
    updateSettings(store)
    toast.success(t('saved'))
  }
  const saveAccount = () => {
    updateAccount(account)
    toast.success(t('saved'))
  }

  const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const logo = reader.result as string
      setStore((s) => ({ ...s, logo }))
      updateSettings({ logo })
      toast.success(t('saved'))
    }
    reader.readAsDataURL(file)
  }

  const onRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importData(file)
      // State lives in memory: importData writes straight into the stores, and
      // the UI re-renders from them. Reloading here would throw the restore away.
      toast.success(t('dataRestored'))
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <div>
      <PageHeader title={t('settings')} />
      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Store info */}
        <div className="lg:col-span-2">
          <Section title={t('storeInfo')} icon={<Store size={20} />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Logo */}
              <div className="sm:col-span-2 flex items-center gap-4">
                {store.logo ? (
                  <img src={store.logo} alt="logo" className="h-20 w-20 rounded-xl object-cover shadow-wood" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-wood-cream text-wood-light"><ImageIcon size={28} /></div>
                )}
                <div>
                  <p className="label-wood">{t('uploadLogo')}</p>
                  <input ref={logoRef} type="file" accept="image/*" onChange={onLogo} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}><Upload size={15} />{t('uploadLogo')}</Button>
                </div>
              </div>
              <Input label={t('storeName')} value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} />
              <Input label={t('phone')} value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} />
              <Input label={t('email')} value={store.email} onChange={(e) => setStore({ ...store, email: e.target.value })} />
              <Input label={t('address')} value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} />
              <div className="sm:col-span-2"><Textarea label={t('description')} value={store.description} onChange={(e) => setStore({ ...store, description: e.target.value })} /></div>
              <Input label="NIF" value={store.nif} onChange={(e) => setStore({ ...store, nif: e.target.value })} />
              <Input label="NIS" value={store.nis} onChange={(e) => setStore({ ...store, nis: e.target.value })} />
              <Input label="N° Article" value={store.article} onChange={(e) => setStore({ ...store, article: e.target.value })} />
              <Input label="RC" value={store.rc} onChange={(e) => setStore({ ...store, rc: e.target.value })} />
            </div>
            <div className="mt-4 flex justify-end"><Button onClick={saveStore}><Check size={16} />{t('save')}</Button></div>
          </Section>
        </div>

        {/* Account */}
        <Section title={t('myAccount')} icon={<UserCog size={20} />}>
          <div className="space-y-4">
            <Input label={t('fullName')} value={account.fullName} onChange={(e) => setAccount({ ...account, fullName: e.target.value })} />
            <Input label={t('username')} value={account.username} onChange={(e) => setAccount({ ...account, username: e.target.value })} />
            <Input label={t('email')} value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
            <Input label={t('password')} value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
            <div className="flex justify-end"><Button onClick={saveAccount}><Check size={16} />{t('save')}</Button></div>
          </div>
          <div className="mt-5 border-t border-wood-light/20 pt-4">
            <p className="label-wood">{t('language')}</p>
            <div className="flex gap-2">
              <Button variant={lang === 'fr' ? 'primary' : 'outline'} size="sm" onClick={() => setLang('fr')}>{t('french')}</Button>
              <Button variant={lang === 'ar' ? 'primary' : 'outline'} size="sm" onClick={() => setLang('ar')}>{t('arabic')}</Button>
            </div>
          </div>
        </Section>

        {/* Data */}
        <Section title={t('database')} icon={<Database size={20} />}>
          <div className="space-y-4">
            <p className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2.5 text-xs text-wood-dark">
              {t('demoDataNotice')}
            </p>
            <div className="rounded-xl border border-wood-light/25 p-4">
              <p className="font-semibold text-wood-dark">{t('backup')}</p>
              <p className="mb-3 text-xs text-wood-medium">{t('backupHint')}</p>
              <Button variant="sage" onClick={() => { exportData(); toast.success(t('saved')) }}><Download size={16} />{t('backup')}</Button>
            </div>
            <div className="rounded-xl border border-wood-light/25 p-4">
              <p className="font-semibold text-wood-dark">{t('restore')}</p>
              <p className="mb-3 text-xs text-wood-medium">{t('restoreHint')}</p>
              <input ref={fileRef} type="file" accept="application/json" onChange={onRestore} className="hidden" />
              <Button variant="gold" onClick={() => fileRef.current?.click()}><Upload size={16} />{t('restore')}</Button>
            </div>
          </div>
        </Section>
      </motion.div>
    </div>
  )
}

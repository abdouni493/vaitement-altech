import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Shirt, Globe, UserPlus, LogIn, ChevronDown } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useTranslation } from '@/i18n/useTranslation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
})
type LoginForm = z.infer<typeof loginSchema>

export const Login = () => {
  const { t, toggleLang, lang } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const users = useAuthStore((s) => s.users)
  const createAdmin = useAuthStore((s) => s.createAdmin)
  const [showCreate, setShowCreate] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  const onLogin = (data: LoginForm) => {
    const user = login(data.identifier, data.password)
    if (user) {
      toast.success(`${t('welcomeBack')}, ${user.fullName}`)
      navigate('/dashboard')
    } else {
      toast.error(t('wrongCredentials'))
    }
  }

  // create-account form
  const createSchema = z
    .object({
      fullName: z.string().min(2),
      username: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(4),
      confirm: z.string().min(4),
    })
    .refine((d) => d.password === d.confirm, { path: ['confirm'], message: t('passwordMismatch') })
  type CreateForm = z.infer<typeof createSchema>

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const onCreate = (data: CreateForm) => {
    const user = createAdmin({
      fullName: data.fullName,
      username: data.username,
      email: data.email,
      password: data.password,
    })
    useAuthStore.setState({ currentUser: user })
    toast.success(t('accountCreated'))
    navigate('/dashboard')
  }

  return (
    <div className="wood-grain relative flex min-h-screen items-center justify-center overflow-hidden bg-wood-sidebar p-4">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-wood-light/20 blur-3xl" />

      {/* Language toggle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleLang}
        className="glass absolute end-5 top-5 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
      >
        <Globe size={16} />
        {lang === 'fr' ? 'العربية' : 'Français'}
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', damping: 12 }}
          className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-shine shadow-gold"
        >
          <Shirt size={38} className="text-wood-dark" />
        </motion.div>
        <div className="mb-6 text-center">
          <h1 className="text-display text-4xl font-bold text-white">{t('appName')}</h1>
          <p className="mt-1 text-sm text-wood-blonde/80">{t('appTagline')}</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl p-7 shadow-wood-lg">
          <p className="mb-5 text-center text-sm text-white/80">{t('loginSubtitle')}</p>

          <form onSubmit={handleSubmit(onLogin)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/90">{t('email')}</label>
              <input
                {...register('identifier')}
                placeholder="admin@atelier-mode.com"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
              {errors.identifier && <p className="mt-1 text-xs text-terracotta">{t('required')}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/90">{t('password')}</label>
              <input
                type="password"
                {...register('password')}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-gold focus:ring-2 focus:ring-gold/30"
              />
              {errors.password && <p className="mt-1 text-xs text-terracotta">{t('required')}</p>}
            </div>

            <Button type="submit" variant="primary" size="lg" className="w-full">
              <LogIn size={18} />
              {t('login')}
            </Button>
          </form>

          {/* Create admin toggle */}
          {users.length === 0 && (
            <button
              onClick={() => setShowCreate((v) => !v)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-medium text-wood-blonde/90 transition hover:text-gold-light"
            >
              <UserPlus size={16} />
              {t('createAdmin')}
              <ChevronDown size={16} className={`transition ${showCreate ? 'rotate-180' : ''}`} />
            </button>
          )}

          <AnimatePresence>
            {showCreate && users.length === 0 && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={createForm.handleSubmit(onCreate)}
                className="mt-4 space-y-3 overflow-hidden border-t border-white/15 pt-4"
              >
                <Input label={<span className="text-white/90">{t('fullName')}</span>} {...createForm.register('fullName')} error={createForm.formState.errors.fullName && t('required')} className="bg-white/90" />
                <Input label={<span className="text-white/90">{t('username')}</span>} {...createForm.register('username')} error={createForm.formState.errors.username && t('required')} className="bg-white/90" />
                <Input label={<span className="text-white/90">{t('email')}</span>} type="email" {...createForm.register('email')} error={createForm.formState.errors.email && t('required')} className="bg-white/90" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label={<span className="text-white/90">{t('password')}</span>} type="password" {...createForm.register('password')} error={createForm.formState.errors.password && t('required')} className="bg-white/90" />
                  <Input label={<span className="text-white/90">{t('confirmPassword')}</span>} type="password" {...createForm.register('confirm')} error={createForm.formState.errors.confirm?.message} className="bg-white/90" />
                </div>
                <Button type="submit" variant="sage" size="lg" className="w-full">
                  <UserPlus size={18} />
                  {t('createMyAdmin')}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Demo access — the app ships with constant data, so surface the keys */}
          {users.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-3">
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-wood-blonde/80">
                {t('demoAccess')}
              </p>
              <div className="space-y-1.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onLogin({ identifier: u.username, password: u.password })}
                    className="flex w-full items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-start transition hover:bg-white/20"
                  >
                    <span className="text-xs font-medium text-white">{u.fullName}</span>
                    <span className="text-mono text-[11px] text-wood-blonde/90">
                      {u.username} / {u.password}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

import { useEffect, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { LoginForm } from '../components/login/LoginForm'
import { LoginBrandPanel } from '../components/login/LoginBrandPanel'

const LoginPage: FC = () => {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  return (
    <div className="flex h-screen bg-[#18181B]">
      {/* Form panel — 40% */}
      <div className="w-full lg:w-[40%]">
        <LoginForm />
      </div>
      {/* Brand panel — 60%, hidden on mobile */}
      <div className="hidden lg:block lg:w-[60%]">
        <LoginBrandPanel />
      </div>
    </div>
  )
}

export default LoginPage

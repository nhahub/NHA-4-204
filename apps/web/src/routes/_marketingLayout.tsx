import { authClient } from '@/lib/auth-client'
import Footer from '@/features/marketing/components/footer'
import Header from '@/features/marketing/components/header'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'
import Logo from '@/components/ui/logo'

function MarketingLayout() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (!isPending && session) {
      navigate('/profile', { replace: true })
    }
  }, [session, isPending, navigate])

  if (isPending) {
    return <div className="h-screen flex justify-center items-center"><Logo /></div>
  }

  if (session) {
    return null
  }

  return (
    <>
      <main className="container mx-auto max-w-7xl px-4 [--header-height:3.5rem]">
        <Header />
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

export default MarketingLayout
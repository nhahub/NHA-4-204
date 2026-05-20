import Header from '@/features/marketing/components/header'
import { Outlet } from 'react-router'

function MarketingLayout() {
  return (
    <div className="container mx-auto max-w-7xl px-4 [--header-height:3.5rem]">
      <Header/>
      <Outlet/>
    </div>
  )
}

export default MarketingLayout
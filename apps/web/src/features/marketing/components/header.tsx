import { ModeToggle } from '@/components/composites/mode-toggle'
import UserMenu from '@/components/composites/user-menu'
import { CompassIcon } from 'lucide-react'
import { Link } from 'react-router'

function Header() {
  return (
    <header className="sticky top-0 left-0 bg-background z-50 flex justify-between items-center flex-wrap uppercase h-(--header-height)">
            <Link to="/" className="text-xl font-bold flex justify-center items-center gap-1"><CompassIcon className="size-6" /> CareerGPS</Link>
            <ul className='hidden md:flex justify-center text-xs items-center gap-4'>
              <li><Link to="/#how-it-works">How it works</Link></li>
              <li><Link to="/#features">Features</Link></li>
              <li><Link to="/#pricing">Pricing</Link></li>
              <li><Link to="/#faq">Faq</Link></li>
            </ul>
            <div className="flex justify-center items-center gap-2">
              <ModeToggle/>
              <UserMenu/>
            </div>
          </header>
  )
}

export default Header
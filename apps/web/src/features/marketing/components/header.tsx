import { ModeToggle } from '@/components/composites/mode-toggle'
import UserMenu from '@/components/composites/user-menu'
import { Link } from 'react-router'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu'
import Logo from '@/components/ui/logo'

function Header() {
  return (
    <header className="sticky top-0 left-0 bg-background z-50 flex justify-between items-center flex-wrap uppercase h-(--header-height)">
      <Link to="/"><Logo /></Link>
      <NavigationMenu className="hidden lg:flex">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuLink render={<Link to="/#how-it-works" />}>
              How it works
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink render={<Link to="/#features" />}>
              Features
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink render={<Link to="/#pricing" />}>
              Pricing
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink render={<Link to="/#faq" />}>
              Faq
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      <div className="flex justify-center items-center gap-2">
        <ModeToggle />
        <UserMenu />
      </div>
    </header>
  )
}

export default Header

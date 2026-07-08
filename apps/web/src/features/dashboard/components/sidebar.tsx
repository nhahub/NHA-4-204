"use client"

import * as React from "react"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { CompassIcon, FileTextIcon, TargetIcon, UserRoundIcon } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { Skeleton } from "@/components/ui/skeleton"
import { Link, useLocation } from "react-router"


export function DashboardSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {data: session,isPending} = authClient.useSession();
  const location = useLocation();
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/profile" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <CompassIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">CareerGPS</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={location.pathname === "/profile"} render={<Link to="/profile" />}>
              <UserRoundIcon className="size-4" />
              <span>Profile</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={location.pathname === "/ats"} render={<Link to="/ats" />}>
              <FileTextIcon className="size-4" />
              <span>ATS Scanner</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={location.pathname === "/score-matching"} render={<Link to="/score-matching" />}>
              <TargetIcon className="size-4" />
              <span>Skill Matching</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {!isPending ? (
          session && <NavUser user={session.user} />
        ) : (
          <Skeleton className="h-9 w-full" />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

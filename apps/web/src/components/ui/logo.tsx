import { CompassIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'


function Logo({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn(
                'text-xl font-bold flex justify-center items-center gap-1',
                className,
            )}
            {...props}
        >
            <CompassIcon
                className="size-6"
            />
            CareerGPS
        </div>
    )
}

export default Logo

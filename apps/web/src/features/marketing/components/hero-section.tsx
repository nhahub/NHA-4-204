import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

function HeroSection() {
  return (
    <section className='flex py-4 items-center gap-3 text-center flex-col min-h-[calc(100vh-var(--header-height))]'>
        <h3 className='text-2xl font-bold'>Navigate your career path with AI precision</h3>
        <p>Build your personalized roadmap to your dream tech job with our AI-powered structured platform.</p>
        <Button render={<Link to="/sign-up"/>}>
            Start Free <ArrowRight />
        </Button>
    </section>
  )
}

export default HeroSection
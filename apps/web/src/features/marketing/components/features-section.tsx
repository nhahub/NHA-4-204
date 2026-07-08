import React from 'react'
import { Route, BarChart3, Trophy, Brain, Wrench, Users } from 'lucide-react'
import { Surface } from '@/components/ui/surface'

const features = [
  {
    icon: Route,
    title: 'AI Roadmap',
    description: 'Dynamic paths that adjust based on your learning speed and market shifts.',
  },
  {
    icon: BarChart3,
    title: 'Career Map',
    description: 'Visualize your career growth path. Track every milestone as you progress.',
  },
  {
    icon: Trophy,
    title: 'Achievement System',
    description: 'Earn recognition for completing courses, projects, and interviews.',
  },
  {
    icon: Brain,
    title: 'AI Mentor',
    description: '24/7 roadmap on portfolio reviews, mock interviews, and technical questions.',
  },
  {
    icon: Wrench,
    title: 'Career Tools',
    description: 'Integrated resume builders, cover letter generators, and salary trackers.',
  },
  {
    icon: Users,
    title: 'Community',
    description: 'Connect with peers, share experiences, and grow your professional network.',
  },
]

function FeaturesSection() {
  return (
    <section id="features" className='py-12'>
      <h2 className="mb-16 text-center text-3xl font-bold tracking-tight">
          Equipped for the journey
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Surface
                key={feature.title}
              >
                <Icon className="mb-4 size-8 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Surface>
            )
          })}
        </div>
    </section>
  )
}

export default FeaturesSection

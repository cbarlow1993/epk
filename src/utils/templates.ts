export interface TemplateConfig {
  id: string
  name: string
  description: string
  defaults: {
    accent_color: string
    bg_color: string
    font_family: string
  }
  sectionOrder: string[]
  heroStyle: 'fullbleed' | 'contained' | 'minimal'
  bioLayout: 'two-column' | 'single-column'
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'default',
    name: 'Gallery',
    description: 'Warm cream background with burnt sienna accent',
    defaults: { accent_color: '#B85C38', bg_color: '#FAF9F6', font_family: 'DM Sans' },
    sectionOrder: ['bio', 'music', 'events', 'technical', 'press', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'two-column',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, centered single-column layout',
    defaults: { accent_color: '#2D2D2D', bg_color: '#FFFFFF', font_family: 'DM Sans' },
    sectionOrder: ['bio', 'music', 'events', 'press', 'technical', 'contact'],
    heroStyle: 'minimal',
    bioLayout: 'single-column',
  },
  {
    id: 'festival',
    name: 'Editorial',
    description: 'Warm paper tones with terracotta accent',
    defaults: { accent_color: '#C4553A', bg_color: '#F5F0EB', font_family: 'Playfair Display' },
    sectionOrder: ['music', 'bio', 'events', 'press', 'technical', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'single-column',
  },
  {
    id: 'underground',
    name: 'Dark',
    description: 'Refined dark theme with warm gold accent',
    defaults: { accent_color: '#D4A574', bg_color: '#1A1A1A', font_family: 'Space Grotesk' },
    sectionOrder: ['music', 'bio', 'technical', 'events', 'press', 'contact'],
    heroStyle: 'contained',
    bioLayout: 'two-column',
  },
]

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0]
}

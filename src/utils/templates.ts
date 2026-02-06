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
    name: 'Swiss',
    description: 'Clean black and white with red accent',
    defaults: { accent_color: '#FF0000', bg_color: '#FFFFFF', font_family: 'Instrument Sans' },
    sectionOrder: ['bio', 'music', 'events', 'photos', 'technical', 'press', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'two-column',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, centered single-column layout',
    defaults: { accent_color: '#000000', bg_color: '#FFFFFF', font_family: 'Instrument Sans' },
    sectionOrder: ['bio', 'music', 'events', 'photos', 'press', 'technical', 'contact'],
    heroStyle: 'minimal',
    bioLayout: 'single-column',
  },
  {
    id: 'festival',
    name: 'Editorial',
    description: 'Warm paper tones with serif typography',
    defaults: { accent_color: '#C4553A', bg_color: '#F5F0EB', font_family: 'Playfair Display' },
    sectionOrder: ['music', 'bio', 'events', 'photos', 'press', 'technical', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'single-column',
  },
  {
    id: 'underground',
    name: 'Dark',
    description: 'Refined dark theme with warm gold accent',
    defaults: { accent_color: '#D4A574', bg_color: '#1A1A1A', font_family: 'Space Grotesk' },
    sectionOrder: ['music', 'bio', 'technical', 'events', 'photos', 'press', 'contact'],
    heroStyle: 'contained',
    bioLayout: 'two-column',
  },
]

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0]
}

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
    name: 'Default',
    description: 'Dark theme with full-width hero',
    defaults: { accent_color: '#3b82f6', bg_color: '#0a0a0f', font_family: 'Inter' },
    sectionOrder: ['bio', 'music', 'events', 'technical', 'press', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'two-column',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, centered single-column layout',
    defaults: { accent_color: '#ffffff', bg_color: '#111111', font_family: 'DM Sans' },
    sectionOrder: ['bio', 'music', 'events', 'press', 'technical', 'contact'],
    heroStyle: 'minimal',
    bioLayout: 'single-column',
  },
  {
    id: 'festival',
    name: 'Festival',
    description: 'Bold colors, music section first',
    defaults: { accent_color: '#f59e0b', bg_color: '#0f0f0f', font_family: 'Bebas Neue' },
    sectionOrder: ['music', 'bio', 'events', 'press', 'technical', 'contact'],
    heroStyle: 'fullbleed',
    bioLayout: 'single-column',
  },
  {
    id: 'underground',
    name: 'Underground',
    description: 'Raw, monospace, industrial aesthetic',
    defaults: { accent_color: '#22c55e', bg_color: '#050505', font_family: 'Space Grotesk' },
    sectionOrder: ['music', 'bio', 'technical', 'events', 'press', 'contact'],
    heroStyle: 'contained',
    bioLayout: 'two-column',
  },
]

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0]
}

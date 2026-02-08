# Creative Features Design: Video Hero, Photo Gallery, Animated Transitions

**Date:** 2026-02-06
**Goal:** Help DJs stand out creatively and get more bookings through richer media experiences and interactivity on their public EPK page.

---

## 1. Video Hero Backgrounds

### Overview
DJs can upload a short looping video clip as their hero background instead of a static image. The video plays silently with a gradient overlay for text readability.

### Dashboard UX
- Toggle on the Hero dashboard page to switch between image and video hero.
- When video is selected, a file upload area with guidance text: "Best results: 10-30 seconds, 1080p landscape, under 50MB. Subtle or slow-moving footage works best (crowd panning, DJ booth shots, abstract visuals). Avoid fast cuts — they compete with the text overlay."
- Client-side validation on file select:
  - File type: mp4, webm only
  - File size: reject over 50MB with specific message
  - Duration: read video metadata, reject over 30 seconds with specific message (e.g. "Video is 45 seconds — trim it to 30 seconds or under")
- Preview before save: show the video playing in a mini version of the current hero style with name/tagline overlaid so the DJ can evaluate text readability before committing.
- Upload progress bar (video files are larger than images). Save button disabled until upload completes.
- Tip text after upload area: "Use your phone's built-in editor to trim before uploading."

### Data Model
- New column on `profiles` table: `hero_video_url` (text, nullable)
- Existing `hero_image_url` remains as fallback

### Public Page Behavior
- Native `<video>` tag: autoplay, muted, loop, playsinline
- No player controls shown
- Hero styles support:
  - **Fullbleed:** full-viewport video
  - **Contained:** 60vh video
  - **Minimal:** ignored (text-only style)
- Existing gradient overlay applies over video
- **Mobile fallback:** static image instead of video to save bandwidth
- **Accessibility:** `prefers-reduced-motion` falls back to static image

### Storage
- Video uploads go to existing Supabase Storage bucket
- Same upload endpoint pattern as other assets

---

## 2. Photo Gallery with Lightbox

### Overview
A new "Photos" section on the public EPK with a masonry grid of images and a full-screen lightbox for browsing.

### Dashboard
- New route: `/dashboard/photos`
- Grid of uploaded images with drag-to-reorder (existing reorder pattern)
- Each image has an optional caption field
- Multi-file upload via dropzone
- Validation: jpg, png, webp only; max 10MB per image
- Limit: 20 photos per gallery

### Data Model
New `photos` table:
- `id` (uuid, PK)
- `profile_id` (uuid, FK to profiles)
- `image_url` (text, not null)
- `caption` (text, nullable)
- `sort_order` (integer, not null)
- `created_at` (timestamptz, default now())

RLS: owner can CRUD, public can read for published profiles.

### Public Page Layout
- Responsive masonry grid: 3 columns desktop, 2 tablet, 1 mobile
- Thumbnails cropped to consistent aspect ratio
- Click any image to open lightbox

### Lightbox Behavior
- Full-screen dark overlay
- Image displayed at full resolution
- Left/right arrows + swipe gestures to navigate
- Caption displayed below image if present
- Close via: escape key, click outside, X button
- Keyboard accessible: arrow keys to navigate, escape to close
- Animate once on open (no re-animating)

### Section Integration
- "Photos" appears in the existing section ordering system on the Pages dashboard
- Toggleable visibility like other sections
- Uses the existing `<Section>` component wrapper on the public page

---

## 3. Animated Section Transitions

### Overview
Sections on the public EPK animate into view as the visitor scrolls, adding polish and life to the page.

### Animation Style
- Single default animation: fade up
  - Opacity: 0 → 1
  - Transform: translateY(20px) → translateY(0)
  - Duration: 500-600ms, ease-out curve
- Slight stagger on nested elements (heading, text, images) so they don't all arrive simultaneously
- Elements animate once and stay visible — no re-animation on scroll back up

### Implementation
- Intersection Observer API to detect when sections enter the viewport
- CSS transitions for the actual animation (no animation library dependency)
- Applied to each `<Section>` component on the public page
- Threshold: trigger when ~15% of the section is visible

### DJ Control
- Single toggle on the Theme dashboard page: "Animate sections on scroll"
- On by default
- No per-section or per-animation-type options — single on/off to keep it simple

### Data Model
- New column on `profiles` table: `animate_sections` (boolean, default true)

### Accessibility
- Respects `prefers-reduced-motion` media query — animations skipped, sections render immediately
- No content hidden or inaccessible if animations fail to trigger

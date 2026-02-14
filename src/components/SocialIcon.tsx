import {
  FaInstagram,
  FaSoundcloud,
  FaTiktok,
  FaXTwitter,
  FaYoutube,
  FaSpotify,
  FaFacebookF,
  FaMixcloud,
  FaLink,
} from 'react-icons/fa6'

const PLATFORM_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  instagram: FaInstagram,
  soundcloud: FaSoundcloud,
  tiktok: FaTiktok,
  twitter: FaXTwitter,
  youtube: FaYoutube,
  spotify: FaSpotify,
  facebook: FaFacebookF,
  mixcloud: FaMixcloud,
  other: FaLink,
}

export function SocialIcon({ platform, size = 18 }: { platform: string; size?: number }) {
  const Icon = PLATFORM_ICONS[platform] ?? FaLink
  return <Icon size={size} />
}

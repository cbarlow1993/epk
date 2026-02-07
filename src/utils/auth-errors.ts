const ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'Incorrect email or password.',
  'Email not confirmed': 'Please verify your email address before logging in.',
  'User already registered': 'An account with this email already exists.',
  'Signup requires a valid password': 'Please enter a valid password (at least 6 characters).',
  'Email rate limit exceeded': 'Too many attempts. Please try again in a few minutes.',
  'For security purposes, you can only request this once every 60 seconds': 'Please wait 60 seconds before requesting another email.',
}

export function friendlyAuthError(message: string): string {
  return ERROR_MAP[message] || message
}

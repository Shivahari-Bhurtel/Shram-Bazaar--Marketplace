export function isValidPhoneNumber(phone: string): boolean {
  const value = phone.trim()
  const digits = value.replace(/\D/g, "")
  return (
    /^\+?[0-9\s()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15
  )
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function isValidAuthPasswordLength(password: string): boolean {
  return new TextEncoder().encode(password).length <= 72
}

export function isValidNepalPan(pan: string): boolean {
  return /^\d{9}$/.test(pan.trim())
}

export function isValidTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

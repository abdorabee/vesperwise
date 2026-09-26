export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

export type ContactFormErrors = Partial<Record<keyof ContactFormInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CONTACT_MESSAGE_MIN = 10;

export function validateContactForm({ name, email, message }: ContactFormInput): ContactFormErrors {
  const errors: ContactFormErrors = {};
  if (!name.trim()) errors.name = "Please enter your name.";
  else if (name.trim().length > 120) errors.name = "Name must be 120 characters or fewer.";

  if (!email.trim()) errors.email = "Please enter your work email.";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "That doesn't look like a valid email address.";

  if (!message.trim()) errors.message = "Tell us briefly what you need.";
  else if (message.trim().length < CONTACT_MESSAGE_MIN)
    errors.message = `Please add a bit more detail (at least ${CONTACT_MESSAGE_MIN} characters).`;
  else if (message.length > 4000) errors.message = "Message must be 4,000 characters or fewer.";

  return errors;
}

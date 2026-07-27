-- Phase A enquiry contact: WhatsApp preference on the seeker's phone number (K EC 1.42).
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS contact_whatsapp_available boolean NOT NULL DEFAULT false;

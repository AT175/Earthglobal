/**
 * Notification Service — Email (SendGrid) + SMS (Twilio)
 *
 * Both providers gracefully degrade: if the API key is not set,
 * notifications are logged to console instead of failing.
 * This ensures the app works in development without external services.
 */
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

// ── Email (SendGrid) ──
let sendGridConfigured = false;
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sendGridConfigured = true;
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@earthglobal.com';

/**
 * Send an email. Returns { sent: boolean, error?: string }.
 * Never throws — failures are logged and returned.
 */
async function sendEmail({ to, subject, html, text }) {
  if (!sendGridConfigured) {
    console.log(`[Email] (not configured) To: ${to}, Subject: ${subject}`);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    const msg = {
      to,
      from: FROM_EMAIL,
      subject,
      text: text || subject,
      html: html || `<p>${text || subject}</p>`,
    };
    await sgMail.send(msg);
    console.log(`[Email] Sent to ${to}: ${subject}`);
    return { sent: true };
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

// ── SMS (Twilio) ──
let twilioClient = null;
let twilioConfigured = false;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    twilioConfigured = true;
  } catch (err) {
    console.error('[SMS] Twilio init failed:', err.message);
  }
}

const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER || '';

/**
 * Send an SMS. Returns { sent: boolean, error?: string }.
 * Never throws — failures are logged and returned.
 */
async function sendSMS({ to, body }) {
  if (!twilioConfigured) {
    console.log(`[SMS] (not configured) To: ${to}, Body: ${body}`);
    return { sent: false, reason: 'not_configured' };
  }
  try {
    await twilioClient.messages.create({
      from: TWILIO_FROM,
      to,
      body,
    });
    console.log(`[SMS] Sent to ${to}`);
    return { sent: true };
  } catch (err) {
    console.error(`[SMS] Failed to send to ${to}:`, err.message);
    return { sent: false, error: err.message };
  }
}

// ── Templated notifications ──
// High-level helpers that compose email + SMS for common events.

async function notifyListingApproved({ sellerEmail, sellerPhone, listingTitle }) {
  const subject = `Your land listing "${listingTitle}" has been approved`;
  const text = `Good news! Your land listing "${listingTitle}" has been approved by the planning officer and is now live on the EarthGlobal marketplace.`;
  const html = `<h2>Listing Approved</h2><p>Good news! Your land listing <strong>${listingTitle}</strong> has been approved by the planning officer and is now live on the EarthGlobal marketplace.</p>`;
  const promises = [];
  if (sellerEmail) promises.push(sendEmail({ to: sellerEmail, subject, text, html }));
  if (sellerPhone) promises.push(sendSMS({ to: sellerPhone, body: text }));
  await Promise.all(promises);
}

async function notifyListingRejected({ sellerEmail, sellerPhone, listingTitle, reason }) {
  const subject = `Your land listing "${listingTitle}" was not approved`;
  const text = `Your land listing "${listingTitle}" was not approved. Reason: ${reason || 'Not specified'}. You can edit and resubmit the listing.`;
  const html = `<h2>Listing Update</h2><p>Your land listing <strong>${listingTitle}</strong> was not approved.</p><p><strong>Reason:</strong> ${reason || 'Not specified'}</p><p>You can edit and resubmit the listing.</p>`;
  const promises = [];
  if (sellerEmail) promises.push(sendEmail({ to: sellerEmail, subject, text, html }));
  if (sellerPhone) promises.push(sendSMS({ to: sellerPhone, body: text }));
  await Promise.all(promises);
}

async function notifyPurchaseRequest({ sellerEmail, sellerPhone, listingTitle, buyerName, price }) {
  const subject = `New purchase request for "${listingTitle}"`;
  const text = `You have received a purchase request from ${buyerName} for your listing "${listingTitle}" at GHS ${price}. Log in to review and accept/reject.`;
  const html = `<h2>New Purchase Request</h2><p><strong>Buyer:</strong> ${buyerName}</p><p><strong>Listing:</strong> ${listingTitle}</p><p><strong>Price:</strong> GHS ${price}</p><p>Log in to review and accept or reject this request.</p>`;
  const promises = [];
  if (sellerEmail) promises.push(sendEmail({ to: sellerEmail, subject, text, html }));
  if (sellerPhone) promises.push(sendSMS({ to: sellerPhone, body: text }));
  await Promise.all(promises);
}

async function notifyPaymentConfirmed({ buyerEmail, buyerPhone, listingTitle, amount }) {
  const subject = `Payment confirmed for "${listingTitle}"`;
  const text = `The seller has confirmed your payment of GHS ${amount} for "${listingTitle}". A receipt will be generated shortly.`;
  const html = `<h2>Payment Confirmed</h2><p>The seller has confirmed your payment of <strong>GHS ${amount}</strong> for <strong>${listingTitle}</strong>.</p><p>A receipt will be generated and sent to you shortly.</p>`;
  const promises = [];
  if (buyerEmail) promises.push(sendEmail({ to: buyerEmail, subject, text, html }));
  if (buyerPhone) promises.push(sendSMS({ to: buyerPhone, body: text }));
  await Promise.all(promises);
}

async function notifyOwnershipTransferred({ buyerEmail, buyerPhone, listingTitle }) {
  const subject = `Ownership transferred for "${listingTitle}"`;
  const text = `Congratulations! Ownership of "${listingTitle}" has been officially transferred to you. You are now the registered owner.`;
  const html = `<h2>Ownership Transferred</h2><p>Congratulations! Ownership of <strong>${listingTitle}</strong> has been officially transferred to you.</p><p>You are now the registered owner of this parcel.</p>`;
  const promises = [];
  if (buyerEmail) promises.push(sendEmail({ to: buyerEmail, subject, text, html }));
  if (buyerPhone) promises.push(sendSMS({ to: buyerPhone, body: text }));
  await Promise.all(promises);
}

async function notifyAlert({ ownerEmail, ownerPhone, parcelName, alertType }) {
  const subject = `New ${alertType} alert on "${parcelName}"`;
  const text = `A ${alertType} alert has been detected on your parcel "${parcelName}". Log in to EarthGlobal to view details.`;
  const html = `<h2>Land Alert</h2><p>A <strong>${alertType}</strong> alert has been detected on your parcel <strong>${parcelName}</strong>.</p><p>Log in to EarthGlobal to view details and take action.</p>`;
  const promises = [];
  if (ownerEmail) promises.push(sendEmail({ to: ownerEmail, subject, text, html }));
  if (ownerPhone) promises.push(sendSMS({ to: ownerPhone, body: text }));
  await Promise.all(promises);
}

module.exports = {
  sendEmail,
  sendSMS,
  notifyListingApproved,
  notifyListingRejected,
  notifyPurchaseRequest,
  notifyPaymentConfirmed,
  notifyOwnershipTransferred,
  notifyAlert,
};

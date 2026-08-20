/**
 * Notification service — sends email and SMS when alerts fire.
 *
 * Uses SendGrid for email and Twilio for SMS.
 * If neither is configured, notifications are only stored in the database
 * and delivered via WebSocket (real-time in-app).
 */
const db = require('../config/db');
const bus = require('../realtime/eventBus');

/**
 * Create a notification record + attempt email/SMS delivery.
 * Called when an alert is created by the NDVI job.
 */
async function notifyOwnerOfAlert(ownerId, alert, parcelName) {
  const message = `Alert: ${alert.alert_type === 'clearing' ? 'Vegetation clearing detected' : 'Possible structure detected'} on your parcel "${parcelName}". NDVI changed from ${alert.ndvi_before?.toFixed(2)} to ${alert.ndvi_after?.toFixed(2)}.`;

  // Store notification in database
  try {
    await db.query(
      `INSERT INTO notifications (owner_id, title, body, type) VALUES ($1, $2, $3, $4)`,
      [ownerId, `Land Alert: ${parcelName}`, message, 'alert']
    );
  } catch (err) {
    console.error('[Notifications] Failed to store notification:', err.message);
  }

  // Push via WebSocket (real-time in-app)
  bus.emit('notification:new', { ownerId, title: `Land Alert: ${parcelName}`, body: message, alert });

  // Send email if SendGrid is configured
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const { rows } = await db.query('SELECT email FROM owners WHERE id = $1', [ownerId]);
      if (rows[0]?.email) {
        await sgMail.send({
          to: rows[0].email,
          from: process.env.SENDGRID_FROM_EMAIL || 'alerts@earthglobal.com',
          subject: `Land Alert: ${parcelName}`,
          text: message,
          html: `<p>${message}</p><p>View details in your <a href="https://earthglobalgh.netlify.app">EarthGlobal dashboard</a>.</p>`,
        });
        console.log(`[Notifications] Email sent to ${rows[0].email}`);
      }
    } catch (err) {
      console.error('[Notifications] Email failed:', err.message);
    }
  }

  // Send SMS if Twilio is configured
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const { rows } = await db.query('SELECT phone FROM owners WHERE id = $1', [ownerId]);
      if (rows[0]?.phone) {
        await twilio.messages.create({
          body: `EarthGlobal Alert: ${message}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: rows[0].phone,
        });
        console.log(`[Notifications] SMS sent to ${rows[0].phone}`);
      }
    } catch (err) {
      console.error('[Notifications] SMS failed:', err.message);
    }
  }
}

module.exports = { notifyOwnerOfAlert };

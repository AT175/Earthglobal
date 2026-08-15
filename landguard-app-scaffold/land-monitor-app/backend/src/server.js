require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const parcelRoutes = require('./routes/parcels.routes');
const surveySessionRoutes = require('./routes/surveySessions.routes');
const visitRequestRoutes = require('./routes/visitRequests.routes');
const subscriptionRoutes = require('./routes/subscriptions.routes');
const alertRoutes = require('./routes/alerts.routes');
const notificationRoutes = require('./routes/notifications.routes');
const paymentRoutes = require('./routes/payments.routes');

const app = express();

app.use(cors());
// Note: payments webhook route needs the raw body for signature verification,
// so it's mounted separately before the global json parser in a real build.
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/parcels', parcelRoutes);
app.use('/survey-sessions', surveySessionRoutes);
app.use('/visit-requests', visitRequestRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/parcels', alertRoutes); // mounts /parcels/:id/alerts, see routes file
app.use('/notifications', notificationRoutes);
app.use('/payments', paymentRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));

const webhookService = require('../services/webhookService');
const { notifyWebhook } = require('../websocket/socketManager');

const BASE_URL = process.env.WEBHOOK_BASE_URL || process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

const webhookController = {
  /**
   * POST /webhook-api/create
   * Body: { session_id }
   */
  createEndpoint: async (req, res) => {
    try {
      const { session_id } = req.body;

      if (!session_id) {
        return res.status(400).json({ error: 'session_id is required' });
      }

      const endpoint = await webhookService.createEndpoint(session_id);
      const webhookUrl = `${BASE_URL}/webhook/${endpoint.endpoint_id}`;

      return res.json({
        success: true,
        endpoint_id: endpoint.endpoint_id,
        url: webhookUrl,
        expires_at: endpoint.expires_at,
      });
    } catch (err) {
      console.error('Error creating webhook endpoint:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * GET /webhook-api/requests/:endpointId
   */
  getRequests: async (req, res) => {
    try {
      const { endpointId } = req.params;
      const requests = await webhookService.getRequests(endpointId);
      return res.json({ success: true, requests });
    } catch (err) {
      console.error('Error fetching webhook requests:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * DELETE /webhook-api/requests/:endpointId
   */
  clearRequests: async (req, res) => {
    try {
      const { endpointId } = req.params;
      await webhookService.clearRequests(endpointId);
      return res.json({ success: true, message: 'Requests cleared' });
    } catch (err) {
      console.error('Error clearing webhook requests:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * GET /webhook-api/status/:endpointId
   */
  getStatus: async (req, res) => {
    try {
      const { endpointId } = req.params;
      const endpoint = await webhookService.validateEndpoint(endpointId);

      if (!endpoint) {
        return res.status(404).json({ error: 'Endpoint not found or expired' });
      }

      return res.json({
        success: true,
        endpoint_id: endpoint.endpoint_id,
        expires_at: endpoint.expires_at,
        url: `${BASE_URL}/webhook/${endpoint.endpoint_id}`,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * ALL /webhook/:endpointId — receives incoming webhook requests
   */
  receiveWebhook: async (req, res) => {
    try {
      const { endpointId } = req.params;

      // Validate endpoint exists
      const endpoint = await webhookService.validateEndpoint(endpointId);
      if (!endpoint) {
        return res.status(404).json({ error: 'Webhook endpoint not found or expired' });
      }

      // Store the request
      const requestData = {
        method: req.method,
        headers: req.headers,
        body: req.body || {},
        query: req.query || {},
        ip: req.ip || req.connection.remoteAddress,
      };

      const stored = await webhookService.storeRequest(endpointId, requestData);

      // Notify connected WebSocket clients in real-time
      notifyWebhook(endpointId, stored);

      // Always return 200 to the sender
      return res.status(200).json({ success: true, message: 'Webhook received' });
    } catch (err) {
      console.error('Error receiving webhook:', err.message);
      return res.status(200).json({ success: true, message: 'Webhook received' });
    }
  },
};

module.exports = webhookController;

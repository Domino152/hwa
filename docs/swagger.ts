/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     description: Always returns 200 OK if the server is running
 *     responses:
 *       200:
 *         description: Server is alive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
export {};

/**
 * @openapi
 * /ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     description: Returns 200 if MongoDB and WhatsApp are connected, 503 otherwise
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service not ready
 */
export {};

/**
 * @openapi
 * /live:
 *   get:
 *     tags: [Health]
 *     summary: Process info
 *     description: Returns uptime, memory usage, and process metadata
 *     responses:
 *       200:
 *         description: Process information
 */
export {};

/**
 * @openapi
 * /whatsapp/qr:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Get QR code
 *     description: Returns the current QR code for WhatsApp authentication
 *     responses:
 *       200:
 *         description: QR code data
 *       404:
 *         description: No QR code available
 */
export {};

/**
 * @openapi
 * /whatsapp/connection-status:
 *   get:
 *     tags: [WhatsApp]
 *     summary: Get connection status
 *     description: Returns the current WhatsApp connection state
 *     responses:
 *       200:
 *         description: Connection status
 */
export {};

/**
 * @openapi
 * /whatsapp/send-message:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Send a WhatsApp message
 *     description: |
 *       Send a WhatsApp message to a phone number. Accepts any common phone format
 *       (`+91 7530063885`, `(234) 567-8901`, `917530063885`). The number is verified
 *       on WhatsApp before sending. Outgoing messages are persisted to MongoDB.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, message]
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number in any common format (7-15 digits)
 *                 example: "+91 7530063885"
 *               message:
 *                 type: string
 *                 description: Message text (1-4096 chars)
 *                 example: "Hello from the College WhatsApp Assistant"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid request body (missing or malformed phone/message)
 *       404:
 *         description: Phone number is not registered on WhatsApp
 *       503:
 *         description: WhatsApp is not connected — scan the QR code first
 */
export {};

/**
 * @openapi
 * /whatsapp/logout:
 *   post:
 *     tags: [WhatsApp]
 *     summary: Logout
 *     description: Disconnect WhatsApp session
 *     responses:
 *       200:
 *         description: Logged out
 */
export {};

/**
 * @openapi
 * components:
 *   schemas:
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *         error:
 *           type: object
 *           properties:
 *             code:
 *               type: string
 *             message:
 *               type: string
 *         requestId:
 *           type: string
 *           format: uuid
 *         timestamp:
 *           type: string
 *           format: date-time
 */
export {};

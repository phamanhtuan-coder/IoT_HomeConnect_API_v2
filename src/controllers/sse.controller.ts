import { Request, Response } from 'express';
import { ProductionTrackingStageLog } from '../types/production-tracking';

interface ProductionUpdatePayload {
    type: 'production_update' | 'update_stage' | 'update_status';
    device_serial: string;
    stage: string;
    status: string;
    stage_logs: ProductionTrackingStageLog[];
}

class SSEController {
    private static instance: SSEController;
    private clients: { id: number; res: Response }[] = [];

    private constructor() {}

    public static getInstance(): SSEController {
        if (!SSEController.instance) {
            SSEController.instance = new SSEController();
        }
        return SSEController.instance;
    }

    getEvents = async (req: Request, res: Response) => {
        try {
            // Check if headers are already sent
            if (res.headersSent) {
                return;
            }

            console.log('getEvents - Starting new connection');
            
            // Set SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();

            const clientId = Date.now();
            const newClient = { id: clientId, res };
            
            // Add new client
            this.clients.push(newClient);
            console.log(`New client connected. ID: ${clientId}. Total clients: ${this.clients.length}`);

            // Send initial connection message
            res.write(`data: ${JSON.stringify({ 
                type: 'connected',
                message: 'Connected to SSE' 
            })}\n\n`);

            // Handle client disconnect
            req.on('close', () => {
                this.clients = this.clients.filter(client => client.id !== clientId);
                console.log(`Client ${clientId} disconnected. Remaining clients: ${this.clients.length}`);
            });

        } catch (error) {
            console.error('Error in getEvents:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }

    postSomeAction(req: Request, res: Response) {
        const result = { success: true, data: req.body };

        this.sendNotificationToAllClients({
            message: 'API call successful!',
            data: result,
        });

        res.json(result);
    }

    private sendNotificationToAllClients(payload: { message: string; data: any }) {
        this.clients.forEach(client => {
            client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
        });
    }

    // Phương thức mới để gửi cập nhật production
    sendProductionUpdate(payload: ProductionUpdatePayload) {
        console.log('Sending production update to clients:', payload);
        this.clients.forEach(client => {
            try {
                client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
            } catch (error) {
                console.error('Error sending to client:', error);
                // Xóa client nếu không thể gửi
                this.clients = this.clients.filter(c => c.id !== client.id);
            }
        });
    }

    getConnectedClientsCount(): number {
        return this.clients.length;
    }
}

export default SSEController.getInstance();
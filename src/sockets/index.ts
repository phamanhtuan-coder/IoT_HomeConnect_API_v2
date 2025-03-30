import { Server } from 'socket.io';
import deviceSocket from './device.socket';

export const initSocket = (io: Server) => {
    io.on('connection', (socket) => {
        console.log('A client connected:', socket.id);
        deviceSocket(socket, io);
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });
};
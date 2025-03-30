import { Server, Socket } from 'socket.io';

const deviceSocket = (socket: Socket, io: Server) => {
    socket.on('device-data', (data) => {
        console.log('Received device data:', data);
        io.emit('device-update', data); // Phát lại cho client
    });
};

export default deviceSocket;
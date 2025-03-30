import { initApp } from './app';
import { initSocket } from './sockets';
import { appConfig } from './config/app';

const { app, io } = initApp();

initSocket(io);

app.listen(appConfig.port, () => {
    console.log(`Server is running on port ${appConfig.port}`);
});
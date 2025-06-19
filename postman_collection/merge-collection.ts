import * as fs from 'fs';
import * as path from 'path';

// Define the type for the Postman collection structure
interface PostmanCollection {
    info: {
        _postman_id: string;
        name: string;
        schema: string;
        _exporter_id?: string;
        _collection_link?: string;
    };
    item: any[];
    event: any[];
    variable: any[];
}

const basePath = path.join(__dirname);
const base: PostmanCollection = JSON.parse(fs.readFileSync(path.join(basePath, 'base.json'), 'utf8'));
const modules = [
    'auth', 'sync-tracking', 'user-devices',
    'notification','device','group',
    'house','space','sharedPermission',
    'alert-type','alert',
    'firmware','firmware-update-history','ownershipHistory',
    'ticket-type','ticket','hourly-value',
    'component','template-component','device-template',
    'production-batches','production-tracking',
    'planning'
];

const items: any[] = [];
for (const module of modules) {
    const moduleData = JSON.parse(fs.readFileSync(path.join(basePath, `${module}.json`), 'utf8'));
    items.push(...moduleData);
}

base.item = items;

fs.writeFileSync(path.join(basePath, 'full-collection.json'), JSON.stringify(base, null, 2));
console.log('Collection merged successfully!');
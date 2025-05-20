export enum NotificationType {
    SYSTEM = 'system',
    ORDER = 'order',
    PROMOTION = 'promotion',
    SECURITY = 'security',
    SHARE_REQUEST = 'share_request',
    TICKET = 'ticket',
    ALERT = 'alert',
}

export interface Notification {
    id: number;
    account_id: string | null;
    role_id: number | null;
    text: string | null;
    type: NotificationType;
    is_read: boolean | null;
    created_at: Date | null;
    updated_at: Date | null;
    deleted_at: Date | null;
}
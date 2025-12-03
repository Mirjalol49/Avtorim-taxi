import React, { useEffect, useRef } from 'react';

export interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

interface TelegramLoginButtonProps {
    botName: string;
    onAuth: (user: TelegramUser) => void;
    buttonSize?: 'large' | 'medium' | 'small';
    cornerRadius?: number;
    requestAccess?: 'write';
    usePic?: boolean;
}

const TelegramLoginButton: React.FC<TelegramLoginButtonProps> = ({
    botName,
    onAuth,
    buttonSize = 'large',
    cornerRadius = 12,
    requestAccess = 'write',
    usePic = true,
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            // Clear previous script if any
            ref.current.innerHTML = '';

            const script = document.createElement('script');
            script.src = 'https://telegram.org/js/telegram-widget.js?22';
            script.setAttribute('data-telegram-login', botName);
            script.setAttribute('data-size', buttonSize);
            script.setAttribute('data-radius', cornerRadius.toString());
            script.setAttribute('data-request-access', requestAccess);
            script.setAttribute('data-userpic', usePic.toString());
            script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
            script.async = true;

            ref.current.appendChild(script);

            (window as any).TelegramLoginWidget = {
                dataOnauth: (user: TelegramUser) => onAuth(user),
            };
        }
    }, [botName, buttonSize, cornerRadius, requestAccess, usePic, onAuth]);

    return <div ref={ref} className="flex justify-center" />;
};

export default TelegramLoginButton;

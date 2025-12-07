import React, { useState, useEffect } from 'react';

interface AuditLog {
    id: string;
    action: string;
    performedBy: string;
    targetId?: string;
    timestamp: any;
    [key: string]: any;
}

interface AuditLogViewerProps {
    theme?: 'light' | 'dark';
}

const ACTION_COLORS: Record<string, string> = {
    'CREATE_ACCOUNT': 'bg-green-500/20 text-green-400',
    'ACCOUNT_APPROVED': 'bg-green-500/20 text-green-400',
    'ACCOUNT_REJECTED': 'bg-red-500/20 text-red-400',
    'PASSWORD_CHANGED': 'bg-blue-500/20 text-blue-400',
    'MFA_ENABLED': 'bg-purple-500/20 text-purple-400',
    'MFA_DISABLED': 'bg-orange-500/20 text-orange-400',
    'LOGOUT_ALL_SESSIONS': 'bg-yellow-500/20 text-yellow-400',
    'DELETE_ADMIN_USER': 'bg-red-500/20 text-red-400',
    'UPDATE_ADMIN_USER': 'bg-blue-500/20 text-blue-400'
};

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ theme = 'dark' }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa('driver123:secretKey')
    };

    useEffect(() => {
        fetchLogs();
    }, [actionFilter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let url = 'http://localhost:3000/api/admin/audit-logs?limit=100';
            if (actionFilter) url += `&action=${actionFilter}`;

            const response = await fetch(url, { headers });
            const data = await response.json();
            setLogs(data);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'N/A';
        const date = ts._seconds ? new Date(ts._seconds * 1000) : new Date(ts);
        return date.toLocaleString();
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(filter.toLowerCase()) ||
        log.performedBy?.toLowerCase().includes(filter.toLowerCase()) ||
        log.targetId?.toLowerCase().includes(filter.toLowerCase())
    );

    const uniqueActions = [...new Set(logs.map(l => l.action))];

    return (
        <div className={`rounded-2xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            {/* Header */}
            <div className={`p-4 border-b flex flex-wrap gap-4 items-center justify-between ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Audit Logs
                </h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className={`px-3 py-2 rounded-lg text-sm border ${theme === 'dark'
                                ? 'bg-gray-900 border-gray-700 text-white'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}
                    />
                    <select
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value)}
                        className={`px-3 py-2 rounded-lg text-sm border ${theme === 'dark'
                                ? 'bg-gray-900 border-gray-700 text-white'
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}
                    >
                        <option value="">All Actions</option>
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchLogs}
                        className="px-3 py-2 bg-[#0d9488] text-white rounded-lg text-sm font-bold hover:bg-[#0f766e]"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Logs */}
            <div className="max-h-[500px] overflow-y-auto">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="w-8 h-8 border-2 border-[#0d9488] border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className={`p-8 text-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                        No audit logs found
                    </div>
                ) : (
                    <div className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-100'}`}>
                        {filteredLogs.map(log => (
                            <div key={log.id} className={`p-4 hover:${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'} transition-colors`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${ACTION_COLORS[log.action] || 'bg-gray-500/20 text-gray-400'}`}>
                                                {log.action}
                                            </span>
                                            {log.targetId && (
                                                <span className={`text-xs font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    → {log.targetId.slice(0, 8)}...
                                                </span>
                                            )}
                                        </div>
                                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                            by <span className="font-bold">{log.performedBy || 'system'}</span>
                                        </div>
                                    </div>
                                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {formatTimestamp(log.timestamp)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuditLogViewer;

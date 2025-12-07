import React, { useState, useEffect } from 'react';
import { ShieldIcon, SearchIcon, FilterIcon } from '../Icons';
import { subscribeToAuditLogs } from '../../services/firestoreService';

const AdminAuditLog: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => {
        const unsubscribe = subscribeToAuditLogs((data) => {
            setLogs(data);
        });
        return () => unsubscribe();
    }, []);

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.targetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.performedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filterAction === 'all' || log.action === filterAction;

        return matchesSearch && matchesFilter;
    });

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'text-red-400';
        if (action.includes('CREATE')) return 'text-green-400';
        if (action.includes('UPDATE')) return 'text-blue-400';
        return 'text-gray-400';
    };

    const uniqueActions = Array.from(new Set(logs.map(log => log.action)));

    return (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 border-b border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldIcon className="w-5 h-5 text-purple-400" />
                    Audit Logs
                </h2>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div className="relative">
                        <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none"
                        >
                            <option value="all">All Actions</option>
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>{action}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-900/50 text-gray-400 text-xs uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4">Timestamp</th>
                            <th className="px-6 py-4">Action</th>
                            <th className="px-6 py-4">Target</th>
                            <th className="px-6 py-4">Performed By</th>
                            <th className="px-6 py-4">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs font-bold uppercase ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-white font-medium">
                                    {log.targetName || log.targetId}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-300">
                                    {log.performedBy}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500 font-mono truncate max-w-xs">
                                    {log.updates || log.reason || '-'}
                                </td>
                            </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    No logs found matching your criteria
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminAuditLog;

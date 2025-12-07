import { useState, useMemo } from 'react';
import { Driver, DriverStatus } from '../../../core/types';

export const useDriversList = (drivers: Driver[]) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const nonDeletedDrivers = useMemo(() => {
        return drivers.filter(d => !d.isDeleted);
    }, [drivers]);

    const filteredDrivers = useMemo(() => {
        const activeDrivers = nonDeletedDrivers;

        if (!searchQuery.trim()) return activeDrivers;
        const query = searchQuery.toLowerCase();
        return activeDrivers.filter(d =>
            d.name.toLowerCase().includes(query) ||
            d.licensePlate.toLowerCase().includes(query) ||
            d.carModel.toLowerCase().includes(query)
        );
    }, [drivers, nonDeletedDrivers, searchQuery]);

    const paginatedDrivers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredDrivers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredDrivers, currentPage]);

    const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);

    return {
        searchQuery, setSearchQuery,
        viewMode, setViewMode,
        currentPage, setCurrentPage,
        itemsPerPage,
        filteredDrivers,
        paginatedDrivers,
        totalPages
    };
};

import * as XLSX from 'xlsx';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat('uz-UZ').format(Math.round(n));

const fmtDate = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

const fmtTime = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmtDateTime = (ms: number) => `${fmtDate(ms)} ${fmtTime(ms)}`;

const downloadWorkbook = (wb: XLSX.WorkBook, filename: string) => {
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

const applyHeaderStyle = (ws: XLSX.WorkSheet, range: XLSX.Range) => {
    for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c });
        if (!ws[addr]) continue;
        ws[addr].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { patternType: 'solid', fgColor: { rgb: '0F766E' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
                bottom: { style: 'thin', color: { rgb: '0A5C56' } },
                right: { style: 'thin', color: { rgb: '0A5C56' } },
            },
        };
    }
};

// ─── Transactions ──────────────────────────────────────────────────────────────

export const exportTransactionsToExcel = (
    transactions: Transaction[],
    filename = "O'tkazmalar"
) => {
    const rows = transactions
        .filter(tx => tx.status !== PaymentStatus.DELETED && (tx as any).status !== 'DELETED')
        .map(tx => ({
            'Sana': fmtDate(tx.timestamp),
            'Vaqt': fmtTime(tx.timestamp),
            'Sana va vaqt': fmtDateTime(tx.timestamp),
            'Haydovchi': tx.driverName ?? '—',
            'Mashina': tx.carName ?? '—',
            'Turi': (tx.type as string) === 'DAY_OFF'
                ? 'Dam olish kuni'
                : tx.type === TransactionType.INCOME
                    ? 'Kirim'
                    : 'Chiqim',
            "To'lov usuli": tx.paymentMethod === 'card' ? 'Karta' : tx.paymentMethod === 'cash' ? 'Naqd' : '—',
            'Summa (UZS)': tx.type === TransactionType.EXPENSE ? -Math.abs(tx.amount) : Math.abs(tx.amount),
            'Izoh': tx.description || tx.note || '—',
            'Holat': tx.status === PaymentStatus.REVERSED ? 'Qaytarilgan' : 'Faol',
        }));

    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
        { wch: 12 }, // Sana
        { wch: 8 },  // Vaqt
        { wch: 18 }, // Sana va vaqt
        { wch: 22 }, // Haydovchi
        { wch: 22 }, // Mashina
        { wch: 14 }, // Turi
        { wch: 14 }, // To'lov usuli
        { wch: 16 }, // Summa
        { wch: 35 }, // Izoh
        { wch: 12 }, // Holat
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    applyHeaderStyle(ws, range);

    // Alternate row fill + right-align amount
    for (let r = 1; r <= rows.length; r++) {
        const isEven = r % 2 === 0;
        for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (!ws[addr]) ws[addr] = { t: 's', v: '' };
            const isAmountCol = c === 7;
            ws[addr].s = {
                fill: isEven
                    ? { patternType: 'solid', fgColor: { rgb: 'F0FDF9' } }
                    : { patternType: 'none' },
                alignment: { horizontal: isAmountCol ? 'right' : 'left', vertical: 'center' },
                border: { right: { style: 'hair', color: { rgb: 'D1FAF0' } } },
            };
        }
    }

    // Summary row
    const incomeTotal = transactions
        .filter(tx => tx.type === TransactionType.INCOME && tx.status !== PaymentStatus.DELETED)
        .reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const expenseTotal = transactions
        .filter(tx => tx.type === TransactionType.EXPENSE && tx.status !== PaymentStatus.DELETED)
        .reduce((s, tx) => s + Math.abs(tx.amount), 0);

    XLSX.utils.sheet_add_aoa(ws, [
        [],
        ['', '', '', '', '', '', "Jami kirim:", incomeTotal, '', ''],
        ['', '', '', '', '', '', "Jami chiqim:", -expenseTotal, '', ''],
        ['', '', '', '', '', '', "Sof foyda:", incomeTotal - expenseTotal, '', ''],
    ], { origin: -1 });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "O'tkazmalar");
    downloadWorkbook(wb, filename);
};

// ─── Drivers ──────────────────────────────────────────────────────────────────

export const exportDriversToExcel = (drivers: Driver[], filename = 'Haydovchilar') => {
    const rows = drivers
        .filter(d => !d.isDeleted)
        .map((d, i) => ({
            '#': i + 1,
            'Ism': d.name,
            'Telefon': d.phone || '—',
            'Mashina modeli': (d as any).carModel || '—',
            'Mashina raqami': (d as any).licensePlate || '—',
            'Holat': d.status === 'ACTIVE' ? 'Faol' : d.status === 'OFFLINE' ? 'Offline' : d.status,
            "Kunlik reja (UZS)": (d as any).dailyPlan ?? 0,
            'Balans (UZS)': d.balance ?? 0,
            "Qo'shilgan sana": d.createdAt ? fmtDate(d.createdAt) : '—',
        }));

    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
        { wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 20 },
        { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 16 },
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    applyHeaderStyle(ws, range);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Haydovchilar');
    downloadWorkbook(wb, filename);
};

// ─── Cars ──────────────────────────────────────────────────────────────────────

export const exportCarsToExcel = (
    cars: Car[],
    drivers: Driver[],
    filename = 'Avtomobillar'
) => {
    const driverMap = new Map(drivers.map(d => [d.id, d.name]));

    const rows = cars
        .filter(c => !c.isDeleted)
        .map((c, i) => ({
            '#': i + 1,
            'Mashina nomi': c.name,
            'Davlat raqami': c.licensePlate,
            'Biriktirilgan haydovchi': c.assignedDriverId ? (driverMap.get(c.assignedDriverId) ?? '—') : 'Biriktirilmagan',
            "Kunlik reja (UZS)": c.dailyPlan ?? 0,
            "Qo'shilgan sana": c.createdAt ? fmtDate(c.createdAt) : '—',
        }));

    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
        { wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 26 }, { wch: 18 }, { wch: 16 },
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    applyHeaderStyle(ws, range);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Avtomobillar');
    downloadWorkbook(wb, filename);
};

// ─── Finance summary (per driver) ─────────────────────────────────────────────

export const exportFinanceSummaryToExcel = (
    drivers: Driver[],
    transactions: Transaction[],
    startDate: string,
    endDate: string,
    filename = 'Moliyaviy hisobot'
) => {
    const now = Date.now();
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate + 'T23:59:59').getTime() : now;

    const periodTx = transactions.filter(tx => {
        if (tx.status === PaymentStatus.DELETED || (tx as any).status === 'DELETED') return false;
        return tx.timestamp >= start && tx.timestamp <= end;
    });

    const rows = drivers
        .filter(d => !d.isDeleted)
        .map((d, i) => {
            const dTx = periodTx.filter(tx => tx.driverId === d.id);
            const income = dTx
                .filter(tx => tx.type === TransactionType.INCOME)
                .reduce((s, tx) => s + Math.abs(tx.amount), 0);
            const expense = dTx
                .filter(tx => tx.type === TransactionType.EXPENSE)
                .reduce((s, tx) => s + Math.abs(tx.amount), 0);
            const txCount = dTx.filter(tx => tx.type === TransactionType.INCOME).length;
            const plan = (d as any).dailyPlan ?? 0;
            return {
                '#': i + 1,
                'Haydovchi': d.name,
                'Mashina': `${(d as any).carModel ?? ''} ${(d as any).licensePlate ?? ''}`.trim() || '—',
                "Jami kirim (UZS)": income,
                "Jami chiqim (UZS)": expense,
                "Sof foyda (UZS)": income - expense,
                "To'lov soni": txCount,
                "Kunlik reja (UZS)": plan,
            };
        });

    if (rows.length === 0) return;

    // Grand totals
    const totalIncome = rows.reduce((s, r) => s + r["Jami kirim (UZS)"], 0);
    const totalExpense = rows.reduce((s, r) => s + r["Jami chiqim (UZS)"], 0);

    const ws = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.sheet_add_aoa(ws, [
        [],
        ['', '', "JAMI:", totalIncome, totalExpense, totalIncome - totalExpense, '', ''],
    ], { origin: -1 });

    ws['!cols'] = [
        { wch: 5 }, { wch: 22 }, { wch: 24 }, { wch: 18 },
        { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 },
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    applyHeaderStyle(ws, range);

    // Add period info in a metadata sheet
    const metaWs = XLSX.utils.aoa_to_sheet([
        ['Hisobot davri:'],
        ["Boshlanish:", startDate || 'Barcha vaqt'],
        ["Tugash:", endDate || 'Hozirgi kun'],
        ["Yaratildi:", fmtDateTime(Date.now())],
    ]);
    metaWs['!cols'] = [{ wch: 20 }, { wch: 20 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hisobot');
    XLSX.utils.book_append_sheet(wb, metaWs, 'Maʼlumot');
    downloadWorkbook(wb, filename);
};

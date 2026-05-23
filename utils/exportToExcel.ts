import * as XLSX from 'xlsx-js-style';
import { Transaction, TransactionType, PaymentStatus } from '../src/core/types';
import { Driver } from '../src/core/types/driver.types';
import { Car } from '../src/core/types/car.types';
import { calcDriverFinance } from '../src/features/drivers/utils/debtUtils';

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
    XLSX.writeFile(wb, `${filename}.xlsx`, { compression: true, cellStyles: true });
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

const setCellStyle = (ws: XLSX.WorkSheet, addr: string, style: any) => {
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = { ...(ws[addr].s || {}), ...style };
};

const applyRangeStyle = (ws: XLSX.WorkSheet, rangeRef: string, style: any) => {
    const range = XLSX.utils.decode_range(rangeRef);
    for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
            setCellStyle(ws, XLSX.utils.encode_cell({ r, c }), style);
        }
    }
};

const driverTypeLabel = (type?: string) => {
    if (type === 'salary') return 'Oylik maosh';
    if (type === 'lease_to_own') return 'Vikup';
    return 'Standart';
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

export const exportDriversToExcel = (
    drivers: Driver[],
    carsOrFilename: Car[] | string = 'Haydovchilar',
    transactionsOrFilename: Transaction[] | string = [],
    filenameArg?: string
) => {
    const cars = Array.isArray(carsOrFilename) ? carsOrFilename : [];
    const transactions = Array.isArray(transactionsOrFilename) ? transactionsOrFilename : [];
    const filename = typeof carsOrFilename === 'string'
        ? carsOrFilename
        : typeof transactionsOrFilename === 'string'
            ? transactionsOrFilename
            : (filenameArg || 'Haydovchilar');
    const activeDrivers = drivers.filter(d => !d.isDeleted);
    if (activeDrivers.length === 0) return;

    const currentCarByDriverId = new Map(
        cars
            .filter(c => !c.isDeleted && c.assignedDriverId)
            .map(c => [c.assignedDriverId as string, c])
    );

    const rows = activeDrivers.map((d, i) => {
        const currentCar = currentCarByDriverId.get(d.id) ?? null;
        const finance = calcDriverFinance(d, currentCar, transactions);
        const driverType = d.driverType ?? 'deposit';
        const depositRemaining = driverType === 'deposit' ? finance.remainingDeposit : 0;
        const startDate = d.startDate || d.createdAt;
        return {
            index: i + 1,
            name: d.name || '—',
            phone: d.phone || '—',
            type: driverTypeLabel(driverType),
            carName: currentCar?.name || 'Biriktirilmagan',
            plate: currentCar?.licensePlate || '—',
            dailyPlan: currentCar?.dailyPlan ?? 0,
            depositRemaining,
            startDate: startDate ? fmtDate(startDate) : '—',
            quitDate: d.quitDate ? fmtDate(d.quitDate) : '—',
        };
    });

    const assignedCount = rows.filter(r => r.carName !== 'Biriktirilmagan').length;
    const unassignedCount = rows.length - assignedCount;
    const totalDailyPlan = rows.reduce((s, r) => s + r.dailyPlan, 0);
    const totalDepositRemaining = rows.reduce((s, r) => s + r.depositRemaining, 0);

    const headers = [
        '#',
        'Haydovchi',
        'Telefon',
        'Toifa',
        'Joriy avtomobil',
        'Davlat raqami',
        'Kunlik reja (UZS)',
        'Depozit qoldiq (UZS)',
        'Ish boshlagan sana',
        'Ishdan ketgan sana',
    ];

    const data = rows.map(r => [
        r.index,
        r.name,
        r.phone,
        r.type,
        r.carName,
        r.plate,
        r.dailyPlan,
        r.depositRemaining,
        r.startDate,
        r.quitDate,
    ]);

    const sheetData = [
        ['Haydovchilar ro\'yxati'],
        [`Yangilangan: ${fmtDateTime(Date.now())}`],
        [],
        ['Jami haydovchilar', rows.length, 'Biriktirilgan', assignedCount, 'Mashinasiz', unassignedCount, 'Jami kunlik reja', totalDailyPlan, 'Depozit qoldiq', totalDepositRemaining],
        [],
        headers,
        ...data,
        [],
        ['', '', '', '', '', 'JAMI:', totalDailyPlan, totalDepositRemaining, '', ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
    ];
    ws['!cols'] = [
        { wch: 6 },
        { wch: 24 },
        { wch: 19 },
        { wch: 16 },
        { wch: 24 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
    ];
    ws['!rows'] = [
        { hpt: 30 },
        { hpt: 20 },
        { hpt: 8 },
        { hpt: 34 },
        { hpt: 8 },
        { hpt: 32 },
    ];
    (ws as any)['!autofilter'] = { ref: `A6:J${6 + rows.length}` };

    setCellStyle(ws, 'A1', {
        font: { bold: true, sz: 20, color: { rgb: '0F172A' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
        alignment: { horizontal: 'left', vertical: 'center' },
    });
    setCellStyle(ws, 'A2', {
        font: { sz: 10, color: { rgb: '64748B' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
        alignment: { horizontal: 'left', vertical: 'center' },
    });
    applyRangeStyle(ws, 'A4:J4', {
        font: { bold: true, sz: 10, color: { rgb: '0F172A' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'ECFDF5' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            top: { style: 'thin', color: { rgb: '99F6E4' } },
            bottom: { style: 'thin', color: { rgb: '99F6E4' } },
            left: { style: 'thin', color: { rgb: 'CCFBF1' } },
            right: { style: 'thin', color: { rgb: 'CCFBF1' } },
        },
    });
    ['B4', 'D4', 'F4', 'H4', 'J4'].forEach(addr => {
        if (ws[addr]) {
            ws[addr].s = {
                ...ws[addr].s,
                font: { bold: true, sz: 12, color: { rgb: '0F766E' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                numFmt: '#,##0',
            };
            ws[addr].z = '#,##0';
        }
    });

    const headerRowIndex = 5;
    for (let c = 0; c < headers.length; c++) {
        setCellStyle(ws, XLSX.utils.encode_cell({ r: headerRowIndex, c }), {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { patternType: 'solid', fgColor: { rgb: '0F766E' } },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
                top: { style: 'thin', color: { rgb: '0A5C56' } },
                bottom: { style: 'thin', color: { rgb: '0A5C56' } },
                right: { style: 'thin', color: { rgb: '0A5C56' } },
            },
        });
    }

    for (let r = 0; r < rows.length; r++) {
        const sheetRow = headerRowIndex + 1 + r;
        const row = rows[r];
        for (let c = 0; c < headers.length; c++) {
            const addr = XLSX.utils.encode_cell({ r: sheetRow, c });
            const isMoney = c === 6 || c === 7;
            const isCentered = [0, 3, 5, 8, 9].includes(c);
            const fill = r % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
            const amountColor = isMoney
                ? c === 7 && row.depositRemaining > 0 && row.depositRemaining <= 1_000_000
                    ? 'B45309'
                    : '0F172A'
                : '0F172A';
            setCellStyle(ws, addr, {
                font: { sz: 11, color: { rgb: amountColor }, bold: isMoney || c === 1 },
                fill: { patternType: 'solid', fgColor: { rgb: fill } },
                alignment: { horizontal: isMoney ? 'right' : isCentered ? 'center' : 'left', vertical: 'center' },
                border: { bottom: { style: 'thin', color: { rgb: 'E2E8F0' } } },
                numFmt: isMoney ? '#,##0' : undefined,
            });
            if (isMoney && ws[addr]) ws[addr].z = '#,##0';
            if (c === 4 && row.carName === 'Biriktirilmagan') {
                ws[addr].s = {
                    ...ws[addr].s,
                    font: { sz: 11, bold: true, color: { rgb: 'B45309' } },
                    fill: { patternType: 'solid', fgColor: { rgb: 'FFFBEB' } },
                };
            }
        }
    }

    const totalRow = headerRowIndex + rows.length + 2;
    applyRangeStyle(ws, `A${totalRow + 1}:J${totalRow + 1}`, {
        font: { bold: true, sz: 11, color: { rgb: '0F172A' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'ECFDF5' } },
        alignment: { vertical: 'center' },
        border: {
            top: { style: 'thin', color: { rgb: '99F6E4' } },
            bottom: { style: 'thin', color: { rgb: '99F6E4' } },
        },
    });
    ['G', 'H'].forEach(col => {
        const addr = `${col}${totalRow + 1}`;
        if (ws[addr]) ws[addr].z = '#,##0';
    });

    const wb = XLSX.utils.book_new();
    wb.Props = {
        Title: 'Haydovchilar ro\'yxati',
        Subject: 'Taksapark haydovchilar eksporti',
        Author: 'Taksapark',
        CreatedDate: new Date(),
    };
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

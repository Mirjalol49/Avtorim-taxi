import { Driver, DriverStatus, Transaction, TransactionType } from './types';

// Tashkent City Center
export const CITY_CENTER = {
  lat: 41.2995,
  lng: 69.2401
};

export const MOCK_DRIVERS: Driver[] = [
  {
    id: 'd1',
    name: 'Sardor Rahimov',
    licensePlate: '01 A 777 AA',
    carModel: 'Chevrolet Cobalt',
    status: DriverStatus.BUSY,
    avatar: 'https://picsum.photos/100/100?random=1',
    telegram: '@sardor_taxi',
    location: { lat: 41.311081, lng: 69.240562, heading: 45 }, // Near Amir Timur Square
    phone: '+998 90 123 45 67',
    dailyPlan: 100000,
    monthlySalary: 3000000,
    balance: 0,
    rating: 4.7
  },
  {
    id: 'd2',
    name: 'Jamshid Aliyev',
    licensePlate: '01 B 123 BB',
    carModel: 'Chevrolet Gentra',
    status: DriverStatus.ACTIVE,
    avatar: 'https://picsum.photos/100/100?random=2',
    telegram: '@jamshid_driver',
    location: { lat: 41.2858, lng: 69.2058, heading: 180 }, // Chorsu Bazaar area
    phone: '+998 93 987 65 43',
    dailyPlan: 90000,
    monthlySalary: 2800000,
    balance: 0,
    rating: 4.5
  },
  {
    id: 'd3',
    name: 'Malika Karimova',
    licensePlate: '01 C 456 CC',
    carModel: 'Kia K5',
    status: DriverStatus.IDLE,
    avatar: 'https://picsum.photos/100/100?random=3',
    telegram: '@malika_k',
    location: { lat: 41.2942, lng: 69.2683, heading: 270 }, // Tashkent City Park
    phone: '+998 97 555 11 22',
    dailyPlan: 110000,
    monthlySalary: 3500000,
    balance: 0,
    rating: 4.8
  },
  {
    id: 'd4',
    name: 'Azizbek Tursunov',
    licensePlate: '01 E 789 DD',
    carModel: 'Chevrolet Tracker',
    status: DriverStatus.OFFLINE,
    avatar: 'https://picsum.photos/100/100?random=4',
    telegram: '@aziz_789',
    location: { lat: 41.3250, lng: 69.2900, heading: 90 }, // Minor Mosque area
    phone: '+998 99 333 44 55',
    dailyPlan: 80000,
    monthlySalary: 2500000,
    balance: 0,
    rating: 4.2
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    driverId: 'd1',
    amount: 45000,
    type: TransactionType.INCOME,
    description: 'Aeroportga yetkazish',
    timestamp: Date.now() - 3600000 * 2
  },
  {
    id: 't2',
    driverId: 'd1',
    amount: 150000,
    type: TransactionType.EXPENSE,
    description: 'Benzin quyish - Uzbekneftegaz',
    timestamp: Date.now() - 3600000 * 4
  },
  {
    id: 't3',
    driverId: 'd2',
    amount: 32000,
    type: TransactionType.INCOME,
    description: 'Markazga qatnov',
    timestamp: Date.now() - 1800000
  },
  {
    id: 't4',
    driverId: 'd3',
    amount: 200000,
    type: TransactionType.EXPENSE,
    description: 'Moy almashtirish',
    timestamp: Date.now() - 86400000
  },
  {
    id: 't5',
    driverId: 'd2',
    amount: 18000,
    type: TransactionType.INCOME,
    description: 'Qisqa masofa',
    timestamp: Date.now() - 7200000
  }
];

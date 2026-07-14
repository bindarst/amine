import type { Diaper, Ward, StockItem, Order, Delivery } from '@/lib/types';

// Let's create a dummy user ID for mock data
const MOCK_USER_ID_1 = 'user_soignant_123';
const MOCK_USER_ID_2 = 'user_logistic_456';

export const diapers: Diaper[] = [
    { id: 'd1', name: 'Flex Jaune', code: 'FJ01', hexColor: '#FFD700', piecesPerCarton: 100, defaultUnit: 'cartons', isActive: true },
    { id: 'd2', name: 'Flex Mauve', code: 'FM01', hexColor: '#E0B0FF', piecesPerCarton: 100, defaultUnit: 'cartons', isActive: true },
    { id: 'd3', name: 'Alèze', code: 'AL01', hexColor: '#B0E0E6', piecesPerCarton: 50, defaultUnit: 'pieces', isActive: true },
    { id: 'd4', name: 'Cellulose', code: 'CE01', hexColor: '#F5F5DC', piecesPerCarton: 200, defaultUnit: 'pieces', isActive: true },
    { id: 'd5', name: 'Micro', code: 'MI01', hexColor: '#E6E6FA', piecesPerCarton: 150, defaultUnit: 'pieces', isActive: true },
    { id: 'd6', name: 'Moby (M)', code: 'MM01', hexColor: '#ADD8E6', piecesPerCarton: 40, defaultUnit: 'pieces', isActive: false },
    { id: 'd7', name: 'Complet (M)', code: 'CM01', hexColor: '#90EE90', piecesPerCarton: 26, defaultUnit: 'cartons', isActive: true },
];

export const wards: Ward[] = [
  { id: 'w1', name: '1er Étage - Cantou A' },
  { id: 'w2', name: '1er Étage - Cantou B' },
  { id: 'w3', name: '2ème Étage' },
  { id: 'w4', name: '3ème Étage' },
];

export const stock: StockItem[] = [
  { diaperId: 'd1', quantity: 250 },
  { diaperId: 'd2', quantity: 180 },
  { diaperId: 'd3', quantity: 300 },
  { diaperId: 'd4', quantity: 120 },
  { diaperId: 'd5', quantity: 80 },
  { diaperId: 'd6', quantity: 150 },
  { diaperId: 'd7', quantity: 90 },
];

export const orders: Order[] = [
    {
        id: 'CMD001',
        date: '2024-05-20',
        status: 'distributed',
        userId: MOCK_USER_ID_1,
        distributorId: MOCK_USER_ID_2,
        distributedAt: '2024-05-21T10:00:00Z',
        wardOrders: [
            {
                wardId: 'w1',
                items: [
                    { diaperId: 'd1', quantity: 2, unit: 'cartons' },
                    { diaperId: 'd3', quantity: 50, unit: 'pieces' }
                ]
            },
            {
                wardId: 'w2',
                items: [
                    { diaperId: 'd2', quantity: 1, unit: 'cartons' },
                ]
            }
        ]
    },
    {
        id: 'CMD002',
        date: '2024-05-21',
        status: 'confirmed',
        userId: MOCK_USER_ID_1,
        wardOrders: [
            {
                wardId: 'w3',
                items: [
                    { diaperId: 'd4', quantity: 100, unit: 'pieces' }
                ]
            }
        ]
    },
    {
        id: 'CMD003',
        date: '2024-05-19',
        status: 'draft',
        userId: MOCK_USER_ID_1,
        wardOrders: [
            {
                wardId: 'w1',
                items: [
                    { diaperId: 'd5', quantity: 30, unit: 'pieces' }
                ]
            }
        ]
    }
];

export const deliveries: Delivery[] = [
    {
        id: 'DLV001',
        date: '2024-05-22',
        supplier: 'Fournisseur Principal',
        userId: MOCK_USER_ID_2,
        items: [
            { diaperId: 'd1', quantity: 500, unit: 'pieces' },
            { diaperId: 'd4', quantity: 2, unit: 'cartons' }
        ],
        createdAt: '2024-05-22T09:00:00Z',
    }
]

export const historicalConsumption = [
    { date: "2023-10-01", quantity: 20 },
    { date: "2023-10-02", quantity: 22 },
    { date: "2023-10-03", quantity: 21 },
    { date: "2023-10-04", quantity: 23 },
    { date: "2023-10-05", quantity: 25 },
    { date: "2023-10-06", quantity: 24 },
    { date: "2023-10-07", quantity: 26 },
    { date: "2023-10-08", quantity: 22 },
    { date: "2023-10-09", quantity: 23 },
    { date: "2023-10-10", quantity: 25 },
    { date: "2023-10-11", quantity: 27 },
    { date: "2023-10-12", quantity: 28 },
    { date: "2023-10-13", quantity: 26 },
    { date: "2023-10-14", quantity: 29 },
    { date: "2023-10-15", quantity: 30 },
    { date: "2023-10-16", quantity: 28 },
    { date: "2023-10-17", quantity: 27 },
    { date: "2023-10-18", quantity: 29 },
    { date: "2023-10-19", quantity: 31 },
    { date: "2023-10-20", quantity: 30 },
    { date: "2023-10-21", quantity: 32 },
    { date: "2023-10-22", quantity: 33 },
    { date: "2023-10-23", quantity: 31 },
    { date: "2023-10-24", quantity: 34 },
    { date: "2023-10-25", quantity: 35 },
    { date: "2023-10-26", quantity: 33 },
    { date: "2023-10-27", quantity: 36 },
    { date: "2023-10-28", quantity: 38 },
];

export const anomalyData = [20, 22, 21, 23, 25, 24, 26, 22, 23, 25, 27, 28, 26, 29, 30, 28, 27, 29, 31, 30, 32, 33, 31, 34, 35, 33, 36, 65]; // Last point is an anomaly

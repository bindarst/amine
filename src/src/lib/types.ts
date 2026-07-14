
export type Diaper = {
  id: string;
  name: string;
  code: string;
  hexColor: string;
  piecesPerCarton: number;
  defaultUnit: 'pieces' | 'cartons';
  isActive: boolean;
  createdAt?: any;
  modifiedAt?: any;
  description?: string;
  imageUrl?: string;
  lowStockThreshold: number;
};

export type Ward = {
  id: string;
  name: string;
  isActive: boolean;
  parLevels?: {
    [diaperId: string]: number;
  }
};

export type StockItem = {
  diaperId: string;
  quantity: number;
  createdAt?: any;
  modifiedAt?: any;
};

export type OrderItem = {
    diaperId: string;
    quantity: number;
    unit: 'pieces' | 'cartons';
};

export type WardOrder = {
  wardId: string;
  items: OrderItem[];
}

export type Order = {
  id: string;
  date: string;
  status: 'draft' | 'confirmed' | 'fulfilled' | 'distributed';
  wardOrders: WardOrder[];
  userId?: string;
  distributorId?: string;
  createdAt?: any;
  modifiedAt?: any;
  distributedAt?: any;
  comment?: string;
};

export type DeliveryItem = {
    diaperId: string;
    quantity: number;
    unit: 'pieces' | 'cartons';
}

export type Delivery = {
    id: string;
    date: string;
    supplier: string;
    items: DeliveryItem[];
    userId?: string;
    createdAt?: any;
}

export type Supplier = {
  id: string;
  name: string;
  isDefault: boolean;
}


export type UserProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  role?: 'Admin' | 'Soignant' | 'Agent Logistique';
  isActive: boolean;
  avatarId?: string;
  pushNotificationsEnabled?: boolean;
  pushToken?: string;
}


export type Notification = {
    id: string;
    type: 'anomaly' | 'info' | 'order' | 'delivery' | 'user' | 'stock';
    title: string;
    description: string;
    date: any;
    read: boolean;
    data?: any;
    forRole?: 'Admin' | 'Soignant' | 'Agent Logistique';
}

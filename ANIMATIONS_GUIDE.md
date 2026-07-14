# 🎨 Guide des Animations Premium - Lista

## 📦 Installation
```bash
npm install framer-motion
```

## 🚀 Composants Créés

### 1️⃣ **Page Transitions** (`page-transition.tsx`)

#### Usage basique
```tsx
import { PageTransition } from '@/components/ui/page-transition';

export default function MyPage() {
  return (
    <PageTransition>
      <div>Votre contenu ici</div>
    </PageTransition>
  );
}
```

#### Card Transition avec délai
```tsx
import { CardTransition } from '@/components/ui/page-transition';

<CardTransition delay={0.2}>
  <Card>...</Card>
</CardTransition>
```

#### List avec stagger
```tsx
import { ListItemTransition } from '@/components/ui/page-transition';

{items.map((item, index) => (
  <ListItemTransition key={item.id} index={index}>
    <div>{item.name}</div>
  </ListItemTransition>
))}
```

---

### 2️⃣ **Skeleton Loaders** (`premium-skeletons.tsx`)

#### Card Skeleton
```tsx
import { CardSkeleton } from '@/components/ui/premium-skeletons';

{isLoading ? <CardSkeleton /> : <RealCard />}
```

#### List Skeleton
```tsx
import { ListSkeleton } from '@/components/ui/premium-skeletons';

{isLoading ? <ListSkeleton count={5} /> : <RealList />}
```

#### Table Skeleton
```tsx
import { TableSkeleton } from '@/components/ui/premium-skeletons';

{isLoading ? <TableSkeleton rows={10} cols={5} /> : <RealTable />}
```

#### Dashboard Skeleton
```tsx
import { DashboardSkeleton } from '@/components/ui/premium-skeletons';

{isLoading ? <DashboardSkeleton /> : <RealDashboard />}
```

---

### 3️⃣ **Animated Feedback** (`animated-feedback.tsx`)

#### Success Message
```tsx
import { AnimatedFeedback } from '@/components/ui/animated-feedback';

<AnimatedFeedback 
  type="success" 
  message="Commande créée avec succès !" 
  show={showSuccess}
/>
```

#### Error Message
```tsx
<AnimatedFeedback 
  type="error" 
  message="Une erreur est survenue" 
  show={showError}
/>
```

#### Loading State
```tsx
<AnimatedFeedback 
  type="loading" 
  message="Chargement en cours..." 
  show={isLoading}
/>
```

#### Success Animation avec particules
```tsx
import { SuccessAnimation } from '@/components/ui/animated-feedback';

<SuccessAnimation show={success} size={120} />
```

#### Loading Spinner
```tsx
import { LoadingSpinner } from '@/components/ui/animated-feedback';

<LoadingSpinner size={40} />
```

---

## 🎯 Exemples d'Utilisation Réels

### Exemple 1: Page avec transition
```tsx
// src/app/dashboard/stock/page.tsx
import { PageTransition } from '@/components/ui/page-transition';

export default function StockPage() {
  return (
    <PageTransition>
      <div className="space-y-8">
        <h1>Stock</h1>
        {/* Contenu */}
      </div>
    </PageTransition>
  );
}
```

### Exemple 2: Liste avec loading
```tsx
import { ListSkeleton } from '@/components/ui/premium-skeletons';
import { ListItemTransition } from '@/components/ui/page-transition';

function OrdersList() {
  const { orders, isLoading } = useOrders();

  if (isLoading) return <ListSkeleton count={5} />;

  return (
    <div className="space-y-3">
      {orders.map((order, index) => (
        <ListItemTransition key={order.id} index={index}>
          <OrderCard order={order} />
        </ListItemTransition>
      ))}
    </div>
  );
}
```

### Exemple 3: Form avec feedback
```tsx
import { AnimatedFeedback } from '@/components/ui/animated-feedback';
import { SuccessAnimation } from '@/components/ui/animated-feedback';

function CreateOrderForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    setStatus('loading');
    try {
      await createOrder();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div>
      {status === 'loading' && <AnimatedFeedback type="loading" message="Création en cours..." show />}
      {status === 'success' && <SuccessAnimation show />}
      {status === 'error' && <AnimatedFeedback type="error" message="Erreur" show />}
      
      {/* Form */}
    </div>
  );
}
```

---

## ✨ Tips & Best Practices

1. **Page Transitions**: Wrap tout le contenu de la page
2. **Stagger Delays**: 0.05-0.1s entre chaque item
3. **Skeletons**: Utilisez pendant le chargement de données
4. **Feedback**: Toujours afficher l'état (loading/success/error)
5. **Performance**: Éviter trop d'animations simultanées

---

## 🎨 Animations Disponibles

- ✅ Page fade + slide
- ✅ Card scale + fade
- ✅ List stagger
- ✅ Modal pop
- ✅ Drawer slide
- ✅ Skeleton shimmer
- ✅ Success burst
- ✅ Loading spinner
- ✅ Error shake
- ✅ Toast notifications

Profitez de votre app ultra-fluide ! 🚀✨

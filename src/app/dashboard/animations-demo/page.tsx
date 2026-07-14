'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedFeedback, SuccessAnimation, LoadingSpinner } from '@/components/ui/animated-feedback';
import { CardSkeleton, ListSkeleton, TableSkeleton, StatSkeleton, DashboardSkeleton } from '@/components/ui/premium-skeletons';
import { PageTransition, CardTransition, ListItemTransition } from '@/components/ui/page-transition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AnimationsDemo() {
    const [showSuccess, setShowSuccess] = React.useState(false);
    const [showError, setShowError] = React.useState(false);
    const [showLoading, setShowLoading] = React.useState(false);
    const [showWarning, setShowWarning] = React.useState(false);
    const [showSuccessAnim, setShowSuccessAnim] = React.useState(false);
    const [loadingState, setLoadingState] = React.useState(false);

    const simulateAction = (type: 'success' | 'error' | 'warning') => {
        if (type === 'success') {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } else if (type === 'error') {
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        } else {
            setShowWarning(true);
            setTimeout(() => setShowWarning(false), 3000);
        }
    };

    const simulateSuccessAnimation = () => {
        setShowSuccessAnim(true);
        setTimeout(() => setShowSuccessAnim(false), 2000);
    };

    const toggleLoading = () => {
        setLoadingState(!loadingState);
    };

    return (
        <PageTransition>
            <div className="space-y-8 pb-12">
                {/* Header */}
                <div className="space-y-3">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-500 via-primary to-secondary bg-clip-text text-transparent">
                        🎨 Démo des Animations Premium
                    </h1>
                    <p className="text-muted-foreground">
                        Testez toutes les animations et transitions disponibles dans Lista
                    </p>
                </div>

                <Tabs defaultValue="feedback" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="feedback">Feedback</TabsTrigger>
                        <TabsTrigger value="skeletons">Skeletons</TabsTrigger>
                        <TabsTrigger value="transitions">Transitions</TabsTrigger>
                    </TabsList>

                    {/* Feedback Tab */}
                    <TabsContent value="feedback" className="space-y-6">
                        <Card className="border-0 glass-strong">
                            <CardHeader>
                                <CardTitle>Animations de Feedback</CardTitle>
                                <CardDescription>Messages de succès, erreur, warning et loading</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-3">
                                    <Button onClick={() => simulateAction('success')} variant="default">
                                        Afficher Success
                                    </Button>
                                    <Button onClick={() => simulateAction('error')} variant="destructive">
                                        Afficher Error
                                    </Button>
                                    <Button onClick={() => simulateAction('warning')} variant="outline">
                                        Afficher Warning
                                    </Button>
                                    <Button onClick={() => setShowLoading(!showLoading)} variant="secondary">
                                        Toggle Loading
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    <AnimatedFeedback type="success" message="Opération réussie !" show={showSuccess} />
                                    <AnimatedFeedback type="error" message="Une erreur est survenue" show={showError} />
                                    <AnimatedFeedback type="warning" message="Attention !" show={showWarning} />
                                    <AnimatedFeedback type="loading" message="Chargement en cours..." show={showLoading} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 glass-strong">
                            <CardHeader>
                                <CardTitle>Success Animation avec Particules</CardTitle>
                                <CardDescription>Animation de succès avec effet de burst</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button onClick={simulateSuccessAnimation}>
                                    Déclencher Success Animation
                                </Button>
                                <div className="flex items-center justify-center min-h-[150px]">
                                    <SuccessAnimation show={showSuccessAnim} size={100} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 glass-strong">
                            <CardHeader>
                                <CardTitle>Loading Spinner Premium</CardTitle>
                                <CardDescription>Spinner animé avec pulse</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center p-8">
                                <LoadingSpinner size={60} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Skeletons Tab */}
                    <TabsContent value="skeletons" className="space-y-6">
                        <Card className="border-0 glass-strong">
                            <CardHeader>
                                <CardTitle>Skeleton Loaders</CardTitle>
                                <CardDescription>États de chargement avec effet shimmer</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Button onClick={toggleLoading}>
                                    {loadingState ? 'Masquer' : 'Afficher'} Skeletons
                                </Button>

                                {loadingState && (
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="font-semibold mb-3">Card Skeleton</h3>
                                            <CardSkeleton />
                                        </div>

                                        <div>
                                            <h3 className="font-semibold mb-3">List Skeleton</h3>
                                            <ListSkeleton count={3} />
                                        </div>

                                        <div>
                                            <h3 className="font-semibold mb-3">Table Skeleton</h3>
                                            <TableSkeleton rows={4} cols={3} />
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <h3 className="font-semibold mb-3">Stat Skeleton</h3>
                                                <StatSkeleton />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold mb-3">Stat Skeleton</h3>
                                                <StatSkeleton />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Transitions Tab */}
                    <TabsContent value="transitions" className="space-y-6">
                        <CardTransition delay={0}>
                            <Card className="border-0 glass-strong">
                                <CardHeader>
                                    <CardTitle>Card Transition</CardTitle>
                                    <CardDescription>Animation d'apparition avec scale</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    Cette carte utilise CardTransition avec un délai de 0ms
                                </CardContent>
                            </Card>
                        </CardTransition>

                        <CardTransition delay={0.2}>
                            <Card className="border-0 glass-strong">
                                <CardHeader>
                                    <CardTitle>Card Transition (delay: 0.2s)</CardTitle>
                                    <CardDescription>Avec un délai de 200ms</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    Cette carte apparaît légèrement après la première
                                </CardContent>
                            </Card>
                        </CardTransition>

                        <Card className="border-0 glass-strong">
                            <CardHeader>
                                <CardTitle>List Item Transitions</CardTitle>
                                <CardDescription>Animation stagger pour les listes</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {['Premier item', 'Deuxième item', 'Troisième item', 'Quatrième item'].map((item, index) => (
                                    <ListItemTransition key={index} index={index}>
                                        <div className="p-4 border rounded-lg">
                                            {item} - Animation avec index {index}
                                        </div>
                                    </ListItemTransition>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </PageTransition>
    );
}

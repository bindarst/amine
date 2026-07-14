
'use client';

import * as React from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    LayoutGrid,
    Package,
    Truck,
    Archive,
    FileText,
    Settings,
    User,
    Users,
    Tag,
    Building,
    Palette,
    Bell,
    ListPlus,
    BrainCircuit,
    Lightbulb,
    Info,
    AlertCircle,
    Send,
    Pencil,
    RefreshCw,
    FileDown,
    Mail,
    PlusCircle,
    Star,
    MousePointerClick,
    Database,
    Calendar,
    Heart,
    MessageSquare,
    CheckCircle2,
    BarChart3,
    History,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useUsers } from '../settings/users-context';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const iconMap = {
    dashboard: <LayoutGrid className="inline-block mr-2 h-5 w-5 text-blue-500" />,
    orders: <Package className="inline-block mr-2 h-5 w-5 text-orange-500" />,
    new_order: <ListPlus className="inline-block mr-2 h-5 w-5 text-orange-500" />,
    deliveries: <Truck className="inline-block mr-2 h-5 w-5 text-cyan-500" />,
    new_delivery: <PlusCircle className="inline-block mr-2 h-5 w-5 text-cyan-500" />,
    stock: <Archive className="inline-block mr-2 h-5 w-5 text-green-500" />,
    reports: <FileText className="inline-block mr-2 h-5 w-5 text-violet-500" />,
    settings: <Settings className="inline-block mr-2 h-5 w-5 text-gray-500" />,
    profile: <User className="inline-block mr-2 h-5 w-5" />,
    users: <Users className="inline-block mr-2 h-5 w-5" />,
    items: <Tag className="inline-block mr-2 h-5 w-5" />,
    wards: <Building className="inline-block mr-2 h-5 w-5" />,
    suppliers: <Truck className="inline-block mr-2 h-5 w-5" />,
    theme: <Palette className="inline-block mr-2 h-5 w-5" />,
    notifications: <Bell className="inline-block mr-2 h-5 w-5" />,
    ai_suggestion: <BrainCircuit className="inline-block mr-2 h-5 w-5 text-purple-500" />,
    forecasting: <Lightbulb className="inline-block mr-2 h-5 w-5 text-yellow-500" />,
    info: <Info className="inline-block mr-2 h-5 w-5" />,
    warning: <AlertCircle className="inline-block mr-2 h-5 w-5 text-red-500" />,
    send: <Send className="inline-block mr-2 h-5 w-5" />,
    edit: <Pencil className="inline-block mr-2 h-5 w-5" />,
    redo: <RefreshCw className="inline-block mr-2 h-5 w-5" />,
    pdf: <FileDown className="inline-block mr-2 h-5 w-5" />,
    email: <Mail className="inline-block mr-2 h-5 w-5" />,
    default_star: <Star className="inline-block mr-2 h-5 w-5" />,
    direct_distribution: <Send className="inline-block mr-2 h-5 w-5 text-teal-500" />,
    adjust: <MousePointerClick className="inline-block mr-2 h-5 w-5" />,
    adjustments_tracking: <Database className="inline-block mr-2 h-5 w-5" />,
    calendar: <Calendar className="inline-block mr-2 h-5 w-5" />,
    comment: <MessageSquare className="inline-block mr-2 h-5 w-5 text-gray-400" />,
    preparation: <CheckCircle2 className="inline-block mr-2 h-5 w-5 text-teal-500" />,
    analytics: <BarChart3 className="inline-block mr-2 h-5 w-5 text-indigo-500" />,
    history: <History className="inline-block mr-2 h-5 w-5 text-gray-500" />,
};


export default function HelpPage() {
    const { currentUserProfile, isCurrentUserProfileLoading } = useUsers();
    
    if (isCurrentUserProfileLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const isAdmin = currentUserProfile?.role === 'Admin';
    const isSoignant = currentUserProfile?.role === 'Soignant';
    const isAgentLogistique = currentUserProfile?.role === 'Agent Logistique';


    return (
        <div className="container mx-auto py-8 space-y-8">
            
            <div>
                <h1 className="text-3xl font-bold tracking-tight">À Propos & Aide</h1>
                <p className="text-muted-foreground">
                    Informations sur l'application et guide d'utilisation.
                </p>
            </div>
            
            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Heart className="h-6 w-6 text-red-500" />
                        À Propos de Lista
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <p className="text-muted-foreground">
                        Cette application a été développée avec passion par <strong>Rahil Amine</strong>. Elle est conçue comme un outil collaboratif, libre de droit, destiné à faciliter le travail quotidien et à améliorer la gestion des ressources entre collègues.
                    </p>
                     <Separator />
                    <p className="text-sm">
                        Pour toute question, suggestion ou si vous rencontrez un problème, n'hésitez pas à envoyer un mail à <a href="mailto:a.rahil@isosl.be" className="text-primary font-medium hover:underline">a.rahil@isosl.be</a>.
                    </p>
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>Guide d'utilisation de l'application</CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        
                        {(isAdmin || isSoignant) && <AccordionItem value="item-orders">
                            <AccordionTrigger className="text-lg font-semibold">
                                {iconMap.orders} Gestion des Commandes (Soignants)
                            </AccordionTrigger>
                            <AccordionContent className="space-y-6 pl-8">
                                <div>
                                    <h4 className="font-semibold text-base mb-2">Créer une nouvelle commande</h4>
                                    <ul className="list-disc pl-5 space-y-2 text-sm">
                                        <li>Cliquez sur {iconMap.new_order} <strong>Créer une Commande</strong> depuis la page des commandes.</li>
                                        <li>Naviguez entre les étages en utilisant les onglets (sur ordinateur) ou le menu déroulant (sur mobile).</li>
                                        <li>Pour chaque article, ajustez la quantité en utilisant les boutons <Badge variant="outline">+</Badge>/<Badge variant="outline">-</Badge> ou en **glissant votre doigt horizontalement** sur la carte pour un ajustement rapide sur mobile.</li>
                                        <li>Utilisez l'interrupteur pour choisir entre 'pièces' et 'cartons'.</li>
                                        <li>{iconMap.ai_suggestion} <strong>Suggestion IA :</strong> Si vous avez un historique suffisant (plus de 5 commandes), l'IA peut pré-remplir la commande en se basant sur les consommations passées pour vous faire gagner du temps.</li>
                                        <li>{iconMap.comment} <strong>Ajouter un commentaire :</strong> En bas de page, vous pouvez laisser une note (ex: "Commande urgente") qui sera visible par les autres utilisateurs.</li>
                                        <li>Cliquez sur {iconMap.send} <strong>Envoyer</strong> pour valider la commande.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-base mb-2">Consulter et Gérer une commande</h4>
                                    <ul className="list-disc pl-5 space-y-2 text-sm">
                                        <li>Utilisez le bouton {iconMap.calendar} <strong>Agenda</strong> pour visualiser les jours avec des commandes et y accéder rapidement.</li>
                                        <li>La liste des commandes affiche la date, les étages concernés, le total des pièces et le statut.</li>
                                        <li><strong>Statuts :</strong> <Badge variant="secondary">Brouillon</Badge> (non finalisée), <Badge variant="default">Confirmée</Badge> (validée et prête à être préparée), <Badge variant="success">Distribuée</Badge> (stock déduit, commande clôturée).</li>
                                        <li>Cliquez sur une commande pour voir les détails par étage.</li>
                                        <li><strong>Actions sur une commande :</strong>
                                            <ul className="list-decimal pl-5 mt-2 space-y-1">
                                                <li>{iconMap.edit} <strong>Modifier :</strong> Permet de changer les quantités et le commentaire (uniquement pour les commandes non distribuées).</li>
                                                <li>{iconMap.redo} <strong>Refaire la commande :</strong> Crée une nouvelle commande pré-remplie avec les mêmes articles et quantités.</li>
                                                <li>{iconMap.pdf} <strong>Exporter en PDF :</strong> Génère un bon de commande détaillé et formaté, idéal pour l'impression.</li>
                                                <li>{iconMap.email} <strong>Partager :</strong> Ouvre votre client mail avec un résumé de la commande prêt à être envoyé (le PDF est téléchargé).</li>
                                            </ul>
                                        </li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>}

                        {(isAdmin || isAgentLogistique) && (
                            <AccordionItem value="item-preparation">
                                <AccordionTrigger className="text-lg font-semibold">
                                    {iconMap.preparation} Préparation et Distribution des Commandes
                                </AccordionTrigger>
                                <AccordionContent className="space-y-6 pl-8 text-sm">
                                    <div>
                                        <h4 className="font-semibold text-base mb-2">Préparer une commande</h4>
                                        <p>Une fois qu'une commande a le statut <Badge>Confirmée</Badge>, elle est prête à être préparée.</p>
                                        <ul className="list-disc pl-5 space-y-2 mt-2">
                                            <li>Accédez à la commande depuis la liste ou l'agenda.</li>
                                            <li>Sur la page de détail, vous pouvez cocher les articles au fur et à mesure de leur préparation en **cliquant dessus** (ordinateur) ou en **glissant le doigt** (sur mobile).</li>
                                            <li>L'article coché sera grisé pour un suivi visuel facile. Le progrès de chaque étage est indiqué.</li>
                                            <li>{iconMap.pdf} Vous pouvez **Exporter en PDF** pour avoir un bon de préparation papier si nécessaire.</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-base mb-2">Finaliser la distribution</h4>
                                        <ul className="list-disc pl-5 space-y-2 text-sm">
                                            <li>Une fois tous les articles préparés et distribués dans les étages, cliquez sur le bouton {iconMap.send} **Marquer comme distribuée**.</li>
                                            <li>Cette action est **irréversible** et a deux effets principaux :
                                                <ul className="list-decimal pl-5 mt-2 space-y-1">
                                                    <li>La commande passe au statut <Badge variant="success">Distribuée</Badge> et ne peut plus être modifiée.</li>
                                                    <li>Les quantités d'articles sont **automatiquement déduites** du stock.</li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )}


                        {(isAdmin || isSoignant || isAgentLogistique) && <AccordionItem value="item-deliveries">
                            <AccordionTrigger className="text-lg font-semibold">
                                {iconMap.deliveries} Gestion des Livraisons
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pl-8 text-sm">
                                <p>Enregistrez ici les livraisons reçues des fournisseurs pour mettre à jour automatiquement votre stock.</p>
                                <ul className="list-disc pl-5 space-y-2">
                                     <li>Cliquez sur {iconMap.new_delivery} <strong>Nouvelle Livraison</strong>.</li>
                                     <li>Sélectionnez le fournisseur dans la liste déroulante (le fournisseur par défaut est présélectionné).</li>
                                     <li>Pour chaque article reçu, entrez la quantité et sélectionnez l'unité ('pièces' ou 'cartons'). Le total en pièces est calculé automatiquement.</li>
                                     <li>Cliquez sur {iconMap.send} <strong>Valider la Livraison</strong>. Le stock sera mis à jour en arrière-plan et une notification sera envoyée.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>}
                        
                         <AccordionItem value="item-items-details">
                            <AccordionTrigger className="text-lg font-semibold">
                                {iconMap.items} Liste et Détails des Articles
                            </AccordionTrigger>
                            <AccordionContent className="space-y-6 pl-8 text-sm">
                                 <div>
                                    <h4 className="font-semibold text-base mb-2">Explorer les Articles</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>La page "Articles" vous permet de voir tous les produits disponibles, avec leur photo et leur stock actuel.</li>
                                        <li>Cliquez sur un article pour accéder à sa page de détail.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-base mb-2">{iconMap.analytics} Page de Détail d'un Article</h4>
                                    <p>Cette page vous donne des informations précieuses sur la consommation d'un article spécifique :</p>
                                    <ul className="list-disc pl-5 space-y-2 mt-2">
                                        <li><strong>Statistiques Clés :</strong> Consommation totale, moyenne par semaine, et l'étage qui en consomme le plus.</li>
                                        <li><strong>Graphiques de Consommation :</strong> Visualisez la répartition par étage et l'évolution des commandes au fil du temps.</li>
                                        <li>{iconMap.history} <strong>Historique des Mouvements :</strong> Un journal complet de toutes les entrées (livraisons, ajustements positifs) et sorties (commandes, distributions, ajustements négatifs) pour cet article. C'est l'outil parfait pour tracer chaque mouvement de stock.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-stock">
                            <AccordionTrigger className="text-lg font-semibold">
                                {iconMap.stock} Gestion du Stock
                            </AccordionTrigger>
                            <AccordionContent className="space-y-6 pl-8 text-sm">
                                <div>
                                    <h4 className="font-semibold text-base mb-2">Niveaux de Stock</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>Consultez la quantité en pièces et en cartons pour chaque article.</li>
                                        <li>Un statut visuel (<Badge variant="destructive">Bas</Badge>, <Badge variant="secondary">Moyen</Badge>, <Badge variant="default">Élevé</Badge>) et une barre de progression vous aident à évaluer rapidement le stock.</li>
                                    </ul>
                                </div>
                                 {(isAdmin || isSoignant || isAgentLogistique) && <div>
                                    <h4 className="font-semibold text-base mb-2">Actions sur le stock</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>{iconMap.direct_distribution} <strong>Distribution Directe :</strong> Utilisez cette fonction pour enregistrer une sortie de stock **légitime et non planifiée** (ex: don, besoin urgent, etc.). Vous devrez spécifier une raison. Cette action est tracée.</li>
                                        <li>{iconMap.adjust} <strong>Ajuster :</strong> Permet de corriger manuellement la quantité d'un article pour refléter la réalité **en cas d'erreur ou d'écart d'inventaire** (perte, vol, etc.). Ces ajustements sont enregistrés et visibles dans les rapports pour les administrateurs.</li>
                                    </ul>
                                </div>}
                                <div>
                                    <h4 className="font-semibold text-base mb-2">Outils d'IA</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>{iconMap.forecasting} <strong>Prévisions de Consommation :</strong> Sélectionnez un article et cliquez sur "Lancer la prévision" pour que l'IA prédise la consommation pour les 7 prochains jours.</li>
                                        <li>{iconMap.lightbulb} <strong>Commande Fournisseur Intelligente :</strong> L'IA analyse votre stock actuel et votre historique de consommation pour vous suggérer une liste d'articles et de quantités à commander auprès de vos fournisseurs, en tenant compte d'un stock de sécurité.</li>
                                    </ul>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        {(isAdmin || isSoignant || isAgentLogistique) && <AccordionItem value="item-reports">
                            <AccordionTrigger className="text-lg font-semibold">
                                {iconMap.reports} Rapports et Analyses
                            </AccordionTrigger>
                            <AccordionContent className="space-y-6 pl-8 text-sm">
                                <p>Visualisez des données consolidées sur la consommation pour la période de votre choix.</p>
                                <div>
                                    <h4 className="font-semibold text-base mb-2">Onglets Disponibles</h4>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>Statistiques :</strong> Des indicateurs clés et des graphiques (Top 10 articles, consommation par étage, évolution dans le temps, articles manquants).</li>
                                        <li><strong>Historique :</strong> La liste détaillée de toutes les commandes pour la période sélectionnée.</li>
                                        {isAdmin && <li>{iconMap.adjustments_tracking} <strong>Ajustements Manuels (Admin) :</strong> Un onglet crucial qui trace **toutes les corrections manuelles de stock**. Idéal pour identifier les écarts d'inventaire, les pertes ou les articles "disparus", en voyant qui a fait la modification.</li>}
                                    </ul>
                                </div>
                                <div>
                                     <h4 className="font-semibold text-base mb-2">Fonctionnalités</h4>
                                     <ul className="list-disc pl-5 space-y-2">
                                         <li><strong>Filtre par date :</strong> Choisissez une période pour affiner vos analyses sur tous les onglets.</li>
                                         <li>{iconMap.pdf} <strong>Exporter le Rapport PDF :</strong> Téléchargez un rapport complet incluant l'historique, les ajustements et les graphiques.</li>
                                     </ul>
                                 </div>
                            </AccordionContent>
                        </AccordionItem>}
                        
                        <AccordionItem value="item-settings">
                            <AccordionTrigger className="text-lg font-semibold">
                                {iconMap.settings} Paramètres
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pl-8 text-sm">
                                <p>Configurez l'application et gérez les données de base.</p>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>{iconMap.profile} <strong>Profil :</strong> Changez votre nom et votre avatar.</li>
                                    {isAdmin && <>
                                        <li>{iconMap.users} <strong>Utilisateurs (Admin) :</strong> Gérez les utilisateurs, activez les nouveaux comptes en leur assignant un rôle (<Badge>Admin</Badge>, <Badge>Soignant</Badge>, <Badge>Agent Logistique</Badge>).</li>
                                        <li>{iconMap.items} <strong>Articles (Admin) :</strong> Ajoutez ou modifiez les types de changes, leur code, couleur, nombre de pièces par carton, et seuil de stock bas.</li>
                                        <li>{iconMap.wards} <strong>Étages (Admin) :</strong> Gérez les noms des étages et des cantous.</li>
                                        <li>{iconMap.suppliers} <strong>Fournisseurs (Admin) :</strong> Gérez la liste des fournisseurs et définissez-en un par défaut.</li>
                                        <li>{iconMap.warning} <strong>Données (Admin) :</strong> Réinitialisez les données de commandes, livraisons et notifications (action irréversible).</li>
                                    </>}
                                    <li>{iconMap.theme} <strong>Apparence :</strong> Personnalisez le thème de couleurs de l'application et basculez entre le mode clair et sombre.</li>
                                </ul>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>

        </div>
    );
}

    
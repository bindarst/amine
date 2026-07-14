import ItemDetailsContent from './item-details-content';

export default async function ItemDetailsPage({ params }: { params: Promise<{ itemId: string }> }) {
    const { itemId } = await params;

    return <ItemDetailsContent itemId={itemId} />;
}
